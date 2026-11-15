import { createMiddleware } from "@tanstack/react-start";

type CsrfHandlerType = "serverFn" | "router";

type CsrfContext = {
  request: Request;
  pathname: string;
  handlerType: CsrfHandlerType;
};

type CsrfOptions = {
  filter?: (context: CsrfContext) => boolean | Promise<boolean>;
};

const csrfMiddlewareMarker = Symbol.for("tanstack-start:csrf-middleware");

/**
 * Same-origin protection for TanStack server functions.
 *
 * Implemented on createMiddleware instead of importing TanStack's bundled
 * createCsrfMiddleware because the latter pulled server-only async_hooks into
 * the browser module graph in the affected Start releases.
 */
export function createCsrfMiddleware(options: CsrfOptions = {}) {
  const middleware = createMiddleware().server(async ({ request, pathname, handlerType, next }) => {
    const context: CsrfContext = { request, pathname, handlerType };
    if (options.filter && !(await options.filter(context))) return next();
    if (isSameOriginRequest(request)) return next();

    return new Response("Forbidden", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  });

  // TanStack Start checks this symbol to recognize configured CSRF middleware.
  Object.defineProperty(middleware, csrfMiddlewareMarker, { value: true });
  return middleware;
}

export function isSameOriginRequest(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin;
  const fetchSite = request.headers.get("Sec-Fetch-Site");

  if (fetchSite !== null) return fetchSite === "same-origin";

  const origin = request.headers.get("Origin");
  if (origin !== null) {
    try {
      return new URL(origin).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("Referer");
  if (referer !== null) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  // Fail closed when the browser provides no trustworthy same-origin metadata.
  return false;
}
