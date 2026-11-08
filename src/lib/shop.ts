import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_BASE = "https://kgspzibqeervjmvxnboy.supabase.co/storage/v1/object/public/product-images/";

export function imageUrl(storagePath: string | null | undefined) {
  if (!storagePath) return null;
  return STORAGE_BASE + storagePath.split("/").map(encodeURIComponent).join("/");
}

export type Category = { id: string; name: string; slug: string; parentId: string | null; count: number };
export type ProductImage = { url: string; alt: string };
export type ProductCardDTO = {
  id: string;
  name: string;
  slug: string;
  price: number;
  regularPrice: number | null;
  onSale: boolean;
  minPrice: number;
  maxPrice: number;
  image: string | null;
  ribbons: string[];
  categoryIds: string[];
  shortDescription: string;
  featured: boolean;
  createdAt: string | null;
};
export type Variation = {
  id: string;
  price: number;
  regularPrice: number | null;
  onSale: boolean;
  inStock: boolean;
  options: Record<string, string>;
};
export type OptionGroup = { name: string; values: string[] };
export type ProductDetailDTO = ProductCardDTO & {
  description: string;
  images: ProductImage[];
  variations: Variation[];
  optionGroups: OptionGroup[];
  categories: Category[];
};

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

type RawImage = { storage_path: string | null; alt_text: string | null; position: number | null; is_primary: boolean };
function sortImages(imgs: RawImage[]) {
  return [...imgs].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || (a.position ?? 0) - (b.position ?? 0));
}

const CARD_SELECT =
  "id,name,slug,price,regular_price,sale_price,on_sale,short_description,featured,created_at," +
  "product_images(storage_path,alt_text,position,is_primary)," +
  "product_ribbon_links(product_ribbons(name))," +
  "product_category_links(category_id)," +
  "product_variations(price)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCard(p: any): ProductCardDTO {
  const imgs = sortImages(p.product_images ?? []);
  const varPrices: number[] = (p.product_variations ?? []).map((v: { price: unknown }) => num(v.price)).filter((n: number | null): n is number => n !== null);
  const base = num(p.price) ?? 0;
  const prices = varPrices.length ? varPrices : [base];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: base,
    regularPrice: num(p.regular_price),
    onSale: !!p.on_sale,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    image: imageUrl(imgs[0]?.storage_path),
    ribbons: (p.product_ribbon_links ?? []).map((r: { product_ribbons: { name: string } | null }) => r.product_ribbons?.name).filter(Boolean),
    categoryIds: (p.product_category_links ?? []).map((c: { category_id: string }) => c.category_id),
    shortDescription: p.short_description ?? "",
    featured: !!p.featured,
    createdAt: p.created_at,
  };
}

async function fetchProducts(): Promise<ProductCardDTO[]> {
  const { data, error } = await supabase.from("products").select(CARD_SELECT).eq("status", "publish").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toCard);
}

async function fetchCategories(): Promise<Category[]> {
  const [{ data, error }, products] = await Promise.all([
    supabase.from("product_categories").select("id,name,slug,parent_id,menu_order").order("menu_order").order("name"),
    fetchProducts(),
  ]);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parent_id,
      count: products.filter((p) => p.categoryIds.includes(c.id)).length,
    }))
    .filter((c) => c.count > 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attrsFromJson(json: any): OptionGroup[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((a) => a && a.name && Array.isArray(a.options) && a.options.length)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((a) => ({ name: String(a.name), values: a.options.map(String) }));
}

async function fetchProduct(slug: string): Promise<ProductDetailDTO | null> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name,slug,price,regular_price,sale_price,on_sale,short_description,featured,created_at," +
        "product_images(storage_path,alt_text,position,is_primary)," +
        "product_ribbon_links(product_ribbons(name))," +
        "description,attributes," +
        "product_variations(id,price,regular_price,on_sale,stock_status,menu_order,status,product_variation_attribute_values(attribute_name,option))," +
        "product_category_links(category_id,product_categories(id,name,slug,parent_id))",
    )
    .eq("status", "publish")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = data as any;
  const card = toCard(p);
  const variations: Variation[] = (p.product_variations ?? [])
    .filter((v: { status: string }) => v.status === "publish")
    .sort((a: { menu_order: number }, b: { menu_order: number }) => (a.menu_order ?? 0) - (b.menu_order ?? 0))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((v: any) => ({
      id: v.id,
      price: num(v.price) ?? card.price,
      regularPrice: num(v.regular_price),
      onSale: !!v.on_sale,
      inStock: v.stock_status !== "outofstock",
      options: Object.fromEntries(
        (v.product_variation_attribute_values ?? []).filter((a: { option: string | null }) => a.option).map((a: { attribute_name: string; option: string }) => [a.attribute_name, a.option]),
      ),
    }));

  const jsonGroups = attrsFromJson(p.attributes);
  let optionGroups: OptionGroup[];
  if (variations.length) {
    const names = new Map<string, Set<string>>();
    for (const v of variations) for (const [k, val] of Object.entries(v.options)) {
      if (!names.has(k)) names.set(k, new Set());
      names.get(k)!.add(val);
    }
    optionGroups = [...names.entries()].map(([name, set]) => {
      const order = jsonGroups.find((g) => g.name === name)?.values ?? [];
      const values = [...set].sort((a, b) => {
        const ia = order.indexOf(a), ib = order.indexOf(b);
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
      });
      return { name, values };
    });
    optionGroups.sort((a, b) => {
      const ia = jsonGroups.findIndex((g) => g.name === a.name), ib = jsonGroups.findIndex((g) => g.name === b.name);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  } else {
    optionGroups = jsonGroups;
  }

  return {
    ...card,
    description: p.description ?? "",
    images: sortImages(p.product_images ?? [])
      .map((i) => ({ url: imageUrl(i.storage_path)!, alt: i.alt_text || p.name }))
      .filter((i) => i.url),
    variations,
    optionGroups,
    categories: (p.product_category_links ?? [])
      .map((l: { product_categories: { id: string; name: string; slug: string; parent_id: string | null } | null }) => l.product_categories)
      .filter(Boolean)
      .map((c: { id: string; name: string; slug: string; parent_id: string | null }) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent_id, count: 0 })),
  };
}

export const productsQuery = queryOptions({ queryKey: ["products"], queryFn: fetchProducts, staleTime: 60_000 });
export const categoriesQuery = queryOptions({ queryKey: ["categories"], queryFn: fetchCategories, staleTime: 60_000 });
export const productQuery = (slug: string) =>
  queryOptions({ queryKey: ["product", slug], queryFn: () => fetchProduct(slug), staleTime: 60_000 });

const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
export const formatPrice = (n: number) => fmt.format(n);

/** Strip simple markdown markers (** and __) from imported descriptions. */
export function cleanText(s: string) {
  return s.replace(/\*\*|__/g, "").replace(/<[^>]+>/g, "").trim();
}
