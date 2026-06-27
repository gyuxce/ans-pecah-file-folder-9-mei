-- Phase 1: fondasi operasional sensei.
-- Aman untuk production: hanya menambah kolom, tabel, index, policy, trigger, dan RPC.
-- Tidak menghapus atau mengubah tipe data existing.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM profiles
  WHERE id::text = auth.uid()::text
    AND status = 'Approved'
$$;

CREATE OR REPLACE FUNCTION public.current_sensei_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id::text
  FROM sensei
  WHERE lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  LIMIT 1
$$;

ALTER TABLE sensei
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sensei_timezone_check'
      AND conrelid = 'public.sensei'::regclass
  ) THEN
    ALTER TABLE sensei ADD CONSTRAINT sensei_timezone_check
      CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id TEXT NOT NULL UNIQUE,
  sensei_id TEXT NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'report_pending', 'completed')),
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta'
    CHECK (timezone IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  adjustment_status TEXT NOT NULL DEFAULT 'none'
    CHECK (adjustment_status IN ('none', 'pending', 'approved', 'rejected')),
  adjustment_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensei_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL
    CHECK (leave_type IN ('Izin/Cuti', 'Sakit', 'Keperluan Pribadi', 'Training/Meeting', 'Lainnya')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  CONSTRAINT leave_requests_date_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_session_logs_sensei_status
  ON session_logs(sensei_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_sensei_dates
  ON leave_requests(sensei_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status
  ON leave_requests(status);

ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_session_logs" ON session_logs;
DROP POLICY IF EXISTS "sensei_read_session_logs" ON session_logs;
CREATE POLICY "admin_manage_session_logs" ON session_logs
  FOR ALL
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));
CREATE POLICY "sensei_read_session_logs" ON session_logs
  FOR SELECT
  USING (
    public.current_profile_role() = 'Sensei'
    AND sensei_id = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "admin_manage_leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "sensei_read_leave_requests" ON leave_requests;
DROP POLICY IF EXISTS "sensei_submit_leave_requests" ON leave_requests;
CREATE POLICY "admin_manage_leave_requests" ON leave_requests
  FOR ALL
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));
CREATE POLICY "sensei_read_leave_requests" ON leave_requests
  FOR SELECT
  USING (
    public.current_profile_role() = 'Sensei'
    AND sensei_id = public.current_sensei_id()
  );
CREATE POLICY "sensei_submit_leave_requests" ON leave_requests
  FOR INSERT
  WITH CHECK (
    public.current_profile_role() = 'Sensei'
    AND sensei_id = public.current_sensei_id()
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );

CREATE OR REPLACE FUNCTION public.phase1_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_logs_set_updated_at ON session_logs;
CREATE TRIGGER session_logs_set_updated_at
BEFORE UPDATE ON session_logs
FOR EACH ROW EXECUTE FUNCTION public.phase1_set_updated_at();

CREATE OR REPLACE FUNCTION public.set_my_timezone(p_timezone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sensei_id TEXT := public.current_sensei_id();
BEGIN
  IF p_timezone NOT IN ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura') THEN
    RAISE EXCEPTION 'Zona waktu tidak valid';
  END IF;
  IF v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Akun sensei tidak ditemukan';
  END IF;

  UPDATE sensei SET timezone = p_timezone WHERE id::text = v_sensei_id;
  RETURN p_timezone;
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_in_session(p_schedule_id TEXT)
RETURNS session_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sensei_id TEXT := public.current_sensei_id();
  v_timezone TEXT;
  v_result session_logs;
BEGIN
  IF public.current_profile_role() <> 'Sensei' OR v_sensei_id IS NULL THEN
    RAISE EXCEPTION 'Hanya sensei yang dapat clock-in';
  END IF;

  SELECT coalesce(timezone, 'Asia/Jakarta') INTO v_timezone
  FROM sensei WHERE id::text = v_sensei_id;

  IF NOT EXISTS (
    SELECT 1 FROM schedules
    WHERE id::text = p_schedule_id
      AND sensei_id::text = v_sensei_id
      AND status = 'active'
      AND date::date = (now() AT TIME ZONE v_timezone)::date
  ) THEN
    RAISE EXCEPTION 'Jadwal aktif hari ini tidak ditemukan untuk sensei ini';
  END IF;

  INSERT INTO session_logs (
    schedule_id, sensei_id, check_in_at, status, timezone
  ) VALUES (
    p_schedule_id, v_sensei_id, now(), 'in_progress', v_timezone
  )
  ON CONFLICT (schedule_id) DO UPDATE SET
    check_in_at = coalesce(session_logs.check_in_at, excluded.check_in_at),
    status = CASE
      WHEN session_logs.status = 'not_started' THEN 'in_progress'
      ELSE session_logs.status
    END,
    timezone = excluded.timezone
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_out_session(p_schedule_id TEXT)
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
    RAISE EXCEPTION 'Hanya sensei yang dapat clock-out';
  END IF;

  UPDATE session_logs SET
    check_out_at = coalesce(check_out_at, now()),
    status = 'report_pending'
  WHERE schedule_id = p_schedule_id
    AND sensei_id = v_sensei_id
    AND status = 'in_progress'
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Sesi belum clock-in atau sudah clock-out';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.set_my_timezone(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clock_in_session(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clock_out_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_my_timezone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_in_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_session(TEXT) TO authenticated;

COMMIT;
