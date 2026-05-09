-- Script untuk menambahkan tabel groups dan memodifikasi tabel schedules (Aman, tidak akan menghapus data lama)

-- 1. Buat tabel Groups baru (Hanya buat jika belum ada)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  student_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- 2. Tambahkan kolom group_id ke schedules (Aman, data lama tetap utuh)
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS group_id UUID;

-- 3. Aktifkan Row Level Security (RLS) untuk tabel groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 4. Buat policy agar aplikasi bisa membaca dan menulis ke tabel groups
CREATE POLICY "Allow All" ON public.groups FOR ALL USING (true) WITH CHECK (true);

-- 5. Masukkan tabel groups ke dalam sistem Realtime Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE groups;

-- 6. Beri tahu API Supabase untuk membaca ulang struktur database terbaru
NOTIFY pgrst, 'reload schema';
