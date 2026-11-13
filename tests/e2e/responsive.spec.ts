import { test, expect, type Page } from "@playwright/test";

/**
 * Testes E2E de responsividade — garantem que nenhuma aba pública
 * gera overflow horizontal em larguras/orientações comuns.
 *
 * Estratégia:
 *  - visita cada rota em um conjunto de viewports (mobile portrait,
 *    mobile landscape, tablet, desktop);
 *  - aguarda o load;
 *  - mede scrollWidth vs clientWidth do documento;
 *  - falha se houver overflow horizontal (> 1px de tolerância);
 *  - captura screenshot para revisão visual.
 *
 * Rotas autenticadas são ignoradas por padrão — o gate redireciona
 * para /auth e o teste valida a própria página de login.
 */

const PUBLIC_ROUTES = [
  { path: "/", name: "landing" },
  { path: "/auth", name: "auth" },
  { path: "/sobre", name: "sobre" },
  { path: "/impacto", name: "impacto" },
  { path: "/privacidade", name: "privacidade" },
  { path: "/seja-voluntario", name: "seja-voluntario" },
  { path: "/pro/cadastro", name: "pro-cadastro" },
  { path: "/offline", name: "offline" },
  { path: "/admin/login", name: "admin-login" },
];

const VIEWPORTS = [
  { name: "mobile-portrait-320", width: 320, height: 640 },
  { name: "mobile-portrait-360", width: 360, height: 780 },
  { name: "mobile-landscape-780", width: 780, height: 360 },
  { name: "tablet-portrait-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-wide-1920", width: 1920, height: 1080 },
];

const OVERFLOW_TOLERANCE_PX = 1;

async function measureOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const docOverflow = doc.scrollWidth - doc.clientWidth;
    const bodyOverflow = body.scrollWidth - body.clientWidth;

    // Detecta elementos individuais que ultrapassam a largura do viewport
    const vw = doc.clientWidth;
    const offenders: Array<{ tag: string; cls: string; width: number; left: number; right: number }> = [];
    const all = document.body.querySelectorAll<HTMLElement>("*");
    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && (rect.right > vw + 1 || rect.left < -1)) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 120),
          width: Math.round(rect.width),
          right: Math.round(rect.right),
        });
        if (offenders.length >= 5) break;
      }
    }

    return { docOverflow, bodyOverflow, vw, offenders };
  });
}

for (const viewport of VIEWPORTS) {
  test.describe(`viewport ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of PUBLIC_ROUTES) {
      test(`sem overflow horizontal em ${route.name}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));

        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        // pequeno wait para animações/framer-motion assentarem
        await page.waitForTimeout(300);

        const result = await measureOverflow(page);

        await testInfo.attach(`${route.name}-${viewport.name}.png`, {
          body: await page.screenshot({ fullPage: false }),
          contentType: "image/png",
        });

        expect(
          result.docOverflow,
          `document overflow=${result.docOverflow}px em ${route.path} @ ${viewport.name}. Offenders: ${JSON.stringify(result.offenders)}`
        ).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);

        expect(
          result.bodyOverflow,
          `body overflow=${result.bodyOverflow}px em ${route.path} @ ${viewport.name}`
        ).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);

        expect(errors, `runtime errors: ${errors.join(" | ")}`).toHaveLength(0);
      });
    }
  });
}


const AUTHENTICATED_ROUTES = [
  { path: "/inicio", name: "inicio" },
  { path: "/ia", name: "amigo-ia" },
  { path: "/conversar", name: "fila-voluntario" },
  { path: "/consultas", name: "minhas-conversas" },
  { path: "/diario", name: "diario" },
  { path: "/apoio", name: "apoio" },
  { path: "/minha-privacidade", name: "privacidade-autenticada" },
  { path: "/configuracoes", name: "configuracoes" },
];

const AUTH_VIEWPORTS = [
  { name: "phone-320", width: 320, height: 640 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

// Configure E2E_AUTH_STORAGE_STATE with a Playwright storage-state file to
// exercise protected routes as a real signed-in user in CI or locally.
for (const viewport of AUTH_VIEWPORTS) {
  test.describe(`rotas autenticadas — ${viewport.name}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      storageState: process.env.E2E_AUTH_STORAGE_STATE || undefined,
    });
    test.skip(!process.env.E2E_AUTH_STORAGE_STATE, "Configure E2E_AUTH_STORAGE_STATE para validar páginas autenticadas.");

    for (const route of AUTHENTICATED_ROUTES) {
      test(`sem overflow e com rolagem utilizável em ${route.name}`, async ({ page }, testInfo) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(350);

        const result = await measureOverflow(page);
        await testInfo.attach(`${route.name}-${viewport.name}.png`, {
          body: await page.screenshot({ fullPage: false }),
          contentType: "image/png",
        });

        expect(page.url(), "a sessão autenticada deve permanecer na rota protegida").toContain(route.path);
        expect(result.docOverflow, `document overflow em ${route.path}: ${JSON.stringify(result.offenders)}`).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
        expect(result.bodyOverflow).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
        expect(errors, `erros de execução: ${errors.join(" | ")}`).toHaveLength(0);

        if (route.path === "/ia") {
          const composer = page.locator("form").last();
          await expect(composer).toBeVisible();
          await expect(composer.locator("textarea")).toBeVisible();
        }
        if (route.path === "/conversar") {
          await expect(page.getByRole("heading", { name: "Conversar agora" })).toBeVisible();
        }
      });
    }

    if (process.env.E2E_TEST_APPOINTMENT_ID) {
      test("chat com voluntário sem overflow e com compositor visível", async ({ page }) => {
        const appointmentPath = `/consulta/${process.env.E2E_TEST_APPOINTMENT_ID}`;
        await page.goto(appointmentPath, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
        const result = await measureOverflow(page);
        expect(page.url()).toContain(appointmentPath);
        expect(result.docOverflow, JSON.stringify(result.offenders)).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
        await expect(page.locator("form textarea")).toBeVisible();
      });
    }
  });
}
\ntest.describe("smoke visual — landing", () => {
  test("landing renderiza herói e CTA em mobile", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
