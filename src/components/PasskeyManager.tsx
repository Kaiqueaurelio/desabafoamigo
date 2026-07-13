import { useEffect, useState } from "react";
import { KeyRound, Trash2, Loader2, ShieldCheck, Plus } from "lucide-react";
import {
  isPasskeySupported,
  registerPasskey,
} from "@/lib/passkeys";
import { deleteMyPasskey, listMyPasskeys } from "@/lib/passkeys.functions";

type Cred = {
  id: string;
  device_name: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  device_type: string | null;
  backed_up: boolean;
};

export function PasskeyManager({ scope }: { scope: "admin" | "pro" | "user" }) {
  const supported = isPasskeySupported();
  const [creds, setCreds] = useState<Cred[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const { credentials } = await listMyPasskeys();
      setCreds(credentials.filter((c) => c.scope === scope) as Cred[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [scope]);

  async function add() {
    setError(null);
    setOk(null);
    setBusy(true);
    try {
      const deviceName = name.trim() || defaultDeviceName();
      await registerPasskey({ scope, deviceName });
      setName("");
      setOk("Chave de acesso cadastrada com sucesso.");
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover esta chave de acesso? Você precisará usar o código de 6 dígitos até cadastrar outra.")) return;
    setBusy(true);
    try {
      await deleteMyPasskey({ data: { id } });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Chaves de acesso estão temporariamente indisponíveis. Para manter sua conta segura,
        use senha + código de 6 dígitos enquanto finalizamos essa opção.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-soft p-2 text-primary">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Chaves de acesso</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre biometria (impressão digital, Face ID, Windows Hello) ou uma chave física para
            entrar sem digitar o código de 6 dígitos.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultDeviceName()}
          maxLength={60}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          disabled={busy}
        />
        <button onClick={add} disabled={busy} className="btn-primary inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Cadastrar
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && (
        <p className="inline-flex items-center gap-1 text-sm text-emerald-600">
          <ShieldCheck className="h-4 w-4" /> {ok}
        </p>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : creds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma chave cadastrada ainda.</p>
        ) : (
          creds.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.device_name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.device_type === "multiDevice" ? "Sincronizada" : "Ligada a este dispositivo"} •
                  cadastrada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  {c.last_used_at ? ` • último uso ${new Date(c.last_used_at).toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remover chave"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function defaultDeviceName() {
  if (typeof navigator === "undefined") return "Chave de acesso";
  const ua = navigator.userAgent;
  if (/iPhone|iPad/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua)) return "Mac (Touch ID)";
  if (/Windows/i.test(ua)) return "Windows Hello";
  return "Este dispositivo";
}

function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/NotAllowedError|cancel|abort/i.test(msg))
    return "Cadastro cancelado. Tente novamente e conclua a verificação biométrica.";
  if (/InvalidStateError/i.test(msg))
    return "Esta chave já está cadastrada neste dispositivo.";
  return msg || "Falha ao cadastrar a chave.";
}
