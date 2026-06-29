-- Safe migration: adds a display-name snapshot for substitute schedules.
BEGIN;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS substitution_sensei_name TEXT;

UPDATE public.schedules schedule
SET substitution_sensei_name = sensei.name
FROM public.sensei sensei
WHERE schedule.substitution_status = 'assigned'
  AND schedule.sensei_id::text = sensei.id::text
  AND coalesce(schedule.substitution_sensei_name, '') = '';

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT id, substitution_status, substitution_sensei_name
FROM public.schedules
WHERE substitution_status = 'assigned'
ORDER BY date DESC, start_time DESC;
