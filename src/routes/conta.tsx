import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { restaurantHead } from "@/lib/restaurant";

export const Route = createFileRoute("/conta")({ head: () => restaurantHead("Conta de cliente", "Entre ou crie a sua conta para consultar os seus pedidos Matturo Burger."), component: CustomerAuth });

function CustomerAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return <div className="page-width max-w-md py-16">
    <p className="mb-3 text-xs font-semibold text-primary">MATTURO · CLIENTES</p><h1 className="section-title">A minha conta</h1>
    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Consulte os pedidos associados à sua conta. Também pode continuar a pedir como convidado.</p>
    <form className="mt-8 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setMessage("");
      try {
        const result = signup ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/conta" } }) : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (result.data.session) await navigate({ to: "/minha-conta" });
        else setMessage("Confirme o seu email para concluir o registo e depois entre na conta.");
      } catch { setMessage("Não foi possível entrar ou criar a conta. Verifique os dados."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm">Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-3" /></label>
      <label className="block text-sm">Palavra-passe<input type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-3" /></label>
      {message && <p role="status" className="text-sm">{message}</p>}
      <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</Button>
      <Button type="button" variant="link" onClick={() => setSignup(!signup)}>{signup ? "Já tenho conta" : "Criar conta de cliente"}</Button>
      <Button asChild variant="link"><Link to="/">Voltar ao Matturo</Link></Button>
    </form>
    <p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">É membro da equipa? <Link to="/auth" className="font-semibold text-primary">Use o acesso da equipa.</Link></p>
  </div>;
}
