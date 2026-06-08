-- Supabase: pgcrypto lives in extensions schema — qualify digest().

create extension if not exists pgcrypto with schema extensions;

create or replace function public.note_version_content_hash(p_title text, p_body_md text)
returns text
language plpgsql
immutable
parallel safe
set search_path = public, extensions
as $$
begin
  return encode(
    extensions.digest(
      coalesce(trim(p_title), '') || E'\n' || coalesce(p_body_md, ''),
      'sha256'
    ),
    'hex'
  );
end;
$$;

-- Smoke: fails migration apply if digest still broken.
do $$
declare
  v_hash text;
begin
  v_hash := public.note_version_content_hash('smoke', 'test');
  if v_hash is null or length(v_hash) < 32 then
    raise exception 'note_version_content_hash smoke failed';
  end if;
end;
$$;
