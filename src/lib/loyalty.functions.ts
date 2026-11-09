import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { loyaltyPhoneSchema } from "./loyalty-phone";

const SESSION_DAYS = 30;
const credentials = z.object({ phone: loyaltyPhoneSchema, password: z.string().min(6).max(72), signup: z.boolean() });

export const guestLoyalty = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { verifiedLoyalty } = await import("./loyalty-session.server");
  const session = await verifiedLoyalty();
  return { verified: Boolean(session), phone: session?.phone ?? null, available: session?.available ?? 0 };
});

export const loyaltyAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => credentials.parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { hashPassword, checkPassword } = await import("./loyalty-password.server");
    const { setLoyaltyCookie } = await import("./loyalty-session.server");
    const { tokenHash } = await import("./delivery");
    const generic = "Telemóvel ou senha incorretos.";

    let wallet = await db.from("matturo_loyalty_wallets").select("id").eq("phone", data.phone).maybeSingle();
    if (wallet.error) throw new Error("Não foi possível continuar. Tente novamente.");
    if (data.signup) {
      if (!wallet.data) {
        const created = await db.from("matturo_loyalty_wallets").upsert({ phone: data.phone }, { onConflict: "phone" }).select("id").single();
        if (created.error) throw new Error("Não foi possível criar a conta. Tente novamente.");
        wallet = { ...wallet, data: created.data };
      }
      const account = await db.from("matturo_loyalty_accounts").insert({ wallet_id: wallet.data!.id, password_hash: await hashPassword(data.password) });
      if (account.error) throw new Error(account.error.code === "23505" ? "Este número já tem conta. Inicie sessão." : "Não foi possível criar a conta. Tente novamente.");
    } else {
      if (!wallet.data) throw new Error(generic);
      const account = await db.from("matturo_loyalty_accounts").select("id,password_hash,failed_attempts,locked_until").eq("wallet_id", wallet.data.id).maybeSingle();
      if (account.error || !account.data) throw new Error(generic);
      if (account.data.locked_until && Date.parse(account.data.locked_until) > Date.now()) throw new Error("Demasiadas tentativas. Tente novamente daqui a 15 minutos.");
      if (!(await checkPassword(data.password, account.data.password_hash))) {
        const failed = account.data.failed_attempts + 1;
        await db.from("matturo_loyalty_accounts").update({ failed_attempts: failed >= 5 ? 0 : failed, locked_until: failed >= 5 ? new Date(Date.now() + 15 * 60000).toISOString() : null }).eq("id", account.data.id);
        throw new Error(generic);
      }
      await db.from("matturo_loyalty_accounts").update({ failed_attempts: 0, locked_until: null }).eq("id", account.data.id);
    }
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    const session = await db.from("matturo_loyalty_sessions").insert({ wallet_id: wallet.data!.id, token_hash: await tokenHash(token), expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString() });
    if (session.error) throw new Error("Não foi possível iniciar sessão. Tente novamente.");
    setLoyaltyCookie(token, SESSION_DAYS * 86400);
    return { ok: true };
  });

export const leaveGuestLoyalty = createServerFn({ method: "POST" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { verifiedLoyalty, setLoyaltyCookie } = await import("./loyalty-session.server");
  const session = await verifiedLoyalty();
  if (session) {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const result = await db.from("matturo_loyalty_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.sessionId);
    if (result.error) throw new Error("Não foi possível terminar sessão. Tente novamente.");
  }
  setLoyaltyCookie("", 0);
  return { ok: true };
});
