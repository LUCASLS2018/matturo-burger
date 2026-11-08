ALTER TABLE public.matturo_orders
  ADD COLUMN customer_id uuid REFERENCES public.matturo_profiles(id) ON DELETE SET NULL,
  ADD COLUMN idempotency_key text UNIQUE,
  ADD COLUMN request_fingerprint text,
  ADD COLUMN access_expires_at timestamptz DEFAULT (now() + interval '30 days'),
  ADD COLUMN access_revoked_at timestamptz;
CREATE INDEX matturo_orders_customer_created ON public.matturo_orders(customer_id, created_at DESC);
CREATE INDEX matturo_orders_rate_limit ON public.matturo_orders(request_fingerprint, created_at DESC);
CREATE POLICY orders_customer_read ON public.matturo_orders FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY order_items_customer_read ON public.matturo_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.matturo_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));

CREATE TABLE public.matturo_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.matturo_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  actor_id uuid REFERENCES public.matturo_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matturo_order_events TO authenticated;
GRANT ALL ON public.matturo_order_events TO service_role;
ALTER TABLE public.matturo_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_events_read ON public.matturo_order_events FOR SELECT TO authenticated USING (public.matturo_has_role('admin') OR EXISTS (SELECT 1 FROM public.matturo_orders o WHERE o.id = order_id AND o.customer_id = auth.uid()));
CREATE TRIGGER touch_matturo_order_events BEFORE UPDATE ON public.matturo_order_events FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();

CREATE OR REPLACE FUNCTION public.matturo_order_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.matturo_order_events(order_id,status,actor_id) VALUES(NEW.id,NEW.status,auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER matturo_order_audit_trigger AFTER INSERT OR UPDATE OF status ON public.matturo_orders FOR EACH ROW EXECUTE FUNCTION public.matturo_order_audit();
INSERT INTO public.matturo_order_events(order_id,status,actor_id,created_at)
SELECT id,status,NULL,created_at FROM public.matturo_orders;

DROP POLICY settings_read ON public.matturo_restaurant_settings;
CREATE POLICY settings_read ON public.matturo_restaurant_settings FOR SELECT TO anon, authenticated USING (id = true);

REVOKE ALL ON FUNCTION public.matturo_has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.matturo_has_role(text) TO authenticated;