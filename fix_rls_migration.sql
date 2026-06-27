-- ============================================================
-- MIGRATION: Fix RLS Security & Schema Issues
-- Tanggal: 2026-06-26
-- Catatan: File ini HANYA berisi perubahan policy/constraint.
--          TIDAK ADA perintah DROP TABLE, DELETE, atau TRUNCATE.
--          Aman dijalankan di production dengan data existing.
-- ============================================================

-- ============================================================
-- FIX #1: RLS lesson_trackers — Tambah scoping per sensei
-- Problem: Policy lama membolehkan SEMUA role approved untuk
--          write tracker siapapun, tanpa cek kepemilikan.
--          Sensei A bisa edit/hapus tracker milik Sensei B.
-- Fix: Scoping Sensei hanya bisa write tracker miliknya sendiri
--      (cocokkan sensei_id dengan email JWT), sama persis
--      seperti pola di sensei_time_blocks.
-- ============================================================

-- Hapus policy lama yang longgar
DROP POLICY IF EXISTS "approved_write_trackers" ON lesson_trackers;

-- Buat policy baru dengan scoping kepemilikan
CREATE POLICY "approved_write_trackers" ON lesson_trackers
  FOR ALL
  USING (
    -- Super Admin dan Staff bisa semua
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR
    -- Sensei hanya bisa akses tracker miliknya sendiri
    EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = lesson_trackers.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    -- Super Admin dan Staff bisa semua
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR
    -- Sensei hanya bisa insert/update tracker miliknya sendiri
    EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = lesson_trackers.sensei_id::text
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

-- Verifikasi: policy read tetap tidak berubah (semua approved bisa baca)
-- CREATE POLICY "approved_read_trackers" ON lesson_trackers
--   FOR SELECT USING (public.current_profile_role() IS NOT NULL);
-- ↑ Policy ini TIDAK diubah, Sensei tetap bisa baca semua tracker (untuk referensi)


-- ============================================================
-- FIX #2: sensei_time_blocks — Tambah index untuk performa
--         (schema_id sensei_id TEXT tidak kita ubah tipenya
--         karena berisiko break data existing, tapi kita tambah
--         index untuk menjaga performa query RLS yang baru)
-- ============================================================

-- Index agar JOIN di RLS policy sensei_time_blocks lebih cepat
-- (sudah ada di schema.sql, tapi pastikan ada)
CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_id_text
  ON sensei_time_blocks(sensei_id);

-- Index untuk mempercepat JOIN lesson_trackers → sensei di policy baru
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_sensei_id
  ON lesson_trackers(sensei_id);

-- Index untuk join audit_logs jika diperlukan
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_schedule_id
  ON lesson_trackers(schedule_id);


-- ============================================================
-- VERIFIKASI (opsional, bisa dijalankan setelah migration)
-- ============================================================
-- Cek daftar policy yang aktif di lesson_trackers:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'lesson_trackers';
