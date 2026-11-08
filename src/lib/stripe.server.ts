import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { CheckoutFormValues } from "./checkout";

export type CheckoutItemInput = { productId: string; qty: number; options: Record<string, string> };
type NumericValue = number | string | null;
type ProductRow = { id: string; name: string; price: NumericValue };
type VariationRow = { id: string; product_id: string | null; price: NumericValue };
type OptionRow = { variation_id: string; attribute_name: string; option: string | null };

export type ResolvedItem = { name: string; unitAmount: number; quantity: number };

const asNumber = (value: NumericValue | undefined) => value === null || value === undefined || value === "" ? null : Number(value);

export function resolvePurchasedItems(
  items: CheckoutItemInput[],
  products: ProductRow[],
  variations: VariationRow[],
  optionRows: OptionRow[],
): ResolvedItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const optionsByVariation = new Map<string, Record<string, string>>();
  for (const row of optionRows) {
    if (!row.option) continue;
    const options = optionsByVariation.get(row.variation_id) ?? {};
    options[row.attribute_name] = row.option;
    optionsByVariation.set(row.variation_id, options);
  }

  return items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error("Um dos produtos já não está disponível. Atualize o carrinho.");

    const productVariations = variations.filter((variation) => variation.product_id === product.id);
    let unitPrice = asNumber(product.price);
    let selectedOptions: Record<string, string> = {};

    if (productVariations.length) {
      const variation = productVariations.find((candidate) => {
        const expected = optionsByVariation.get(candidate.id) ?? {};
        const expectedKeys = Object.keys(expected);
        const providedKeys = Object.keys(item.options);
        return expectedKeys.length === providedKeys.length && expectedKeys.every((key) => item.options[key] === expected[key]);
      });
      if (!variation) throw new Error(`As opções de ${product.name} já não estão disponíveis.`);
      unitPrice = asNumber(variation.price) ?? unitPrice;
      selectedOptions = optionsByVariation.get(variation.id) ?? {};
    } else if (Object.keys(item.options).length) {
      throw new Error(`As opções de ${product.name} não são válidas.`);
    }

    if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`O preço de ${product.name} não está disponível.`);
    }

    const optionText = Object.entries(selectedOptions).map(([key, value]) => `${key === "TIME" ? "Time" : key}: ${value}`).join(" · ");
    return {
      name: `${product.name}${optionText ? ` — ${optionText}` : ""}`.slice(0, 240),
      unitAmount: Math.round(unitPrice * 100),
      quantity: item.qty,
    };
  });
}

const checkoutSessionSchema = z.object({ id: z.string(), url: z.string().url() });
const checkoutStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  payment_status: z.string(),
  amount_total: z.number().nullable(),
  currency: z.string().nullable(),
});

async function parseStripeResponse(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = typeof body === "object" && body && "error" in body && typeof body.error === "object" && body.error && "code" in body.error
      ? String(body.error.code)
      : "unknown";
    console.error(`Stripe API request failed: ${response.status} (${code})`);
    throw new Error("A Stripe não conseguiu processar o pedido. Tente novamente.");
  }
  return body;
}

function validReturnOrigin(origin: string) {
  try {
    const url = new URL(origin);
    const local = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    const preview = url.protocol === "https:" && url.hostname.endsWith(".lovable.app");
    return local || preview;
  } catch {
    return false;
  }
}

export async function createStripeSession(
  data: { customer: CheckoutFormValues; items: CheckoutItemInput[]; origin: string; submissionId: string },
  stripeSecretKey: string,
  supabaseUrl: string,
  supabasePublishableKey: string,
) {
  if (!validReturnOrigin(data.origin)) throw new Error("O endereço de regresso à loja não é válido.");

  const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (supabasePublishableKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${supabasePublishableKey}`) headers.delete("Authorization");
      headers.set("apikey", supabasePublishableKey);
      return fetch(input, { ...init, headers });
    } },
  });

  const productIds = [...new Set(data.items.map((item) => item.productId))];
  const [{ data: products, error: productsError }, { data: variations, error: variationsError }] = await Promise.all([
    supabase.from("products").select("id,name,price").in("id", productIds).eq("status", "publish"),
    supabase.from("product_variations").select("id,product_id,price").in("product_id", productIds).eq("status", "publish"),
  ]);
  if (productsError || variationsError) throw new Error("Não foi possível confirmar os produtos. Tente novamente.");

  const variationIds = (variations ?? []).map((variation) => variation.id);
  const { data: optionRows, error: optionsError } = variationIds.length
    ? await supabase.from("product_variation_attribute_values").select("variation_id,attribute_name,option").in("variation_id", variationIds)
    : { data: [], error: null };
  if (optionsError) throw new Error("Não foi possível confirmar as opções. Tente novamente.");

  const resolvedItems = resolvePurchasedItems(data.items, products ?? [], variations ?? [], optionRows ?? []);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("locale", "pt");
  params.set("success_url", `${data.origin}/encomenda/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${data.origin}/encomenda/cancelada`);
  params.set("customer_email", data.customer.email);
  params.set("client_reference_id", data.submissionId);
  params.set("metadata[store]", "NovaFix Tech Lab");
  params.set("metadata[submission_id]", data.submissionId);
  params.set("metadata[customer_name]", data.customer.name);
  params.set("metadata[customer_phone]", data.customer.phone);
  params.set("metadata[delivery_address]", [data.customer.address, data.customer.address2].filter(Boolean).join(", "));
  params.set("metadata[delivery_postal_code]", data.customer.postalCode);
  params.set("metadata[delivery_city]", data.customer.city);
  params.set("metadata[delivery_country]", data.customer.country);
  if (data.customer.notes) params.set("metadata[delivery_notes]", data.customer.notes);
  params.set("payment_intent_data[metadata][submission_id]", data.submissionId);
  params.set("payment_intent_data[metadata][store]", "NovaFix Tech Lab");

  resolvedItems.forEach((item, index) => {
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
    params.set(`line_items[${index}][price_data][currency]`, "eur");
    params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
    params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": data.submissionId,
    },
    body: params,
  });
  return checkoutSessionSchema.parse(await parseStripeResponse(response));
}

export async function retrieveStripeSession(sessionId: string, stripeSecretKey: string) {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  return checkoutStatusSchema.parse(await parseStripeResponse(response));
}
