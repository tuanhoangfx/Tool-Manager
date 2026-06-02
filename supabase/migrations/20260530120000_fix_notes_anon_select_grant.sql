-- Fix missing SELECT grant for anon on notes (public share reads).
-- Symptom without Data Box JWT: "permission denied for table notes"

grant select on public.notes to anon;
