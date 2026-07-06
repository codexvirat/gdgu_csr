import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "csr_erp_session";
const PUBLIC_PATHS = ["/login"];

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = await hasValidSession(request);

  if (PUBLIC_PATHS.includes(pathname)) {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!authed) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /trainee-login and /trainee/* use their own session (a different cookie), not the staff one.
  // /verify/* is the public, unauthenticated certificate-verification page reached via QR code.
  matcher: ["/((?!api/auth|trainee|verify|_next/static|_next/image|favicon.ico|next.svg|vercel.svg).*)"],
};
