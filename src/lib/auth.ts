import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { can, isGlobalRole, type Capability } from "@/lib/permissions";

const SESSION_COOKIE = "csr_erp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** Which company a Super Admin is currently viewing. Not part of the signed session — a plain
 * preference cookie so switching company doesn't require re-authenticating. Ignored for every
 * other role (always null, always scoped to their own companyId). */
const VIEW_COMPANY_COOKIE = "csr_erp_view_company";

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  clientId: string | null;
  volunteerEventId: string | null;
  /** Super Admin only: company selected via the switcher. Null means "all companies" (aggregate). */
  viewCompanyId: string | null;
};

type SignedSessionPayload = Omit<SessionPayload, "viewCompanyId">;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionCookie(payload: SignedSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(VIEW_COMPANY_COOKIE);
}

export async function setViewCompanyCookie(companyId: string | null) {
  const store = await cookies();
  if (companyId) {
    store.set(VIEW_COMPANY_COOKIE, companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  } else {
    store.delete(VIEW_COMPANY_COOKIE);
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const signed = payload as unknown as SignedSessionPayload;
    const viewCompanyId = isGlobalRole(signed.role) ? store.get(VIEW_COMPANY_COOKIE)?.value ?? null : null;
    return { ...signed, viewCompanyId };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireCapability(capability: Capability): Promise<SessionPayload> {
  const session = await requireUser();
  if (!can(session.role, capability)) {
    redirect("/dashboard?denied=1");
  }
  return session;
}

/** Returns a Prisma `where` fragment scoping a query to the session's company, unless the
 * role is global (Super Admin) — in which case it scopes to whatever company they're currently
 * viewing via the switcher, or no filter at all for the "all companies" aggregate view. */
export function companyScope(session: SessionPayload) {
  if (!isGlobalRole(session.role)) return { companyId: session.companyId };
  return session.viewCompanyId ? { companyId: session.viewCompanyId } : {};
}
