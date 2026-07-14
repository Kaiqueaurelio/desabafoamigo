import { createFileRoute } from "@tanstack/react-router";

// Endpoint chamado por pg_cron uma vez ao dia.
// Autenticação: exige apikey igual ao SUPABASE_PUBLISHABLE_KEY.
export const Route = createFileRoute("/api/public/hooks/daily-maintenance")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );
          const { data, error } = await supabaseAdmin.rpc(
            "run_daily_maintenance",
          );
          if (error) throw error;
          return new Response(
            JSON.stringify({ ok: true, result: data }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("daily-maintenance error:", message);
          return new Response(
            JSON.stringify({ ok: false, error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
