CREATE TABLE public.matturo_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reference text NOT NULL UNIQUE,
 customer_name text NOT NULL,
 customer_phone text NOT NULL,
 service text NOT NULL CHECK (service IN ('Retirada','Delivery','Comer no local')),
 address text, postal_code text, zone_name text,
 delivery_fee_cents integer NOT NULL DEFAULT 0,
 subtotal_cents integer NOT NULL, total_cents integer NOT NULL,
 notes text,
 status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','aceite','em_preparacao','pronto','concluido','cancelado')),
 access_token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.matturo_orders TO authenticated;
GRANT ALL ON public.matturo_orders TO service_role;
ALTER TABLE public.matturo_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_admin_read ON public.matturo_orders FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
CREATE POLICY orders_admin_update ON public.matturo_orders FOR UPDATE TO authenticated USING (public.matturo_has_role('admin')) WITH CHECK (public.matturo_has_role('admin'));
CREATE TRIGGER matturo_orders_touch BEFORE UPDATE ON public.matturo_orders FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();

CREATE TABLE public.matturo_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.matturo_orders(id) ON DELETE CASCADE,
 dish_id text NOT NULL, name text NOT NULL,
 options jsonb NOT NULL DEFAULT '{}'::jsonb,
 unit_price_cents integer NOT NULL, qty integer NOT NULL CHECK (qty > 0),
 line_total_cents integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.matturo_order_items TO authenticated;
GRANT ALL ON public.matturo_order_items TO service_role;
ALTER TABLE public.matturo_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_items_admin_read ON public.matturo_order_items FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
CREATE TRIGGER matturo_order_items_touch BEFORE UPDATE ON public.matturo_order_items FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
CREATE INDEX matturo_order_items_order ON public.matturo_order_items(order_id);
CREATE INDEX matturo_orders_created ON public.matturo_orders(created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.matturo_orders;