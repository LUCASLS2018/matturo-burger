import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { loyaltyAccess } from "@/lib/loyalty.functions";

export function PhoneAccountForm({ onDone }: { onDone?: () => void }) {
  const access = useServerFn(loyaltyAccess);
  const cache = useQueryClient();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <form className="mt-6 space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await access({ data: { phone, password, signup } });
      await cache.invalidateQueries();
      onDone?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : "";
      setMessage(text && !text.startsWith("[") ? text : "Não foi possível continuar. Verifique os dados.");
    } finally { setBusy(false); }
  }}>
    <label className="block text-sm">Número de telemóvel<input type="tel" required autoComplete="tel" placeholder="912 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-3" /></label>
    <label className="block text-sm">Senha<input type="password" required minLength={6} autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-3" /></label>
    {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
    <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}</Button>
    <Button type="button" variant="link" className="w-full" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Já tenho conta — entrar" : "Ainda não tenho conta — criar conta"}</Button>
  </form>;
}
