ALTER TABLE public.matturo_loyalty_movements DROP CONSTRAINT IF EXISTS matturo_loyalty_movements_check;
DO $$ DECLARE c text; BEGIN
 FOR c IN SELECT conname FROM pg_constraint WHERE conrelid='public.matturo_loyalty_movements'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%-100%' LOOP
  EXECUTE format('ALTER TABLE public.matturo_loyalty_movements DROP CONSTRAINT %I', c);
 END LOOP; END $$;
ALTER TABLE public.matturo_loyalty_movements ADD CONSTRAINT matturo_loyalty_movements_points_sign CHECK ((kind='redeem' AND points<0) OR (kind='refund' AND points>0) OR (kind='earn' AND points>=0));

DROP FUNCTION IF EXISTS public.matturo_place_loyalty_order(jsonb, jsonb, text, boolean);
CREATE OR REPLACE FUNCTION public.matturo_place_loyalty_order(p_order jsonb, p_items jsonb, p_session_hash text DEFAULT NULL, p_reward_points integer DEFAULT 0)
 RETURNS TABLE(id uuid, reference text) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE wallet public.matturo_loyalty_wallets; previous public.matturo_orders; created record; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order->>'idempotency_key',0));
 SELECT * INTO previous FROM public.matturo_orders WHERE idempotency_key=p_order->>'idempotency_key';
 IF FOUND THEN
  IF previous.access_token_hash IS DISTINCT FROM p_order->>'access_token_hash' THEN RAISE EXCEPTION 'Tentativa repetida inválida'; END IF;
  RETURN QUERY SELECT previous.id,previous.reference; RETURN;
 END IF;
 IF p_reward_points < 0 OR p_reward_points > 1000 THEN RAISE EXCEPTION 'Recompensa inválida'; END IF;
 IF p_reward_points > 0 THEN
  SELECT w.* INTO wallet FROM public.matturo_loyalty_wallets w JOIN public.matturo_loyalty_sessions s ON s.wallet_id=w.id WHERE s.token_hash=p_session_hash AND s.revoked_at IS NULL AND s.expires_at>now() AND w.phone=public.matturo_loyalty_phone(p_order->>'customer_phone') FOR UPDATE OF w;
  IF NOT FOUND THEN RAISE EXCEPTION 'Confirme o seu telemóvel para resgatar'; END IF;
  IF wallet.balance<p_reward_points THEN RAISE EXCEPTION 'Não tem pontos suficientes'; END IF;
 END IF;
 SELECT * INTO created FROM public.matturo_place_order(p_order,p_items);
 IF p_reward_points > 0 THEN
  INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet.id,created.id,'redeem',-p_reward_points);
  UPDATE public.matturo_loyalty_wallets SET balance=balance-p_reward_points WHERE public.matturo_loyalty_wallets.id=wallet.id;
 END IF;
 RETURN QUERY SELECT created.id,created.reference; END $function$;
REVOKE ALL ON FUNCTION public.matturo_place_loyalty_order(jsonb,jsonb,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_place_loyalty_order(jsonb,jsonb,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.matturo_loyalty_order_status()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE wallet uuid; movement_points integer; spent integer; BEGIN
 IF TG_OP='UPDATE' AND NEW.customer_phone IS DISTINCT FROM OLD.customer_phone THEN RAISE EXCEPTION 'Telemóvel do pedido não pode ser alterado'; END IF;
 INSERT INTO public.matturo_loyalty_wallets(phone) VALUES(public.matturo_loyalty_phone(NEW.customer_phone)) ON CONFLICT(phone) DO NOTHING;
 SELECT id INTO wallet FROM public.matturo_loyalty_wallets WHERE phone=public.matturo_loyalty_phone(NEW.customer_phone) FOR UPDATE;
 IF NEW.status='concluido' THEN
  INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet,NEW.id,'earn',floor(NEW.subtotal_cents/100.0)::integer) ON CONFLICT(order_id,kind) DO NOTHING RETURNING points INTO movement_points;
  IF FOUND THEN UPDATE public.matturo_loyalty_wallets SET balance=balance+movement_points WHERE id=wallet; END IF;
 ELSIF NEW.status='cancelado' THEN
  SELECT -points INTO spent FROM public.matturo_loyalty_movements WHERE order_id=NEW.id AND kind='redeem';
  IF spent IS NOT NULL AND spent>0 THEN
   INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet,NEW.id,'refund',spent) ON CONFLICT(order_id,kind) DO NOTHING RETURNING points INTO movement_points;
   IF FOUND THEN UPDATE public.matturo_loyalty_wallets SET balance=balance+movement_points WHERE id=wallet; END IF;
  END IF;
 END IF; RETURN NEW; END $function$;