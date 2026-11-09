import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { enablePush, pushConfigured, type PushStatus } from "@/lib/push";
import { registerPushDevice } from "@/lib/push.functions";

const copy: Record<PushStatus, string> = {
  registered: "Avisos ativos. Vai receber uma notícia em cada novidade do pedido.",
  "not-configured": "Os avisos ainda não estão disponíveis neste site.",
  unsupported: "Este navegador não aceita avisos no telemóvel.",
  "open-in-new-tab": "Abra esta página no seu navegador (fora da pré-visualização) para ativar os avisos.",
  denied: "Não permitiu os avisos. Ative-os nas definições do navegador e tente de novo.",
  failed: "Não foi possível ativar os avisos. Tente novamente.",
};

/**
 * Lets the customer opt in to phone alerts for this order. The browser only asks for
 * permission from a real click, so the button is the whole flow.
 */
export function OrderAlerts({ orderToken, path }: { orderToken: string; path: string }) {
  const [state, setState] = useState<"idle" | "busy" | "active" | "error">("idle");
  const [message, setMessage] = useState("");

  async function activate() {
    setState("busy");
    const result = await enablePush();
    if (result.status === "registered" && result.token) {
      try {
        await registerPushDevice({ data: { token: result.token, orderToken, path } });
        setState("active");
        setMessage(copy.registered);
      } catch {
        setState("error");
        setMessage("Não foi possível ligar os avisos a este pedido. Tente novamente.");
      }
      return;
    }
    setState("error");
    setMessage(copy[result.status]);
  }

  if (!pushConfigured()) return null;

  return (
    <section className="mt-8 rounded-lg border border-border bg-card p-4">
      <p className="flex items-center gap-2 font-semibold">
        <BellRing className="h-4 w-4 text-primary" />
        Avisos no telemóvel
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Recebe uma notícia sempre que o pedido muda, mesmo com esta página fechada.
      </p>
      {state === "active" ? (
        <p className="mt-3 text-sm font-medium text-primary">{message}</p>
      ) : (
        <Button className="mt-3" size="sm" onClick={activate} disabled={state === "busy"}>
          {state === "busy" ? "A ativar…" : "Ativar avisos"}
        </Button>
      )}
      {state === "error" && <p className="mt-2 text-sm text-destructive">{message}</p>}
    </section>
  );
}
