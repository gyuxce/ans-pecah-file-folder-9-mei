-- Consolidated RLS/index migration for lesson trackers.
-- Safe for existing data: no DELETE, UPDATE, TRUNCATE, or table recreation.

BEGIN;

DROP POLICY IF EXISTS "approved_write_trackers" ON lesson_trackers;
DROP POLICY IF EXISTS "scoped_write_trackers" ON lesson_trackers;

CREATE POLICY "scoped_write_trackers" ON lesson_trackers
  FOR ALL
  USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = lesson_trackers.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = lesson_trackers.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_id
  ON sensei_time_blocks(sensei_id);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_sensei_id
  ON lesson_trackers(sensei_id);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_schedule_id
  ON lesson_trackers(schedule_id);

COMMIT;
