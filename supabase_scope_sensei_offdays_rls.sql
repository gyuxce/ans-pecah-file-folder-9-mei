-- Allow sensei to manage only their own full-day Off/Cuti records.
-- Policy-only migration. No DELETE, UPDATE, TRUNCATE, or table recreation.

BEGIN;

DROP POLICY IF EXISTS "approved_read_offdays" ON offdays;
DROP POLICY IF EXISTS "staff_write_offdays" ON offdays;
DROP POLICY IF EXISTS "scoped_write_offdays" ON offdays;

CREATE POLICY "approved_read_offdays" ON offdays
  FOR SELECT USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = offdays.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

CREATE POLICY "scoped_write_offdays" ON offdays
  FOR ALL
  USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = offdays.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = offdays.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

COMMIT;
