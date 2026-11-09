import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminLoyalty } from "@/lib/orders.functions";
import { restaurantHead } from "@/lib/restaurant";

const loyaltyQuery = queryOptions({ queryKey: ["matturo-admin-loyalty"], queryFn: () => adminLoyalty() });

export const Route = createFileRoute("/_authenticated/fidelizacao")({
  head: () => restaurantHead("Fidelização", "Pontos de fidelização dos clientes Matturo Burger."),
  loader: ({ context }) => context.queryClient.ensureQueryData(loyaltyQuery),
  errorComponent: () => <div className="page-width py-16"><h1 className="section-title">Acesso indisponível</h1><p className="mt-4">Esta área exige acesso de administrador.</p><Button asChild className="mt-6"><Link to="/painel">Voltar ao painel</Link></Button></div>,
  component: LoyaltyPage,
});

function LoyaltyPage() {
  const { data } = useSuspenseQuery(loyaltyQuery);
  const redeemed = data.reduce((s, c) => s + c.redemptions.filter((r) => !r.cancelled).length, 0);
  return (
    <div className="page-width py-12">
      <Link to="/painel" className="text-sm text-primary">← Painel</Link>
      <h1 className="section-title mt-3">Fidelização</h1>
      <p className="mt-3 text-sm text-muted-foreground">Cada 1 € gasto em produtos (pedidos concluídos, sem portes) = 1 ponto. Aos 100 pontos o cliente resgata um Hamburguinho grátis e os 100 pontos são debitados.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Telemóveis de clientes</p><p className="text-2xl font-bold">{data.length}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Prontos a resgatar</p><p className="text-2xl font-bold">{data.filter((c) => c.available >= 100).length}</p></div>
        <div className="rounded-lg border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Hamburguinhos resgatados</p><p className="text-2xl font-bold">{redeemed}</p></div>
      </div>
      <ul className="mt-6 space-y-3">
        {data.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold">{c.name}</p><p className="text-sm text-muted-foreground">{c.phone}</p></div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{c.available} pts</p>
                <p className="text-xs text-muted-foreground">Ganhos {c.earned} · Usados {c.spent}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{ width: `${Math.min(100, c.available)}%` }} /></div>
            {c.available >= 100 && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-primary"><Gift className="h-3 w-3" />Pode resgatar um Hamburguinho grátis</p>}
            {c.redemptions.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Resgates: {c.redemptions.map((r) => `#${r.number} (${new Date(r.at).toLocaleDateString("pt-PT")}${r.cancelled ? ", cancelado — pontos devolvidos" : ""})`).join(" · ")}</p>}
          </li>
        ))}
        {!data.length && <li className="text-sm text-muted-foreground">Ainda não há pedidos de clientes.</li>}
      </ul>
    </div>
  );
}
