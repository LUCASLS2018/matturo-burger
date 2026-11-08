DROP POLICY categories_public_read ON public.matturo_menu_categories;
CREATE POLICY categories_public_read ON public.matturo_menu_categories FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY categories_admin_read ON public.matturo_menu_categories FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
DROP POLICY modifier_groups_public_read ON public.matturo_modifier_groups;
CREATE POLICY modifier_groups_public_read ON public.matturo_modifier_groups FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.matturo_menu_items i WHERE i.id = matturo_modifier_groups.item_id AND i.visible));
CREATE POLICY modifier_groups_admin_read ON public.matturo_modifier_groups FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));
DROP POLICY modifiers_public_read ON public.matturo_modifiers;
CREATE POLICY modifiers_public_read ON public.matturo_modifiers FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.matturo_menu_items i WHERE i.id = matturo_modifiers.item_id AND i.visible));
CREATE POLICY modifiers_admin_read ON public.matturo_modifiers FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));