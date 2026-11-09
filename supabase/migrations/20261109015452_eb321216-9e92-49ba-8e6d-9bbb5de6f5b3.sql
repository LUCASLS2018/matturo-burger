CREATE TABLE public.matturo_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.matturo_orders(id) ON DELETE CASCADE,
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token, order_id)
);

GRANT ALL ON public.matturo_push_tokens TO service_role;

ALTER TABLE public.matturo_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.matturo_push_tokens_touch()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER matturo_push_tokens_updated
BEFORE UPDATE ON public.matturo_push_tokens
FOR EACH ROW EXECUTE FUNCTION public.matturo_push_tokens_touch();