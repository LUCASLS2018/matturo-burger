import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { LayoutDashboard, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { teamSummary } from "@/lib/delivery.functions";

export function TeamAccess() {
  const [signedIn, setSignedIn] = useState(false);
  const [team, setTeam] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const sync = async (user: boolean) => {
      setSignedIn(user);
      if (!user) { setTeam(false); return; }
      try { const summary = await teamSummary(); setTeam(summary.admin || summary.courier); }
      catch { setTeam(false); }
    };
    void supabase.auth.getUser().then((result) => sync(Boolean(result.data.user)));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      void sync(Boolean(session));
      void router.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  if (signedIn && team) return <Button asChild variant="outline" size="sm" className="h-11 gap-2 px-4"><Link to="/painel" aria-label="Painel da equipa"><LayoutDashboard /><span className="hidden sm:inline">Painel</span></Link></Button>;
  return <Button asChild variant="ghost" size="icon" aria-label={signedIn ? "A minha conta" : "Conta de cliente"}><Link to={signedIn ? "/minha-conta" : "/conta"}><UserRound /></Link></Button>;
}
