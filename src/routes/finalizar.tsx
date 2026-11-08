import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, MapPin, Pencil, UserRound } from "lucide-react";
import { createStripeCheckout } from "@/lib/stripe.functions";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { checkoutDefaults, checkoutSchema, type CheckoutFormValues } from "@/lib/checkout";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";
import { studioPhoto } from "@/lib/studio-photos";

export const Route = createFileRoute("/finalizar")({
  head: () => ({
    meta: [
      { title: "Identificação e entrega — NovaFix Tech Lab" },
      { name: "description", content: "Indique os seus dados de identificação e entrega e reveja a sua encomenda NovaFix." },
      { property: "og:title", content: "Finalizar encomenda — NovaFix Tech Lab" },
      { property: "og:description", content: "Identificação, entrega e revisão da encomenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

const inputClass = "mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function Field({ label, error, optional, children }: { label: string; error?: string | undefined; optional?: boolean; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      <span>{label}{optional && <span className="font-normal text-muted-foreground"> (opcional)</span>}</span>
      {children}
      {error && <span role="alert" className="mt-1.5 block text-xs font-normal text-destructive">{error}</span>}
    </label>
  );
}

function OrderSummary() {
  const { items, subtotal } = useCart();

  return (
    <aside className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24">
      <h2 className="font-display text-xl font-semibold">A sua encomenda</h2>
      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const image = studioPhoto(item.slug) ?? item.image;
          return (
            <li key={item.key} className="flex gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {image && <img src={image} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{item.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Quantidade: {item.qty}</p>
                {Object.entries(item.options).length > 0 && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {Object.entries(item.options).map(([key, value]) => `${key === "TIME" ? "Time" : key}: ${value}`).join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold">{formatPrice(item.price * item.qty)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="mt-5 space-y-3 border-t border-border pt-5 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{formatPrice(subtotal)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Portes</dt><dd>A calcular</dd></div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Os portes serão calculados antes do pagamento. Nenhum valor será cobrado nesta etapa.</p>
    </aside>
  );
}

function CheckoutPage() {
  const { items } = useCart();
  const createCheckout = useServerFn(createStripeCheckout);
  const [reviewData, setReviewData] = useState<CheckoutFormValues | null>(null);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: checkoutDefaults,
    mode: "onBlur",
  });

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">O seu carrinho está vazio</h1>
        <p className="mt-3 text-muted-foreground">Adicione produtos antes de avançar para a identificação e entrega.</p>
        <Link to="/produtos" className="mt-6 inline-flex rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon">Ver produtos</Link>
      </div>
    );
  }

  const submit = handleSubmit((data) => {
    setReviewData(data);
    setPaymentError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const beginPayment = async () => {
    if (!reviewData || paymentPending) return;
    setPaymentPending(true);
    setPaymentError(null);
    try {
      const session = await createCheckout({ data: {
        customer: reviewData,
        items: items.map((item) => ({ productId: item.productId, qty: item.qty, options: item.options })),
        origin: window.location.origin,
        submissionId: crypto.randomUUID(),
      } });
      window.location.assign(session.url);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Não foi possível iniciar o pagamento. Tente novamente.");
      setPaymentPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/carrinho" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao carrinho</Link>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Finalização da encomenda</p>
          <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">{reviewData ? "Reveja os seus dados" : "Identificação e entrega"}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Passo 2 de 3</p>
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        {reviewData ? (
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
            <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold">Dados prontos para a próxima etapa</h2>
                <p className="mt-1 text-sm text-muted-foreground">Confirme as informações. Ao continuar, os dados da encomenda serão enviados de forma segura à Stripe.</p>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-semibold">Identificação</h2>
              <button onClick={() => setReviewData(null)} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><Pencil className="h-4 w-4" /> Editar dados</button>
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Nome</dt><dd className="mt-1 font-medium">{reviewData.name}</dd></div>
              <div><dt className="text-muted-foreground">Email</dt><dd className="mt-1 break-words font-medium">{reviewData.email}</dd></div>
              <div><dt className="text-muted-foreground">Telefone</dt><dd className="mt-1 font-medium">{reviewData.phone}</dd></div>
            </dl>

            <h2 className="mt-8 font-display text-xl font-semibold">Morada de entrega</h2>
            <address className="mt-4 text-sm not-italic leading-relaxed text-muted-foreground">
              <span className="block text-foreground">{reviewData.address}</span>
              {reviewData.address2 && <span className="block">{reviewData.address2}</span>}
              <span className="block">{reviewData.postalCode} {reviewData.city}</span>
              <span className="block">{reviewData.country}</span>
            </address>
            {reviewData.notes && <div className="mt-5 rounded-lg bg-muted p-4 text-sm"><span className="font-medium">Notas de entrega:</span> <span className="whitespace-pre-wrap text-muted-foreground">{reviewData.notes}</span></div>}

            <div className="mt-8 border-t border-border pt-6">
              {paymentError && <p role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{paymentError}</p>}
              <button onClick={beginPayment} disabled={paymentPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon transition-opacity disabled:cursor-wait disabled:opacity-60">
                {paymentPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                {paymentPending ? "A preparar o Checkout…" : "Testar pagamento seguro na Stripe"}
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Modo teste: não efetua cobranças reais. Não inclui portes nem IVA.</p>
            </div>
          </section>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><UserRound className="h-5 w-5" /></span>
                <div><h2 className="font-display text-xl font-semibold">Identificação</h2><p className="text-sm text-muted-foreground">Para contacto sobre a encomenda.</p></div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Nome completo" error={errors.name?.message}><input {...register("name")} autoComplete="name" maxLength={100} className={inputClass} placeholder="O seu nome" /></Field></div>
                <Field label="Email" error={errors.email?.message}><input {...register("email")} type="email" autoComplete="email" maxLength={255} className={inputClass} placeholder="nome@exemplo.pt" /></Field>
                <Field label="Telefone" error={errors.phone?.message}><input {...register("phone")} type="tel" autoComplete="tel" maxLength={20} className={inputClass} placeholder="+351 912 345 678" /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></span>
                <div><h2 className="font-display text-xl font-semibold">Entrega</h2><p className="text-sm text-muted-foreground">Indique onde pretende receber a encomenda.</p></div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field label="Morada" error={errors.address?.message}><input {...register("address")} autoComplete="address-line1" maxLength={160} className={inputClass} placeholder="Rua, número e andar" /></Field></div>
                <div className="sm:col-span-2"><Field label="Complemento" optional error={errors.address2?.message}><input {...register("address2")} autoComplete="address-line2" maxLength={160} className={inputClass} placeholder="Apartamento, piso ou referência" /></Field></div>
                <Field label="Código postal" error={errors.postalCode?.message}><input {...register("postalCode")} autoComplete="postal-code" maxLength={12} className={inputClass} placeholder="0000-000" /></Field>
                <Field label="Localidade" error={errors.city?.message}><input {...register("city")} autoComplete="address-level2" maxLength={100} className={inputClass} placeholder="A sua localidade" /></Field>
                <div className="sm:col-span-2"><Field label="País" error={errors.country?.message}><input {...register("country")} autoComplete="country-name" maxLength={56} className={inputClass} /></Field></div>
                <div className="sm:col-span-2">
                  <Field label="Notas de entrega" optional error={errors.notes?.message}>
                    <textarea {...register("notes")} maxLength={500} rows={4} className={`${inputClass} h-auto resize-y py-3`} placeholder="Informações úteis para a entrega" />
                  </Field>
                </div>
              </div>
            </section>

            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon transition-transform hover:scale-[1.01]">
              Rever dados e encomenda <ArrowRight className="h-4 w-4" />
            </button>
            <p className="text-center text-xs text-muted-foreground">Os dados ficam apenas nesta página e não são enviados nem guardados.</p>
          </form>
        )}
        <OrderSummary />
      </div>
    </div>
  );
}
