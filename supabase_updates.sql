-- Updates for ANS LPK teacher/student tracking dashboard.
-- Run this after the base tables are created.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff',
  status TEXT NOT NULL DEFAULT 'Pending',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  student_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

ALTER TABLE sensei
  ADD COLUMN IF NOT EXISTS sensei_leave_quota INTEGER DEFAULT 4;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS inactive_reason TEXT,
  ADD COLUMN IF NOT EXISTS special_note TEXT,
  ADD COLUMN IF NOT EXISTS exam_note TEXT,
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS session_quota INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS student_leave_quota INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS curriculum_level TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_unit TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_progress TEXT,
  ADD COLUMN IF NOT EXISTS graduate_level TEXT,
  ADD COLUMN IF NOT EXISTS classroom_link TEXT,
  ADD COLUMN IF NOT EXISTS chat_link TEXT,
  ADD COLUMN IF NOT EXISTS progress_link TEXT,
  ADD COLUMN IF NOT EXISTS curriculum_link TEXT;

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS student_ids JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS group_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE lesson_trackers
  ADD COLUMN IF NOT EXISTS curriculum_unit TEXT,
  ADD COLUMN IF NOT EXISTS case_notes TEXT,
  ADD COLUMN IF NOT EXISTS student_feedback TEXT,
  ADD COLUMN IF NOT EXISTS actual_start_time TEXT,
  ADD COLUMN IF NOT EXISTS actual_end_time TEXT,
  ADD COLUMN IF NOT EXISTS time_adjustment_note TEXT,
  ADD COLUMN IF NOT EXISTS time_adjustment_status TEXT DEFAULT 'None',
  ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS sensei_time_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available_ans' CHECK (status IN ('available_ans', 'busy_cakap', 'busy_personal', 'off')),
  note TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  record_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_date ON sensei_time_blocks(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_time_blocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id::text = auth.uid()::text AND status = 'Approved'
$$;

CREATE OR REPLACE FUNCTION public.is_bootstrap_admin_email(profile_email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(profile_email, '')) IN ('contact.ilusa@gmail.com')
$$;

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (
    id::text = auth.uid()::text
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND (
      (
        public.is_bootstrap_admin_email(email)
        AND role = 'Super Admin'
        AND status = 'Approved'
      )
      OR (
        NOT public.is_bootstrap_admin_email(email)
        AND role = 'Staff'
        AND status = 'Pending'
      )
    )
  );

DROP POLICY IF EXISTS "approved_read_time_blocks" ON sensei_time_blocks;
CREATE POLICY "approved_read_time_blocks" ON sensei_time_blocks
  FOR SELECT USING (public.current_profile_role() IS NOT NULL);

DROP POLICY IF EXISTS "approved_write_time_blocks" ON sensei_time_blocks;
CREATE POLICY "approved_write_time_blocks" ON sensei_time_blocks
  FOR ALL USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = sensei_time_blocks.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id::text = sensei_time_blocks.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
    )
  );
