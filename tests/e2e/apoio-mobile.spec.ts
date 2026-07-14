import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * E2E específico para /apoio em celulares (320–390px).
 *
 * Cobre:
 *  - zero overflow horizontal no documento e nos filhos de <main>
 *  - hero e chips de categoria visíveis e interativos
 *  - troca de aba (Técnicas, Áudios, Frases, Imagens, Emergência) funcional
 *  - CTAs principais têm hitbox >= 44px (WCAG 2.5.5) e ficam dentro da viewport
 *  - botão "Ligar 188" da aba Emergência é totalmente clicável
 *
 * A rota é gateada por auth. Para rodar, exporte:
 *   E2E_SUPABASE_STORAGE_KEY   (ex.: sb-yczvbygxizzjzqvufocy-auth-token)
 *   E2E_SUPABASE_SESSION_JSON  (JSON completo da sessão Supabase)
 * ou defina LOVABLE_BROWSER_SUPABASE_* (auto-injetado no sandbox Lovable).
 *
 * Sem essas variáveis, os testes são pulados com mensagem clara — assim a
 * suíte não quebra CI em ambientes sem credenciais gerenciadas.
 */

const MOBILE_WIDTHS = [
  { name: "iphone-se-320", width: 320, height: 568 },
  { name: "android-360", width: 360, height: 780 },
  { name: "iphone-13-390", width: 390, height: 844 },
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

  // Cookies (@supabase/ssr) — se disponíveis, também restauram
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
      /* ignora cookies malformados */
    }
  }

  await page.goto("http://localhost:8080", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: storageKey, value: sessionJson }
  );
  return true;
}

async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const vw = doc.clientWidth;
    const offenders: Array<{ tag: string; cls: string; right: number; width: number }> = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > vw + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 140),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
        if (offenders.length >= 5) break;
      }
    }
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      bodyOverflow: body.scrollWidth - body.clientWidth,
      bodyWidth: body.getBoundingClientRect().width,
      mainWidth: document.querySelector("main")?.getBoundingClientRect().width ?? null,
      vw,
      offenders,
    };
  });
}

for (const vp of MOBILE_WIDTHS) {
  test.describe(`/apoio @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test.beforeEach(async ({ context, page }) => {
      const restored = await restoreSession(context, page);
      if (!restored) {
        test.skip(true, "Sessão Supabase ausente — defina E2E_SUPABASE_STORAGE_KEY/SESSION_JSON para rodar");
      }
      await page.goto("/apoio", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      // Se o gate redirecionou para /auth, pula com mensagem clara.
      if (new URL(page.url()).pathname.startsWith("/auth")) {
        test.skip(true, "Sessão inválida/expirada — /apoio redirecionou para /auth");
      }
      await page.waitForTimeout(300);
    });

    test("hero e chips renderizam sem overflow", async ({ page }, testInfo) => {
      await expect(page.getByRole("heading", { name: /Central de Apoio/i })).toBeVisible();

      // Chips visíveis (o container é scroll-x com snap em mobile)
      for (const cat of CATEGORIES) {
        await expect(page.getByRole("button", { name: CATEGORY_LABELS[cat] }).first()).toBeVisible();
      }

      const result = await measureOverflow(page);
      await testInfo.attach(`apoio-${vp.name}.png`, {
        body: await page.screenshot({ fullPage: false }),
        contentType: "image/png",
      });

      expect(
        result.docOverflow,
        `document overflow=${result.docOverflow}px. Offenders: ${JSON.stringify(result.offenders)}`
      ).toBeLessThanOrEqual(1);
      expect(result.bodyOverflow, `body overflow=${result.bodyOverflow}px`).toBeLessThanOrEqual(1);
      expect(result.bodyWidth, `body width=${result.bodyWidth}px maior que viewport=${result.vw}px`).toBeLessThanOrEqual(result.vw + 1);
      expect(result.mainWidth, `main width=${result.mainWidth}px maior que viewport=${result.vw}px`).toBeLessThanOrEqual(result.vw + 1);
    });

    test("troca entre todas as categorias sem quebrar layout", async ({ page }) => {
      for (const cat of CATEGORIES) {
        await page.getByRole("button", { name: CATEGORY_LABELS[cat] }).first().click();
        await page.waitForTimeout(150);
        const result = await measureOverflow(page);
        expect(
          result.docOverflow,
          `overflow após abrir "${cat}": ${result.docOverflow}px. Offenders: ${JSON.stringify(result.offenders)}`
        ).toBeLessThanOrEqual(1);
      }
    });

    test("CTA 'Começar agora' em Técnicas é visível e tem hitbox >= 44px", async ({ page }) => {
      await page.getByRole("button", { name: CATEGORY_LABELS.tecnicas }).first().click();
      const cta = page.getByRole("link", { name: /Começar agora/i });
      await expect(cta).toBeVisible();

      const box = await cta.boundingBox();
      expect(box, "CTA deve ter bounding box").not.toBeNull();
      if (!box) return;

      expect(box.height, `hitbox height=${box.height}px < 44 (WCAG 2.5.5)`).toBeGreaterThanOrEqual(44);
      expect(box.x, "CTA vazando à esquerda").toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `CTA vazando à direita (right=${box.x + box.width}, vw=${vp.width})`).toBeLessThanOrEqual(vp.width + 1);
    });

    test("Emergência: botão 'Ligar 188' totalmente visível e clicável", async ({ page }) => {
      await page.getByRole("button", { name: CATEGORY_LABELS.emergencia }).first().click();

      const ligarCvv = page.getByRole("link", { name: /Ligar para CVV/i });
      await expect(ligarCvv).toBeVisible();

      const box = await ligarCvv.boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
      expect(box.x).toBeGreaterThanOrEqual(0);

      // href tel: correto
      await expect(ligarCvv).toHaveAttribute("href", /^tel:188$/);
    });

    test("todos os CTAs interativos ficam dentro da viewport", async ({ page }) => {
      const interactive = page.locator("main a, main button").filter({ hasText: /.+/ });
      const count = await interactive.count();
      expect(count).toBeGreaterThan(0);

      const offenders: string[] = [];
      for (let i = 0; i < count; i++) {
        const el = interactive.nth(i);
        if (!(await el.isVisible())) continue;
        const box = await el.boundingBox();
        if (!box) continue;
        if (box.x < -0.5 || box.x + box.width > vp.width + 1) {
          const text = (await el.innerText().catch(() => "")).slice(0, 40);
          offenders.push(`"${text}" [x=${Math.round(box.x)}, w=${Math.round(box.width)}]`);
        }
      }
      expect(offenders, `CTAs fora da viewport: ${offenders.join(" | ")}`).toHaveLength(0);
    });
  });
}
