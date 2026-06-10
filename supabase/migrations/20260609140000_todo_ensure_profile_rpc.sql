-- Ensure authenticated user has a profiles row (Todo Kanban bootstrap).
-- SECURITY DEFINER bypasses RLS edge cases during first load after cached session restore.

CREATE OR REPLACE FUNCTION public.todo_ensure_profile()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.profiles;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO row FROM public.profiles WHERE id = uid;
  IF FOUND THEN
    RETURN row;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, created_at, last_sign_in_at)
  SELECT
    u.id,
    u.raw_user_meta_data ->> 'full_name',
    u.email::text,
    u.raw_user_meta_data ->> 'avatar_url',
    coalesce(nullif(u.raw_app_meta_data ->> 'role', ''), 'employee'),
    u.created_at,
    coalesce(u.last_sign_in_at, u.created_at)
  FROM auth.users u
  WHERE u.id = uid
  ON CONFLICT (id) DO UPDATE SET
    email = coalesce(EXCLUDED.email, public.profiles.email),
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now()
  RETURNING * INTO row;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.todo_ensure_profile() TO authenticated;

NOTIFY pgrst, 'reload schema';
