DROP POLICY "Public can read visible Matturo dishes" ON public.matturo_menu_items;
CREATE POLICY "Public can read visible Matturo dishes" ON public.matturo_menu_items FOR SELECT TO anon, authenticated USING (visible = true);
CREATE POLICY "Admins can read all Matturo dishes" ON public.matturo_menu_items FOR SELECT TO authenticated USING (public.matturo_has_role('admin'));