import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const response = await next();
  const headers = new Headers(response.headers);
  const existingPolicy = headers.get("Content-Security-Policy") ?? "";
  const directives = existingPolicy
    .split(";")
    .map((directive) => directive.trim())
    .filter((directive) => directive && !/^frame-ancestors\b/i.test(directive));
  directives.push("frame-ancestors 'none'");
  headers.set("Content-Security-Policy", directives.join("; "));
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, csrfMiddleware, errorMiddleware],
}));
