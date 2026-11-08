import canecaDeTimePhoto from "@/assets/products/caneca-de-time-500ml.png.asset.json";
import dalmataFrontPhoto from "@/assets/products/cachorro-dalmata-25cm-frente.jpg.asset.json";

// AI-cleaned studio photos (made from the real product photo), keyed by product slug.
// Shown first on the product page and in the cart; the original photos stay in the gallery.
const files = import.meta.glob("@/assets/products/*.jpg", { eager: true, import: "default" }) as Record<string, string>;

const bySlug: Record<string, string> = {};
for (const [path, url] of Object.entries(files)) {
  const slug = path.split("/").pop()!.replace(/\.jpg$/, "");
  bySlug[slug] = url;
}

bySlug["caneca-de-time-500ml"] = canecaDeTimePhoto.url;

export function studioPhoto(slug: string): string | null {
  return bySlug[slug] ?? null;
}
