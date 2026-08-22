const BASE_PATH = "/firsthand";

export function isValidRequestHost(request: Request, origin: URL) {
  const requestUrl = new URL(request.url);
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");

  if (host !== origin.host) {
    return false;
  }
  if (forwardedHost !== null && forwardedHost !== origin.host) {
    return false;
  }
  if (forwardedProto !== null && forwardedProto !== "https") {
    return false;
  }

  return forwardedProto === "https" || requestUrl.protocol === "https:";
}

export function isSameOriginRequest(request: Request, origin: URL) {
  return (
    isValidRequestHost(request, origin) &&
    request.headers.get("origin") === origin.origin
  );
}

export function isExactLoginPath(pathname: string, normalizedBasePath = "") {
  return (
    pathname === `${BASE_PATH}/login` ||
    (normalizedBasePath === BASE_PATH && pathname === "/login")
  );
}

export function isBrowserDocumentRequest(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  const pathname = new URL(request.url).pathname;
  if (
    pathname === `${BASE_PATH}/favicon.ico` ||
    pathname.startsWith(`${BASE_PATH}/api/`) ||
    pathname.startsWith(`${BASE_PATH}/_next/`) ||
    /\/[^/]+\.[^/]+$/.test(pathname)
  ) {
    return false;
  }

  return (
    request.headers.get("sec-fetch-dest") === "document" &&
    request.headers.get("accept")?.split(",").some((value) =>
      value.trim().toLowerCase().startsWith("text/html"),
    ) === true
  );
}
