import {createServerFn} from "@tanstack/react-start";
import {z} from "zod";
import {requireSupabaseAuth} from "@/integrations/supabase/auth-middleware";
import {tokenHash,validTrackingLink} from "./delivery";
const idSchema=z.object({id:z.string().uuid()});
export const deliveryDashboard=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=context.supabase;
 const roles=await db.from("matturo_user_roles").select("role").eq("user_id",context.userId); if(roles.error)throw roles.error;
 const admin=roles.data.some(r=>r.role==="admin");
 const profile=await db.from("matturo_profiles").select("*").eq("id",context.userId).maybeSingle();
 if(!profile.data){const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const result=await supabaseAdmin.from("matturo_profiles").upsert({id:context.userId,name:""},{onConflict:"id",ignoreDuplicates:true});if(result.error)throw result.error;}
 const deliveries=await db.from("matturo_deliveries").select("*").order("created_at",{ascending:false}).limit(100);if(deliveries.error)throw deliveries.error;
 const positions=await db.from("matturo_delivery_positions").select("*");if(positions.error)throw positions.error;
 const events=await db.from("matturo_delivery_events").select("*").order("created_at",{ascending:false}).limit(200);
 const profiles=admin?await db.from("matturo_profiles").select("*"):profile;
 const couriers=admin?await db.from("matturo_user_roles").select("user_id").eq("role","courier"):null;
 return {admin,courier:roles.data.some(r=>r.role==="courier"),userId:context.userId,profile:profile.data,profiles:Array.isArray(profiles.data)?profiles.data:[],courierIds:couriers?.data?.map(r=>r.user_id)??[],deliveries:deliveries.data,positions:positions.data,events:events.data??[]};
});
export const createDelivery=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input)=>z.object({reference:z.string().trim().min(1).max(100),destination:z.string().trim().min(5).max(300),courier_id:z.string().uuid(),destination_lat:z.number().min(-90).max(90),destination_lng:z.number().min(-180).max(180)}).parse(input)).handler(async({data,context})=>{const role=await context.supabase.rpc("matturo_has_role",{wanted:"admin"});if(!role.data)throw new Error("Sem acesso administrativo.");const r=await context.supabase.from("matturo_deliveries").insert(data).select().single();if(r.error)throw r.error;return r.data;});
export const changeDelivery=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>idSchema.extend({status:z.enum(["active","delivered"])}).parse(input)).handler(async({data,context})=>{const r=await context.supabase.rpc("matturo_set_delivery_state",{delivery:data.id,next_state:data.status});if(r.error)throw r.error;return true;});
export const recordPosition=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>idSchema.extend({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),accuracy:z.number().nonnegative().finite()}).parse(input)).handler(async({data,context})=>{const r=await context.supabase.rpc("matturo_record_position",{delivery:data.id,lat:data.lat,lng:data.lng,precision_m:data.accuracy});if(r.error)throw r.error;return true;});
export const issueTrackingLink=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator(input=>idSchema.parse(input)).handler(async({data,context})=>{
 const r=await context.supabase.rpc("matturo_has_role",{wanted:"admin"});if(!r.data)throw new Error("Sem acesso.");
 const d=await context.supabase.from("matturo_deliveries").select("id").eq("id",data.id).single();if(d.error)throw d.error;
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,"0")).join("");
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
 const revoked=await supabaseAdmin.from("matturo_tracking_links").update({revoked_at:new Date().toISOString()}).eq("delivery_id",data.id).is("revoked_at",null);if(revoked.error)throw revoked.error;
 const insert=await supabaseAdmin.from("matturo_tracking_links").insert({delivery_id:data.id,token_hash:await tokenHash(token),expires_at:new Date(Date.now()+86400000).toISOString()});if(insert.error)throw insert.error;return {token};
});
export const customerTracking=createServerFn({method:"POST"}).inputValidator(input=>z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(input)).handler(async({data})=>{
 const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
 const link=await supabaseAdmin.from("matturo_tracking_links").select("delivery_id,expires_at,revoked_at").eq("token_hash",await tokenHash(data.token)).maybeSingle();if(!link.data||!validTrackingLink(link.data.expires_at,link.data.revoked_at))throw new Error("Link inválido ou expirado.");
 const d=await supabaseAdmin.from("matturo_deliveries").select("reference,destination,destination_lat,destination_lng,status,updated_at").eq("id",link.data.delivery_id).single();if(d.error)throw d.error;
 const p=d.data.status==="active"?await supabaseAdmin.from("matturo_delivery_positions").select("latitude,longitude,recorded_at").eq("delivery_id",link.data.delivery_id).maybeSingle():null;
 return {delivery:d.data,position:p?.data??null};
});