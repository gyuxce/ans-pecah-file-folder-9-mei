# SQL Migration Guide

Semua langkah di bawah menjaga data existing. Jangan menjalankan `schema.sql`
pada database production; file itu hanya untuk project Supabase baru.

1. Untuk database production, jalankan `supabase_production_rls_update.sql`.
   File ini mempertahankan tipe ID existing dan tidak menghapus data.
2. `schema.sql` hanya untuk project Supabase baru.
3. File migrasi terpisah disimpan untuk referensi, tetapi tidak perlu dijalankan
   bila `supabase_production_rls_update.sql` sudah berhasil.

Jika migrasi production gagal, seluruh transaksi otomatis rollback.
