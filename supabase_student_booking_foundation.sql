-- ANS Schedule - Student booking and sensei availability foundation.
-- Phase 1: additive and idempotent. This migration does not delete or rewrite
-- existing students, sensei, schedules, trackers, time blocks, or off days.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Link a student master record to an Auth account without changing old rows.
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS profile_id TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;

-- Existing projects usually have a generated profiles_role_check constraint.
-- Replace only the role check so Student becomes a valid role; no profile row
-- is changed by this block.
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Super Admin', 'Staff', 'Sensei', 'Student'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_profile_id_unique
  ON public.students (profile_id)
  WHERE profile_id IS NOT NULL AND btrim(profile_id) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email_unique
  ON public.students (lower(email))
  WHERE email IS NOT NULL AND btrim(email) <> '';

-- Availability means the sensei is willing to accept an ANS class. It is not
-- an actual class and therefore remains separate from public.schedules.
CREATE TABLE IF NOT EXISTS public.sensei_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sensei_id TEXT NOT NULL,
  pattern TEXT NOT NULL DEFAULT 'specific_date'
    CHECK (pattern IN ('specific_date', 'weekly')),
  availability_date DATE,
  weekday SMALLINT,
  valid_from DATE,
  valid_until DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (slot_duration_minutes IN (30, 45, 60, 90, 120)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sensei_availability_time_order CHECK (end_time > start_time),
  CONSTRAINT sensei_availability_pattern_fields CHECK (
    (pattern = 'specific_date' AND availability_date IS NOT NULL AND weekday IS NULL)
    OR
    (pattern = 'weekly' AND availability_date IS NULL AND weekday BETWEEN 0 AND 6
      AND valid_from IS NOT NULL AND valid_until IS NOT NULL AND valid_until >= valid_from)
  )
);

CREATE INDEX IF NOT EXISTS idx_sensei_availability_lookup
  ON public.sensei_availability (sensei_id, is_active, availability_date, weekday);

CREATE INDEX IF NOT EXISTS idx_sensei_availability_validity
  ON public.sensei_availability (valid_from, valid_until)
  WHERE pattern = 'weekly' AND is_active = TRUE;

-- A student request is only a request. An approved request will point to the
-- real schedule created in public.schedules during Phase 2.
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL,
  sensei_id TEXT NOT NULL,
  availability_id UUID REFERENCES public.sensei_availability(id) ON DELETE SET NULL,
  schedule_id TEXT,
  requested_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  class_type TEXT,
  level TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_by TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_requests_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_booking_requests_admin_queue
  ON public.booking_requests (status, requested_date, start_time);

CREATE INDEX IF NOT EXISTS idx_booking_requests_student
  ON public.booking_requests (student_id, requested_date DESC);

CREATE INDEX IF NOT EXISTS idx_booking_requests_sensei
  ON public.booking_requests (sensei_id, requested_date DESC);

-- Notifications are scoped by Auth user ID represented as text so this also
-- works in projects where profiles.id has previously been stored as text.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_request_id UUID REFERENCES public.booking_requests(id) ON DELETE CASCADE,
  schedule_id TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read, created_at DESC);

-- Keep updated_at consistent without requiring frontend timestamps.
CREATE OR REPLACE FUNCTION public.set_booking_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sensei_availability_updated_at ON public.sensei_availability;
CREATE TRIGGER trg_sensei_availability_updated_at
BEFORE UPDATE ON public.sensei_availability
FOR EACH ROW EXECUTE FUNCTION public.set_booking_updated_at();

DROP TRIGGER IF EXISTS trg_booking_requests_updated_at ON public.booking_requests;
CREATE TRIGGER trg_booking_requests_updated_at
BEFORE UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.set_booking_updated_at();

-- Resolve the current student safely by explicit profile link first, then by
-- email for existing master data that has not been linked yet.
CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT students.id::text
  FROM public.students
  WHERE students.profile_id = auth.uid()::text
     OR (
       students.email IS NOT NULL
       AND lower(students.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     )
  ORDER BY CASE WHEN students.profile_id = auth.uid()::text THEN 0 ELSE 1 END
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_student_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated;

ALTER TABLE public.sensei_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_read_own_master" ON public.students;
CREATE POLICY "student_read_own_master" ON public.students
FOR SELECT TO authenticated
USING (id::text = public.current_student_id());

DROP POLICY IF EXISTS "availability_read_approved" ON public.sensei_availability;
CREATE POLICY "availability_read_approved" ON public.sensei_availability
FOR SELECT TO authenticated
USING (public.current_profile_role() IS NOT NULL);

DROP POLICY IF EXISTS "availability_write_owner_or_staff" ON public.sensei_availability;
CREATE POLICY "availability_write_owner_or_staff" ON public.sensei_availability
FOR ALL TO authenticated
USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR sensei_id = public.current_sensei_id()
)
WITH CHECK (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR sensei_id = public.current_sensei_id()
);

DROP POLICY IF EXISTS "booking_requests_read_scoped" ON public.booking_requests;
CREATE POLICY "booking_requests_read_scoped" ON public.booking_requests
FOR SELECT TO authenticated
USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR sensei_id = public.current_sensei_id()
  OR student_id = public.current_student_id()
);

DROP POLICY IF EXISTS "booking_requests_student_insert" ON public.booking_requests;
CREATE POLICY "booking_requests_student_insert" ON public.booking_requests
FOR INSERT TO authenticated
WITH CHECK (
  status = 'pending'
  AND student_id = public.current_student_id()
  AND created_by = auth.uid()::text
);

DROP POLICY IF EXISTS "booking_requests_student_cancel" ON public.booking_requests;
CREATE POLICY "booking_requests_student_cancel" ON public.booking_requests
FOR UPDATE TO authenticated
USING (student_id = public.current_student_id() AND status = 'pending')
WITH CHECK (student_id = public.current_student_id() AND status = 'cancelled');

DROP POLICY IF EXISTS "booking_requests_staff_manage" ON public.booking_requests;
CREATE POLICY "booking_requests_staff_manage" ON public.booking_requests
FOR ALL TO authenticated
USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

DROP POLICY IF EXISTS "notifications_read_own" ON public.notifications;
CREATE POLICY "notifications_read_own" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "notifications_staff_insert" ON public.notifications;
CREATE POLICY "notifications_staff_insert" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR user_id = auth.uid()::text
);

COMMIT;

-- Verification only. These queries do not modify data.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sensei_availability', 'booking_requests', 'notifications')
ORDER BY table_name;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name IN ('profile_id', 'email')
ORDER BY column_name;
