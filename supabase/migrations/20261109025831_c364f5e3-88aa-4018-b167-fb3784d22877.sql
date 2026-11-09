ALTER TABLE public.matturo_orders
  ADD COLUMN source text NOT NULL DEFAULT 'web' CHECK (source IN ('app','web','telefone'));

CREATE OR REPLACE FUNCTION public.matturo_place_order(p_order jsonb, p_items jsonb)
RETURNS TABLE(id uuid, reference text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  existing_order public.matturo_orders;
  new_id uuid;
  new_reference text := p_order->>'reference';
  idem text := p_order->>'idempotency_key';
  fingerprint text := p_order->>'request_fingerprint';
  new_source text := CASE WHEN p_order->>'source' IN ('app','web','telefone') THEN p_order->>'source' ELSE 'web' END;
BEGIN
  IF idem IS NULL OR idem !~ '^[0-9a-f-]{36}$' OR new_reference IS NULL OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'Pedido inválido';
  END IF;
  SELECT * INTO existing_order FROM public.matturo_orders WHERE idempotency_key = idem;
  IF FOUND THEN
    IF existing_order.access_token_hash IS DISTINCT FROM p_order->>'access_token_hash' THEN RAISE EXCEPTION 'Tentativa repetida inválida'; END IF;
    RETURN QUERY SELECT existing_order.id,existing_order.reference;
    RETURN;
  END IF;
  IF fingerprint IS NOT NULL AND (SELECT count(*) FROM public.matturo_orders WHERE request_fingerprint = fingerprint AND created_at > now() - interval '10 minutes') >= 10 THEN
    RAISE EXCEPTION 'Demasiados pedidos seguidos. Aguarde alguns minutos.';
  END IF;
  INSERT INTO public.matturo_orders(
    reference,customer_name,customer_phone,service,source,address,postal_code,zone_name,
    delivery_fee_cents,subtotal_cents,total_cents,notes,access_token_hash,
    idempotency_key,request_fingerprint,access_expires_at
  ) VALUES(
    new_reference,p_order->>'customer_name',p_order->>'customer_phone',p_order->>'service',new_source,
    NULLIF(p_order->>'address',''),NULLIF(p_order->>'postal_code',''),NULLIF(p_order->>'zone_name',''),
    (p_order->>'delivery_fee_cents')::integer,(p_order->>'subtotal_cents')::integer,(p_order->>'total_cents')::integer,
    NULLIF(p_order->>'notes',''),p_order->>'access_token_hash',idem,fingerprint,
    COALESCE((p_order->>'access_expires_at')::timestamptz,now() + interval '30 days')
  ) RETURNING public.matturo_orders.id INTO new_id;
  INSERT INTO public.matturo_order_items(order_id,dish_id,name,options,unit_price_cents,qty,line_total_cents)
  SELECT new_id,x.dish_id,x.name,x.options,x.unit_price_cents,x.qty,x.line_total_cents
  FROM jsonb_to_recordset(p_items) AS x(dish_id text,name text,options jsonb,unit_price_cents integer,qty integer,line_total_cents integer);
  RETURN QUERY SELECT new_id,new_reference;
END $$;