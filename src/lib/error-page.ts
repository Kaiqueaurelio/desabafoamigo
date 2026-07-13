export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Oops! Algo deu errado</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root { color-scheme: light dark; }
      body { font: 15px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6fbf8; color: #10201a; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 30rem; width: 100%; text-align: center; padding: 2rem; }
      .mark { width: 3rem; height: 3rem; border-radius: 999px; display: grid; place-items: center; margin: 0 auto 1rem; background: #dff5e8; color: #166534; font-size: 1.5rem; }
      h1 { font-size: clamp(1.55rem, 4vw, 2rem); line-height: 1.15; margin: 0 0 0.75rem; }
      p { color: #475569; margin: 0 auto 1.25rem; max-width: 24rem; }
      .actions { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
      a, button { padding: 0.75rem 1rem; border-radius: 0.75rem; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; border: 1px solid transparent; min-width: 9.5rem; }
      .primary { background: #166534; color: #fff; box-shadow: 0 10px 24px rgba(22,101,52,.18); }
      .secondary { background: #fff; color: #10201a; border-color: #cbd5e1; }
      .support { margin-top: 1.25rem; font-size: .875rem; color: #64748b; }
      @media (prefers-color-scheme: dark) {
        body { background: #071511; color: #ecfdf5; }
        .mark { background: rgba(34,197,94,.16); color: #86efac; }
        p { color: #b6c7be; }
        .secondary { background: #0f241c; color: #ecfdf5; border-color: #234236; }
        .support { color: #8fb3a4; }
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="mark" aria-hidden="true">!</div>
      <h1>Oops! Algo deu errado.</h1>
      <p>Lamentamos, mas não foi possível carregar esta página.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Tentar novamente</button>
        <a class="secondary" href="/">Voltar ao início</a>
      </div>
      <p class="support">Se o problema persistir, por favor, entre em contato com nosso suporte.</p>
    </div>
  </body>
</html>`;
}
