import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export const guestLoyalty = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { verifiedLoyalty } = await import("./loyalty-session.server");
  const session = await verifiedLoyalty();
  // SMS stays unavailable until a provider is explicitly authorized and configured.
  return { verified: Boolean(session), phone: session?.phone ?? null, available: session?.available ?? 0, smsAvailable: false };
});

export const leaveGuestLoyalty = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { verifiedLoyalty, setLoyaltyCookie } = await import("./loyalty-session.server");
  const session = await verifiedLoyalty();
  if (session) {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const result = await db.from("matturo_loyalty_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.sessionId);
    if (result.error) throw new Error("Não foi possível terminar a confirmação. Tente novamente.");
  }
  setLoyaltyCookie("", 0);
  return { ok: true };
});