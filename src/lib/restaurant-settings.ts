import { z } from "zod";
export const zoneSchema = z.object({name:z.string().trim().min(1).max(100),postal_prefixes:z.array(z.string().regex(/^\d{4}$/)).min(1).max(100),fee_cents:z.number().int().min(0).max(100000),active:z.boolean()});
export function zoneMatches(postalCode:string,prefixes:string[]){return /^\d{4}-\d{3}$/.test(postalCode.trim())&&prefixes.includes(postalCode.trim().slice(0,4));}
export function orderingAllowed(paused:boolean){return !paused;}
export type DeliveryZone = {name:string;postal_prefixes:string[];fee_cents:number};
export function findZone(postalCode:string,zones:DeliveryZone[]){return zones.find(z=>zoneMatches(postalCode,z.postal_prefixes))??null;}
