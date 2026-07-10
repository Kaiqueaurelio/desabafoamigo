import { describe, it, expect, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ScreenshotGuard, classifyAttempt } from "./ScreenshotGuard";
import { IdentityWatermark } from "./Watermark";

describe("classifyAttempt", () => {
  it("classifica PrintScreen como high", () => {
    expect(classifyAttempt("Tecla PrintScreen detectada", { msSinceLastKey: 5000 })).toBe("high");
  });
  it("classifica atalho como high", () => {
    expect(classifyAttempt("Atalho de captura detectado", { msSinceLastKey: 5000 })).toBe("high");
  });
  it("classifica perda de foco imediata como medium", () => {
    expect(classifyAttempt("Janela perdeu o foco", { msSinceLastKey: 500 })).toBe("medium");
  });
  it("classifica perda de foco após inatividade como low", () => {
    expect(classifyAttempt("Aba perdeu a visibilidade", { msSinceLastKey: 30_000 })).toBe("low");
  });
});

describe("ScreenshotGuard", () => {
  it("renderiza filhos sem quebrar a árvore do chat", () => {
    render(
      <ScreenshotGuard>
        <div data-testid="chat">conversa</div>
      </ScreenshotGuard>,
    );
    expect(screen.getByTestId("chat")).toBeInTheDocument();
    expect(screen.getByTestId("screenshot-guard")).toBeInTheDocument();
  });

  it("dispara onAttempt com severidade high em PrintScreen", () => {
    const spy = vi.fn();
    render(<ScreenshotGuard onAttempt={spy}><div>x</div></ScreenshotGuard>);
    act(() => {
      fireEvent.keyDown(window, { key: "PrintScreen" });
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].severity).toBe("high");
    expect(spy.mock.calls[0][0].reason).toMatch(/PrintScreen/);
  });

  it("dispara onAttempt em atalho Ctrl+Shift+S", () => {
    const spy = vi.fn();
    render(<ScreenshotGuard onAttempt={spy}><div>x</div></ScreenshotGuard>);
    act(() => {
      fireEvent.keyDown(window, { key: "s", ctrlKey: true, shiftKey: true });
    });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0].severity).toBe("high");
  });

  it("borra conteúdo e mostra alerta acessível ao detectar", () => {
    render(<ScreenshotGuard><div data-testid="c">x</div></ScreenshotGuard>);
    act(() => {
      fireEvent.keyDown(window, { key: "PrintScreen" });
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByTestId("guard-content").getAttribute("style") ?? "").toMatch(/blur/);
  });

  it("bloqueia menu de contexto", () => {
    render(<ScreenshotGuard><div>x</div></ScreenshotGuard>);
    const evt = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    const prevented = !document.dispatchEvent(evt);
    expect(prevented).toBe(true);
  });
});

describe("IdentityWatermark", () => {
  it("marca-se como aria-hidden e inclui o apelido", () => {
    const { container } = render(<IdentityWatermark label="Lua Serena" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden");
    expect(root.textContent).toContain("Lua Serena");
    expect(root.textContent).toContain("Desabafa Amigo");
  });
});
