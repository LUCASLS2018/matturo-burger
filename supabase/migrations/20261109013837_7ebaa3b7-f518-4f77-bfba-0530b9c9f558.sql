LOCK TABLE public.matturo_orders IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.matturo_orders ADD COLUMN order_day date, ADD COLUMN daily_number integer;
WITH numbered AS (SELECT id,(created_at AT TIME ZONE 'Europe/Lisbon')::date AS day,row_number() OVER (PARTITION BY (created_at AT TIME ZONE 'Europe/Lisbon')::date ORDER BY created_at,id)::integer AS number FROM public.matturo_orders)
UPDATE public.matturo_orders o SET order_day=n.day,daily_number=n.number FROM numbered n WHERE o.id=n.id;
ALTER TABLE public.matturo_orders ALTER COLUMN order_day SET NOT NULL, ALTER COLUMN daily_number SET NOT NULL, ADD CONSTRAINT matturo_orders_daily_number_unique UNIQUE(order_day,daily_number), ADD CONSTRAINT matturo_orders_daily_number_positive CHECK(daily_number>0);
CREATE TABLE public.matturo_order_daily_counters(order_day date PRIMARY KEY,last_number integer NOT NULL CHECK(last_number>0),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.matturo_order_daily_counters TO service_role;
REVOKE ALL ON public.matturo_order_daily_counters FROM anon,authenticated;
ALTER TABLE public.matturo_order_daily_counters ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER matturo_order_daily_counters_touch BEFORE UPDATE ON public.matturo_order_daily_counters FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();
INSERT INTO public.matturo_order_daily_counters(order_day,last_number) SELECT order_day,max(daily_number) FROM public.matturo_orders GROUP BY order_day;
CREATE FUNCTION public.matturo_next_daily_order_number(p_day date) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE assigned integer; BEGIN
INSERT INTO public.matturo_order_daily_counters AS c(order_day,last_number) VALUES(p_day,1) ON CONFLICT(order_day) DO UPDATE SET last_number=c.last_number+1 RETURNING last_number INTO assigned;
RETURN assigned; END $$;
REVOKE ALL ON FUNCTION public.matturo_next_daily_order_number(date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.matturo_next_daily_order_number(date) TO service_role;
CREATE FUNCTION public.matturo_number_order() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' THEN NEW.created_at:=statement_timestamp(); NEW.order_day:=(NEW.created_at AT TIME ZONE 'Europe/Lisbon')::date; NEW.daily_number:=public.matturo_next_daily_order_number(NEW.order_day);
ELSIF NEW.order_day IS DISTINCT FROM OLD.order_day OR NEW.daily_number IS DISTINCT FROM OLD.daily_number OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN RAISE EXCEPTION 'A numeração do pedido não pode ser alterada'; END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.matturo_number_order() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER matturo_number_order BEFORE INSERT OR UPDATE ON public.matturo_orders FOR EACH ROW EXECUTE FUNCTION public.matturo_number_order();
DO $$ BEGIN BEGIN
IF public.matturo_next_daily_order_number('9998-01-01')<>1 THEN RAISE EXCEPTION 'First number must be 1'; END IF;
IF public.matturo_next_daily_order_number('9998-01-01')<>2 THEN RAISE EXCEPTION 'Second number must be 2'; END IF;
IF public.matturo_next_daily_order_number('9998-01-02')<>1 THEN RAISE EXCEPTION 'Next day must restart at 1'; END IF;
IF ('2026-07-01 23:30:00+00'::timestamptz AT TIME ZONE 'Europe/Lisbon')::date<>'2026-07-02'::date THEN RAISE EXCEPTION 'Lisbon summer date invalid'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Rollback test counters'; EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END; END $$;