import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { guestLoyalty } from "@/lib/loyalty.functions";
import { useCart } from "@/lib/cart";
import { REWARD_POINTS } from "@/lib/loyalty";

/** Balances are visible only with a server-validated telephone confirmation. */
export function LoyaltyBanner() {
  const [points, setPoints] = useState(0);
  const cart = useCart();
  const fetchPoints = useServerFn(guestLoyalty);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const b = await fetchPoints(); if (alive) setPoints(b.verified ? b.available : 0);
      } catch { /* banner is optional */ }
    };
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [fetchPoints, cart.items]);
  if (points < REWARD_POINTS || cart.items.some((i) => i.reward)) return null;
  return (
    <div role="status" className="bg-primary text-primary-foreground">
      <div className="page-width flex flex-wrap items-center justify-center gap-3 py-2 text-sm">
        <Gift className="h-4 w-4" />
        <span className="font-semibold">Parabéns! Tem {points} pontos — ganhou um Hamburguinho grátis.</span>
        <Button asChild size="sm" variant="secondary"><Link to="/pontos">Resgatar agora</Link></Button>
      </div>
    </div>
  );
}
