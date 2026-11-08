REVOKE ALL ON FUNCTION public.matturo_create_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.matturo_delivery_audit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.matturo_delivery_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.matturo_touch() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.matturo_has_role(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.matturo_set_delivery_state(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.matturo_record_position(uuid,double precision,double precision,double precision) FROM PUBLIC, anon;
CREATE POLICY tracking_links_deny ON public.matturo_tracking_links FOR ALL TO authenticated USING(false) WITH CHECK(false);