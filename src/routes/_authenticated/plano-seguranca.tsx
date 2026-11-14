import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HeartPulse, Save, ShieldCheck, Phone, Info } from "lucide-react";
import { getMySafetyPlan, saveMySafetyPlan } from "@/lib/crisis.functions";

export const Route = createFileRoute("/_authenticated/plano-seguranca")({
  component: SafetyPlanPage,
});

type Plan = {
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  reasons_to_live: string | null;
  warning_signs: string | null;
  coping_strategies: string | null;
  share_location_with_contact: boolean;
};

const EMPTY: Plan = {
  emergency_contact_name: "",
  emergency_contact_phone: "",
  reasons_to_live: "",
  warning_signs: "",
  coping_strategies: "",
  share_location_with_contact: false,
};

function SafetyPlanPage() {
  const load = useServerFn(getMySafetyPlan);
  const save = useServerFn(saveMySafetyPlan);
  const [plan, setPlan] = useState<Plan>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    load()
      .then((row) => {
        if (!alive || !row) return;
        setPlan({
          emergency_contact_name: row.emergency_contact_name ?? "",
          emergency_contact_phone: row.emergency_contact_phone ?? "",
          reasons_to_live: row.reasons_to_live ?? "",
          warning_signs: row.warning_signs ?? "",
          coping_strategies: row.coping_strategies ?? "",
          share_location_with_contact: !!row.share_location_with_contact,
        });
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [load]);

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: plan });
      toast.success("Plano de segurança salvo. Só você tem acesso.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="size-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Só você vê isto</span>
        </div>
        <h1 className="text-2xl font-semibold">Meu plano de segurança</h1>
        <p className="text-sm text-muted-foreground">
          Um plano de segurança é uma folha de rota para momentos difíceis. Você preenche no seu
          tempo, e ele fica guardado só para você. Voluntários e admins não têm acesso a este
          conteúdo.
        </p>
      </header>

      <section className="rounded-2xl border border-primary/30 bg-brand-soft/40 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-0.5 size-5 text-primary" aria-hidden />
          <div>
            <h2 className="font-medium">Contato de confiança</h2>
            <p className="text-xs text-muted-foreground">
              Quem você gostaria que soubesse se acontecer algo? O app só envia mensagem para essa
              pessoa se <strong>você</strong> apertar o botão de ajuda — nunca automaticamente.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm space-y-1">
            <span className="font-medium">Nome</span>
            <input
              value={plan.emergency_contact_name ?? ""}
              onChange={(e) => setPlan({ ...plan, emergency_contact_name: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex.: Maria (irmã)"
              maxLength={120}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-medium flex items-center gap-1">
              <Phone className="size-3.5" /> Telefone (com DDD)
            </span>
            <input
              value={plan.emergency_contact_phone ?? ""}
              onChange={(e) => setPlan({ ...plan, emergency_contact_phone: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="+55 11 91234-5678"
              inputMode="tel"
              maxLength={30}
            />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={plan.share_location_with_contact}
            onChange={(e) => setPlan({ ...plan, share_location_with_contact: e.target.checked })}
            className="mt-1"
          />
          <span>
            Autorizo que, quando <strong>eu</strong> apertar “Preciso de ajuda agora”, o app abra o
            aplicativo de SMS do meu celular com uma mensagem pronta contendo minha localização
            aproximada para este contato.
          </span>
        </label>
      </section>

      <PlanField
        label="Meus motivos para viver"
        hint="Pessoas, animais, projetos, memórias — qualquer coisa que te lembra por que continuar."
        value={plan.reasons_to_live ?? ""}
        onChange={(v) => setPlan({ ...plan, reasons_to_live: v })}
      />
      <PlanField
        label="Meus sinais de alerta"
        hint="Pensamentos, sensações ou situações que costumam anteceder uma crise."
        value={plan.warning_signs ?? ""}
        onChange={(v) => setPlan({ ...plan, warning_signs: v })}
      />
      <PlanField
        label="Estratégias que me acalmam"
        hint="Respiração, música, caminhar, ligar para alguém — o que já funcionou antes."
        value={plan.coping_strategies ?? ""}
        onChange={(v) => setPlan({ ...plan, coping_strategies: v })}
      />

      <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 text-primary" />
        <p>
          O Desabafo Amigo não substitui atendimento profissional. Em risco imediato, ligue para o
          <a href="tel:188" className="mx-1 font-semibold text-primary underline">
            CVV 188
          </a>
          ou{" "}
          <a href="tel:192" className="mx-1 font-semibold text-primary underline">
            SAMU 192
          </a>
          .
        </p>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={loading || saving}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        <Save className="size-4" /> {saving ? "Salvando..." : "Salvar meu plano"}
      </button>
    </main>
  );
}

function PlanField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-2">
      <label className="block text-sm">
        <span className="font-medium">{label}</span>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          maxLength={2000}
        />
      </label>
    </section>
  );
}
