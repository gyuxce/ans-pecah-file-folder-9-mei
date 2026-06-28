# SQL Migration Guide

Semua langkah di bawah menjaga data existing. Jangan menjalankan `schema.sql`
pada database production; file itu hanya untuk project Supabase baru.

1. Untuk database production, jalankan `supabase_production_rls_update.sql`.
   File ini mempertahankan tipe ID existing dan tidak menghapus data.
2. `schema.sql` hanya untuk project Supabase baru.
3. File migrasi terpisah disimpan untuk referensi, tetapi tidak perlu dijalankan
   bila `supabase_production_rls_update.sql` sudah berhasil.

## Fase 1 Operasional Sensei

Setelah migrasi RLS production selesai, jalankan
`supabase_phase1_sensei_foundation.sql` satu kali. Migrasi ini menambahkan zona
waktu sensei, session log untuk clock-in/out berbasis waktu server, dan request
cuti dengan status approval. Tabel `offdays` lama tetap dipertahankan.

Sesudahnya, jalankan `supabase_phase2_sensei_workflow.sql` untuk mengaktifkan
penyelesaian laporan setelah clock-out. Jalankan file fase 1 lebih dahulu.

Jika migrasi production gagal, seluruh transaksi otomatis rollback.
