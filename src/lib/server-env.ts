import { env } from "cloudflare:workers";

/**
 * Read server configuration from Cloudflare Worker bindings first, then from
 * process.env for Node.js/Lovable local runtimes. Call only from server code.
 */
export function getServerEnv(name: string): string | undefined {
  const bindings = env as unknown as Record<string, unknown>;
  const bindingValue = bindings[name];
  if (typeof bindingValue === "string" && bindingValue.length > 0) {
    return bindingValue;
  }

  if (typeof process !== "undefined") {
    const processValue = process.env?.[name];
    if (processValue) return processValue;
  }

  return undefined;
}
