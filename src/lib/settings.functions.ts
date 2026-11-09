import {createServerFn} from '@tanstack/react-start';
import {setResponseHeader} from '@tanstack/react-start/server';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import type {Database} from '@/integrations/supabase/types';
import {zoneSchema} from './restaurant-settings';
import {isRestaurantOpen} from './opening-hours';
export const publicSettings=createServerFn({method:'GET'}).handler(async()=>{
 setResponseHeader('Cache-Control','no-store');const url=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_PUBLISHABLE_KEY'];if(!url||!key)throw new Error('Não foi possível consultar o atendimento.');
 const db=createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>{const headers=new Headers(init?.headers);if(key.startsWith('sb_')&&headers.get('Authorization')===`Bearer ${key}`)headers.delete('Authorization');headers.set('apikey',key);return fetch(input,{...init,headers});}}});
 const [settings,zones]=await Promise.all([db.from('matturo_restaurant_settings').select('orders_paused').eq('id',true).single(),db.from('matturo_delivery_zones').select('id,name,postal_prefixes,fee_cents').eq('active',true).order('name')]);if(settings.error||zones.error)throw new Error('Não foi possível consultar o atendimento.');return {paused:settings.data.orders_paused,zones:zones.data};
});
export const adminSettings=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 setResponseHeader('Cache-Control','no-store');const role=await context.supabase.rpc('matturo_has_role',{wanted:'admin'});if(role.error||!role.data)throw new Error('Acesso reservado ao administrador.');
 const [settings,zones]=await Promise.all([context.supabase.from('matturo_restaurant_settings').select('*').eq('id',true).single(),context.supabase.from('matturo_delivery_zones').select('*').order('name')]);if(settings.error||zones.error)throw new Error('Não foi possível carregar as configurações.');return {settings:settings.data,zones:zones.data};
});
export const setOrderPause=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>z.object({paused:z.boolean(),revision:z.number().int().positive()}).parse(input)).handler(async({data,context})=>{
 const role=await context.supabase.rpc('matturo_has_role',{wanted:'admin'});if(role.error||!role.data)throw new Error('Acesso reservado ao administrador.');const r=await context.supabase.from('matturo_restaurant_settings').update({orders_paused:data.paused,revision:data.revision+1}).eq('id',true).eq('revision',data.revision).select().maybeSingle();if(r.error)throw new Error('Não foi possível guardar. Tente novamente.');if(!r.data)throw new Error('As configurações foram alteradas noutra janela. Atualize antes de tentar novamente.');return r.data;
});
export const saveDeliveryZone=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>zoneSchema.extend({id:z.string().uuid().optional(),revision:z.number().int().positive().optional()}).parse(input)).handler(async({data,context})=>{
 const role=await context.supabase.rpc('matturo_has_role',{wanted:'admin'});if(role.error||!role.data)throw new Error('Acesso reservado ao administrador.');const {id,revision,...values}=data;if(id&&!revision)throw new Error('Atualize a zona antes de editar.');const r=id&&revision?await context.supabase.from('matturo_delivery_zones').update({...values,revision:revision+1}).eq('id',id).eq('revision',revision).select().maybeSingle():await context.supabase.from('matturo_delivery_zones').insert(values).select().single();if(r.error)throw new Error('Não foi possível guardar a zona. Tente novamente.');if(!r.data)throw new Error('Esta zona foi alterada noutra janela. Atualize antes de editar.');return r.data;
});
