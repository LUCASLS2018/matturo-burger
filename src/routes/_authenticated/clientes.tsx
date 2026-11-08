import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminCustomers } from "@/lib/orders.functions";
import { orderStatusLabels, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";

const customersQuery = queryOptions({ queryKey: ["matturo-admin-customers"], queryFn: () => adminCustomers() });

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => restaurantHead("Clientes", "Lista privada de clientes do Matturo Burger."),
  loader: ({ context }) => context.queryClient.ensureQueryData(customersQuery),
  errorComponent: () => <div className="page-width py-16"><h1 className="section-title">Acesso indisponível</h1><p className="mt-4">Esta área exige acesso de administrador.</p><Button asChild className="mt-6"><Link to="/painel">Voltar ao painel</Link></Button></div>,
  component: CustomersPage,
});

const date = (iso: string) => new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
const wa = (phone: string) => { const d = phone.replace(/\D/g, ""); return `https://wa.me/${d.length === 9 ? "351" + d : d}`; };

function CustomersPage() {
  const { data } = useSuspenseQuery(customersQuery);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const term = q.trim().toLowerCase();
  const list = term ? data.filter((c) => `${c.name} ${c.phone} ${c.address} ${c.postal}`.toLowerCase().includes(term)) : data;
  const total = data.reduce((s, c) => s + c.spentCents, 0);
  return (
    <div className="page-width py-12">
      <Link to="/painel" className="text-sm text-primary">← Painel</Link>
      <h1 className="section-title mt-3">Clientes</h1>
      <p className="mt-3 text-sm text-muted-foreground">{data.length} clientes · {money(total / 100)} gastos no total (pedidos cancelados não contam).</p>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar por nome, telemóvel ou morada" className="mt-6 h-12 w-full max-w-md rounded-md border border-input bg-card px-4" />
      <ul className="mt-6 space-y-3">
        {list.map((c) => (
          <li key={c.phone} className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{c.name}</h2>
                <p className="mt-1 text-sm">{c.phone}</p>
                <p className="mt-1 text-sm text-muted-foreground">{c.address ? `${c.address}${c.postal ? " · " + c.postal : ""}` : "Sem morada (só retirada / no local)"}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-lg font-semibold text-primary">{money(c.spentCents / 100)}</p>
                <p className="text-muted-foreground">{c.orders} {c.orders === 1 ? "pedido" : "pedidos"} · último {date(c.lastAt)}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline"><a href={wa(c.phone)} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a></Button>
              <Button asChild size="sm" variant="outline"><a href={`tel:${c.phone.replace(/\s/g, "")}`}><Phone />Ligar</a></Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(open === c.phone ? null : c.phone)}>{open === c.phone ? "Esconder pedidos" : "Últimos pedidos"}</Button>
            </div>
            {open === c.phone && <ul className="mt-4 divide-y divide-border border-t border-border text-sm">
              {c.recent.map((o) => <li key={o.reference} className="flex flex-wrap justify-between gap-2 py-2"><span>{o.reference} · {o.service} · {date(o.createdAt)}</span><span>{orderStatusLabels[o.status as OrderStatus] ?? o.status} · <strong>{money(o.totalCents / 100)}</strong></span></li>)}
            </ul>}
          </li>
        ))}
        {!list.length && <li className="text-sm text-muted-foreground">Nenhum cliente encontrado.</li>}
      </ul>
    </div>
  );
}
