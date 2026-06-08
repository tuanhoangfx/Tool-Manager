-- Include body_md in list RPC (truncate at 64 KiB) to avoid extra get round-trips for typical notes.

create or replace function public.note_versions_list(
  p_note_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows jsonb;
  v_body_limit constant integer := 65536;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.notes
    where id = p_note_id and user_id = v_user_id
  ) then
    raise exception 'note not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', nv.id,
        'note_id', nv.note_id,
        'title', nv.title,
        'body_preview', left(nv.body_md, 280),
        'body_md', case
          when length(nv.body_md) <= v_body_limit then nv.body_md
          else left(nv.body_md, v_body_limit)
        end,
        'body_truncated', length(nv.body_md) > v_body_limit,
        'body_length', length(nv.body_md),
        'content_hash', nv.content_hash,
        'source', nv.source,
        'label', nv.label,
        'created_at', nv.created_at
      )
      order by nv.created_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select *
    from public.note_versions
    where note_id = p_note_id and user_id = v_user_id
    order by created_at desc
    limit greatest(coalesce(p_limit, 50), 1)
  ) nv;

  return jsonb_build_object('ok', true, 'versions', v_rows);
end;
$$;
