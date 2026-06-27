-- Restrict Sensei reads to their own operational data.
-- Super Admin and Staff keep full access.
-- Policy-only migration: no data mutation or table recreation.

BEGIN;

DROP POLICY IF EXISTS "approved_read_sensei" ON sensei;
CREATE POLICY "approved_read_sensei" ON sensei
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR (
      public.current_profile_role() = 'Sensei'
      AND lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

DROP POLICY IF EXISTS "approved_read_schedules" ON schedules;
CREATE POLICY "approved_read_schedules" ON schedules
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = schedules.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

DROP POLICY IF EXISTS "approved_read_students" ON students;
CREATE POLICY "approved_read_students" ON students
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1
      FROM schedules
      JOIN sensei ON sensei.id::text = schedules.sensei_id::text
      WHERE (
        schedules.student_id::text = students.id::text
        OR schedules.student_ids ? students.id::text
      )
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

DROP POLICY IF EXISTS "approved_read_groups" ON groups;
CREATE POLICY "approved_read_groups" ON groups
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1
      FROM schedules
      JOIN sensei ON sensei.id::text = schedules.sensei_id::text
      WHERE schedules.group_id::text = groups.id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

DROP POLICY IF EXISTS "approved_read_time_blocks" ON sensei_time_blocks;
CREATE POLICY "approved_read_time_blocks" ON sensei_time_blocks
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = sensei_time_blocks.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

DROP POLICY IF EXISTS "approved_read_trackers" ON lesson_trackers;
CREATE POLICY "approved_read_trackers" ON lesson_trackers
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = lesson_trackers.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

COMMIT;
