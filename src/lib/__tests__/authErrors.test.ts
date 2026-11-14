import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, isNetworkError } from "../authErrors";

describe("erros de autenticação", () => {
  it("reconhece o erro genérico Load failed do Safari", () => {
    expect(isNetworkError(new TypeError("Load failed"))).toBe(true);
  });

  it("reconhece falhas de rede reportadas pelo fetch", () => {
    expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("Network request failed"))).toBe(true);
  });

  it("não classifica credenciais inválidas como falha de rede", () => {
    expect(isNetworkError(new Error("Invalid login credentials"))).toBe(false);
  });

  it("orienta a pessoa quando o dispositivo está offline", () => {
    expect(getAuthErrorMessage(new TypeError("Load failed"), false)).toContain(
      "sem conexão com a internet",
    );
  });

  it("não exibe a mensagem técnica Load failed", () => {
    const message = getAuthErrorMessage(new TypeError("Load failed"), true);
    expect(message).toContain("serviço de login");
    expect(message).not.toContain("Load failed");
  });

  it("não expõe detalhes internos de erros desconhecidos", () => {
    expect(getAuthErrorMessage(new Error("relation user_roles does not exist"))).toBe(
      "Não foi possível concluir seu acesso. Confira seus dados e tente novamente.",
    );
  });
});
