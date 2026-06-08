-- Fix: digest(text, unknown) does not exist — cast algorithm to text; ensure pgcrypto.

create extension if not exists pgcrypto;

create or replace function public.note_version_content_hash(p_title text, p_body_md text)
returns text
language sql
immutable
as $$
  select encode(
    digest(
      coalesce(trim(p_title), '') || E'\n' || coalesce(p_body_md, ''),
      'sha256'::text
    ),
    'hex'
  );
$$;
