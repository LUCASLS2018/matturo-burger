export const deliveryLabels: Record<string,string> = { confirmed:"Confirmada", active:"Em entrega", delivered:"Entregue", cancelled:"Cancelada" };
export function trackingActive(status: string) { return status === "active"; }
export function validTrackingLink(expires: string, revoked: string | null, now = Date.now()) { return !revoked && Date.parse(expires) > now; }
export async function tokenHash(token: string) { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)); return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join(""); }