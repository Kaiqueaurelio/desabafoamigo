import { supabase } from "@/integrations/supabase/client";

let installed = false;

export function installErrorTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const send = async (message: string, stack?: string, metadata: Record<string, string> = {}) => {
    try {
      const { data } = await supabase.auth.getUser();
      await supabase.from("error_events").insert({
        user_id: data.user?.id ?? null,
        message: message.slice(0, 500),
        stack: stack?.slice(0, 4000) ?? null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: metadata as Record<string, string>,
      });
    } catch {
      /* silent */
    }
  };

  window.addEventListener("error", (e) => {
    send(e.message || "window.error", e.error?.stack, { type: "error" });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    send(
      typeof reason === "string" ? reason : reason?.message || "unhandledrejection",
      reason?.stack,
      { type: "unhandledrejection" },
    );
  });
}
