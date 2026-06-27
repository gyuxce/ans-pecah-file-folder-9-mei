-- Complete Supabase schema for ANS Schedule Dashboard.
-- Run this in a new Supabase project before using the app.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Staff' CHECK (role IN ('Super Admin', 'Staff', 'Sensei')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Suspended')),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensei (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT,
  no_wa TEXT,
  email TEXT,
  level_mengajar TEXT,
  kelas_tersedia TEXT,
  sensei_leave_quota INTEGER DEFAULT 4
);

CREATE TABLE IF NOT EXISTS students (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  level TEXT,
  type TEXT,
  sensei_name TEXT,
  level_awal TEXT,
  level_sekarang TEXT,
  durasi_kelas TEXT,
  session_quota INTEGER DEFAULT 10,
  student_leave_quota INTEGER DEFAULT 3,
  payment_status TEXT DEFAULT 'Unpaid',
  is_active BOOLEAN DEFAULT TRUE,
  inactive_reason TEXT,
  special_note TEXT,
  exam_note TEXT,
  admin_note TEXT,
  curriculum_level TEXT,
  curriculum_unit TEXT,
  curriculum_progress TEXT,
  graduate_level TEXT,
  classroom_link TEXT,
  chat_link TEXT,
  progress_link TEXT,
  curriculum_link TEXT
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

CREATE TABLE IF NOT EXISTS offdays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  student_ids JSONB DEFAULT '[]'::jsonb,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  type TEXT,
  level TEXT,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS sensei_time_blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sensei_id UUID REFERENCES sensei(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'busy_cakap' CHECK (status IN ('available_ans', 'busy_cakap', 'busy_personal', 'off')),
  note TEXT,
  updated_at TIMESTAMPTZ,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS lesson_trackers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  sensei_id UUID REFERENCES sensei(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  attendance TEXT DEFAULT 'Hadir' CHECK (attendance IN ('Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show')),
  curriculum_unit TEXT,
  material TEXT,
  score NUMERIC DEFAULT 0,
  notes TEXT,
  case_notes TEXT,
  student_feedback TEXT,
  actual_start_time TEXT,
  actual_end_time TEXT,
  time_adjustment_note TEXT,
  time_adjustment_status TEXT DEFAULT 'None' CHECK (time_adjustment_status IN ('None', 'Pending', 'Approved', 'Rejected')),
  is_delayed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_sensei_email ON sensei(email);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_sensei_date ON schedules(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_sensei_time_blocks_sensei_date ON sensei_time_blocks(sensei_id, date);
CREATE INDEX IF NOT EXISTS idx_lesson_trackers_student_date ON lesson_trackers(student_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE offdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensei_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_trackers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "profiles_select_own_or_admin" ON profiles
  FOR SELECT USING (id = auth.uid() OR public.current_profile_role() = 'Super Admin');

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

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (public.current_profile_role() = 'Super Admin')
  WITH CHECK (public.current_profile_role() = 'Super Admin');

CREATE POLICY "approved_read_sensei" ON sensei FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR (
    public.current_profile_role() = 'Sensei'
    AND lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
CREATE POLICY "staff_write_sensei" ON sensei FOR ALL USING (public.current_profile_role() IN ('Super Admin', 'Staff')) WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

CREATE POLICY "approved_read_students" ON students FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1
    FROM schedules
    JOIN sensei ON sensei.id = schedules.sensei_id
    WHERE (
      schedules.student_id = students.id
      OR schedules.student_ids ? students.id::text
    )
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
CREATE POLICY "staff_write_students" ON students FOR ALL USING (public.current_profile_role() IN ('Super Admin', 'Staff')) WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

CREATE POLICY "approved_read_groups" ON groups FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1
    FROM schedules
    JOIN sensei ON sensei.id = schedules.sensei_id
    WHERE schedules.group_id = groups.id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
CREATE POLICY "staff_write_groups" ON groups FOR ALL USING (public.current_profile_role() IN ('Super Admin', 'Staff')) WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

CREATE POLICY "approved_read_offdays" ON offdays FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1 FROM sensei
    WHERE sensei.id = offdays.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
CREATE POLICY "scoped_write_offdays" ON offdays FOR ALL
  USING (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = offdays.sensei_id
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  )
  WITH CHECK (
    public.current_profile_role() IN ('Super Admin', 'Staff')
    OR EXISTS (
      SELECT 1 FROM sensei
      WHERE sensei.id = offdays.sensei_id
        AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND public.current_profile_role() = 'Sensei'
    )
  );

CREATE POLICY "approved_read_schedules" ON schedules FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1 FROM sensei
    WHERE sensei.id = schedules.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
CREATE POLICY "staff_write_schedules" ON schedules FOR ALL USING (public.current_profile_role() IN ('Super Admin', 'Staff')) WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

CREATE POLICY "approved_read_time_blocks" ON sensei_time_blocks FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1 FROM sensei
    WHERE sensei.id = sensei_time_blocks.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
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

CREATE POLICY "approved_read_trackers" ON lesson_trackers FOR SELECT USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR EXISTS (
    SELECT 1 FROM sensei
    WHERE sensei.id = lesson_trackers.sensei_id
      AND lower(coalesce(sensei.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND public.current_profile_role() = 'Sensei'
  )
);
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

CREATE POLICY "admin_read_audit_logs" ON audit_logs FOR SELECT USING (public.current_profile_role() = 'Super Admin');
CREATE POLICY "approved_insert_audit_logs" ON audit_logs FOR INSERT WITH CHECK (public.current_profile_role() IS NOT NULL);
