CREATE OR REPLACE FUNCTION public.matturo_delete_closed_order(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.matturo_orders;
BEGIN
  IF NOT public.matturo_has_role('admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  SELECT * INTO o FROM public.matturo_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF o.status NOT IN ('concluido','cancelado') THEN RAISE EXCEPTION 'Só pedidos concluídos ou cancelados podem ser apagados'; END IF;
  DELETE FROM public.matturo_tracking_links WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = p_order_id);
  DELETE FROM public.matturo_delivery_positions WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = p_order_id);
  DELETE FROM public.matturo_delivery_events WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = p_order_id);
  DELETE FROM public.matturo_deliveries WHERE order_id = p_order_id;
  DELETE FROM public.matturo_push_tokens WHERE order_id = p_order_id;
  DELETE FROM public.matturo_loyalty_redemptions WHERE order_id = p_order_id;
  DELETE FROM public.matturo_loyalty_movements WHERE order_id = p_order_id;
  DELETE FROM public.matturo_order_events WHERE order_id = p_order_id;
  DELETE FROM public.matturo_order_items WHERE order_id = p_order_id;
  DELETE FROM public.matturo_orders WHERE id = p_order_id;
END $$;
REVOKE ALL ON FUNCTION public.matturo_delete_closed_order(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.matturo_delete_closed_order(uuid) TO authenticated;

DO $$ DECLARE oid uuid; BEGIN
  SELECT id INTO oid FROM public.matturo_orders WHERE reference = 'ML56CQ49A';
  IF oid IS NOT NULL THEN
    DELETE FROM public.matturo_tracking_links WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = oid);
    DELETE FROM public.matturo_delivery_positions WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = oid);
    DELETE FROM public.matturo_delivery_events WHERE delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id = oid);
    DELETE FROM public.matturo_deliveries WHERE order_id = oid;
    DELETE FROM public.matturo_push_tokens WHERE order_id = oid;
    DELETE FROM public.matturo_loyalty_redemptions WHERE order_id = oid;
    DELETE FROM public.matturo_loyalty_movements WHERE order_id = oid;
    DELETE FROM public.matturo_order_events WHERE order_id = oid;
    DELETE FROM public.matturo_order_items WHERE order_id = oid;
    DELETE FROM public.matturo_orders WHERE id = oid;
  END IF;
END $$;