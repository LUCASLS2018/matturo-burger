CREATE TABLE public.matturo_courier_availability (
  user_id uuid PRIMARY KEY REFERENCES public.matturo_profiles(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'available' CHECK (state IN ('available','busy','inactive')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matturo_courier_availability TO authenticated;
GRANT ALL ON public.matturo_courier_availability TO service_role;
ALTER TABLE public.matturo_courier_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY courier_availability_read ON public.matturo_courier_availability FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.matturo_has_role('admin'));
CREATE TRIGGER touch_matturo_courier_availability BEFORE UPDATE ON public.matturo_courier_availability FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
INSERT INTO public.matturo_courier_availability(user_id,state)
SELECT r.user_id,CASE WHEN EXISTS(SELECT 1 FROM public.matturo_deliveries d WHERE d.courier_id=r.user_id AND d.status IN ('confirmed','active')) THEN 'busy' ELSE 'available' END
FROM public.matturo_user_roles r WHERE r.role='courier';

ALTER TABLE public.matturo_deliveries DROP CONSTRAINT matturo_deliveries_status_check;
ALTER TABLE public.matturo_deliveries ADD CONSTRAINT matturo_deliveries_status_check CHECK (status IN ('confirmed','to_restaurant','collected','active','delivered','cancelled'));

CREATE OR REPLACE FUNCTION public.matturo_delivery_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.courier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=NEW.courier_id AND role='courier') THEN RAISE EXCEPTION 'Entregador não autorizado'; END IF;
  IF NEW.courier_id IS NOT NULL AND NEW.status IN ('confirmed','to_restaurant','collected','active') AND EXISTS(SELECT 1 FROM public.matturo_courier_availability a WHERE a.user_id=NEW.courier_id AND a.state='inactive') AND (TG_OP='INSERT' OR NEW.courier_id IS DISTINCT FROM OLD.courier_id) THEN RAISE EXCEPTION 'Entregador inativo'; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.status<>OLD.status AND NOT ((OLD.status='confirmed' AND NEW.status IN ('to_restaurant','cancelled')) OR (OLD.status='to_restaurant' AND NEW.status IN ('collected','cancelled')) OR (OLD.status='collected' AND NEW.status IN ('active','cancelled')) OR (OLD.status='active' AND NEW.status IN ('delivered','cancelled')) OR (OLD.status='confirmed' AND NEW.status='active') OR (OLD.status='active' AND NEW.status='cancelled')) THEN RAISE EXCEPTION 'Transição inválida'; END IF;
    IF OLD.status IN ('collected','active') AND NEW.courier_id IS DISTINCT FROM OLD.courier_id THEN RAISE EXCEPTION 'Não reatribuir entrega em curso'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.matturo_delivery_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining integer; current_state text;
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.matturo_delivery_events(delivery_id,status,actor_id) VALUES(NEW.id,NEW.status,auth.uid()); END IF;
  IF NEW.status IN ('delivered','cancelled') THEN
    DELETE FROM public.matturo_delivery_positions WHERE delivery_id=NEW.id;
    UPDATE public.matturo_tracking_links SET revoked_at=now() WHERE delivery_id=NEW.id AND revoked_at IS NULL;
  END IF;
  IF NEW.courier_id IS NOT NULL AND (TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status OR NEW.courier_id IS DISTINCT FROM OLD.courier_id) THEN
    SELECT count(*) INTO remaining FROM public.matturo_deliveries WHERE courier_id=NEW.courier_id AND status IN ('confirmed','to_restaurant','collected','active') AND id<>NEW.id;
    SELECT state INTO current_state FROM public.matturo_courier_availability WHERE user_id=NEW.courier_id;
    INSERT INTO public.matturo_courier_availability(user_id,state) VALUES(NEW.courier_id,CASE WHEN NEW.status IN ('confirmed','to_restaurant','collected','active') OR remaining>0 THEN 'busy' ELSE 'available' END)
    ON CONFLICT(user_id) DO UPDATE SET state=CASE WHEN EXCLUDED.state='available' AND public.matturo_courier_availability.state='inactive' THEN 'inactive' ELSE EXCLUDED.state END,revision=public.matturo_courier_availability.revision+1;
  END IF;
  IF NEW.status='delivered' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'delivered') AND NEW.order_id IS NOT NULL THEN
    UPDATE public.matturo_orders SET status='concluido' WHERE id=NEW.order_id AND status NOT IN ('concluido','cancelado');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.matturo_order_cancel_delivery()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status='cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    UPDATE public.matturo_deliveries SET status='cancelled' WHERE order_id=NEW.id AND status IN ('confirmed','to_restaurant','collected','active');
    UPDATE public.matturo_tracking_links SET revoked_at=now() WHERE revoked_at IS NULL AND delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id=NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.matturo_assign_order_courier(p_admin_id uuid,p_order_id uuid,p_courier_id uuid,p_destination text,p_lat double precision,p_lng double precision)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.matturo_orders; a public.matturo_courier_availability; new_id uuid;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=p_admin_id AND role='admin') THEN RAISE EXCEPTION 'Sem acesso administrativo'; END IF;
  SELECT * INTO o FROM public.matturo_orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.service<>'Delivery' OR o.address IS NULL OR o.status IN ('concluido','cancelado') THEN RAISE EXCEPTION 'Pedido não pode ser atribuído'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=p_courier_id AND role='courier') THEN RAISE EXCEPTION 'Entregador não autorizado'; END IF;
  INSERT INTO public.matturo_courier_availability(user_id) VALUES(p_courier_id) ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO a FROM public.matturo_courier_availability WHERE user_id=p_courier_id FOR UPDATE;
  IF a.state='inactive' THEN RAISE EXCEPTION 'Entregador inativo'; END IF;
  INSERT INTO public.matturo_deliveries(order_id,reference,destination,destination_lat,destination_lng,courier_id)
  VALUES(o.id,o.reference,p_destination,p_lat,p_lng,p_courier_id) RETURNING public.matturo_deliveries.id INTO new_id;
  UPDATE public.matturo_courier_availability SET state='busy',revision=revision+1 WHERE user_id=p_courier_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.matturo_assign_order_courier(uuid,uuid,uuid,text,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_assign_order_courier(uuid,uuid,uuid,text,double precision,double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.matturo_set_courier_availability(p_courier_id uuid,next_state text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE open_count integer;
BEGIN
  IF next_state NOT IN ('available','inactive') OR NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=p_courier_id AND role='courier') THEN RAISE EXCEPTION 'Operação não autorizada'; END IF;
  SELECT count(*) INTO open_count FROM public.matturo_deliveries WHERE courier_id=p_courier_id AND status IN ('confirmed','to_restaurant','collected','active');
  IF next_state='available' AND open_count>0 THEN RAISE EXCEPTION 'Conclua as entregas ativas antes de ficar disponível'; END IF;
  INSERT INTO public.matturo_courier_availability(user_id,state) VALUES(p_courier_id,next_state)
  ON CONFLICT(user_id) DO UPDATE SET state=EXCLUDED.state,revision=public.matturo_courier_availability.revision+1;
  RETURN next_state;
END $$;
REVOKE ALL ON FUNCTION public.matturo_set_courier_availability(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_set_courier_availability(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.matturo_set_delivery_state(actor uuid,delivery uuid,next_state text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.matturo_deliveries;
BEGIN
  SELECT * INTO d FROM public.matturo_deliveries WHERE id=delivery FOR UPDATE;
  IF NOT FOUND OR d.courier_id IS DISTINCT FROM actor OR NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=actor AND role='courier') THEN RAISE EXCEPTION 'Sem acesso'; END IF;
  IF NOT ((d.status='confirmed' AND next_state='to_restaurant') OR (d.status='to_restaurant' AND next_state='collected') OR (d.status='collected' AND next_state='active') OR (d.status='active' AND next_state='delivered')) THEN RAISE EXCEPTION 'Transição inválida'; END IF;
  UPDATE public.matturo_deliveries SET status=next_state,started_at=CASE WHEN next_state='active' THEN now() ELSE started_at END,completed_at=CASE WHEN next_state='delivered' THEN now() ELSE completed_at END WHERE id=delivery;
END $$;
REVOKE ALL ON FUNCTION public.matturo_set_delivery_state(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_set_delivery_state(uuid,uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.matturo_set_delivery_state(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.matturo_record_position(actor uuid,delivery uuid,lat double precision,lng double precision,precision_m double precision)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.matturo_deliveries;
BEGIN
  SELECT * INTO d FROM public.matturo_deliveries WHERE id=delivery FOR UPDATE;
  IF NOT FOUND OR d.courier_id IS DISTINCT FROM actor OR d.status<>'active' OR NOT EXISTS(SELECT 1 FROM public.matturo_user_roles WHERE user_id=actor AND role='courier') THEN RAISE EXCEPTION 'Rastreamento não autorizado'; END IF;
  INSERT INTO public.matturo_delivery_positions(delivery_id,latitude,longitude,accuracy) VALUES(delivery,lat,lng,precision_m)
  ON CONFLICT(delivery_id) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,accuracy=EXCLUDED.accuracy,recorded_at=now();
END $$;
REVOKE ALL ON FUNCTION public.matturo_record_position(uuid,uuid,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_record_position(uuid,uuid,double precision,double precision,double precision) TO service_role;
REVOKE ALL ON FUNCTION public.matturo_record_position(uuid,double precision,double precision,double precision) FROM PUBLIC,anon,authenticated;