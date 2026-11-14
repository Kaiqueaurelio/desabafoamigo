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
  it("falha da IA com sinal local de risco nunca reduz a classificação", () => {
    const r = assessRisk("não quero mais viver", null);
    expect(r.level).toBe("urgent");
    expect(r.offerHuman).toBe(true);
    expect(r.source).toBe("keywords");
  });
  it("severidade inválida não é tratada como ausência de risco", () => {
    const r = assessRisk("estou perdido e sem saída", Number.NaN);
    expect(r.level).toBe("attention");
    expect(r.offerHuman).toBe(true);
    expect(r.source).toBe("fallback");
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

describe("sinais persistentes de risco", () => {
  it("classifica intenção explícita em primeira pessoa como urgente mesmo se a IA minimizar", () => {
    expect(assessRisk("não quero mais viver", 0).level).toBe("urgent");
    expect(assessRisk("vou tirar minha vida hoje", 0).level).toBe("urgent");
  });

  it("eleva menções repetidas de ideação na conversa para urgente", () => {
    const conversation = "Tenho pensado em suicídio.\nHoje pensei em suicídio de novo.";
    const result = assessRisk(conversation, 1);
    expect(result.level).toBe("urgent");
    expect(result.offerHuman).toBe(true);
  });

  it("uma menção contextual isolada gera atenção e encaminhamento, sem presumir iminência", () => {
    const result = assessRisk("Tenho pensado em suicídio ultimamente.", 1);
    expect(result.level).toBe("attention");
    expect(result.offerHuman).toBe(true);
  });

  it("não marca automaticamente uma negação explícita de intenção como ideação", () => {
    const result = assessRisk("Não estou pensando em me matar e não tenho intenção de suicídio.", 0);
    expect(result.level).toBe("none");
  });

  it("reconhece expressões imediatas curtas mesmo com severidade zero", () => {
    expect(assessRisk("Quero morrer hoje.", 0).level).toBe("urgent");
    expect(assessRisk("Estou pensando em agir hoje.", 0).level).toBe("urgent");
  });

  it("não ignora uma intenção imediata só porque o modelo retornou severidade zero", () => {
    const result = assessRisk("Decidi me matar hoje.", 0);
    expect(result.level).toBe("urgent");
    expect(result.source).toBe("keywords");
  });

  it("uma negação não pode apagar intenção declarada depois de mas", () => {
    const result = assessRisk("Não quero morrer, mas vou me matar hoje.", 0);
    expect(result.level).toBe("urgent");
    expect(result.offerHuman).toBe(true);
    expect(result.source).toBe("keywords");
  });

  it("mantém a negação explícita quando não há cláusula positiva posterior", () => {
    expect(assessRisk("Não estou pensando em me matar e não tenho intenção de suicídio.", 0).level).toBe("none");
  });
});
