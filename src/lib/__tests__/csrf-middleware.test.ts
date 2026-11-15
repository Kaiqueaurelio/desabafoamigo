import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "../csrf-middleware";

describe("isSameOriginRequest", () => {
  const url = "https://desabafoamigo.lovable.app/_serverFn";

  it("accepts Fetch Metadata marked same-origin", () => {
    expect(
      isSameOriginRequest(new Request(url, { headers: { "Sec-Fetch-Site": "same-origin" } })),
    ).toBe(true);
  });

  it("rejects same-site and cross-site requests", () => {
    for (const site of ["same-site", "cross-site", "none"]) {
      expect(isSameOriginRequest(new Request(url, { headers: { "Sec-Fetch-Site": site } }))).toBe(
        false,
      );
    }
  });

  it("falls back to the exact Origin when Fetch Metadata is absent", () => {
    expect(
      isSameOriginRequest(
        new Request(url, { headers: { Origin: "https://desabafoamigo.lovable.app" } }),
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(new Request(url, { headers: { Origin: "https://evil.example" } })),
    ).toBe(false);
  });

  it("accepts a same-origin Referer fallback and rejects missing metadata", () => {
    expect(
      isSameOriginRequest(
        new Request(url, { headers: { Referer: "https://desabafoamigo.lovable.app/auth" } }),
      ),
    ).toBe(true);
    expect(isSameOriginRequest(new Request(url))).toBe(false);
  });
});
