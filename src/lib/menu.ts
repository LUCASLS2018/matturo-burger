import snapshot from "@/assets/matturo/menu.json";

export type Modifier = { id: string; name: string; price: number; max: number; revision?: number; position?: number };
export type ModifierGroup = { id: string; name: string; required: boolean; min: number; max: number; modifiers: Modifier[]; revision?: number; position?: number };
export type Dish = { id: string; name: string; slug: string; description: string; category: string; price: number; image: string | null; groups: ModifierGroup[]; available: boolean; visible: boolean };
export const dishes: Dish[] = snapshot.products.filter((product) => product.visible);
export const categories = snapshot.categories;

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  position: number;
  active: boolean;
  revision: number;
};

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
  position: number;
};

export type ModifierGroupRecord = {
  item_id: string;
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  position: number;
  revision: number;
};

export type ModifierRecord = {
  item_id: string;
  group_id: string;
  id: string;
  name: string;
  price_cents: number;
  max: number;
  position: number;
  revision: number;
};

export type EditableDish = Dish & { revision: number; imagePath: string | null; position: number };

/** Converts current database rows into the ordering model; the snapshot is only a legacy/test fallback. */
export function menuItemToDish(item: Omit<MenuItemRecord, "revision" | "position"> & Partial<Pick<MenuItemRecord, "revision" | "position">>, groups?: ModifierGroup[]): Dish {
  const source = snapshot.products.find((product) => product.id === item.id);
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    description: item.description,
    category: item.category,
    price: item.price_cents / 100,
    image: item.image,
    groups: groups ?? source?.groups ?? [],
    available: item.available,
    visible: item.visible,
  };
}

export function composeModifierGroups(groupRows: ModifierGroupRecord[], modifierRows: ModifierRecord[]): ModifierGroup[] {
  return [...groupRows].sort((a, b) => a.position - b.position).map((group) => ({
    id: group.id,
    name: group.name,
    required: group.required,
    min: group.min,
    max: group.max,
    position: group.position,
    revision: group.revision,
    modifiers: modifierRows.filter((modifier) => modifier.item_id === group.item_id && modifier.group_id === group.id)
      .sort((a, b) => a.position - b.position)
      .map((modifier) => ({ id: modifier.id, name: modifier.name, price: modifier.price_cents / 100, max: modifier.max, position: modifier.position, revision: modifier.revision })),
  }));
}

export function menuItemOrder(item: Pick<MenuItemRecord, "position">) {
  return item.position;
}

export function selectionValid(dish: Dish, selected: Record<string, number>) {
  const known = new Set(dish.groups.flatMap((group) => group.modifiers.map((modifier) => modifier.id)));
  if (Object.entries(selected).some(([id, quantity]) => !known.has(id) || !Number.isInteger(quantity) || quantity < 0)) return false;
  return dish.groups.every((group) => {
    const count = group.modifiers.reduce((sum, modifier) => sum + (selected[modifier.id] ?? 0), 0);
    return count <= group.max && (!group.required || count >= group.min) && group.modifiers.every((modifier) => (selected[modifier.id] ?? 0) <= modifier.max);
  });
}

export function dishTotal(dish: Dish, selected: Record<string, number>) {
  return dish.price + dish.groups.flatMap((group) => group.modifiers).reduce((sum, modifier) => sum + modifier.price * (selected[modifier.id] ?? 0), 0);
}
