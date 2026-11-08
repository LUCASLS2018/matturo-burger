import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, LayoutDashboard, LogOut, MapPin, Settings, Truck, Users, Utensils } from "lucide-react";
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
    { to: "/clientes" as const, icon: Users, title: "Clientes", text: "Nome, telemóvel, morada, últimos pedidos e total gasto.", admin: true },
    { to: "/gerir-menu" as const, icon: Utensils, title: "Produtos", text: "Nomes, preços, descrições, disponibilidade e fotografias.", admin: true },
    { to: "/entregas" as const, icon: Truck, title: "Entregas", text: "Entregas atribuídas, perfil de estafeta e rastreamento.", admin: false },
    { to: "/configuracoes" as const, icon: Settings, title: "Configurações", text: "Pausar pedidos e gerir zonas de delivery com portes.", admin: true },
  ].filter((a) => !a.admin || data.admin);
  const signOut = async () => { await supabase.auth.signOut(); await qc.cancelQueries(); qc.clear(); await navigate({ to: "/admin", replace: true }); };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] bg-muted/40">
      <nav aria-label="Administração" className="sticky top-0 hidden h-[calc(100vh-5rem)] w-16 shrink-0 flex-col items-center gap-3 bg-foreground py-5 md:flex">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground" title="Painel"><LayoutDashboard className="h-5 w-5" /></span>
        {areas.map((a) => <Link key={a.to} to={a.to} title={a.title} aria-label={a.title} className="flex h-10 w-10 items-center justify-center rounded-lg text-background/60 transition hover:bg-background/10 hover:text-background"><a.icon className="h-5 w-5" /></Link>)}
        <button type="button" onClick={() => void signOut()} title="Sair" aria-label="Sair" className="mt-auto flex h-10 w-10 items-center justify-center rounded-lg text-background/60 hover:bg-background/10 hover:text-background"><LogOut className="h-5 w-5" /></button>
      </nav>
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-5 lg:block">
        <p className="text-lg font-bold">Matturo · Painel</p>
        <p className="mt-6 text-sm font-semibold">Áreas</p>
        <div className="mt-3 space-y-1">
          <span className="block rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Início</span>
          {areas.map((a) => <Link key={a.to} to={a.to} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-accent hover:text-foreground">{a.title}</Link>)}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-bold">Painel da equipa</h1><p className="text-sm text-muted-foreground">{data.name ? `Bem-vindo, ${data.name}.` : "Bem-vindo."} Escolha a área que quer gerir.</p></div>
          <Button variant="outline" onClick={() => void signOut()}><LogOut />Sair</Button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {areas.map((a) => (
            <Link key={a.to} to={a.to} className="group rounded-xl border border-border bg-card p-3 shadow-sm transition hover:border-primary hover:shadow-md">
              <div className="flex aspect-[16/9] items-center justify-center rounded-lg bg-muted transition group-hover:bg-primary/10"><a.icon className="h-12 w-12 text-primary transition group-hover:scale-110" /></div>
              <div className="mt-3 flex items-center justify-between"><h2 className="font-semibold">{a.title}</h2><ArrowRight className="h-4 w-4 text-primary" /></div>
              <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
            </Link>
          ))}
        </div>
        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-4 w-4" />Os clientes acompanham as entregas apenas pelo link privado do pedido.</p>
      </main>
    </div>
  );
}
