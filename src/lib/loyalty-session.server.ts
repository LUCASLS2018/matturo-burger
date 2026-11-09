import { getCookie, setCookie } from "@tanstack/react-start/server";
import { tokenHash } from "./delivery";

const COOKIE = "matturo_loyalty";
export async function verifiedLoyalty() {
  const token = getCookie(COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const hash = await tokenHash(token);
  const result = await db.from("matturo_loyalty_sessions").select("id,wallet_id,expires_at,revoked_at,matturo_loyalty_wallets(phone,balance)").eq("token_hash", hash).maybeSingle();
  if (result.error) throw new Error("Não foi possível consultar os pontos. Tente novamente.");
  if (!result.data || result.data.revoked_at || Date.parse(result.data.expires_at) <= Date.now() || !result.data.matturo_loyalty_wallets) return null;
  return { hash, sessionId: result.data.id, walletId: result.data.wallet_id, phone: result.data.matturo_loyalty_wallets.phone, available: result.data.matturo_loyalty_wallets.balance };
}
export function setLoyaltyCookie(token: string, maxAge = 86400) {
  setCookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge });
}