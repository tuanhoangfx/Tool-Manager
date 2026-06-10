-- Demo tasks for Todo Kanban (General project). Idempotent — skips if any task exists.

INSERT INTO public.tasks (
  title,
  description,
  status,
  priority,
  user_id,
  created_by,
  project_id,
  due_date
)
SELECT
  v.title,
  v.description,
  v.status::public.task_status,
  v.priority::public.task_priority,
  pr.id,
  pr.id,
  p.id,
  v.due_date
FROM public.profiles pr
CROSS JOIN public.projects p
CROSS JOIN (
  VALUES
    ('Welcome to Todo', 'Explore Kanban columns and filters.', 'todo', 'medium', current_date + 3),
    ('Review project filters', 'Try All Projects / Due Dates / Priorities.', 'inprogress', 'high', current_date + 1),
    ('Complete onboarding', 'Mark this done when you are ready.', 'done', 'low', current_date - 1)
) AS v(title, description, status, priority, due_date)
WHERE p.name = 'General'
  AND NOT EXISTS (SELECT 1 FROM public.tasks LIMIT 1);

NOTIFY pgrst, 'reload schema';
