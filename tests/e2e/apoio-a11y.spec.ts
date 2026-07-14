import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * E2E de acessibilidade para /apoio em celulares (320–390px).
 *
 * Cobre:
 *  - Foco visível: cada CTA principal recebe outline/box-shadow visível
 *    ao ser focado via teclado (WCAG 2.4.7).
 *  - Ordem de navegação: Tab percorre os elementos na ordem visual
 *    (hero → chips de categoria → CTAs do conteúdo), sem tabindex > 0.
 *  - Rótulos ARIA: todo botão/link interativo tem nome acessível
 *    (texto visível ou aria-label), incluindo ícones-only.
 *  - Varredura axe-core (WCAG 2A/2AA) filtrada para regras críticas.
 *
 * Reuso o mesmo padrão de sessão Supabase do apoio-mobile.spec.ts.
 */

const MOBILE_WIDTHS = [
  { name: "iphone-se-320", width: 320, height: 568 },
  { name: "android-360", width: 360, height: 780 },
  { name: "iphone-13-390", width: 390, height: 844 },
];

function getSupabaseCreds() {
  const storageKey =
    process.env.E2E_SUPABASE_STORAGE_KEY ??
    process.env.LOVABLE_BROWSER_SUPABASE_STORAGE_KEY;
  const sessionJson =
    process.env.E2E_SUPABASE_SESSION_JSON ??
    process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
  return { storageKey, sessionJson };
}

async function restoreSession(context: BrowserContext, page: Page) {
  const { storageKey, sessionJson } = getSupabaseCreds();
  if (!storageKey || !sessionJson) return false;
  const cookiesJson =
    process.env.E2E_SUPABASE_COOKIES_JSON ??
    process.env.LOVABLE_BROWSER_SUPABASE_COOKIES_JSON;
  if (cookiesJson) {
    try {
      const cookies = JSON.parse(cookiesJson).map((c: Record<string, unknown>) => ({
        ...c,
        url: "http://localhost:8080",
      }));
      await context.addCookies(cookies);
    } catch {
      /* ignora */
    }
  }
  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: storageKey, value: sessionJson }
  );
  return true;
}

/** Retorna true se o elemento focado tem indicador visível (outline ou box-shadow). */
async function hasVisibleFocusIndicator(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { ok: false, reason: "no focused element" };
    const cs = window.getComputedStyle(el);
    const outlineW = parseFloat(cs.outlineWidth || "0");
    const outlineStyle = cs.outlineStyle;
    const boxShadow = cs.boxShadow;
    const hasOutline = outlineStyle !== "none" && outlineW >= 1;
    const hasShadow = boxShadow && boxShadow !== "none";
    return {
      ok: Boolean(hasOutline || hasShadow),
      reason: `outline=${outlineStyle}/${outlineW}px shadow=${boxShadow?.slice(0, 60)}`,
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || "").trim().slice(0, 40),
    };
  });
}

/** Nome acessível calculado — texto, aria-label, aria-labelledby, ou title. */
async function collectInteractiveNames(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const nodes = Array.from(
      main.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [role="button"]:not([aria-disabled="true"])'
      )
    );
    return nodes.map((el) => {
      const ariaLabel = el.getAttribute("aria-label");
      const labelledby = el.getAttribute("aria-labelledby");
      let name = ariaLabel || "";
      if (!name && labelledby) {
        name = Array.from(
          document.querySelectorAll(
            labelledby
              .split(/\s+/)
              .map((id) => `#${CSS.escape(id)}`)
              .join(",")
          )
        )
          .map((n) => (n.textContent || "").trim())
          .join(" ");
      }
      if (!name) name = (el.textContent || "").trim();
      if (!name) name = el.getAttribute("title") || "";
      const rect = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0;
      return {
        tag: el.tagName.toLowerCase(),
        name: name.slice(0, 60),
        visible,
        tabIndex: el.tabIndex,
      };
    });
  });
}

for (const vp of MOBILE_WIDTHS) {
  test.describe(`/apoio a11y @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ context, page }) => {
      const restored = await restoreSession(context, page);
      if (!restored) {
        test.skip(true, "Sessão Supabase ausente — defina E2E_SUPABASE_STORAGE_KEY/SESSION_JSON");
      }
      await page.goto("/apoio", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      if (new URL(page.url()).pathname.startsWith("/auth")) {
        test.skip(true, "Sessão inválida/expirada — /apoio redirecionou para /auth");
      }
      await page.waitForTimeout(300);
    });

    test("todo CTA visível tem nome acessível (WCAG 4.1.2)", async ({ page }) => {
      const items = await collectInteractiveNames(page);
      const visible = items.filter((i) => i.visible);
      expect(visible.length, "esperava interativos visíveis em /apoio").toBeGreaterThan(0);

      const unnamed = visible.filter((i) => !i.name || i.name.length === 0);
      expect(
        unnamed,
        `Interativos sem nome acessível:\n${JSON.stringify(unnamed, null, 2)}`
      ).toEqual([]);

      const badTabIndex = visible.filter((i) => i.tabIndex > 0);
      expect(
        badTabIndex,
        `tabindex > 0 quebra ordem natural:\n${JSON.stringify(badTabIndex, null, 2)}`
      ).toEqual([]);
    });

    test("Tab percorre CTAs em ordem visual com foco visível (WCAG 2.4.3/2.4.7)", async ({
      page,
    }) => {
      // Foca a partir do topo do documento.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.locator("body").click({ position: { x: 1, y: 1 } });

      const order: Array<{ text: string; top: number }> = [];
      const focusFailures: Array<{ text: string; reason: string }> = [];
      const MAX_TABS = 15;

      for (let i = 0; i < MAX_TABS; i++) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const main = document.querySelector("main");
          if (main && !main.contains(el)) return { skip: true };
          const rect = el.getBoundingClientRect();
          return {
            text: ((el.getAttribute("aria-label") || el.textContent) || "")
              .trim()
              .slice(0, 40),
            top: Math.round(rect.top),
          };
        });
        if (!info) break;
        if ("skip" in info) continue;

        const focus = await hasVisibleFocusIndicator(page);
        if (!focus.ok) {
          focusFailures.push({ text: info.text, reason: focus.reason });
        }
        order.push({ text: info.text, top: info.top });
      }

      expect(order.length, "esperava CTAs focáveis dentro de <main>").toBeGreaterThanOrEqual(3);

      expect(
        focusFailures,
        `CTAs sem foco visível:\n${JSON.stringify(focusFailures, null, 2)}`
      ).toEqual([]);

      // A ordem visual deve ser aproximadamente top-descendente. Contamos regressões grandes.
      let regressions = 0;
      for (let i = 1; i < order.length; i++) {
        if (order[i].top < order[i - 1].top - 40) regressions++;
      }
      expect(
        regressions,
        `Ordem de Tab não segue ordem visual:\n${JSON.stringify(order, null, 2)}`
      ).toBeLessThanOrEqual(1);
    });

    test("axe-core: sem violações críticas de contraste, nome ou role", async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa"])
        .disableRules([
          // ruído comum vindo de wrappers de layout; medimos separadamente
          "region",
          "landmark-one-main",
        ])
        .analyze();

      const critical = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? "")
      );
      const summary = critical.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
      }));
      expect(
        critical,
        `Violações a11y críticas em /apoio:\n${JSON.stringify(summary, null, 2)}`
      ).toEqual([]);
    });
  });
}
