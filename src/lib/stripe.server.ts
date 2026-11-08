import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { CheckoutFormValues } from "./checkout";

export type CheckoutItemInput = { productId: string; qty: number; options: Record<string, string> };
type NumericValue = number | string | null;
type ProductRow = { id: string; name: string; price: NumericValue };
type VariationRow = { id: string; product_id: string | null; price: NumericValue };
type OptionRow = { variation_id: string; attribute_name: string; option: string | null };

export type ResolvedItem = {
  productId: string;
  variationId: string | null;
  lookupKey: string;
  name: string;
  optionText: string;
  unitAmount: number;
  quantity: number;
};

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
    let variationId: string | null = null;

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
      variationId = variation.id;
    } else if (Object.keys(item.options).length) {
      throw new Error(`As opções de ${product.name} não são válidas.`);
    }

    if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error(`O preço de ${product.name} não está disponível.`);
    }

    const optionText = Object.entries(selectedOptions).map(([key, value]) => `${key === "TIME" ? "Time" : key}: ${value}`).join(" · ");
    const unitAmount = Math.round(unitPrice * 100);
    const priceOwner = variationId ?? product.id;
    return {
      productId: product.id,
      variationId,
      lookupKey: `novafix_${priceOwner}_${unitAmount}`,
      name: product.name,
      optionText,
      unitAmount,
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
const priceSchema = z.object({ id: z.string(), lookup_key: z.string().nullable() });
const priceListSchema = z.object({ data: z.array(priceSchema) });
const productSchema = z.object({ id: z.string() });

async function stripeApi(path: string, secretKey: string, options: { method?: "GET" | "POST"; body?: URLSearchParams; idempotencyKey?: string; allowNotFound?: boolean } = {}) {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2025-08-27.basil",
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    ...(options.body ? { body: options.body } : {}),
  });
  const body: unknown = await response.json().catch(() => null);
  if (options.allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    const code = typeof body === "object" && body && "error" in body && typeof body.error === "object" && body.error && "code" in body.error
      ? String(body.error.code)
      : "unknown";
    console.error(`Stripe API request failed: ${response.status} (${code})`);
    throw new Error("A Stripe não conseguiu processar o pedido. Tente novamente.");
  }
  return body;
}

async function ensureStripePrices(items: ResolvedItem[], secretKey: string, submissionId: string) {
  const uniqueItems = [...new Map(items.map((item) => [item.lookupKey, item])).values()];
  const pricesByLookupKey = new Map<string, string>();

  for (let offset = 0; offset < uniqueItems.length; offset += 10) {
    const chunk = uniqueItems.slice(offset, offset + 10);
    const query = new URLSearchParams();
    query.set("active", "true");
    query.set("currency", "eur");
    query.set("type", "one_time");
    query.set("limit", "100");
    chunk.forEach((item) => query.append("lookup_keys[]", item.lookupKey));
    const list = priceListSchema.parse(await stripeApi(`/v1/prices?${query.toString()}`, secretKey));
    for (const price of list.data) if (price.lookup_key) pricesByLookupKey.set(price.lookup_key, price.id);
  }

  for (const item of uniqueItems) {
    if (pricesByLookupKey.has(item.lookupKey)) continue;
    const stripeProductId = `novafix_${item.productId}`;
    let product = productSchema.nullable().parse(await stripeApi(`/v1/products/${encodeURIComponent(stripeProductId)}`, secretKey, { allowNotFound: true }));
    if (!product) {
      const productParams = new URLSearchParams();
      productParams.set("id", stripeProductId);
      productParams.set("name", item.name);
      productParams.set("shippable", "true");
      productParams.set("metadata[novafix_product_id]", item.productId);
      product = productSchema.parse(await stripeApi("/v1/products", secretKey, {
        method: "POST",
        body: productParams,
        idempotencyKey: `${submissionId}-product-${item.productId}`,
      }));
    }

    const priceParams = new URLSearchParams();
    priceParams.set("currency", "eur");
    priceParams.set("unit_amount", String(item.unitAmount));
    priceParams.set("product", product.id);
    priceParams.set("lookup_key", item.lookupKey);
    priceParams.set("nickname", item.optionText || "Preço base");
    priceParams.set("metadata[novafix_product_id]", item.productId);
    if (item.variationId) priceParams.set("metadata[novafix_variation_id]", item.variationId);
    const price = priceSchema.parse(await stripeApi("/v1/prices", secretKey, {
      method: "POST",
      body: priceParams,
      idempotencyKey: `${submissionId}-${item.lookupKey}`,
    }));
    pricesByLookupKey.set(item.lookupKey, price.id);
  }

  return items.map((item) => ({ ...item, priceId: pricesByLookupKey.get(item.lookupKey)! }));
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
  const pricedItems = await ensureStripePrices(resolvedItems, stripeSecretKey, data.submissionId);
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

  pricedItems.forEach((item, index) => {
    params.set(`line_items[${index}][price]`, item.priceId);
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
  });

  const response = await stripeApi("/v1/checkout/sessions", stripeSecretKey, {
    method: "POST",
    body: params,
    idempotencyKey: data.submissionId,
  });
  return checkoutSessionSchema.parse(response);
}

export async function retrieveStripeSession(sessionId: string, stripeSecretKey: string) {
  const response = await stripeApi(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, stripeSecretKey);
  return checkoutStatusSchema.parse(response);
}
