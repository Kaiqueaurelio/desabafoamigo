# Testes E2E de responsividade

Suíte Playwright que valida, em várias larguras e orientações, que nenhuma aba
pública do app introduz overflow horizontal ou erros de runtime.

## Rodar localmente

```bash
# instala os browsers do Playwright uma única vez
bunx playwright install --with-deps chromium webkit

# roda a suíte inteira (sobe o dev server automaticamente)
bun run test:e2e

# roda em modo UI para debugar
bun run test:e2e:ui

# apenta um viewport/rota
bunx playwright test -g "landing" --project=chromium-mobile
```

## O que é validado

- `scrollWidth - clientWidth <= 1px` em `<html>` e `<body>`
- Lista dos 5 primeiros elementos que ultrapassam a viewport (para debug)
- Nenhum `pageerror` de runtime
- Screenshot anexado a cada teste (visível no HTML report)

## Viewports cobertos

| Nome                  | Largura | Altura |
| --------------------- | ------- | ------ |
| mobile-portrait-320   | 320     | 640    |
| mobile-portrait-360   | 360     | 780    |
| mobile-landscape-780  | 780     | 360    |
| tablet-portrait-768   | 768     | 1024   |
| tablet-landscape-1024 | 1024    | 768    |
| desktop-1280          | 1280    | 800    |
| desktop-wide-1920     | 1920    | 1080   |

## Rotas cobertas

Apenas rotas públicas — rotas sob `_authenticated/` e `/admin/*` (fora do
login) são gateadas e redirecionam para `/auth`. Para incluí-las, seria
preciso injetar uma sessão Supabase antes do `page.goto`.

## Adicionar uma rota nova

Edite `PUBLIC_ROUTES` em `responsive.spec.ts`.

## CI

O workflow `.github/workflows/e2e.yml` roda esta suíte em cada PR e publica
o HTML report como artifact.
