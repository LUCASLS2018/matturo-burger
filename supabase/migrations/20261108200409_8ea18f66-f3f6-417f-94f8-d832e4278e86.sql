CREATE OR REPLACE FUNCTION public.matturo_order_cancel_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='cancelado' AND OLD.status IS DISTINCT FROM 'cancelado' THEN
    UPDATE public.matturo_deliveries SET status='cancelled' WHERE order_id=NEW.id AND status IN ('confirmed','active');
    UPDATE public.matturo_tracking_links SET revoked_at=now() WHERE revoked_at IS NULL AND delivery_id IN (SELECT id FROM public.matturo_deliveries WHERE order_id=NEW.id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.matturo_order_cancel_delivery() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER matturo_order_cancel_delivery AFTER UPDATE OF status ON public.matturo_orders FOR EACH ROW EXECUTE FUNCTION public.matturo_order_cancel_delivery();