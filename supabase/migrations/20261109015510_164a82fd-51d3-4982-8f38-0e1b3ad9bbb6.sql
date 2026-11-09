CREATE POLICY "push_tokens_no_browser_read" ON public.matturo_push_tokens FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "push_tokens_no_browser_insert" ON public.matturo_push_tokens FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "push_tokens_no_browser_update" ON public.matturo_push_tokens FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "push_tokens_no_browser_delete" ON public.matturo_push_tokens FOR DELETE TO anon, authenticated USING (false);