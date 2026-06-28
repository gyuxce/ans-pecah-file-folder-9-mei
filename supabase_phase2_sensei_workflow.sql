-- Phase 2: menutup workflow sesi setelah lesson tracker disimpan.
-- Tidak mengubah atau menghapus data existing.

BEGIN;

CREATE OR REPLACE FUNCTION public.complete_session_report(p_schedule_id TEXT)
RETURNS session_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sensei_id TEXT := public.current_sensei_id();
  v_result session_logs;
BEGIN
  IF public.current_profile_role() <> 'Sensei' OR v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Hanya sensei yang dapat menyelesaikan laporan sesi';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM lesson_trackers
    WHERE schedule_id::text = p_schedule_id
      AND sensei_id::text = v_sensei_id
      AND nullif(trim(material), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Isi materi belajar sebelum menyelesaikan laporan';
  END IF;

  UPDATE session_logs SET status = 'completed'
  WHERE schedule_id = p_schedule_id
    AND sensei_id = v_sensei_id
    AND status = 'report_pending'
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Session log belum clock-out atau sudah selesai';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_session_report(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_session_report(TEXT) TO authenticated;

COMMIT;
