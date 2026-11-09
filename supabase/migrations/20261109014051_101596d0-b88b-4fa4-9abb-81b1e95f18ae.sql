DO $$ DECLARE payload jsonb; first_result record; retry_result record; original_counter integer; assigned_number integer; assigned_day date; test_key text:=gen_random_uuid()::text; test_hash text:=encode(gen_random_bytes(32),'hex'); today date:=(statement_timestamp() AT TIME ZONE 'Europe/Lisbon')::date; BEGIN
BEGIN
SELECT COALESCE((SELECT last_number FROM public.matturo_order_daily_counters WHERE order_day=today),0) INTO original_counter;
payload:=jsonb_build_object('reference','TEST-'||test_key,'customer_name','Validação transacional','customer_phone','+351910000000','service','Retirada','subtotal_cents',100,'total_cents',100,'delivery_fee_cents',0,'access_token_hash',test_hash,'idempotency_key',test_key);
SELECT * INTO first_result FROM public.matturo_place_order(payload,'[{"dish_id":"test","name":"Validação transacional","options":{},"unit_price_cents":100,"qty":1,"line_total_cents":100}]'::jsonb);
SELECT daily_number,order_day INTO assigned_number,assigned_day FROM public.matturo_orders WHERE id=first_result.id;
IF assigned_number<>original_counter+1 OR assigned_day<>today THEN RAISE EXCEPTION 'Order insert numbering failed'; END IF;
SELECT * INTO retry_result FROM public.matturo_place_order(payload,'[{"dish_id":"test","name":"Validação transacional","options":{},"unit_price_cents":100,"qty":1,"line_total_cents":100}]'::jsonb);
IF retry_result.id<>first_result.id OR retry_result.reference<>first_result.reference THEN RAISE EXCEPTION 'Idempotent reference changed'; END IF;
IF (SELECT last_number FROM public.matturo_order_daily_counters WHERE order_day=today)<>assigned_number THEN RAISE EXCEPTION 'Retry consumed another number'; END IF;
UPDATE public.matturo_orders SET status='cancelado' WHERE id=first_result.id;
IF (SELECT daily_number FROM public.matturo_orders WHERE id=first_result.id)<>assigned_number THEN RAISE EXCEPTION 'Cancellation changed number'; END IF;
RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Rollback numbering test order';
EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL; END;
END $$;