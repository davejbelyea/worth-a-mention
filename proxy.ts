import { NextResponse, type NextRequest } from "next/server";

// A quick front-door check. Every page also verifies the session against the database.
const PUBLIC = [/^\/login/, /^\/join\//, /^\/auth\//, /^\/api\/cron\//, /^\/icon/, /^\/favicon/, /^\/manifest/, /^\/apple-icon/];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  if (!req.cookies.get("wam_session")) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|svg|ico|webp)$).*)"] };
