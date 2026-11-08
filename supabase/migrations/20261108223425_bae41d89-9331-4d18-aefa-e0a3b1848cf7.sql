UPDATE public.matturo_modifiers SET position=position+1 WHERE group_id IN (SELECT id FROM public.matturo_modifier_groups WHERE name='Quer ingrediente extra ?');
INSERT INTO public.matturo_modifiers (item_id,group_id,id,name,price_cents,max,position)
SELECT g.item_id,g.id,'5a1e0000-0000-4000-8000-0000000000a0'::uuid,'NAO QUERO',0,1,0
FROM public.matturo_modifier_groups g WHERE g.name='Quer ingrediente extra ?'
ON CONFLICT DO NOTHING;