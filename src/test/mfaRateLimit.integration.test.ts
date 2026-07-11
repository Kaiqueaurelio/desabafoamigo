import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

const hasDb = !!process.env.PGHOST;

// Verifica no backend real:
//  - 5 falhas TOTP em 15 min bloqueiam a conta
//  - sucesso zera o contador
//  - escopos 'pro' e 'admin' são independentes
//  - falhas fora da janela de 15 min não bloqueiam
describe.skipIf(!hasDb)("MFA rate limit (backend)", () => {
  it("bloqueia após 5 tentativas e reseta após sucesso", () => {
    const out = execFileSync(
      "psql",
      ["-v", "ON_ERROR_STOP=1", "-X", "-A", "-t", "-c", "select public._test_mfa_rate_limit()"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    expect(out.trim()).toBe("OK");
  });
});
