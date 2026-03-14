import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/referrers", "/messages", "/request"];
const AUTH_PREFIXES = ["/auth/login", "/auth/signup"];

function looksLikeJwt(token: string | undefined): boolean {
  if (!token) return false;
  return token.split(".").length === 3;
}

export function middleware(request: NextRequest) {
  const rawToken = request.cookies.get("referai_token")?.value;
  const token = looksLikeJwt(rawToken) ? rawToken : undefined;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    if (rawToken && !token) {
      response.cookies.delete("referai_token");
    }
    return response;
  }

  if (isAuthPath && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
};
