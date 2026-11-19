CREATE OR REPLACE FUNCTION public.matturo_place_staff_reward_order(p_order jsonb, p_items jsonb, p_reward_points integer)
 RETURNS TABLE(id uuid, reference text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE wallet public.matturo_loyalty_wallets; previous public.matturo_orders; created record; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order->>'idempotency_key',0));
 SELECT * INTO previous FROM public.matturo_orders WHERE idempotency_key=p_order->>'idempotency_key';
 IF FOUND THEN
  IF previous.access_token_hash IS DISTINCT FROM p_order->>'access_token_hash' THEN RAISE EXCEPTION 'Tentativa repetida inválida'; END IF;
  RETURN QUERY SELECT previous.id,previous.reference; RETURN;
 END IF;
 IF p_reward_points <= 0 OR p_reward_points > 1000 THEN RAISE EXCEPTION 'Recompensa inválida'; END IF;
 SELECT w.* INTO wallet FROM public.matturo_loyalty_wallets w WHERE w.phone=public.matturo_loyalty_phone(p_order->>'customer_phone') FOR UPDATE;
 IF NOT FOUND OR wallet.balance<p_reward_points THEN RAISE EXCEPTION 'Não tem pontos suficientes'; END IF;
 SELECT * INTO created FROM public.matturo_place_order(p_order,p_items);
 INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet.id,created.id,'redeem',-p_reward_points);
 UPDATE public.matturo_loyalty_wallets SET balance=balance-p_reward_points WHERE public.matturo_loyalty_wallets.id=wallet.id;
 RETURN QUERY SELECT created.id,created.reference; END $function$;
REVOKE ALL ON FUNCTION public.matturo_place_staff_reward_order(jsonb,jsonb,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_place_staff_reward_order(jsonb,jsonb,integer) TO service_role;