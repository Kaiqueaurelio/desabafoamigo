import { env } from "cloudflare:workers";

/**
 * Read server configuration from Cloudflare Worker bindings first, then from
 * process.env for Node.js/Lovable local runtimes. Call only from server code.
 */
export function getServerEnv(name: string): string | undefined {
  // Cloudflare bindings are supplied by the Workers runtime. A local module
  // declaration keeps TypeScript aware of this runtime-only module.
  try {
    const bindings = env as unknown as Record<string, unknown>;
    const bindingValue = bindings[name];
    if (typeof bindingValue === "string" && bindingValue.length > 0) {
      return bindingValue;
    }
  } catch {
    // Fall back to process.env in Node.js/Lovable local runtimes.
  }

  if (typeof process !== "undefined") {
    const processValue = process.env?.[name];
    if (processValue) return processValue;
  }

  return undefined;
}
