CREATE TABLE public.matturo_loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.matturo_profiles(id),
  order_id uuid NOT NULL UNIQUE REFERENCES public.matturo_orders(id),
  points integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matturo_loyalty_redemptions TO authenticated;
GRANT ALL ON public.matturo_loyalty_redemptions TO service_role;
ALTER TABLE public.matturo_loyalty_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer reads own redemptions" ON public.matturo_loyalty_redemptions FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Admin reads redemptions" ON public.matturo_loyalty_redemptions FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
CREATE INDEX ON public.matturo_loyalty_redemptions(customer_id);