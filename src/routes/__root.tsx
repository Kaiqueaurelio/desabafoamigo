import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { SkipLink } from "@/components/SkipLink";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { applyA11yPrefs, loadA11yPrefs } from "@/lib/a11y";
import { applyTheme, loadTheme, watchSystemTheme } from "@/lib/theme";

const ORG_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Desabafa Amigo",
  url: "https://desabaoamigo.lovable.app",
  logo: "https://desabaoamigo.lovable.app/favicon.png",
  description:
    "Escuta acolhedora anônima por voluntários treinados, via mensagens de texto.",
  sameAs: [],
});



function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Página não encontrada.</p>
        <Link to="/" className="mt-6 inline-block btn-primary">Voltar ao início</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 btn-primary"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Desabafa Amigo — sua voz merece ser ouvida" },
      { name: "description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { name: "theme-color", content: "#0F2A47" },
      { property: "og:title", content: "Desabafa Amigo — sua voz merece ser ouvida" },
      { property: "og:description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "referrer", content: "no-referrer" },
      { httpEquiv: "Content-Security-Policy", content: "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.cdnfonts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.dicebear.com https://*.lovable.app https://*.lovable.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { httpEquiv: "Permissions-Policy", content: "camera=(), microphone=(self), geolocation=()" },
      { name: "twitter:title", content: "Desabafa Amigo — sua voz merece ser ouvida" },
      { name: "twitter:description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4474fd7c-b298-4d57-981c-07e48bc5070a/id-preview-889889cc--ce27e131-caf6-49a0-96ff-b49e0b0eee10.lovable.app-1783809047965.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4474fd7c-b298-4d57-981c-07e48bc5070a/id-preview-889889cc--ce27e131-caf6-49a0-96ff-b49e0b0eee10.lovable.app-1783809047965.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: "https://fonts.cdnfonts.com/css/opendyslexic" },

    ],
    scripts: [
      { type: "application/ld+json", children: ORG_JSONLD },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const themeInit = `try{var t=localStorage.getItem('desabafo:theme');var d=t==='dark'||((!t||t==='auto')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}`;
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <SkipLink />
        {children}
        <Toaster position="top-center" richColors closeButton />
        <Scripts />
      </body>
    </html>
  );
}


function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    applyA11yPrefs(loadA11yPrefs());
    applyTheme(loadTheme());
    const unwatch = watchSystemTheme();
    import("@/lib/errorTracking").then((m) => m.installErrorTracking()).catch(() => {});
    import("@/lib/pwa-register").then((m) => m.registerPwa()).catch(() => {});


    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => { data.subscription.unsubscribe(); unwatch(); };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
