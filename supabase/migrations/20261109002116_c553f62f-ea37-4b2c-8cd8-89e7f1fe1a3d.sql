CREATE OR REPLACE FUNCTION public.matturo_loyalty_phone(raw_phone text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN regexp_replace(raw_phone,'[^0-9]','','g') ~ '^[0-9]{9}$' THEN '+351'||regexp_replace(raw_phone,'[^0-9]','','g') WHEN raw_phone ~ '^\s*00' THEN '+'||substring(regexp_replace(raw_phone,'[^0-9]','','g') from 3) ELSE '+'||regexp_replace(raw_phone,'[^0-9]','','g') END $$;
REVOKE ALL ON FUNCTION public.matturo_loyalty_phone(text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.matturo_loyalty_phone(text) TO service_role;
CREATE TABLE public.matturo_loyalty_wallets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phone text NOT NULL UNIQUE,balance integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.matturo_loyalty_wallets TO authenticated; GRANT ALL ON public.matturo_loyalty_wallets TO service_role;
ALTER TABLE public.matturo_loyalty_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads loyalty wallets" ON public.matturo_loyalty_wallets FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
CREATE TRIGGER touch_matturo_loyalty_wallets BEFORE UPDATE ON public.matturo_loyalty_wallets FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
CREATE TABLE public.matturo_loyalty_movements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),wallet_id uuid NOT NULL REFERENCES public.matturo_loyalty_wallets(id),order_id uuid NOT NULL REFERENCES public.matturo_orders(id),kind text NOT NULL CHECK(kind IN ('earn','redeem','refund')),points integer NOT NULL CHECK ((kind='redeem' AND points=-100) OR (kind='refund' AND points=100) OR (kind='earn' AND points>=0)),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(order_id,kind));
GRANT SELECT ON public.matturo_loyalty_movements TO authenticated; GRANT ALL ON public.matturo_loyalty_movements TO service_role;
ALTER TABLE public.matturo_loyalty_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads loyalty movements" ON public.matturo_loyalty_movements FOR SELECT TO authenticated USING(public.matturo_has_role('admin'));
CREATE INDEX ON public.matturo_loyalty_movements(wallet_id);
CREATE TABLE public.matturo_loyalty_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),wallet_id uuid NOT NULL REFERENCES public.matturo_loyalty_wallets(id),token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.matturo_loyalty_sessions TO service_role;
ALTER TABLE public.matturo_loyalty_sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER touch_matturo_loyalty_sessions BEFORE UPDATE ON public.matturo_loyalty_sessions FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
INSERT INTO public.matturo_loyalty_wallets(phone) SELECT DISTINCT public.matturo_loyalty_phone(customer_phone) FROM public.matturo_orders;
INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) SELECT w.id,o.id,'earn',floor(o.subtotal_cents/100.0)::integer FROM public.matturo_orders o JOIN public.matturo_loyalty_wallets w ON w.phone=public.matturo_loyalty_phone(o.customer_phone) WHERE o.status='concluido';
INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) SELECT w.id,o.id,'redeem',-100 FROM public.matturo_loyalty_redemptions r JOIN public.matturo_orders o ON o.id=r.order_id JOIN public.matturo_loyalty_wallets w ON w.phone=public.matturo_loyalty_phone(o.customer_phone);
INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) SELECT m.wallet_id,m.order_id,'refund',100 FROM public.matturo_loyalty_movements m JOIN public.matturo_orders o ON o.id=m.order_id WHERE m.kind='redeem' AND o.status='cancelado';
UPDATE public.matturo_loyalty_wallets w SET balance=(SELECT COALESCE(sum(m.points),0)::integer FROM public.matturo_loyalty_movements m WHERE m.wallet_id=w.id);
CREATE OR REPLACE FUNCTION public.matturo_loyalty_order_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE wallet uuid; movement_points integer; BEGIN
 IF TG_OP='UPDATE' AND NEW.customer_phone IS DISTINCT FROM OLD.customer_phone THEN RAISE EXCEPTION 'Telemóvel do pedido não pode ser alterado'; END IF;
 INSERT INTO public.matturo_loyalty_wallets(phone) VALUES(public.matturo_loyalty_phone(NEW.customer_phone)) ON CONFLICT(phone) DO NOTHING;
 SELECT id INTO wallet FROM public.matturo_loyalty_wallets WHERE phone=public.matturo_loyalty_phone(NEW.customer_phone) FOR UPDATE;
 IF NEW.status='concluido' THEN
 INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet,NEW.id,'earn',floor(NEW.subtotal_cents/100.0)::integer) ON CONFLICT(order_id,kind) DO NOTHING RETURNING points INTO movement_points;
 IF FOUND THEN UPDATE public.matturo_loyalty_wallets SET balance=balance+movement_points WHERE id=wallet; END IF;
 ELSIF NEW.status='cancelado' AND EXISTS(SELECT 1 FROM public.matturo_loyalty_movements WHERE order_id=NEW.id AND kind='redeem') THEN
 INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet,NEW.id,'refund',100) ON CONFLICT(order_id,kind) DO NOTHING RETURNING points INTO movement_points;
 IF FOUND THEN UPDATE public.matturo_loyalty_wallets SET balance=balance+movement_points WHERE id=wallet; END IF;
 END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.matturo_loyalty_order_status() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.matturo_loyalty_order_status() TO service_role;
CREATE TRIGGER matturo_loyalty_order_status AFTER INSERT OR UPDATE ON public.matturo_orders FOR EACH ROW EXECUTE FUNCTION public.matturo_loyalty_order_status();
CREATE OR REPLACE FUNCTION public.matturo_place_loyalty_order(p_order jsonb,p_items jsonb,p_session_hash text DEFAULT NULL,p_reward boolean DEFAULT false) RETURNS TABLE(id uuid,reference text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE wallet public.matturo_loyalty_wallets; previous public.matturo_orders; created record; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order->>'idempotency_key',0));
 SELECT * INTO previous FROM public.matturo_orders WHERE idempotency_key=p_order->>'idempotency_key';
 IF FOUND THEN
 IF previous.access_token_hash IS DISTINCT FROM p_order->>'access_token_hash' THEN RAISE EXCEPTION 'Tentativa repetida inválida'; END IF;
 RETURN QUERY SELECT previous.id,previous.reference; RETURN;
 END IF;
 IF p_reward THEN
 SELECT w.* INTO wallet FROM public.matturo_loyalty_wallets w JOIN public.matturo_loyalty_sessions s ON s.wallet_id=w.id WHERE s.token_hash=p_session_hash AND s.revoked_at IS NULL AND s.expires_at>now() AND w.phone=public.matturo_loyalty_phone(p_order->>'customer_phone') FOR UPDATE OF w;
 IF NOT FOUND THEN RAISE EXCEPTION 'Confirme o seu telemóvel para resgatar'; END IF;
 IF wallet.balance<100 THEN RAISE EXCEPTION 'Ainda não tem 100 pontos para resgatar'; END IF;
 END IF;
 SELECT * INTO created FROM public.matturo_place_order(p_order,p_items);
 IF p_reward THEN
 INSERT INTO public.matturo_loyalty_movements(wallet_id,order_id,kind,points) VALUES(wallet.id,created.id,'redeem',-100);
 UPDATE public.matturo_loyalty_wallets SET balance=balance-100 WHERE public.matturo_loyalty_wallets.id=wallet.id;
 END IF;
 RETURN QUERY SELECT created.id,created.reference; END $$;
REVOKE ALL ON FUNCTION public.matturo_place_loyalty_order(jsonb,jsonb,text,boolean) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.matturo_place_loyalty_order(jsonb,jsonb,text,boolean) TO service_role;