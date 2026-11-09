import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Toca sem parar em qualquer página do painel enquanto houver pedidos «Por aceitar» e o som estiver ligado. */
export function OrderAlarm() {
  const [pending, setPending] = useState(0);
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const r = await supabase.from("matturo_orders").select("id", { count: "exact", head: true }).eq("status", "novo");
      if (alive) setPending(r.error ? 0 : r.count ?? 0);
    };
    void check();
    const timer = window.setInterval(check, 8000);
    const ch = supabase.channel("matturo-order-alarm").on("postgres_changes", { event: "*", schema: "public", table: "matturo_orders" }, () => void check()).subscribe();
    const unlock = () => { void ctx.current?.resume(); };
    document.addEventListener("pointerdown", unlock);
    return () => { alive = false; window.clearInterval(timer); void supabase.removeChannel(ch); document.removeEventListener("pointerdown", unlock); };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const beep = () => {
      if (window.localStorage.getItem("matturo-order-sound") !== "on") return;
      ctx.current ??= new AudioContext();
      const a = ctx.current; void a.resume();
      [0, 0.25].forEach((t) => { const o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.18); });
    };
    beep();
    const timer = window.setInterval(beep, 2000);
    return () => window.clearInterval(timer);
  }, [pending]);

  if (!pending) return null;
  return (
    <Link to="/pedidos" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg animate-pulse">
      <BellRing className="h-4 w-4" />{pending} pedido{pending > 1 ? "s" : ""} por aceitar
    </Link>
  );
}
