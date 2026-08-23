import { NextRequest, NextResponse } from "next/server";

const PUBLIC_HOST = "www.shamiehchess.com";
const APEX_HOST = "shamiehchess.com";
const APP_HOST = "app.shamiehchess.com";

const APP_ONLY_PATHS = [
  "/login",
  "/register",
  "/portal",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
];

const PUBLIC_ONLY_PATHS = ["/tournaments", "/news"];

function isAppOnlyPath(pathname: string) {
  return APP_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isPublicOnlyPath(pathname: string) {
  return PUBLIC_ONLY_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function noIndexResponse() {
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export function middleware(request: NextRequest) {
  const hostname = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, search } = request.nextUrl;

  // Keep the same canonical direction as Vercel: apex -> www.
  if (hostname === APEX_HOST) {
    return NextResponse.redirect(`https://${PUBLIC_HOST}${pathname}${search}`);
  }

  if (hostname === PUBLIC_HOST && isAppOnlyPath(pathname)) {
    return NextResponse.redirect(`https://${APP_HOST}${pathname}${search}`);
  }

  if (hostname === APP_HOST) {
    if (pathname === "/") {
      return NextResponse.redirect(`https://${APP_HOST}/login`);
    }

    if (isPublicOnlyPath(pathname)) {
      return NextResponse.redirect(`https://${PUBLIC_HOST}${pathname}${search}`);
    }

    return noIndexResponse();
  }

  // Prevent temporary Vercel deployment URLs from competing with the canonical public domain in search results.
  if (hostname.endsWith(".vercel.app")) {
    return noIndexResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|images/|shamieh-logo.svg).*)"],
};
