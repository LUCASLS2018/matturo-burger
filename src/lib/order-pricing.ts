import { dishes, dishTotal, selectionValid, type Dish } from "./menu";

export type OrderLineInput = { productId: string; qty: number; options: Record<string, string> };
export type PricedLine = { dish_id: string; name: string; options: Record<string, string>; unit_price_cents: number; qty: number; line_total_cents: number };

const cents = (euros: number) => Math.round(euros * 100);

/** Recomputes a cart line from the current menu; never trusts browser prices. */
export function priceLine(line: OrderLineInput, menu: Dish[] = dishes): PricedLine {
  const dish = menu.find((d) => d.id === line.productId);
  if (!dish || !dish.available) throw new Error("Um dos produtos já não está disponível. Reveja o seu pedido.");
  if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 50) throw new Error("Quantidade inválida.");
  const selected: Record<string, number> = {};
  for (const [group, value] of Object.entries(line.options)) {
    if (group === "Observações") continue;
    const g = dish.groups.find((x) => x.name === group);
    if (!g) throw new Error(`Opção inválida em ${dish.name}.`);
    for (const part of value.split(", ")) {
      const m = /^(\d+)× (.+)$/.exec(part);
      const mod = m && g.modifiers.find((x) => x.name === m[2]);
      if (!m || !mod) throw new Error(`Opção inválida em ${dish.name}.`);
      selected[mod.id] = (selected[mod.id] ?? 0) + Number(m[1]);
    }
  }
  if (!selectionValid(dish, selected)) throw new Error(`Reveja as opções de ${dish.name}.`);
  const unit = cents(dishTotal(dish, selected));
  return { dish_id: dish.id, name: dish.name, options: line.options, unit_price_cents: unit, qty: line.qty, line_total_cents: unit * line.qty };
}

export const orderStatuses = ["novo", "aceite", "em_preparacao", "pronto", "concluido", "cancelado"] as const;
export type OrderStatus = (typeof orderStatuses)[number];
export const orderStatusLabels: Record<OrderStatus, string> = { novo: "Novo", aceite: "Aceite", em_preparacao: "Em preparação", pronto: "Pronto", concluido: "Concluído", cancelado: "Cancelado" };
const next: Record<OrderStatus, OrderStatus[]> = { novo: ["aceite", "cancelado"], aceite: ["em_preparacao", "cancelado"], em_preparacao: ["pronto", "cancelado"], pronto: ["concluido", "cancelado"], concluido: [], cancelado: [] };
export function canMoveOrder(from: OrderStatus, to: OrderStatus) { return next[from].includes(to); }
export function nextOrderSteps(from: OrderStatus) { return next[from]; }
