import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gift, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { guestLoyalty, leaveGuestLoyalty } from "@/lib/loyalty.functions";
import { restaurantHead } from "@/lib/restaurant";
import { PhoneAccountForm } from "@/components/restaurant/PhoneAccountForm";

const pointsQuery = queryOptions({ queryKey: ["matturo-guest-loyalty"], queryFn: () => guestLoyalty(), staleTime: 0 });
export const Route = createFileRoute("/pontos")({
  head: () => restaurantHead("Os meus pontos", "Carteira privada de fidelização Matturo Burger por telemóvel."),
  loader: ({ context }) => context.queryClient.ensureQueryData(pointsQuery),
  component: PointsPage,
});
function PointsPage() {
  const { data } = useSuspenseQuery(pointsQuery);
  const leave = useServerFn(leaveGuestLoyalty);
  const cache = useQueryClient();
  const [error, setError] = useState("");
  return <div className="page-width max-w-xl py-10">
    <Button asChild variant="link" className="px-0"><Link to="/cardapio">← Cardápio</Link></Button>
    <Gift className="mt-6 h-9 w-9 text-primary" />
    <h1 className="section-title mt-4">Os meus pontos</h1>
    {data.verified ? <>
      <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4" />{data.phone}</p>
      <p className="mt-6 text-4xl font-bold text-primary">{data.available} pontos</p>
      <progress max={100} value={Math.min(100, data.available)} aria-label="Progresso para Hamburguinho grátis" className="mt-4 h-3 w-full accent-primary" />
      <p className="mt-4 text-sm text-muted-foreground">100 pontos = 1 Hamburguinho grátis</p>
      {data.available >= 100 && <Button asChild className="mt-6 w-full"><Link to="/produto/$slug" params={{ slug: "hamburguinho" }} search={{ recompensa: true }}>Resgatar Hamburguinho grátis</Link></Button>}
      <Button variant="outline" className="mt-4 w-full" onClick={async () => { try { await leave(); await cache.invalidateQueries({ queryKey: ["matturo-guest-loyalty"] }); } catch { setError("Não foi possível sair. Tente novamente."); } }}>Sair</Button>
    </> : <div className="mt-6">
      <p className="text-sm leading-relaxed text-muted-foreground">Os pontos acumulam no telemóvel de cada pedido concluído (1 € = 1 ponto). Entre ou crie conta com o mesmo número para os ver e resgatar.</p>
      <PhoneAccountForm />
    </div>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
  </div>;
}