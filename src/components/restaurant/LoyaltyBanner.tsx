import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { myLoyalty } from "@/lib/orders.functions";
import { useCart } from "@/lib/cart";
import { REWARD_POINTS } from "@/lib/loyalty";

/** Shows signed-in customers with 100+ points a message to redeem their free Hamburguinho. */
export function LoyaltyBanner() {
  const [points, setPoints] = useState(0);
  const cart = useCart();
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { if (alive) setPoints(0); return; }
      try { const b = await myLoyalty(); if (alive) setPoints(b.available); } catch { /* ignore */ }
    };
    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load(); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  if (points < REWARD_POINTS || cart.items.some((i) => i.reward)) return null;
  return (
    <div role="status" className="bg-primary text-primary-foreground">
      <div className="page-width flex flex-wrap items-center justify-center gap-3 py-2 text-sm">
        <Gift className="h-4 w-4" />
        <span className="font-semibold">Parabéns! Tem {points} pontos — ganhou um Hamburguinho grátis.</span>
        <Link to="/produto/$slug" params={{ slug: "hamburguinho" }} search={{ recompensa: true }} className="rounded-full bg-background px-3 py-1 text-xs font-bold text-foreground">Resgatar agora</Link>
      </div>
    </div>
  );
}
