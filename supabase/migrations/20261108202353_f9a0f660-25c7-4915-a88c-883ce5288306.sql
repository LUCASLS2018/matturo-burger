CREATE TABLE public.matturo_menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  image text,
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  active boolean NOT NULL DEFAULT true,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.matturo_menu_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matturo_menu_categories TO authenticated;
GRANT ALL ON public.matturo_menu_categories TO service_role;
ALTER TABLE public.matturo_menu_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_public_read ON public.matturo_menu_categories FOR SELECT TO anon, authenticated USING (active OR public.matturo_has_role('admin'));
CREATE POLICY categories_admin_write ON public.matturo_menu_categories FOR ALL TO authenticated USING (public.matturo_has_role('admin')) WITH CHECK (public.matturo_has_role('admin'));
CREATE TRIGGER touch_matturo_menu_categories BEFORE UPDATE ON public.matturo_menu_categories FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();

ALTER TABLE public.matturo_menu_items ADD COLUMN position integer NOT NULL DEFAULT 0 CHECK (position >= 0);

CREATE TABLE public.matturo_modifier_groups (
  item_id uuid NOT NULL REFERENCES public.matturo_menu_items(id) ON DELETE CASCADE,
  id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  required boolean NOT NULL DEFAULT false,
  min integer NOT NULL DEFAULT 0 CHECK (min >= 0),
  max integer NOT NULL DEFAULT 1 CHECK (max >= 1 AND max <= 100),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, id),
  CHECK (min <= max)
);
GRANT SELECT ON public.matturo_modifier_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matturo_modifier_groups TO authenticated;
GRANT ALL ON public.matturo_modifier_groups TO service_role;
ALTER TABLE public.matturo_modifier_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY modifier_groups_public_read ON public.matturo_modifier_groups FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.matturo_menu_items i WHERE i.id = item_id AND i.visible) OR public.matturo_has_role('admin'));
CREATE POLICY modifier_groups_admin_write ON public.matturo_modifier_groups FOR ALL TO authenticated USING (public.matturo_has_role('admin')) WITH CHECK (public.matturo_has_role('admin'));
CREATE TRIGGER touch_matturo_modifier_groups BEFORE UPDATE ON public.matturo_modifier_groups FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();

CREATE TABLE public.matturo_modifiers (
  item_id uuid NOT NULL,
  group_id uuid NOT NULL,
  id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents BETWEEN 0 AND 100000),
  max integer NOT NULL DEFAULT 1 CHECK (max >= 1 AND max <= 100),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, group_id, id),
  FOREIGN KEY (item_id, group_id) REFERENCES public.matturo_modifier_groups(item_id, id) ON DELETE CASCADE
);
GRANT SELECT ON public.matturo_modifiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matturo_modifiers TO authenticated;
GRANT ALL ON public.matturo_modifiers TO service_role;
ALTER TABLE public.matturo_modifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY modifiers_public_read ON public.matturo_modifiers FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.matturo_menu_items i WHERE i.id = item_id AND i.visible) OR public.matturo_has_role('admin'));
CREATE POLICY modifiers_admin_write ON public.matturo_modifiers FOR ALL TO authenticated USING (public.matturo_has_role('admin')) WITH CHECK (public.matturo_has_role('admin'));
CREATE TRIGGER touch_matturo_modifiers BEFORE UPDATE ON public.matturo_modifiers FOR EACH ROW EXECUTE FUNCTION public.matturo_touch();

INSERT INTO public.matturo_menu_categories (id,name,slug,position)
SELECT (v->>0)::uuid,v->>1,v->>2,(v->>3)::integer FROM jsonb_array_elements($matturo$[["a1145c2c-6730-4479-a80f-cfca7f0a14cf","PROMOÇOES","promocoes",0],["a1df8f58-b216-427d-8308-3d4c4c0eadf4","Pizza","pizza",1],["a0e45564-e0c7-4097-aa9d-b7cefbf77d71","HAMBURGUER","hamburguer",2],["9f9660fa-58cf-492d-a4e4-87b5d7e48baf","Entradas","entradas",3],["9fe2c3ad-c27f-473c-8db5-34108c76c3f4","Sobremesa","sobremesa",4],["a1f1b4cd-1fd5-4657-b524-519f00306a9c","Bebidas","bebidas",5]]$matturo$::jsonb) v;

UPDATE public.matturo_menu_items i SET position = p.ordinality - 1
FROM jsonb_array_elements_text($matturo$["a28eb809-67a7-4254-ae72-63e51984bb86","a28eb977-5805-44b4-babe-64e3b564ef48","a1145cb7-48c1-4cfd-885d-cfd2ddb8f4f4","a1145cbc-3ed3-433f-83a4-dfbed3131cf7","a1145cc4-a35d-4cbb-8560-ae61d6fde566","a1e3c7b5-3f4c-41bb-bfa4-7619cfc1fa99","a1e3c8e2-7407-40aa-9226-17345c7c4f00","a1e3dd5b-e6cf-4ea1-9b98-026beda1a109","a1efbbcc-70b7-49c6-9ef4-05b2768b0356","a1e3def8-d577-46e7-b6f9-167929ff8591","a1e3e00c-30ab-4d53-a712-b37018eb9c12","a1e3e07c-7165-4bdd-affb-9a041c724224","a1e3e0b7-188b-47ed-9242-09c5ec201035","a1e3de9a-c79e-4cf4-a79e-1d606ab60043","a1e3df49-fef2-4053-974d-97455994d6ff","a1e3df92-edcd-48d4-ad41-cce7450f8d02","a1e3dfc3-aa1e-4eb3-a98a-76ca931e0b4e","a1e3e045-cc97-4ca7-982c-b14e868e367d","a1e3e0e1-ff30-4821-a0b8-68fd27709bb4","a1e3e126-3894-437a-9698-a563e0972927","a1efb8f8-81bb-4621-8e3d-e300bc9bdbae","a0e455d6-5e1e-414c-b0cf-c873bed34efe","a0e455dd-1ded-4bb5-8f9c-671dcfbadc05","a0e455e5-5d7b-4242-b5b4-59d2b682a385","a2f966db-44ad-49d3-aede-35291f6d4b02","a0e455f0-1c51-42a4-9c20-6e8348517144","a0e455f9-f555-45da-800d-b5f89f1dc2b6","a0e45608-eb02-493c-b6bc-c92116add04d","a0e45612-503f-4036-bb01-7f7aca81bbb8","a0e4561d-101c-4375-b0bf-9f1a2fd7a4f5","a0e4562a-24b6-4aa0-88e1-e7f1ccbdde1f","a0e45635-9e4f-4639-a926-c839b4b2442a","a0e4563d-3818-47e3-b9ea-7d0b115f0780","a0e45652-ada2-479f-8d12-6ec2dadd9f0c","a0e4565a-c1fa-476f-bc73-cc4f32be890a","a0e45674-9503-4abe-8fa9-1e5c937f4b1c","a213e340-96c4-40f0-87fe-d6143706d4ed","9f9660fa-5d77-40be-ac53-64e6bde63cfb","9f9661cf-9872-426f-b0d6-b6a222d640f8","9fee837c-a0a6-475c-949a-f79bb84420a6","a0154c14-23f5-461a-a52a-6b2ecec02575","a0154c54-a6a8-4b6b-8177-9e04c010fe94","a0154c72-f29d-47ea-998b-30bfcb207806","a0154ce5-3dc9-4658-bfe2-251573e5c0f6","9fe2c3ae-afa6-44c1-a50d-379e3f7e84d5","a21216f2-8ebe-4579-abeb-d0076b894f71","a2febc85-74aa-46d6-9a41-d2a994ca7a63","a2febcd1-3bd8-4548-8b3b-70aab0e076bc","a1f1b4cd-b2f1-451b-9138-e1c5f696e965","a1f1b511-4765-44ec-8e9e-cb9c1d168425","a1f1b526-824a-4799-9b9d-5368cc5ee19c","a1f1b54c-43e0-4998-9f00-500b0b3f2293","a1f1b566-086f-4b2a-b48c-ecec5bb9a3cb","a20b5df5-ac9c-406b-9664-ed943378ed8d"]$matturo$::jsonb) WITH ORDINALITY AS p(id,ordinality)
WHERE i.id = p.id::uuid;