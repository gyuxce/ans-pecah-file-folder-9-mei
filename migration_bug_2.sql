-- LANGKAH 1: Hapus data time block yang yatim piatu / ID nya ngawur
DELETE FROM sensei_time_blocks
WHERE sensei_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   OR sensei_id NOT IN (SELECT id::text FROM sensei);

-- LANGKAH 2: Hapus policy LAMA terlebih dahulu sebelum mengubah kolom
DROP POLICY IF EXISTS "approved_write_time_blocks" ON sensei_time_blocks;

-- LANGKAH 3: Ubah tipe data kolom dari TEXT ke UUID + tambahkan Foreign Key (CASCADE)
ALTER TABLE sensei_time_blocks
  ALTER COLUMN sensei_id TYPE UUID USING sensei_id::uuid,
  ADD CONSTRAINT sensei_time_blocks_sensei_id_fkey 
    FOREIGN KEY (sensei_id) REFERENCES sensei(id) ON DELETE CASCADE;

-- LANGKAH 4: Buat policy BARU yang sudah disesuaikan dengan UUID
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
