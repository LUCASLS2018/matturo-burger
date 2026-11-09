import { orderNumber } from "./order-number";

type TicketOrder = {
  reference: string; daily_number?: number | null; order_day?: string | null;
  customer_name: string; customer_phone: string; service: string;
  address?: string | null; postal_code?: string | null; notes?: string | null;
  created_at: string; scheduled_for?: string | null; delivery_fee_cents: number; total_cents: number;
  matturo_order_items: { name: string; options: unknown; qty: number; line_total_cents: number }[];
};

const esc = (v: string) => v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

/** Opens an 80 mm receipt and the browser print dialog (pick the thermal printer there). */
export function printTicket(order: TicketOrder) {
  const items = order.matturo_order_items.flatMap((i) => Array.from({ length: Math.max(1, i.qty) }, () => i)).map((i) =>
    `<div class="row"><b>1x ${esc(i.name)}</b><span>${eur(i.line_total_cents / Math.max(1, i.qty))}</span></div>` +
    Object.entries((i.options ?? {}) as Record<string, string>).map(([k, v]) => `<div class="opt">${esc(k)}: ${esc(String(v))}</div>`).join("")).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${orderNumber(order)}</title><style>
@page{size:80mm auto;margin:0}body{width:72mm;margin:0 auto;padding:4mm 0;font:12px/1.35 monospace;color:#000}
h1{font-size:16px;text-align:center;margin:0}.big{font-size:22px;text-align:center;font-weight:bold;margin:4px 0}
.c{text-align:center}hr{border:0;border-top:1px dashed #000;margin:6px 0}.row{display:flex;justify-content:space-between;gap:6px}
.opt{padding-left:10px;font-size:11px}.tot{font-size:15px;font-weight:bold}</style></head><body>
<h1>MATTURO BURGER</h1><div class="big">#${orderNumber(order)}</div>
<div class="c">${esc(order.service)} · ${new Date(order.created_at).toLocaleString("pt-PT")}</div>${order.scheduled_for ? `<div class="c"><b>AGENDADO: ${new Date(order.scheduled_for).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</b></div>` : ""}<hr>
<div><b>${esc(order.customer_name)}</b></div><div>${esc(order.customer_phone)}</div>
${order.address ? `<div>${esc(order.address)}</div><div>${esc(order.postal_code ?? "")}</div>` : ""}<hr>
${items}<hr>
${order.notes ? `<div style="white-space:pre-line">${esc(order.notes)}</div><hr>` : ""}
${order.delivery_fee_cents ? `<div class="row"><span>Entrega</span><span>${eur(order.delivery_fee_cents)}</span></div>` : ""}
<div class="row tot"><span>TOTAL</span><span>${eur(order.total_cents)}</span></div><hr><div class="c">Obrigado!</div>
<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}
