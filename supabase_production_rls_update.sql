-- ANS Dashboard production RLS update.
-- Safe for existing data: no DELETE, UPDATE, TRUNCATE, or type conversion.

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

ALTER TABLE sensei ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE offdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_date
  ON sensei_time_blocks(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_sensei_id
  ON lesson_trackers(sensei_id);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_schedule_id
  ON lesson_trackers(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedules_student_id
  ON schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_group_id
  ON schedules(group_id);

-- Remove permissive legacy policies left by older schema versions.
DROP POLICY IF EXISTS "Allow All" ON sensei;
DROP POLICY IF EXISTS "Allow All" ON students;
DROP POLICY IF EXISTS "Allow All" ON groups;
DROP POLICY IF EXISTS "Allow All" ON schedules;
DROP POLICY IF EXISTS "Allow All" ON offdays;
DROP POLICY IF EXISTS "Allow All" ON sensei_time_blocks;
DROP POLICY IF EXISTS "Allow All" ON lesson_trackers;
DROP POLICY IF EXISTS "Allow All" ON audit_logs;

DROP POLICY IF EXISTS "approved_read_sensei" ON sensei;
CREATE POLICY "approved_read_sensei" ON sensei
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR id::text = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "approved_read_schedules" ON schedules;
CREATE POLICY "approved_read_schedules" ON schedules
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "approved_read_students" ON students;
CREATE POLICY "approved_read_students" ON students
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1
      FROM schedules
      WHERE schedules.sensei_id::text = public.current_sensei_id()
        AND (
          schedules.student_id::text = students.id::text
          OR students.id::text = ANY(
            coalesce(schedules.student_ids, ARRAY[]::text[])
          )
        )
    )
  );

DROP POLICY IF EXISTS "approved_read_groups" ON groups;
CREATE POLICY "approved_read_groups" ON groups
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1
      FROM schedules
      WHERE schedules.sensei_id::text = public.current_sensei_id()
        AND schedules.group_id::text = groups.id::text
    )
  );

DROP POLICY IF EXISTS "approved_read_time_blocks" ON sensei_time_blocks;
DROP POLICY IF EXISTS "approved_write_time_blocks" ON sensei_time_blocks;
CREATE POLICY "approved_read_time_blocks" ON sensei_time_blocks
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );
CREATE POLICY "approved_write_time_blocks" ON sensei_time_blocks
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "approved_read_offdays" ON offdays;
DROP POLICY IF EXISTS "staff_write_offdays" ON offdays;
DROP POLICY IF EXISTS "scoped_write_offdays" ON offdays;
CREATE POLICY "approved_read_offdays" ON offdays
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );
CREATE POLICY "scoped_write_offdays" ON offdays
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "approved_read_trackers" ON lesson_trackers;
DROP POLICY IF EXISTS "approved_write_trackers" ON lesson_trackers;
DROP POLICY IF EXISTS "scoped_write_trackers" ON lesson_trackers;
CREATE POLICY "approved_read_trackers" ON lesson_trackers
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );
CREATE POLICY "scoped_write_trackers" ON lesson_trackers
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_id::text = public.current_sensei_id()
  );

DROP POLICY IF EXISTS "approved_insert_audit_logs" ON audit_logs;
CREATE POLICY "approved_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (public.current_profile_role() IS NOT NULL);

COMMIT;

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'sensei' AND column_name = 'id')
    OR (table_name = 'sensei_time_blocks' AND column_name = 'sensei_id')
  )
ORDER BY table_name;

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'sensei', 'students', 'groups', 'schedules', 'offdays',
    'sensei_time_blocks', 'lesson_trackers', 'audit_logs'
  )
ORDER BY tablename, policyname;
