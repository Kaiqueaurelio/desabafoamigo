import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createLiveVoiceAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { consent?: boolean }) => {
    if (data?.consent !== true) {
      throw new Error("É necessário consentir com o processamento por IA para usar a voz ao vivo.");
    }
    return { consent: true as const };
  })
  .handler(async ({ context }) => {
    const [{ getServerEnv }, { createLiveVoiceTicket }] = await Promise.all([
      import("./server-env"),
      import("./live-voice-auth"),
    ]);
    const secret = getServerEnv("LOVABLE_API_KEY");
    if (!secret) throw new Error("A voz ao vivo não está configurada no momento.");
    return { ticket: await createLiveVoiceTicket(context.userId, secret) };
  });
