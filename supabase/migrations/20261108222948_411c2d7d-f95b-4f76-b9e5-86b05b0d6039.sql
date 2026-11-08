UPDATE public.matturo_modifier_groups SET position=position+1
WHERE item_id IN (SELECT id FROM public.matturo_menu_items WHERE category='pizza')
AND id<>'5a1e0000-0000-4000-8000-000000000001'::uuid;
WITH sizes(slug, small, large, big_price) AS (VALUES
 ('margarita','Pequena (25 cm)','Grande (35 cm)',349),('4-estacoes','Pequena (25 cm)','Grande (35 cm)',500),
 ('ka-preziosa','Pequena (25 cm)','Grande (35 cm)',500),('peperoni','Pequena (25 cm)','Grande (35 cm)',400),
 ('delicia-de-frango','Pequena (25 cm)','Grande (35 cm)',500),('carbonara','Pequena (25 cm)','Grande (35 cm)',500),
 ('vegetariana','Pequena (25 cm)','Grande (35 cm)',500),('strogonof','Pequena (25 cm)','Grande (35 cm)',500),
 ('especial-da-casa','Pequena (25 cm)','Grande (35 cm)',500),('mare-de-camarao','Pequena (25 cm)','Grande (35 cm)',400),
 ('suprema','Pequena (25 cm)','Grande (35 cm)',600),('saborosa','Individual (25 cm)','Média (35 cm)',400),
 ('campestre','Pequena (25 cm)','Grande (35 cm)',500),('4-queijos','Pequena (25 cm)','Grande (35 cm)',400),
 ('moda-tturo','Pequena (25 cm)','Grande (35 cm)',500),('calabresa','Pequena (25 cm)','Grande (35 cm)',500)),
g AS (
 INSERT INTO public.matturo_modifier_groups (item_id,id,name,required,min,max,position)
 SELECT i.id,'5a1e0000-0000-4000-8000-000000000001'::uuid,'Tamanho',true,1,1,0
 FROM public.matturo_menu_items i JOIN sizes s ON s.slug=i.slug
 ON CONFLICT DO NOTHING RETURNING item_id)
INSERT INTO public.matturo_modifiers (item_id,group_id,id,name,price_cents,max,position)
SELECT i.id,'5a1e0000-0000-4000-8000-000000000001'::uuid,o.id,o.name,o.price,1,o.pos
FROM g JOIN public.matturo_menu_items i ON i.id=g.item_id JOIN sizes s ON s.slug=i.slug
CROSS JOIN LATERAL (VALUES ('5a1e0000-0000-4000-8000-000000000002'::uuid,s.small,0,0),('5a1e0000-0000-4000-8000-000000000003'::uuid,s.large,s.big_price,1)) o(id,name,price,pos)
ON CONFLICT DO NOTHING;