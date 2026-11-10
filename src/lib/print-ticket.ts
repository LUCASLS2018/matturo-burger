import { orderNumber } from "./order-number";

type TicketOrder = {
  reference: string; daily_number?: number | null; order_day?: string | null;
  customer_name: string; customer_phone: string; service: string;
  address?: string | null; postal_code?: string | null; notes?: string | null;
  created_at: string; scheduled_for?: string | null; delivery_fee_cents: number; total_cents: number;
  matturo_order_items: { name: string; options: unknown; qty: number; line_total_cents: number }[];
};

/** "cozinha" prints what the kitchen needs (no prices, no customer data); "cliente" prints the full receipt. */
export type TicketAudience = "cozinha" | "cliente";

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/** The customer's own notes, without the payment line the checkout adds. */
export function kitchenNotes(notes: string | null | undefined) {
  return (notes ?? "").split("\n").filter((line) => !line.startsWith("Pagamento:")).join("\n").trim();
}

const itemRows = (order: TicketOrder, withPrices: boolean) =>
  order.matturo_order_items
    .flatMap((i) => Array.from({ length: Math.max(1, i.qty) }, () => i))
    .map((i) =>
      `<div class="row"><b>1x ${esc(i.name)}</b>${withPrices ? `<span>${eur(i.line_total_cents / Math.max(1, i.qty))}</span>` : ""}</div>` +
      Object.entries((i.options ?? {}) as Record<string, string>)
        .map(([k, v]) => `<div class="opt">${esc(k)}: ${esc(String(v))}</div>`)
        .join(""),
    )
    .join("");

const head = (title: string) => `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page{size:80mm auto;margin:0}html,body{margin:0;padding:0}body{width:100%;box-sizing:border-box;padding:2mm 1.5mm;font:bold 17px/1.35 Arial,Helvetica,sans-serif;color:#000;-webkit-print-color-adjust:exact}
h1{font-size:24px;text-align:center;margin:0}.big{font-size:40px;text-align:center;font-weight:900;margin:4px 0}
.tag{font-size:22px;text-align:center;font-weight:900;letter-spacing:2px;margin:2px 0}
.c{text-align:center}hr{border:0;border-top:2px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;gap:6px}
.opt{padding-left:10px;font-size:15px;font-weight:normal}.tot{font-size:24px;font-weight:900}</style></head><body>`;

/** Builds the 80 mm receipt markup for the chosen audience. */
export function ticketHtml(order: TicketOrder, audience: TicketAudience): string {
  const number = orderNumber(order);
  const scheduled = order.scheduled_for
    ? `<div class="c"><b>AGENDADO: ${new Date(order.scheduled_for).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</b></div>`
    : "";

  if (audience === "cozinha") {
    const notes = kitchenNotes(order.notes);
    return head(`Cozinha #${number}`) +
      `<h1>MATTURO BURGER</h1><div class="tag">COZINHA</div><div class="big">#${number}</div>` +
      `<div class="c">${esc(order.service)} · ${new Date(order.created_at).toLocaleString("pt-PT")}</div>${scheduled}<hr>` +
      itemRows(order, false) + `<hr>` +
      (notes ? `<div class="tag">NOTAS</div><div style="white-space:pre-line">${esc(notes)}</div><hr>` : "") +
      `<div class="c">BOM TRABALHO!</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  }

  return head(`Pedido #${number}`) +
    `<h1>MATTURO BURGER</h1><div class="big">#${number}</div>` +
    `<div class="c">${esc(order.service)} · ${new Date(order.created_at).toLocaleString("pt-PT")}</div>${scheduled}<hr>` +
    `<div><b>${esc(order.customer_name)}</b></div><div>${esc(order.customer_phone)}</div>` +
    (order.address ? `<div>${esc(order.address)}</div><div>${esc(order.postal_code ?? "")}</div>` : "") + `<hr>` +
    itemRows(order, true) + `<hr>` +
    (order.notes ? `<div style="white-space:pre-line">${esc(order.notes)}</div><hr>` : "") +
    (order.delivery_fee_cents ? `<div class="row"><span>Entrega</span><span>${eur(order.delivery_fee_cents)}</span></div>` : "") +
    `<div class="row tot"><span>TOTAL</span><span>${eur(order.total_cents)}</span></div><hr><div class="c">Obrigado!</div>` +
    `<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
}

/** Opens an 80 mm receipt and the browser print dialog (pick the thermal printer there). */
export function printTicket(order: TicketOrder, audience: TicketAudience = "cliente") {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(ticketHtml(order, audience));
  w.document.close();
  return true;
}
