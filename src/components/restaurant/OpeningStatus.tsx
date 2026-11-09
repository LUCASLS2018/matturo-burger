import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock3 } from "lucide-react";
import { publicSettingsQuery } from "@/lib/settings-query";
import { OPENING_HOURS_SUMMARY } from "@/lib/opening-hours";

export function OpeningStatus() {
  const { data: settings } = useSuspenseQuery(publicSettingsQuery);
  const closed = !settings.isOpen || settings.paused;
  const label = closed ? "FECHADO" : "ABERTO";
  return <div role="status" aria-live="polite" className={`border-t border-border ${closed ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"}`}>
    <div className="page-width flex min-h-9 items-center justify-center gap-2 py-2 text-center text-xs sm:gap-3">
      <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <strong className="shrink-0 tracking-[0.14em]">{label}</strong>
      <span className="hidden sm:inline">·</span>
      <span className="leading-relaxed">{!settings.isOpen ? OPENING_HOURS_SUMMARY : settings.paused ? "Fechado temporariamente pela equipa. Para já não são aceites novos pedidos." : "Já pode fazer o seu pedido."}</span>
    </div>
  </div>;
}
