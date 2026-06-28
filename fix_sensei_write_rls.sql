-- Restore admin/staff write access to the sensei master table.
-- Safe for existing data: this migration only updates an RLS policy.

BEGIN;

ALTER TABLE public.sensei ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_write_sensei" ON public.sensei;

CREATE POLICY "staff_write_sensei"
ON public.sensei
FOR ALL
TO authenticated
USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
)
WITH CHECK (
  public.current_profile_role() IN ('Super Admin', 'Staff')
);

COMMIT;

-- The result should contain staff_write_sensei with command ALL.
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'sensei'
ORDER BY policyname;
