import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "csr_erp_trainee_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 3; // 3 days — a trainee logs in briefly to take a test, not for ongoing use.

export type TraineeSessionPayload = {
  sub: string; // participant id
  name: string;
  mobile: string;
  projectId: string;
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(value);
}

export async function createTraineeSessionCookie(payload: TraineeSessionPayload) {
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

export async function clearTraineeSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getTraineeSession(): Promise<TraineeSessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as TraineeSessionPayload;
  } catch {
    return null;
  }
}

export async function requireTrainee(): Promise<TraineeSessionPayload> {
  const session = await getTraineeSession();
  if (!session) redirect("/trainee-login");
  return session;
}
