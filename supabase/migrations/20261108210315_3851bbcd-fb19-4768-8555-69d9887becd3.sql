DROP POLICY orders_courier_read ON public.matturo_orders;
CREATE POLICY orders_courier_read ON public.matturo_orders FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.matturo_deliveries d WHERE d.order_id = public.matturo_orders.id AND d.courier_id = auth.uid()));
DROP POLICY order_items_courier_read ON public.matturo_order_items;
CREATE POLICY order_items_courier_read ON public.matturo_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.matturo_deliveries d WHERE d.order_id = public.matturo_order_items.order_id AND d.courier_id = auth.uid()));