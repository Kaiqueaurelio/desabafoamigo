import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agendar/$id")({
  component: Book,
});

function Book() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [pro, setPro] = useState<{ full_name: string | null; specialty: string | null } | null>(null);
  const [date, setDate] = useState(() => defaultDate());
  const [time, setTime] = useState("14:00");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("volunteers").select("full_name, specialty").eq("user_id", id).maybeSingle();
      setPro(data);
    })();
  }, [id]);

  const slots = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","19:00","20:00"];

  async function book() {
    setErr("");
    if (!topic.trim()) { setErr("Descreva brevemente o motivo"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const scheduledAt = new Date(`${date}T${time}:00`);

      const { data: appt, error } = await supabase.from("appointments").insert({
        patient_id: u.user.id,
        professional_id: id,
        scheduled_at: scheduledAt.toISOString(),
        topic: topic.trim(),
        status: "scheduled",
      }).select("id").single();
      if (error) throw error;

      // Create conversation linked to appointment
      const { data: conv, error: cErr } = await supabase.from("conversations").insert({
        user_id: u.user.id,
        volunteer_id: id,
        appointment_id: appt.id,
        status: "active",
      }).select("id").single();
      if (cErr) throw cErr;

      await supabase.from("appointments").update({ conversation_id: conv.id }).eq("id", appt.id);
      navigate({ to: "/consulta/$id", params: { id: appt.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link to="/profissionais" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-primary">Agendar conversa</h1>
      {pro && <p className="mt-1 text-sm text-muted-foreground">com <span className="font-medium text-foreground">{pro.full_name}</span>{pro.specialty ? ` · ${pro.specialty}` : ""}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Você conversará com um(a) voluntário(a) treinado(a) em escuta acolhedora. Não é um atendimento psicológico ou médico.
      </p>

      <div className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Data</label>
          <input type="date" value={date} min={defaultDate()} onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Horário</label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button key={s} onClick={() => setTime(s)} type="button"
                className={`rounded-lg border px-3 py-2 text-sm ${time === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">O que gostaria de conversar?</label>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} maxLength={500}
            placeholder="Conte brevemente o que está sentindo."
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button onClick={book} disabled={busy} className="btn-primary inline-flex w-full items-center justify-center gap-2">
          <CalendarClock className="size-4" /> {busy ? "Agendando..." : "Confirmar agendamento"}
        </button>
      </div>
    </div>
  );
}

function defaultDate() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
