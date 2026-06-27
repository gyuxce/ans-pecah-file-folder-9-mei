# SQL Migration Guide

Semua langkah di bawah menjaga data existing. Jangan menjalankan `schema.sql`
pada database production; file itu hanya untuk project Supabase baru.

1. Jalankan `verify_sensei_time_blocks.sql` terlebih dahulu. Dua hasil query
   harus kosong sebelum melanjutkan konversi tipe.
2. Jalankan `migration_bug_2.sql` hanya bila `sensei_time_blocks.sensei_id`
   masih bertipe `text` atau foreign key belum ada. Migrasi akan berhenti tanpa
   menghapus data bila verifikasi gagal.
3. Jalankan `fix_rls_migration.sql` untuk membatasi write Lesson Tracker per
   sensei dan menambah index pendukung.
4. Jalankan `supabase_scope_sensei_offdays_rls.sql` agar Sensei dapat mengirim
   Off/Cuti miliknya sendiri.
5. Jalankan `supabase_scope_sensei_reads_rls.sql` agar akun Sensei hanya dapat
   membaca siswa, grup, jadwal, tracker, dan availability yang terkait dengannya.

`supabase_scope_lesson_trackers_rls.sql` adalah versi khusus langkah 3. Tidak
perlu dijalankan bila `fix_rls_migration.sql` sudah berhasil.
