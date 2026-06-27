-- Safe production migration for sensei_time_blocks.
-- Keeps the existing ID type and never deletes or rewrites data.

BEGIN;

DO $$
DECLARE
  block_id_type TEXT;
  sensei_id_type TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM sensei_time_blocks block
    LEFT JOIN sensei ON sensei.id::text = block.sensei_id::text
    WHERE sensei.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Migration cancelled: orphan time block found. Run verify_sensei_time_blocks.sql.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint constraint_data
    JOIN pg_attribute attribute_data
      ON attribute_data.attrelid = constraint_data.conrelid
     AND attribute_data.attnum = ANY(constraint_data.conkey)
    WHERE constraint_data.conrelid = 'public.sensei_time_blocks'::regclass
      AND constraint_data.contype = 'f'
      AND attribute_data.attname = 'sensei_id'
  ) THEN
    SELECT data_type INTO block_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sensei_time_blocks'
      AND column_name = 'sensei_id';

    SELECT data_type INTO sensei_id_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sensei'
      AND column_name = 'id';

    IF block_id_type IS DISTINCT FROM sensei_id_type THEN
      RAISE EXCEPTION 'Migration cancelled: sensei_time_blocks.sensei_id type (%) differs from sensei.id type (%).', block_id_type, sensei_id_type;
    END IF;

    ALTER TABLE sensei_time_blocks
      ADD CONSTRAINT sensei_time_blocks_sensei_id_fkey
      FOREIGN KEY (sensei_id) REFERENCES sensei(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "approved_write_time_blocks" ON sensei_time_blocks;

CREATE POLICY "approved_write_time_blocks" ON sensei_time_blocks
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_time_blocks.sensei_id::text = public.current_sensei_id()
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR sensei_time_blocks.sensei_id::text = public.current_sensei_id()
  );

COMMIT;
