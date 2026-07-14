import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * E2E de safe-area para /apoio (320–390px).
 *
 * Valida que nenhum CTA visível dentro de <main> é coberto por:
 *   - <nav aria-label="Navegação principal"> (bottom nav mobile)
 *   - Botão flutuante de emergência (fixo, canto inferior direito)
 *
 * Simulação de safe-area:
 *   Chromium headless resolve env(safe-area-inset-*) como 0. Para simular o
 *   notch do iPhone (~34px) e a gesture bar do Android (~24px), injetamos
 *   padding extra nos elementos fixos inferiores e reexecutamos a checagem
 *   de sobreposição. Se o layout respeita safe-area corretamente, o <main>
 *   já reserva espaço suficiente (pb-[calc(env(...) + 7rem)]), mas como env
 *   é 0 no headless, forçamos o pior caso adicionando padding equivalente.
 */

const MOBILE_WIDTHS = [
  { name: "iphone-se-320", width: 320, height: 568, safeBottom: 20 },
  { name: "android-360", width: 360, height: 780, safeBottom: 24 },
  { name: "iphone-13-390", width: 390, height: 844, safeBottom: 34 },
];

const CATEGORIES = ["tecnicas", "audios", "frases", "imagens", "emergencia"] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], RegExp> = {
  tecnicas: /Técnicas/i,
  audios: /Áudios/i,
  frases: /Frases/i,
  imagens: /Imagens/i,
  emergencia: /Emergência/i,
};

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

/**
 * Simula safe-area injetando padding-bottom equivalente em elementos fixos
 * inferiores. Também injeta um "phantom" para representar o home indicator
 * (barra branca do iPhone) ocupando a área inferior da tela.
 */
async function simulateSafeArea(page: Page, safeBottom: number) {
  await page.addStyleTag({
    content: `
      :root { --sim-safe-bottom: ${safeBottom}px; }
      nav[aria-label="Navegação principal"] {
        padding-bottom: calc(var(--sim-safe-bottom) + env(safe-area-inset-bottom, 0px)) !important;
      }
      /* home indicator/gesture bar reservada pelo SO */
      body::after {
        content: "";
        position: fixed;
        left: 0; right: 0; bottom: 0;
        height: var(--sim-safe-bottom);
        background: transparent;
        pointer-events: none;
        z-index: 2147483647;
      }
    `,
  });
}

/** Retorna os rects dos overlays inferiores fixos (bottom nav + botão SOS). */
async function getBottomOverlays(page: Page) {
  return page.evaluate(() => {
    const rects: Array<{ label: string; top: number; bottom: number; left: number; right: number }> = [];
    const nav = document.querySelector('nav[aria-label="Navegação principal"]') as HTMLElement | null;
    if (nav && getComputedStyle(nav).display !== "none") {
      const r = nav.getBoundingClientRect();
      rects.push({ label: "bottom-nav", top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
    // botão de emergência (colapsado ou expandido). Marcado por aria-label
    // contendo "emergência" / "Preciso de ajuda" ou pelo texto "SOS".
    const sos = Array.from(document.querySelectorAll<HTMLElement>('[class*="fixed"]')).filter((el) => {
      const t = (el.innerText || "").toLowerCase();
      const a = (el.getAttribute("aria-label") || "").toLowerCase();
      return /sos|ajuda urgente|188|emergência/.test(t + " " + a);
    });
    for (const el of sos) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        rects.push({ label: "sos", top: r.top, bottom: r.bottom, left: r.left, right: r.right });
      }
    }
    return rects;
  });
}

function overlaps(
  a: { top: number; bottom: number; left: number; right: number },
  b: { top: number; bottom: number; left: number; right: number },
) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function assertNoCtaCovered(page: Page, viewport: { width: number; height: number }) {
  const overlays = await getBottomOverlays(page);
  const ctas = page.locator("main a, main button").filter({ hasText: /.+/ });
  const count = await ctas.count();
  expect(count, "Deve existir ao menos 1 CTA em <main>").toBeGreaterThan(0);

  const covered: string[] = [];
  for (let i = 0; i < count; i++) {
    const el = ctas.nth(i);
    if (!(await el.isVisible())) continue;
    const box = await el.boundingBox();
    if (!box) continue;
    // Só nos importa CTAs efetivamente dentro da viewport visível.
    if (box.top > viewport.height || box.top + box.height < 0) continue;

    const rect = { top: box.y, bottom: box.y + box.height, left: box.x, right: box.x + box.width };
    for (const ov of overlays) {
      if (overlaps(rect, ov)) {
        const text = (await el.innerText().catch(() => "")).slice(0, 40);
        covered.push(`"${text}" coberto por ${ov.label} (cta.bottom=${Math.round(rect.bottom)}, ov.top=${Math.round(ov.top)})`);
        break;
      }
    }
  }

  expect(
    covered,
    `CTAs cobertos pela nav inferior ou pelo botão de emergência:\n  - ${covered.join("\n  - ")}`,
  ).toHaveLength(0);
}

for (const vp of MOBILE_WIDTHS) {
  test.describe(`/apoio safe-area @ ${vp.name} (safeBottom=${vp.safeBottom}px)`, () => {
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
      await simulateSafeArea(page, vp.safeBottom);
      await page.waitForTimeout(200);
    });

    test("main reserva pelo menos 7rem + safe-area no padding inferior", async ({ page }) => {
      const info = await page.evaluate(() => {
        const main = document.querySelector("main");
        if (!main) return null;
        const cs = getComputedStyle(main);
        return {
          paddingBottom: parseFloat(cs.paddingBottom),
          className: main.className,
        };
      });
      expect(info, "elemento <main> deve existir").not.toBeNull();
      // 7rem = 112px. safe-area em Chromium headless resolve como 0,
      // então o mínimo garantido é 112px.
      expect(info!.paddingBottom, `padding-bottom=${info!.paddingBottom}px < 112`).toBeGreaterThanOrEqual(112);
    });

    test("bottom nav não cobre nenhum CTA (aba Técnicas)", async ({ page }) => {
      await page.getByRole("button", { name: CATEGORY_LABELS.tecnicas }).first().click();
      await page.waitForTimeout(150);
      // Rola até o fim para forçar o pior cenário
      await page.evaluate(() => {
        const main = document.querySelector("main");
        main?.scrollTo({ top: main.scrollHeight, behavior: "instant" as ScrollBehavior });
      });
      await page.waitForTimeout(150);
      await assertNoCtaCovered(page, vp);
    });

    test("botão de emergência não cobre o CTA 'Ligar para CVV'", async ({ page }) => {
      await page.getByRole("button", { name: CATEGORY_LABELS.emergencia }).first().click();
      await page.waitForTimeout(150);

      const ligarCvv = page.getByRole("link", { name: /Ligar para CVV/i });
      await expect(ligarCvv).toBeVisible();
      const box = await ligarCvv.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      const overlays = await getBottomOverlays(page);
      const rect = { top: box.y, bottom: box.y + box.height, left: box.x, right: box.x + box.width };
      for (const ov of overlays) {
        expect(
          overlaps(rect, ov),
          `Botão "Ligar para CVV" está coberto por ${ov.label} (cta.bottom=${Math.round(rect.bottom)}, ov.top=${Math.round(ov.top)})`,
        ).toBe(false);
      }
    });

    test("nenhum CTA coberto em nenhuma categoria após simular safe-area", async ({ page }) => {
      for (const cat of CATEGORIES) {
        await page.getByRole("button", { name: CATEGORY_LABELS[cat] }).first().click();
        await page.waitForTimeout(150);
        await page.evaluate(() => {
          const main = document.querySelector("main");
          main?.scrollTo({ top: main.scrollHeight, behavior: "instant" as ScrollBehavior });
        });
        await page.waitForTimeout(120);
        await assertNoCtaCovered(page, vp);
      }
    });
  });
}
