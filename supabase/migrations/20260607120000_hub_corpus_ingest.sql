-- P0020 Data Box — track hub.ai_corpus.v1 ingest from P0016 (and future Hub sources)
create table if not exists public.hub_corpus_ingest_log (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'p0016',
  bot_id text not null default 'default',
  thread_id text not null,
  note_id uuid references public.notes (id) on delete set null,
  row_count int not null default 0,
  schema_version text not null default 'hub.ai_corpus.v1',
  ingested_at timestamptz not null default now(),
  constraint hub_corpus_ingest_log_uniq unique (source, bot_id, thread_id)
);

create index if not exists hub_corpus_ingest_log_source_idx
  on public.hub_corpus_ingest_log (source, ingested_at desc);

alter table public.hub_corpus_ingest_log enable row level security;
