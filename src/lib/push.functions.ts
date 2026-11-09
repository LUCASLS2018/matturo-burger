import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { tokenHash } from "./delivery";
import { orderAccessValid } from "./order-pricing";
import { orderAlertPath } from "./push";

// A customer registers this device from their own order page. The order link is the
// only proof they may receive alerts about that order, so it is verified on the server.
const registerSchema = z.object({
  token: z.string().trim().min(20).max(512),
  orderToken: z.string().trim().min(10).max(200),
  path: z.string().trim().min(8).max(200),
});

export const registerPushDevice = createServerFn({ method: "POST" })
  .inputValidator((input) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    // Only the order page of this very order may be opened by the notification.
    if (!orderAlertPath(data.path)) throw new Error("Ligação do pedido inválida.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const order = await supabaseAdmin
      .from("matturo_orders")
      .select("id,access_expires_at,access_revoked_at")
      .eq("access_token_hash", await tokenHash(data.orderToken))
      .maybeSingle();
    if (order.error) throw new Error("Não foi possível verificar o pedido.");
    if (!order.data || !orderAccessValid(order.data.access_expires_at, order.data.access_revoked_at)) {
      throw new Error("Este link de pedido já não é válido.");
    }
    const saved = await supabaseAdmin
      .from("matturo_push_tokens")
      .upsert(
        { token: data.token, order_id: order.data.id, path: data.path, updated_at: new Date().toISOString() },
        { onConflict: "token,order_id" },
      );
    if (saved.error) throw new Error("Não foi possível ativar os avisos.");
    return { ok: true };
  });

// A signed-in courier registers this device to be told when a delivery is sent to them.
export const registerCourierDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().trim().min(20).max(512) }).parse(input))
  .handler(async ({ data, context }) => {
    const roles = await context.supabase.from("matturo_user_roles").select("role").eq("user_id", context.userId);
    if (roles.error || !roles.data.some((r) => r.role === "courier")) throw new Error("Só estafetas podem ativar estes avisos.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const saved = await supabaseAdmin.from("matturo_courier_push_tokens")
      .upsert({ token: data.token, user_id: context.userId, updated_at: new Date().toISOString() }, { onConflict: "token" });
    if (saved.error) throw new Error("Não foi possível ativar os avisos.");
    return { ok: true };
  });
