import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PhoneAccountForm } from "@/components/restaurant/PhoneAccountForm";
import { restaurantHead } from "@/lib/restaurant";

export const Route = createFileRoute("/conta")({ head: () => restaurantHead("Conta de cliente", "Entre ou crie a sua conta Matturo Burger com o seu telemóvel para acumular e usar pontos."), component: CustomerAuth });

function CustomerAuth() {
  const navigate = useNavigate();
  return <div className="page-width max-w-md py-16">
    <p className="mb-3 text-xs font-semibold text-primary">MATTURO · CLIENTES</p><h1 className="section-title">A minha conta</h1>
    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Entre com o seu telemóvel e senha para ver os seus pontos e resgatar o Hamburguinho grátis. Também pode continuar a pedir como convidado.</p>
    <PhoneAccountForm onDone={() => navigate({ to: "/pontos" })} />
    <Button asChild variant="link" className="w-full"><Link to="/">Voltar ao Matturo</Link></Button>
  </div>;
}
