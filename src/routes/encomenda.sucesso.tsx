import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";
import { getStripeCheckoutStatus } from "@/lib/stripe.functions";

type SearchParams = { session_id?: string | undefined };
type PaymentResult = { status: string; paymentStatus: string; amountTotal: number | null; currency: string | null };

export const Route = createFileRoute("/encomenda/sucesso")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({ session_id: typeof search["session_id"] === "string" ? search["session_id"] : undefined }),
  head: () => ({
    meta: [
      { title: "Confirmação de pagamento — NovaFix Tech Lab" },
      { name: "description", content: "Consulte a confirmação do seu pagamento Stripe na NovaFix Tech Lab." },
      { property: "og:title", content: "Confirmação de pagamento — NovaFix Tech Lab" },
      { property: "og:description", content: "Estado do pagamento da sua encomenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { session_id: sessionId } = Route.useSearch();
  const { clear } = useCart();
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setError("A referência da sessão de pagamento está em falta.");
      return () => { active = false; };
    }
    getStripeCheckoutStatus({ data: { sessionId } })
      .then((session) => {
        if (!active) return;
        setResult(session);
        if (session.paymentStatus === "paid" || session.paymentStatus === "no_payment_required") clear();
      })
      .catch(() => { if (active) setError("Não foi possível confirmar o pagamento. Consulte a sua conta Stripe antes de tentar novamente."); });
    return () => { active = false; };
  }, [sessionId]);

  const loading = !result && !error;
  const paid = result?.paymentStatus === "paid" || result?.paymentStatus === "no_payment_required";
  const title = loading ? "A confirmar o pagamento" : error ? "Confirmação indisponível" : paid ? "Pagamento confirmado" : result?.status === "expired" ? "A sessão de pagamento expirou" : "Pagamento em processamento";
  const description = loading
    ? "Estamos a consultar a confirmação diretamente na Stripe."
    : error
      ? error
      : paid
        ? "A Stripe confirmou o pagamento da sua encomenda."
        : result?.status === "expired"
          ? "Não foi efetuada qualquer cobrança. Pode repetir a finalização a partir do carrinho."
          : "A Stripe ainda não confirmou o pagamento. Não repita o pagamento até conhecer o resultado.";
  const Icon = loading || (!paid && !error && result?.status !== "expired") ? Clock3 : paid ? CheckCircle2 : XCircle;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary"><Icon className={`h-8 w-8 ${loading ? "animate-pulse" : ""}`} /></span>
      <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-4 text-muted-foreground">{description}</p>
      {paid && result?.amountTotal !== null && result?.amountTotal !== undefined && (
        <p className="mt-6 text-xl font-semibold text-primary">{formatPrice(result.amountTotal / 100)}</p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/produtos" className="rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon">Voltar à loja</Link>
        {!paid && <Link to="/carrinho" className="rounded-lg border border-border px-6 py-3 font-semibold hover:border-primary/60">Ver carrinho</Link>}
      </div>
    </div>
  );
}
