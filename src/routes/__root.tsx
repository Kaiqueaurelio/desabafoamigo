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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Desabafa Amigo — sua voz merece ser ouvida" },
      { name: "description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { name: "theme-color", content: "#0F2A47" },
      { property: "og:title", content: "Desabafa Amigo — sua voz merece ser ouvida" },
      { property: "og:description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "referrer", content: "no-referrer" },
      { httpEquiv: "Content-Security-Policy", content: "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.dicebear.com https://*.lovable.app https://*.lovable.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      { httpEquiv: "X-Content-Type-Options", content: "nosniff" },
      { httpEquiv: "Permissions-Policy", content: "camera=(), microphone=(self), geolocation=()" },
      { name: "twitter:title", content: "Desabafa Amigo — sua voz merece ser ouvida" },
      { name: "twitter:description", content: "Um espaço confiável para conversar por mensagem com voluntários treinados em escuta acolhedora. Seu apelido é gerado pelo app — sua identidade fica protegida." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4474fd7c-b298-4d57-981c-07e48bc5070a/id-preview-889889cc--ce27e131-caf6-49a0-96ff-b49e0b0eee10.lovable.app-1783809047965.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4474fd7c-b298-4d57-981c-07e48bc5070a/id-preview-889889cc--ce27e131-caf6-49a0-96ff-b49e0b0eee10.lovable.app-1783809047965.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
