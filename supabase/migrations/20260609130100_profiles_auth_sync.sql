-- Sync profiles with auth.users (Hub / Data Box dual sign-in).
-- Ensures Todo can load profile + RLS before first task create.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role, created_at, last_sign_in_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    NEW.raw_user_meta_data ->> 'avatar_url',
    coalesce(nullif(NEW.raw_app_meta_data ->> 'role', ''), 'employee'),
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
    last_sign_in_at = coalesce(EXCLUDED.last_sign_in_at, public.profiles.last_sign_in_at),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill any auth.users missing a profiles row (existing Hub users before Todo migration).
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
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.todo_schema_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'tasks_table', EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'tasks'
    ),
    'profiles_count', (SELECT count(*)::int FROM public.profiles),
    'projects_count', (SELECT count(*)::int FROM public.projects),
    'auth_user_trigger', EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.todo_schema_health() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
