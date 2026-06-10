-- Fix infinite recursion: profiles RLS must not SELECT from profiles inside profiles policies.
-- Use SECURITY DEFINER role helpers from tasks_schema (get_user_role / is_admin / is_manager).

DROP POLICY IF EXISTS "profiles_select_self_or_managers" ON public.profiles;
CREATE POLICY "profiles_select_self_or_managers"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_manager()
);

DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_admin()
);

NOTIFY pgrst, 'reload schema';
