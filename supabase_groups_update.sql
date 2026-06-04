-- Script untuk menambahkan tabel groups dan memodifikasi tabel schedules.
-- Aman dijalankan berkali-kali dan tidak akan menghapus data lama.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- 4. Pastikan helper role tersedia untuk policy yang lebih aman
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND status = 'Approved'
$$;

-- 5. Ganti policy lama yang terlalu terbuka dengan policy berbasis role
DROP POLICY IF EXISTS "Allow All" ON public.groups;
DROP POLICY IF EXISTS "approved_read_groups" ON public.groups;
DROP POLICY IF EXISTS "staff_write_groups" ON public.groups;

CREATE POLICY "approved_read_groups" ON public.groups
  FOR SELECT
  USING (public.current_profile_role() IS NOT NULL);

CREATE POLICY "staff_write_groups" ON public.groups
  FOR ALL
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

-- 6. Masukkan tabel groups ke dalam sistem Realtime Supabase jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
END $$;

-- 7. Beri tahu API Supabase untuk membaca ulang struktur database terbaru
NOTIFY pgrst, 'reload schema';
