import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePush, type PushConfig } from "@/lib/push";
import { getPushConfig } from "@/lib/push-config.functions";
import { registerCourierDevice } from "@/lib/push.functions";

const FAILED = "Não foi possível ativar os avisos. Tente novamente.";
const copy: Record<string, string> = {
  "not-configured": "Os avisos ainda não estão disponíveis.",
  unsupported: "Este navegador não aceita avisos.",
  "open-in-new-tab": "Abra o site no navegador (fora da pré-visualização) para ativar.",
  denied: "Não permitiu os avisos. Ative-os nas definições do navegador.",
  failed: "Não foi possível ativar os avisos. Tente novamente.",
};

/** Lets a courier get a phone alert whenever a delivery is sent to them. */
export function CourierAlerts() {
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "active">("idle");
  const [error, setError] = useState("");
  useEffect(() => { getPushConfig().then(setConfig).catch(() => setConfig(null)); }, []);

  async function activate() {
    setState("busy"); setError("");
    const result = await enablePush(config);
    if (result.status === "registered" && result.token) {
      try { await registerCourierDevice({ data: { token: result.token } }); setState("active"); return; }
      catch (cause) { setError(cause instanceof Error ? cause.message : FAILED); }
    } else setError(copy[result.status] ?? FAILED);
    setState("idle");
  }

  return <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
    <BellRing className="h-4 w-4 text-primary" />
    <p className="text-sm">{state === "active" ? "Avisos ativos: vai ser notificado quando receber um pedido." : "Receba um aviso no telemóvel quando lhe enviarem um pedido."}</p>
    {state !== "active" && <Button size="sm" className="ml-auto" disabled={state === "busy"} onClick={activate}>{state === "busy" ? "A ativar…" : "Ativar avisos"}</Button>}
    {error && <p className="w-full text-sm text-destructive">{error}</p>}
  </div>;
}
