CREATE TABLE public.matturo_courier_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.matturo_courier_push_tokens TO service_role;
ALTER TABLE public.matturo_courier_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courier_push_no_browser" ON public.matturo_courier_push_tokens FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);