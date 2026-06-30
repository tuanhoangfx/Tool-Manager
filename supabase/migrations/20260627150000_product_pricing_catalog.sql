-- P0020 SSOT: structured product pricing catalogs (bots, MCP, Data Box)

create table if not exists public.pricing_catalogs (
  id text primary key,
  label text not null,
  sheet_id text,
  sheet_gid text,
  sheet_url text,
  bot_ids text[] not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_pricing (
  id uuid primary key default gen_random_uuid(),
  catalog_id text not null references public.pricing_catalogs (id) on delete cascade,
  platform_key text not null,
  platform_label text not null,
  header text not null,
  bullets jsonb not null default '[]'::jsonb,
  extras jsonb not null default '[]'::jsonb,
  follow_up text,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  unique (catalog_id, platform_key)
);

create index if not exists product_pricing_catalog_idx
  on public.product_pricing (catalog_id, sort_order);

create index if not exists product_pricing_platform_label_idx
  on public.product_pricing (catalog_id, platform_label);

alter table public.pricing_catalogs enable row level security;
alter table public.product_pricing enable row level security;

drop policy if exists "pricing_catalogs_select_all" on public.pricing_catalogs;
create policy "pricing_catalogs_select_all" on public.pricing_catalogs
  for select to anon, authenticated
  using (true);

drop policy if exists "product_pricing_select_all" on public.product_pricing;
create policy "product_pricing_select_all" on public.product_pricing
  for select to anon, authenticated
  using (true);

grant select on public.pricing_catalogs to anon, authenticated;
grant select on public.product_pricing to anon, authenticated;
grant all on public.pricing_catalogs to service_role;
grant all on public.product_pricing to service_role;

create or replace function public.pricing_catalogs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pricing_catalogs_updated_at on public.pricing_catalogs;
create trigger pricing_catalogs_updated_at
  before update on public.pricing_catalogs
  for each row
  execute function public.pricing_catalogs_set_updated_at();

create or replace function public.product_pricing_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_pricing_updated_at on public.product_pricing;
create trigger product_pricing_updated_at
  before update on public.product_pricing
  for each row
  execute function public.product_pricing_set_updated_at();

-- Lookup by catalog + free-text query (platform name / báo giá …)
create or replace function public.pricing_lookup(p_catalog_id text, p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query, '')));
  v_row public.product_pricing%rowtype;
  v_score int := 0;
  v_best public.product_pricing%rowtype;
  v_best_score int := 0;
  v_key text;
  v_label text;
begin
  if p_catalog_id is null or p_catalog_id = '' then
    return jsonb_build_object('ok', false, 'error', 'catalog_required');
  end if;

  if v_query = '' then
    return jsonb_build_object('ok', false, 'error', 'query_required');
  end if;

  for v_row in
    select * from public.product_pricing
    where catalog_id = p_catalog_id
    order by sort_order, platform_label
  loop
    v_score := 0;
    v_key := lower(v_row.platform_key);
    v_label := lower(v_row.platform_label);

    if v_query like '%' || v_key || '%' then
      v_score := v_score + length(v_key) * 3;
    end if;
    if v_query like '%' || v_label || '%' then
      v_score := v_score + length(v_label) * 3;
    end if;
    if v_key <> '' and position(v_key in replace(v_query, ' ', '')) > 0 then
      v_score := v_score + length(v_key) * 2;
    end if;

    if v_score > v_best_score then
      v_best := v_row;
      v_best_score := v_score;
    end if;
  end loop;

  if v_best_score < 4 then
    return jsonb_build_object('ok', false, 'error', 'not_found', 'catalog_id', p_catalog_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'catalog_id', p_catalog_id,
    'platform_key', v_best.platform_key,
    'platform', v_best.platform_label,
    'header', v_best.header,
    'bullets', v_best.bullets,
    'extras', v_best.extras,
    'follow_up', v_best.follow_up,
    'score', v_best_score
  );
end;
$$;

grant execute on function public.pricing_lookup(text, text) to anon, authenticated, service_role;

-- Seed Infi 28 catalog metadata (rows synced by scripts/sync-infi28-pricing-catalog.mjs)
insert into public.pricing_catalogs (id, label, sheet_id, sheet_gid, sheet_url, bot_ids)
values (
  'infi28-payment',
  'Infi 28 Cổng thanh toán (Czp Docs)',
  '1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo',
  '1075393871',
  'https://docs.google.com/spreadsheets/d/1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo/edit?gid=1075393871',
  array['infi28']::text[]
)
on conflict (id) do update set
  label = excluded.label,
  sheet_id = excluded.sheet_id,
  sheet_gid = excluded.sheet_gid,
  sheet_url = excluded.sheet_url,
  bot_ids = excluded.bot_ids,
  updated_at = now();
