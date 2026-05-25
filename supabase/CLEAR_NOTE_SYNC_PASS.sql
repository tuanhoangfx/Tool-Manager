-- Clear sync pass on a note (fixes vault "invalid pass" when pass was set by mistake)
-- Replace YOUR_NOTE_UUID

update public.notes
set sync_pass_hash = null
where id = '5b675aab-4a04-442a-a86f-dab37c4e12e4'::uuid;

notify pgrst, 'reload schema';
