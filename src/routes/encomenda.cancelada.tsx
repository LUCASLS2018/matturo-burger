import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, XCircle } from "lucide-react";

export const Route = createFileRoute("/encomenda/cancelada")({
  head: () => ({
    meta: [
      { title: "Pagamento cancelado — NovaFix Tech Lab" },
      { name: "description", content: "O pagamento foi cancelado e o seu carrinho NovaFix continua disponível." },
      { property: "og:title", content: "Pagamento cancelado — NovaFix Tech Lab" },
      { property: "og:description", content: "Retome a finalização da sua encomenda quando estiver pronto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentCancelledPage,
});

function PaymentCancelledPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground"><XCircle className="h-8 w-8" /></span>
      <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">Pagamento cancelado</h1>
      <p className="mt-4 text-muted-foreground">Não foi efetuada qualquer cobrança. Os produtos continuam no seu carrinho.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/finalizar" className="inline-flex items-center gap-2 rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon"><ArrowLeft className="h-4 w-4" /> Voltar à finalização</Link>
        <Link to="/carrinho" className="rounded-lg border border-border px-6 py-3 font-semibold hover:border-primary/60">Ver carrinho</Link>
      </div>
    </div>
  );
}
