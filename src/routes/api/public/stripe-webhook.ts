import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyStripeSignature } from "@/lib/stripe-webhook";

const stripeEventSchema = z.object({
  id: z.string().max(255),
  type: z.string().max(100),
  data: z.object({ object: z.object({
    id: z.string().max(255),
    status: z.string().nullish(),
    payment_status: z.string().nullish(),
  }).passthrough() }).passthrough(),
}).passthrough();

const handledEvents = new Set([
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
]);

export const Route = createFileRoute("/api/public/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) return Response.json({ error: "Webhook não configurado." }, { status: 503 });
        const signature = request.headers.get("stripe-signature");
        if (!signature) return Response.json({ error: "Assinatura em falta." }, { status: 401 });
        const contentLength = Number(request.headers.get("content-length") ?? 0);
        if (contentLength > 1_000_000) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });

        const payload = await request.text();
        if (payload.length > 1_000_000) return Response.json({ error: "Pedido demasiado grande." }, { status: 413 });
        if (!await verifyStripeSignature(payload, signature, secret)) {
          return Response.json({ error: "Assinatura inválida." }, { status: 401 });
        }

        let json: unknown;
        try {
          json = JSON.parse(payload);
        } catch {
          return Response.json({ error: "JSON inválido." }, { status: 400 });
        }
        const parsed = stripeEventSchema.safeParse(json);
        if (!parsed.success) return Response.json({ error: "Evento inválido." }, { status: 400 });

        const event = parsed.data;
        if (handledEvents.has(event.type)) {
          console.info("Stripe Checkout event verified", {
            eventId: event.id,
            type: event.type,
            status: event.data.object.status,
            paymentStatus: event.data.object.payment_status,
          });
        }
        return Response.json({ received: true });
      },
    },
  },
});
