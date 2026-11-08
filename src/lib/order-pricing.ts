import { dishes, dishTotal, selectionValid, type Dish } from "./menu";

export type OrderLineInput = { productId: string; qty: number; options?: Record<string, string> | undefined; selected?: Record<string, number> | undefined };
export type PricedLine = { dish_id: string; name: string; options: Record<string, string>; unit_price_cents: number; qty: number; line_total_cents: number };

const cents = (euros: number) => Math.round(euros * 100);

/** Recomputes a cart line from current database options; browser prices and labels are never authoritative. */
export function priceLine(line: OrderLineInput, menu: Dish[] = dishes): PricedLine {
  const dish = menu.find((item) => item.id === line.productId);
  if (!dish || !dish.available || !dish.visible) throw new Error("Um dos produtos já não está disponível. Reveja o seu pedido.");
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 50) throw new Error("Quantidade inválida.");
  const selected: Record<string, number> = {};
  const options: Record<string, string> = {};
  if (line.options?.["Observações"]?.trim()) options["Observações"] = line.options["Observações"].trim();

  if (line.selected) {
    Object.assign(selected, line.selected);
    if (!selectionValid(dish, selected)) throw new Error(`Reveja as opções de ${dish.name}.`);
    for (const group of dish.groups) {
      const chosen = group.modifiers.filter((modifier) => (selected[modifier.id] ?? 0) > 0);
      if (chosen.length) options[group.name] = chosen.map((modifier) => `${selected[modifier.id]}× ${modifier.name}`).join(", ");
    }
  } else {
    for (const [groupName, value] of Object.entries(line.options ?? {})) {
      if (groupName === "Observações") continue;
      const group = dish.groups.find((item) => item.name === groupName);
      if (!group) throw new Error(`Opção inválida em ${dish.name}. Reveja o produto no cardápio.`);
      for (const part of value.split(", ")) {
        const match = /^(\d+)× (.+)$/.exec(part);
        const modifier = match && group.modifiers.find((item) => item.name === match[2]);
        if (!match || !modifier) throw new Error(`Opção inválida em ${dish.name}. Reveja o produto no cardápio.`);
        selected[modifier.id] = (selected[modifier.id] ?? 0) + Number(match[1]);
      }
      options[groupName] = value;
    }
    if (!selectionValid(dish, selected)) throw new Error(`Reveja as opções de ${dish.name}.`);
  }
  const unit = cents(dishTotal(dish, selected));
  return { dish_id: dish.id, name: dish.name, options, unit_price_cents: unit, qty: line.qty, line_total_cents: unit * line.qty };
}

export const orderStatuses = ["novo", "aceite", "em_preparacao", "pronto", "concluido", "cancelado"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const orderStatusLabels: Record<OrderStatus, string> = { novo: "Novo", aceite: "Aceite", em_preparacao: "Em preparação", pronto: "Pronto", concluido: "Concluído", cancelado: "Cancelado" };
const next: Record<OrderStatus, OrderStatus[]> = { novo: ["aceite", "cancelado"], aceite: ["em_preparacao", "cancelado"], em_preparacao: ["pronto", "cancelado"], pronto: ["concluido", "cancelado"], concluido: [], cancelado: [] };
export function canMoveOrder(from: OrderStatus, to: OrderStatus) { return next[from].includes(to); }
export function nextOrderSteps(from: OrderStatus) { return next[from]; }
export function orderAccessValid(expires: string | null, revoked: string | null, now = Date.now()) { return !revoked && (!expires || Date.parse(expires) > now); }
