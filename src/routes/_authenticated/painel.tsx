import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ClipboardList, LogOut, MapPin, Settings, Truck, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { teamSummary } from "@/lib/delivery.functions";
import { restaurantHead } from "@/lib/restaurant";

const summaryQuery = queryOptions({ queryKey: ["matturo-team-summary"], queryFn: () => teamSummary() });

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => restaurantHead("Painel da equipa", "Área privada do Matturo Burger com pedidos, entregas e configurações."),
  loader: ({ context }) => context.queryClient.ensureQueryData(summaryQuery),
  component: PanelHub,
});

function PanelHub() {
  const { data } = useSuspenseQuery(summaryQuery);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const areas = [
    { to: "/pedidos" as const, icon: ClipboardList, title: "Pedidos", text: "Lista ao vivo dos pedidos recebidos, com estados e cancelamentos.", admin: true },
    { to: "/entregas" as const, icon: Truck, title: "Entregas", text: "As suas entregas atribuídas, perfil de estafeta e rastreamento.", admin: false },
    { to: "/configuracoes" as const, icon: Settings, title: "Configurações", text: "Pausar pedidos e gerir zonas de delivery com portes.", admin: true },
  ].filter((a) => !a.admin || data.admin);
  return (
    <div className="page-width py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3 text-xs font-semibold text-primary">MATTURO · EQUIPA</p>
          <h1 className="section-title">Painel da equipa</h1>
          <p className="mt-3 text-sm text-muted-foreground">{data.name ? `Bem-vindo, ${data.name}.` : "Bem-vindo."} Escolha a área que quer gerir.</p>
        </div>
        <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); await qc.cancelQueries(); qc.clear(); await navigate({ to: "/auth", replace: true }); }}><LogOut />Sair</Button>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {areas.map((a) => (
          <Link key={a.to} to={a.to} className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary">
            <a.icon className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{a.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.text}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary">Abrir →</span>
          </Link>
        ))}
      </div>
      <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-4 w-4" />Os clientes acompanham as entregas apenas pelo link privado do pedido.</p>
    </div>
  );
}
