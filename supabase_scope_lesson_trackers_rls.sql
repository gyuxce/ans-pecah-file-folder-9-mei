-- Migration: Scoping RLS untuk lesson_trackers per sensei.
-- Jalankan di Supabase SQL Editor pada project yang sudah berjalan.
--
-- Masalah sebelumnya: policy approved_write_trackers mengizinkan SEMUA role
-- approved (termasuk Sensei lain) untuk insert/update/delete tracker SIAPAPUN.
-- Lewat UI ini tidak kelihatan karena Sensei cuma melihat data miliknya sendiri
-- (sudah di-scope di sisi client), tapi lewat API Supabase langsung (bypass UI),
-- Sensei A bisa saja mengubah/menghapus tracker milik Sensei B.
--
-- Setelah migration ini: role Sensei hanya bisa insert/update/delete tracker
-- yang sensei_id-nya cocok dengan akun mereka sendiri (dicocokkan lewat email
-- di JWT, sama seperti pola yang sudah dipakai di sensei_time_blocks).
-- Role Super Admin dan Staff tetap bisa mengelola semua tracker seperti biasa.

DROP POLICY IF EXISTS "approved_write_trackers" ON lesson_trackers;

CREATE POLICY "scoped_write_trackers" ON lesson_trackers
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = lesson_trackers.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = lesson_trackers.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
    )
  );

-- Catatan: kalau ada tracker lama yang sensei_id-nya NULL (misal dibuat manual
-- tanpa sensei_id), tracker itu hanya bisa dikelola oleh Super Admin/Staff
-- setelah migration ini, karena EXISTS di atas tidak akan match untuk Sensei.
-- Cek dulu sebelum menjalankan migration ini:
--   SELECT count(*) FROM lesson_trackers WHERE sensei_id IS NULL;
-- Kalau hasilnya > 0 dan ada sensei yang masih butuh akses ke tracker lama
-- miliknya, isi dulu sensei_id yang kosong itu sebelum apply migration ini.
