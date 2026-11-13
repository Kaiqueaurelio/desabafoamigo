import { describe, it, expect } from "vitest";
import { assessRisk, parseAiJson } from "../aiSafety";

describe("triagem do Desabafo Amigo AI", () => {
  it("mensagem de risco explícito é urgente mesmo que a IA diga 0", () => {
    expect(assessRisk("eu quero me matar", 0).level).toBe("urgent");
  });
  it("falha da IA não vira ausência de risco", () => {
    const r = assessRisk("tô cansado de tudo", null);
    expect(r.level).toBe("attention");
    expect(r.offerHuman).toBe(true);
  });
  it("resposta inválida da IA cai na contingência", () => {
    expect(assessRisk("oi", "abc").source).toBe("fallback");
  });
  it("ambiguidade com severidade 2 oferece humano", () => {
    expect(assessRisk("não vejo saída", 2).offerHuman).toBe(true);
  });
  it("conversa tranquila não exige humano", () => {
    expect(assessRisk("hoje foi um dia ok", 0).level).toBe("none");
  });
  it("parseAiJson rejeita JSON sem reply", () => {
    expect(parseAiJson('{"severity":1}')).toBeNull();
    expect(parseAiJson("texto solto")).toBeNull();
    expect(parseAiJson('{"reply":"oi","severity":5}')?.severity).toBe(3);
  });
});
