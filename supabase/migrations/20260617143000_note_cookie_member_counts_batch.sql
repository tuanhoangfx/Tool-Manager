-- Batch member counts for Cookie Auto directory (avoids N+1 RPC per note).

create or replace function public.note_cookie_member_counts_batch(p_note_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_ids := array(
    select distinct unnest(coalesce(p_note_ids, '{}'::uuid[]))
  );

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'counts', '[]'::jsonb);
  end if;

  -- Only allow owner / manage access to request counts.
  v_ids := array(
    select n.id
    from public.notes n
    where n.id = any(v_ids)
      and (n.user_id = auth.uid() or public.note_cookie_can(n.id, 'manage'))
  );

  return jsonb_build_object(
    'ok',
    true,
    'counts',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('note_id', x.note_id, 'member_count', x.member_count)
          order by x.note_id
        ),
        '[]'::jsonb
      )
      from (
        select
          n.id as note_id,
          (
            select count(*)::int
            from public.note_cookie_members m
            where m.note_id = n.id
          ) as member_count
        from unnest(v_ids) as n_id(id)
        join public.notes n on n.id = n_id.id
      ) x
    )
  );
end;
$$;

revoke all on function public.note_cookie_member_counts_batch(uuid[]) from public;
grant execute on function public.note_cookie_member_counts_batch(uuid[]) to authenticated;

