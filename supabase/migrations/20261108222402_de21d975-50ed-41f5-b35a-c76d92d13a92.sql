INSERT INTO public.matturo_modifiers (item_id, group_id, id, name, price_cents, max, position)
SELECT g.item_id, g.id, o.id, o.name, o.price, 1, o.pos
FROM public.matturo_modifier_groups g
CROSS JOIN (VALUES
  ('b0d00000-0000-4000-8000-000000000001'::uuid, 'Sem borda recheada', 0, 0),
  ('b0d00000-0000-4000-8000-000000000002'::uuid, 'Borda de Catupiry', 200, 1),
  ('b0d00000-0000-4000-8000-000000000003'::uuid, 'Borda de Cheddar', 200, 2)
) AS o(id, name, price, pos)
WHERE g.id = 'a20d6d88-1575-4642-b5e8-df4801035c3d'
ON CONFLICT DO NOTHING;