import { env } from "cloudflare:workers";

type DenoRuntime = { env?: { get(name: string): string | undefined } };

function normalized(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * Read server configuration from Cloudflare Worker bindings first, then from
 * process.env for Node.js/Lovable local runtimes. Call only from server code.
 */
export function getServerEnv(name: string): string | undefined {
  // Cloudflare bindings are supplied by the Workers runtime. A local module
  // declaration keeps TypeScript aware of this runtime-only module.
  try {
    const bindings = env as unknown as Record<string, unknown>;
    const bindingValue = normalized(bindings[name]);
    if (bindingValue) return bindingValue;
  } catch {
    // Fall back to process.env in Node.js/Lovable local runtimes.
  }

  if (typeof process !== "undefined") {
    const processValue = normalized(process.env?.[name]);
    if (processValue) return processValue;
  }

  const deno = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;
  try {
    const denoValue = normalized(deno?.env?.get(name));
    if (denoValue) return denoValue;
  } catch {
    // Deno permissions may reject access; treat the variable as unavailable.
  }

  return undefined;
}
