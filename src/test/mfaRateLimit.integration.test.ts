import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

const hasDb = !!process.env.PGHOST;

describe.skipIf(!hasDb)("MFA rate limit (backend)", () => {
  it("bloqueia após 5 tentativas em 15 min e reseta após sucesso", () => {
    const file = path.resolve("src/test/sql/mfaRateLimit.sql");
    // psql -v ON_ERROR_STOP=1 => exit non-zero on any RAISE EXCEPTION.
    const out = execFileSync(
      "psql",
      ["-v", "ON_ERROR_STOP=1", "-X", "-q", "-f", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    expect(out + "").toMatch(/mfaRateLimit: OK/);
  });
});
