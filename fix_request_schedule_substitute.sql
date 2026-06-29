-- Safe fix: only replaces the RPC function. Existing schedule data is untouched.
BEGIN;

DROP FUNCTION IF EXISTS public.request_schedule_substitute(UUID);
DROP FUNCTION IF EXISTS public.request_schedule_substitute(TEXT);

CREATE FUNCTION public.request_schedule_substitute(p_schedule_id TEXT)
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
  WHERE s.id::text = p_schedule_id
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
  WHERE id::text = p_schedule_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_schedule_substitute(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_schedule_substitute(TEXT) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verification: arguments should show "p_schedule_id text".
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'request_schedule_substitute';
