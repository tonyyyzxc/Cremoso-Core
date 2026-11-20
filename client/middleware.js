import { next, rewrite } from "@vercel/functions";

const BYPASS_COOKIE_NAME = "maintenance_bypass";
const BYPASS_QUERY_NAME = "maintenance_bypass";

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    /^\/favicon(?:\.[a-z0-9]+)?$/i.test(pathname) ||
    /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(pathname)
  );
}

function getBypassCookie(request) {
  const cookies = request.headers.get("cookie") || "";
  return cookies
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${BYPASS_COOKIE_NAME}=`));
}

function hasBypassCookie(request, bypassKey) {
  return (
    getBypassCookie(request) ===
    `${BYPASS_COOKIE_NAME}=${encodeURIComponent(bypassKey)}`
  );
}

export default function middleware(request) {
  const url = new URL(request.url);
  const bypassKey = process.env.MAINTENANCE_BYPASS_KEY;

  if (process.env.MAINTENANCE_MODE !== "true") {
    if (getBypassCookie(request)) {
      const secure = url.protocol === "https:" ? "; Secure" : "";
      return next({
        headers: {
          "Set-Cookie": `${BYPASS_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${secure}`,
        },
      });
    }

    return next();
  }

  if (isStaticAsset(url.pathname) || url.pathname === "/maintenance.html") {
    return next();
  }

  if (bypassKey && hasBypassCookie(request, bypassKey)) {
    return next();
  }

  const requestedBypass = url.searchParams.get(BYPASS_QUERY_NAME);
  if (bypassKey && requestedBypass === bypassKey) {
    const secure = url.protocol === "https:" ? "; Secure" : "";
    return next({
      headers: {
        "Set-Cookie": `${BYPASS_COOKIE_NAME}=${encodeURIComponent(bypassKey)}; Path=/; Max-Age=86400; SameSite=Lax${secure}`,
      },
    });
  }

  return rewrite(new URL("/maintenance.html", request.url));
}
