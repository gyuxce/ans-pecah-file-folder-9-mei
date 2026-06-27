-- Safe migration for sensei_time_blocks TEXT -> UUID.
-- No rows are deleted or rewritten. The transaction stops if invalid/orphaned
-- sensei IDs exist so the team can review them manually first.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sensei_time_blocks'
      AND column_name = 'sensei_id'
      AND data_type = 'text'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM sensei_time_blocks
      WHERE sensei_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) THEN
      RAISE EXCEPTION 'Migration cancelled: invalid UUID found. Run verify_sensei_time_blocks.sql.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM sensei_time_blocks block
      LEFT JOIN sensei ON sensei.id::text = block.sensei_id
      WHERE sensei.id IS NULL
    ) THEN
      RAISE EXCEPTION 'Migration cancelled: orphan time block found. Run verify_sensei_time_blocks.sql.';
    END IF;

    ALTER TABLE sensei_time_blocks
      ALTER COLUMN sensei_id TYPE UUID USING sensei_id::uuid;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sensei_time_blocks_sensei_id_fkey'
      AND conrelid = 'public.sensei_time_blocks'::regclass
  ) THEN
    ALTER TABLE sensei_time_blocks
      ADD CONSTRAINT sensei_time_blocks_sensei_id_fkey
      FOREIGN KEY (sensei_id) REFERENCES sensei(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "approved_write_time_blocks" ON sensei_time_blocks;

CREATE POLICY "approved_write_time_blocks" ON sensei_time_blocks
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = sensei_time_blocks.sensei_id
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = sensei_time_blocks.sensei_id
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

COMMIT;
