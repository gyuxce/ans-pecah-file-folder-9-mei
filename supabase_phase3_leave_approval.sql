-- Phase 3: approval Off/Cuti dan sinkronisasi ke tabel offdays lama.
-- Tidak menghapus atau mengubah data existing.

BEGIN;

CREATE OR REPLACE FUNCTION public.review_leave_request(
  p_request_id UUID,
  p_status TEXT
)
RETURNS leave_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request leave_requests;
  v_day DATE;
BEGIN
  IF public.current_profile_role() NOT IN ('Super Admin', 'Staff') THEN
    RAISE EXCEPTION 'Hanya admin/staff yang dapat memproses pengajuan';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Status review tidak valid';
  END IF;

  SELECT * INTO v_request
  FROM leave_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Pengajuan tidak ditemukan';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Pengajuan ini sudah diproses';
  END IF;

  UPDATE leave_requests SET
    status = p_status,
    reviewed_at = now(),
    reviewed_by = auth.uid()::text
  WHERE id = p_request_id
  RETURNING * INTO v_request;

  IF p_status = 'approved' THEN
    FOR v_day IN
      SELECT generate_series(v_request.start_date, v_request.end_date, interval '1 day')::date
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM offdays
        WHERE sensei_id::text = v_request.sensei_id
          AND date::date = v_day
      ) THEN
        INSERT INTO offdays (id, sensei_id, date, reason)
        VALUES (
          gen_random_uuid(),
          v_request.sensei_id,
          v_day,
          CASE
            WHEN nullif(trim(v_request.note), '') IS NULL THEN v_request.leave_type
            ELSE v_request.leave_type || ' - ' || trim(v_request.note)
          END
        );
      END IF;
    END LOOP;
  END IF;

  RETURN v_request;
END;
$$;

REVOKE ALL ON FUNCTION public.review_leave_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_leave_request(UUID, TEXT) TO authenticated;

COMMIT;
