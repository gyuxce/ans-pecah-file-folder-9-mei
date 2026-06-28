-- Allow an approved Sensei to read students assigned to their schedules.
-- Supports both legacy text[] and newer jsonb student_ids columns.
-- Safe for existing data: functions and policies only.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_sensei_student_ids()
RETURNS SETOF TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT assigned.student_id
  FROM (
    SELECT schedules.student_id::text AS student_id
    FROM public.schedules
    WHERE schedules.sensei_id::text = public.current_sensei_id()
      AND schedules.student_id IS NOT NULL

    UNION ALL

    SELECT jsonb_array_elements_text(
      coalesce(to_jsonb(schedules.student_ids), '[]'::jsonb)
    ) AS student_id
    FROM public.schedules
    WHERE schedules.sensei_id::text = public.current_sensei_id()
  ) AS assigned
  WHERE assigned.student_id IS NOT NULL
    AND assigned.student_id <> ''
$$;

REVOKE ALL ON FUNCTION public.current_sensei_student_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_sensei_student_ids() TO authenticated;

DROP POLICY IF EXISTS "approved_read_students" ON public.students;

CREATE POLICY "approved_read_students"
ON public.students
FOR SELECT
TO authenticated
USING (
  public.current_profile_role() IN ('Super Admin', 'Staff')
  OR (
    public.current_profile_role() = 'Sensei'
    AND students.id::text IN (
      SELECT public.current_sensei_student_ids()
    )
  )
);

COMMIT;

SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'students'
ORDER BY policyname;
