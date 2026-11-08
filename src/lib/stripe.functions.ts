import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutSchema } from "./checkout";
import { createStripeSession, retrieveStripeSession } from "./stripe.server";

const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).max(20),
  options: z.record(z.string().trim().min(1).max(80), z.string().trim().min(1).max(120))
    .refine((options) => Object.keys(options).length <= 6, "Demasiadas opções no produto."),
});

const createCheckoutSchema = z.object({
  customer: checkoutSchema,
  items: z.array(checkoutItemSchema).min(1).max(50),
  origin: z.string().url().max(200),
  submissionId: z.string().uuid(),
});

export const createStripeCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => createCheckoutSchema.parse(input))
  .handler(async ({ data }) => {
    const stripeSecretKey = process.env["STRIPE_SECRET_KEY"];
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabasePublishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!stripeSecretKey || !supabaseUrl || !supabasePublishableKey) throw new Error("O pagamento ainda não está configurado.");
    return createStripeSession(data, stripeSecretKey, supabaseUrl, supabasePublishableKey);
  });

export const getStripeCheckoutStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ sessionId: z.string().max(255).regex(/^cs_(test|live)_[A-Za-z0-9_]+$/) }).parse(input))
  .handler(async ({ data }) => {
    const stripeSecretKey = process.env["STRIPE_SECRET_KEY"];
    if (!stripeSecretKey) throw new Error("O pagamento ainda não está configurado.");
    const session = await retrieveStripeSession(data.sessionId, stripeSecretKey);
    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
    };
  });
