import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Como trabalhamos — NovaFix Tech Lab" },
      { name: "description", content: "Saiba como a NovaFix fabrica artigos personalizados com impressão 3D, gravação e corte a laser." },
      { property: "og:title", content: "Como trabalhamos — NovaFix Tech Lab" },
      { property: "og:description", content: "Do pedido à peça final: impressão 3D e laser feitos à medida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const steps = [
  { n: "01", t: "Escolha", d: "Escolha o produto e as opções: modelo, cor, tamanho ou time." },
  { n: "02", t: "Produção", d: "Cada peça é fabricada à medida no nosso laboratório, em impressão 3D ou laser." },
  { n: "03", t: "Acabamento", d: "Revemos cada detalhe antes de embalar com cuidado." },
  { n: "04", t: "Entrega", d: "Combinamos consigo a entrega e o pagamento." },
];

function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-4xl font-bold sm:text-5xl">Como <span className="text-neon">trabalhamos</span></h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        A NovaFix Tech Lab transforma ideias em objetos reais. Usamos impressão 3D, gravação a laser e corte a laser para criar peças únicas e personalizadas.
      </p>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.n} className="rounded-xl border border-border bg-card p-6">
            <span className="font-display text-3xl font-bold text-neon">{s.n}</span>
            <p className="mt-3 font-display text-lg font-semibold">{s.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
      <Link to="/produtos" className="mt-12 inline-flex rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon">Ver produtos</Link>
    </div>
  );
}
