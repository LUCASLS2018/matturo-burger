import snapshot from "@/assets/matturo/menu.json";
export type Modifier = { id: string; name: string; price: number; max: number };
export type ModifierGroup = { id: string; name: string; required: boolean; min: number; max: number; modifiers: Modifier[] };
export type Dish = { id: string; name: string; slug: string; description: string; category: string; price: number; image: string | null; groups: ModifierGroup[]; available: boolean; visible: boolean };
export const dishes: Dish[] = snapshot.products.filter(p => p.visible);
export const categories = snapshot.categories;

export type MenuItemRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price_cents: number;
  image: string | null;
  available: boolean;
  visible: boolean;
  revision: number;
};

export type EditableDish = Dish & { revision: number; imagePath: string | null };

/** Database fields supply current commercial data; the verified snapshot preserves the original option groups. */
export function menuItemToDish(item: Omit<MenuItemRecord, "revision">): Dish {
  const source = snapshot.products.find((product) => product.id === item.id);
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    category: item.category,
    price: item.price_cents / 100,
    image: item.image,
    groups: source?.groups ?? [],
    available: item.available,
    visible: item.visible,
  };
}

export function menuItemOrder(item: MenuItemRecord) {
  const index = snapshot.products.findIndex((product) => product.id === item.id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
export function selectionValid(dish: Dish, selected: Record<string, number>) {
  return dish.groups.every(g => {
    const count = g.modifiers.reduce((s,m) => s+(selected[m.id] ?? 0),0);
    return count <= g.max && (!g.required || count >= g.min) && g.modifiers.every(m => (selected[m.id] ?? 0) >= 0 && (selected[m.id] ?? 0) <= m.max);
  });
}
export function dishTotal(dish: Dish, selected: Record<string, number>) {
  return dish.price + dish.groups.flatMap(g => g.modifiers).reduce((s,m) => s+m.price*(selected[m.id] ?? 0),0);
}