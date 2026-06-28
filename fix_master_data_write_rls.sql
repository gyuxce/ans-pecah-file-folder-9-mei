-- Restore approved admin/staff write access to operational master data.
-- Safe for existing data: this migration only updates RLS policies.

BEGIN;

ALTER TABLE public.sensei ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_write_sensei" ON public.sensei;
CREATE POLICY "staff_write_sensei" ON public.sensei
  FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

DROP POLICY IF EXISTS "staff_write_students" ON public.students;
CREATE POLICY "staff_write_students" ON public.students
  FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

DROP POLICY IF EXISTS "staff_write_groups" ON public.groups;
CREATE POLICY "staff_write_groups" ON public.groups
  FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

DROP POLICY IF EXISTS "staff_write_schedules" ON public.schedules;
CREATE POLICY "staff_write_schedules" ON public.schedules
  FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('Super Admin', 'Staff'))
  WITH CHECK (public.current_profile_role() IN ('Super Admin', 'Staff'));

COMMIT;

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'staff_write_sensei',
    'staff_write_students',
    'staff_write_groups',
    'staff_write_schedules'
  )
ORDER BY tablename, policyname;
