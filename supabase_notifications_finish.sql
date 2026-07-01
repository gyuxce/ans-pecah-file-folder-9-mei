-- ANS Schedule - Phase 5 notification and access verification finish.
-- Additive and idempotent. No operational data is deleted.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Mark all notifications for the authenticated account only.
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()::text
    AND is_read = FALSE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- Lightweight health report for administrators. It exposes counts only, not
-- another user's private records.
CREATE OR REPLACE FUNCTION public.booking_access_health()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_accounts INTEGER;
  unlinked_students INTEGER;
  active_availability INTEGER;
  pending_bookings INTEGER;
BEGIN
  IF public.current_profile_role() NOT IN ('Super Admin', 'Staff') THEN
    RAISE EXCEPTION 'Akses ditolak.';
  END IF;

  SELECT count(*) INTO student_accounts
  FROM public.profiles
  WHERE role = 'Student' AND status = 'Approved';

  SELECT count(*) INTO unlinked_students
  FROM public.profiles profile
  WHERE profile.role = 'Student'
    AND profile.status = 'Approved'
    AND NOT EXISTS (
      SELECT 1 FROM public.students student
      WHERE student.profile_id = profile.id::text
         OR lower(coalesce(student.email, '')) = lower(coalesce(profile.email, ''))
    );

  SELECT count(*) INTO active_availability
  FROM public.sensei_availability WHERE is_active = TRUE;

  SELECT count(*) INTO pending_bookings
  FROM public.booking_requests WHERE status = 'pending';

  RETURN jsonb_build_object(
    'student_accounts', student_accounts,
    'unlinked_student_accounts', unlinked_students,
    'active_availability_rules', active_availability,
    'pending_booking_requests', pending_bookings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.booking_access_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_access_health() TO authenticated;

-- Supabase Realtime publication may already contain this table.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END;
$$;

COMMIT;

-- Verification only.
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sensei_availability', 'booking_requests', 'notifications')
ORDER BY tablename, policyname;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('mark_all_notifications_read', 'booking_access_health')
ORDER BY routine_name;
