-- Demo projects for Todo tab (All Tasks / manager scope).
-- Idempotent: ensures General + Client Work exist; all profiles join General.

INSERT INTO public.projects (name, color)
SELECT v.name, v.color
FROM (VALUES ('General', '#6366f1'), ('Client Work', '#f97316')) AS v(name, color)
WHERE NOT EXISTS (
  SELECT 1 FROM public.projects p WHERE p.name = v.name
);

INSERT INTO public.project_members (project_id, user_id)
SELECT p.id, pr.id
FROM public.projects p
CROSS JOIN public.profiles pr
WHERE p.name = 'General'
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
