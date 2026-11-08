import { createMiddleware } from "@tanstack/react-start";
export const attachDeliveryAuth = createMiddleware({type:"function"}).client(async ({next})=>{
  const {supabase}=await import("@/integrations/supabase/client");
  const {data}=await supabase.auth.getSession();
  return next({headers:data.session?{Authorization:`Bearer ${data.session.access_token}`}:{}});
});