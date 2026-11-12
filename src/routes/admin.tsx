import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { restaurantHead } from "@/lib/restaurant";
import logo from "@/assets/matturo/logo-black.png";

export const Route = createFileRoute("/admin")({
  head: () => restaurantHead("Administração", "Acesso privado à gestão do Matturo Burger."),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => { if (data.user) void navigate({ to: "/painel", replace: true }); });
  }, [navigate]);

  return <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
    <form className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8 shadow-sm" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMessage("");
      if (signup) {
        const r = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
        if (r.error) { setBusy(false); setMessage("Não foi possível criar a conta. Verifique os dados."); return; }
        if (r.data.session && r.data.user) { await supabase.from("matturo_profiles").update({ name: name.trim() }).eq("id", r.data.user.id); setBusy(false); await navigate({ to: "/entregas", replace: true }); return; }
        setBusy(false); setMessage("Registo enviado. Confirme o seu email; depois o restaurante autoriza o acesso às entregas."); return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setMessage("Email ou palavra-passe incorretos.");
      else await navigate({ to: "/painel", replace: true });
    }}>
      <img src={logo} alt="Matturo Burger" className="mx-auto h-16 w-48 object-contain" />
      <div className="text-center"><LockKeyhole className="mx-auto h-6 w-6 text-primary" /><h1 className="mt-2 text-xl font-semibold">{signup ? "Registo de estafeta" : "Administração"}</h1><p className="mt-1 text-xs text-muted-foreground">Acesso exclusivo da equipa Matturo</p></div>
      {signup && <label className="block text-sm">Nome<input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 w-full rounded border border-input bg-background px-3" /></label>}
      <label className="block text-sm">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-12 w-full rounded border border-input bg-background px-3" /></label>
      <label className="block text-sm">Palavra-passe<input type="password" required minLength={signup ? 8 : undefined} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded border border-input bg-background px-3" /></label>
      {message && <p role="status" className="text-sm text-destructive">{message}</p>}
      <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? "Aguarde…" : signup ? "Registar estafeta" : "Entrar"}</Button>
      <Button type="button" variant="outline" className="h-11 w-full" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Já tenho conta — entrar" : "Registar estafeta"}</Button>
    </form>
  </div>;
}
