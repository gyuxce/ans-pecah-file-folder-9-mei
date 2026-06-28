BEGIN;

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS original_sensei_id TEXT,
  ADD COLUMN IF NOT EXISTS substitution_status TEXT,
  ADD COLUMN IF NOT EXISTS substitution_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS substitution_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS substitution_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS substitution_assigned_by TEXT;

ALTER TABLE public.schedules
  DROP CONSTRAINT IF EXISTS schedules_substitution_status_check;

ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_substitution_status_check
  CHECK (substitution_status IS NULL OR substitution_status IN ('requested', 'assigned', 'cancelled'));

CREATE OR REPLACE FUNCTION public.request_schedule_substitute(p_schedule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sensei_id TEXT;
  v_email TEXT;
BEGIN
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF public.current_profile_role() <> 'Sensei' THEN
    RAISE EXCEPTION 'Hanya akun sensei aktif yang dapat meminta pengganti.';
  END IF;

  SELECT s.sensei_id::text
  INTO v_sensei_id
  FROM public.schedules s
  WHERE s.id = p_schedule_id
    AND s.status = 'active';

  IF v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Jadwal aktif tidak ditemukan.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.sensei se
    WHERE se.id::text = v_sensei_id
      AND lower(coalesce(se.email, '')) = v_email
  ) THEN
    RAISE EXCEPTION 'Jadwal ini bukan milik akun sensei Anda.';
  END IF;

  UPDATE public.schedules
  SET original_sensei_id = coalesce(original_sensei_id, sensei_id::text),
      substitution_status = 'requested',
      substitution_requested_at = now(),
      substitution_requested_by = v_email,
      substitution_assigned_at = NULL,
      substitution_assigned_by = NULL,
      updated_at = now(),
      updated_by = v_email
  WHERE id = p_schedule_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_schedule_substitute(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_schedule_substitute(UUID) TO authenticated;

DROP POLICY IF EXISTS "approved_read_schedules" ON public.schedules;
CREATE POLICY "approved_read_schedules" ON public.schedules
FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1
    FROM public.sensei se
    WHERE se.id::text IN (schedules.sensei_id::text, schedules.original_sensei_id)
      AND lower(coalesce(se.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);

COMMIT;

SELECT id, sensei_id, original_sensei_id, substitution_status
FROM public.schedules
WHERE substitution_status IS NOT NULL
ORDER BY date DESC, start_time DESC;
