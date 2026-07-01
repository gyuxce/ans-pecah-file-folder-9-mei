-- ANS Schedule - centralized booking validation and approval.
-- Phase 2: run after supabase_student_booking_foundation.sql.
-- Additive and idempotent. Existing schedules and master data are untouched.

BEGIN;

-- Old schedule data stores time as text. This helper prevents one malformed
-- legacy value from crashing every conflict check.
CREATE OR REPLACE FUNCTION public.safe_schedule_time(value TEXT)
RETURNS TIME
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN value::time;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- One source of truth for conflicts from every booking flow.
CREATE OR REPLACE FUNCTION public.find_booking_conflicts(
  p_sensei_id TEXT,
  p_student_id TEXT,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_request_id UUID DEFAULT NULL
)
RETURNS TABLE(conflict_type TEXT, conflict_message TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_end_time <= p_start_time THEN
    RETURN QUERY SELECT 'invalid_time', 'Jam selesai harus setelah jam mulai.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schedules schedule
    WHERE schedule.sensei_id::text = p_sensei_id
      AND nullif(schedule.date::text, '')::date = p_date
      AND coalesce(schedule.status, 'active') <> 'cancelled'
      AND public.safe_schedule_time(schedule.start_time::text) < p_end_time
      AND public.safe_schedule_time(schedule.end_time::text) > p_start_time
  ) THEN
    RETURN QUERY SELECT 'sensei_schedule', 'Sensei sudah memiliki kelas ANS pada jam ini.';
  END IF;

  IF p_student_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.schedules schedule
    WHERE nullif(schedule.date::text, '')::date = p_date
      AND coalesce(schedule.status, 'active') <> 'cancelled'
      AND (
        schedule.student_id::text = p_student_id
        OR coalesce(to_jsonb(schedule.student_ids), '[]'::jsonb) @> jsonb_build_array(p_student_id)
      )
      AND public.safe_schedule_time(schedule.start_time::text) < p_end_time
      AND public.safe_schedule_time(schedule.end_time::text) > p_start_time
  ) THEN
    RETURN QUERY SELECT 'student_schedule', 'Siswa sudah memiliki kelas lain pada jam ini.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.sensei_time_blocks block
    WHERE block.sensei_id::text = p_sensei_id
      AND nullif(block.date::text, '')::date = p_date
      AND coalesce(block.status, '') <> 'available_ans'
      AND public.safe_schedule_time(block.start_time::text) < p_end_time
      AND public.safe_schedule_time(block.end_time::text) > p_start_time
  ) THEN
    RETURN QUERY SELECT 'sensei_busy', 'Sensei memiliki jadwal Cakap atau keperluan pribadi pada jam ini.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offdays offday
    WHERE offday.sensei_id::text = p_sensei_id
      AND nullif(offday.date::text, '')::date = p_date
  ) THEN
    RETURN QUERY SELECT 'sensei_off', 'Sensei sedang libur atau cuti pada tanggal ini.';
  END IF;

  IF to_regclass('public.leave_requests') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.leave_requests request
    WHERE request.sensei_id::text = p_sensei_id
      AND request.status = 'approved'
      AND p_date BETWEEN nullif(request.start_date::text, '')::date AND nullif(request.end_date::text, '')::date
  ) THEN
    RETURN QUERY SELECT 'sensei_leave', 'Sensei memiliki pengajuan libur yang sudah disetujui.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.booking_requests request
    WHERE request.id IS DISTINCT FROM p_exclude_booking_request_id
      AND request.sensei_id = p_sensei_id
      AND nullif(request.requested_date::text, '')::date = p_date
      AND request.status IN ('pending', 'approved')
      AND request.start_time < p_end_time
      AND request.end_time > p_start_time
  ) THEN
    RETURN QUERY SELECT 'booking_request', 'Slot sedang diminta atau sudah disetujui untuk siswa lain.';
  END IF;

  IF p_student_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.booking_requests request
    WHERE request.id IS DISTINCT FROM p_exclude_booking_request_id
      AND request.student_id = p_student_id
      AND nullif(request.requested_date::text, '')::date = p_date
      AND request.status IN ('pending', 'approved')
      AND request.start_time < p_end_time
      AND request.end_time > p_start_time
  ) THEN
    RETURN QUERY SELECT 'student_request', 'Siswa sudah memiliki permintaan lain pada jam ini.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.find_booking_conflicts(TEXT, TEXT, DATE, TIME, TIME, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_booking_conflicts(TEXT, TEXT, DATE, TIME, TIME, UUID) TO authenticated;

-- Submit through one RPC so a student cannot bypass availability and conflict
-- validation with a direct table insert.
CREATE OR REPLACE FUNCTION public.submit_booking_request(
  p_student_id TEXT,
  p_sensei_id TEXT,
  p_availability_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_class_type TEXT DEFAULT NULL,
  p_level TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_request public.booking_requests%ROWTYPE;
  conflict_record RECORD;
BEGIN
  IF public.current_profile_role() NOT IN ('Super Admin', 'Staff')
     AND public.current_student_id() IS DISTINCT FROM p_student_id THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Anda tidak dapat membuat booking untuk siswa ini.');
  END IF;

  -- Serialize requests for the same sensei and student window. This closes the
  -- race where two users click the final available slot at the same moment.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', 'sensei', p_sensei_id, p_date::text, p_start_time::text, p_end_time::text), 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', 'student', p_student_id, p_date::text, p_start_time::text, p_end_time::text), 0
  ));

  IF NOT EXISTS (
    SELECT 1
    FROM public.sensei_availability availability
    WHERE availability.id = p_availability_id
      AND availability.sensei_id = p_sensei_id
      AND availability.is_active = TRUE
      AND availability.start_time <= p_start_time
      AND availability.end_time >= p_end_time
      AND (
        (availability.pattern = 'specific_date' AND nullif(availability.availability_date::text, '')::date = p_date)
        OR
        (availability.pattern = 'weekly'
          AND availability.weekday = extract(dow FROM p_date)::smallint
          AND p_date BETWEEN nullif(availability.valid_from::text, '')::date AND nullif(availability.valid_until::text, '')::date)
      )
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Slot availability tidak ditemukan atau sudah tidak aktif.');
  END IF;

  SELECT * INTO conflict_record
  FROM public.find_booking_conflicts(
    p_sensei_id, p_student_id, p_date, p_start_time, p_end_time, NULL
  )
  LIMIT 1;

  IF conflict_record.conflict_type IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', conflict_record.conflict_type,
      'message', conflict_record.conflict_message
    );
  END IF;

  INSERT INTO public.booking_requests (
    student_id, sensei_id, availability_id, requested_date,
    start_time, end_time, class_type, level, note, status, created_by
  ) VALUES (
    p_student_id, p_sensei_id, p_availability_id, p_date,
    p_start_time, p_end_time, p_class_type, p_level, nullif(btrim(p_note), ''),
    'pending', auth.uid()::text
  )
  RETURNING * INTO new_request;

  INSERT INTO public.notifications (user_id, type, title, message, booking_request_id)
  SELECT profile.id::text, 'booking_request', 'Booking baru',
    'Ada permintaan jadwal siswa yang perlu diperiksa.', new_request.id
  FROM public.profiles profile
  WHERE profile.role IN ('Super Admin', 'Staff')
    AND profile.status = 'Approved';

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, collection_name, record_id, payload
  ) VALUES (
    auth.uid(), auth.jwt() ->> 'email', 'submit_booking_request',
    'booking_requests', new_request.id::text,
    jsonb_build_object('student_id', p_student_id, 'sensei_id', p_sensei_id,
      'date', p_date, 'start_time', p_start_time, 'end_time', p_end_time)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Permintaan booking berhasil dikirim.',
    'booking_request_id', new_request.id,
    'status', new_request.status
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', FALSE, 'message', 'Permintaan yang sama sudah pernah dikirim.');
WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_booking_request(TEXT, TEXT, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_booking_request(TEXT, TEXT, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) TO authenticated;

-- Admin approval atomically rechecks the slot, creates the real schedule, and
-- links the request to it. jsonb_populate_record adapts text IDs to the actual
-- UUID/text column types used by each existing Supabase project.
CREATE OR REPLACE FUNCTION public.review_booking_request(
  p_booking_request_id UUID,
  p_decision TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_request public.booking_requests%ROWTYPE;
  conflict_record RECORD;
  new_schedule_id TEXT;
  student_profile_id TEXT;
  sensei_profile_id TEXT;
BEGIN
  IF public.current_profile_role() NOT IN ('Super Admin', 'Staff') THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Hanya admin yang dapat memproses booking.');
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Keputusan harus approve atau reject.');
  END IF;

  SELECT * INTO target_request
  FROM public.booking_requests
  WHERE id = p_booking_request_id
  FOR UPDATE;

  IF target_request.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Permintaan booking tidak ditemukan.');
  END IF;

  IF target_request.status <> 'pending' THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Permintaan ini sudah pernah diproses.');
  END IF;

  IF p_decision = 'reject' THEN
    UPDATE public.booking_requests
    SET status = 'rejected', reviewed_by = auth.uid()::text,
      reviewed_at = NOW(), review_note = nullif(btrim(p_review_note), '')
    WHERE id = target_request.id;

    SELECT students.profile_id INTO student_profile_id
    FROM public.students
    WHERE students.id::text = target_request.student_id;

    IF student_profile_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, booking_request_id)
      VALUES (student_profile_id, 'booking_rejected', 'Booking ditolak',
        'Permintaan jadwal Anda belum dapat disetujui.', target_request.id);
    END IF;

    RETURN jsonb_build_object('success', TRUE, 'message', 'Permintaan booking ditolak.', 'status', 'rejected');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', 'sensei', target_request.sensei_id, target_request.requested_date::text,
      target_request.start_time::text, target_request.end_time::text), 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    concat_ws('|', 'student', target_request.student_id, target_request.requested_date::text,
      target_request.start_time::text, target_request.end_time::text), 0
  ));

  SELECT * INTO conflict_record
  FROM public.find_booking_conflicts(
    target_request.sensei_id,
    target_request.student_id,
    target_request.requested_date,
    target_request.start_time,
    target_request.end_time,
    target_request.id
  )
  LIMIT 1;

  IF conflict_record.conflict_type IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'code', conflict_record.conflict_type,
      'message', conflict_record.conflict_message
    );
  END IF;

  INSERT INTO public.schedules (
    sensei_id, student_id, student_ids, type, level, date,
    start_time, end_time, status, updated_at, updated_by
  )
  SELECT
    record.sensei_id, record.student_id, record.student_ids, record.type,
    record.level, record.date, record.start_time, record.end_time,
    record.status, record.updated_at, record.updated_by
  FROM jsonb_populate_record(
    NULL::public.schedules,
    jsonb_build_object(
      'sensei_id', target_request.sensei_id,
      'student_id', target_request.student_id,
      'student_ids', jsonb_build_array(target_request.student_id),
      'type', coalesce(target_request.class_type, 'Private'),
      'level', coalesce(target_request.level, ''),
      'date', target_request.requested_date,
      'start_time', to_char(target_request.start_time, 'HH24:MI'),
      'end_time', to_char(target_request.end_time, 'HH24:MI'),
      'status', 'active',
      'updated_at', NOW(),
      'updated_by', auth.jwt() ->> 'email'
    )
  ) AS record
  RETURNING id::text INTO new_schedule_id;

  UPDATE public.booking_requests
  SET status = 'approved', schedule_id = new_schedule_id,
    reviewed_by = auth.uid()::text, reviewed_at = NOW(),
    review_note = nullif(btrim(p_review_note), '')
  WHERE id = target_request.id;

  SELECT students.profile_id INTO student_profile_id
  FROM public.students
  WHERE students.id::text = target_request.student_id;

  SELECT profile.id::text INTO sensei_profile_id
  FROM public.sensei
  JOIN public.profiles profile ON lower(profile.email) = lower(public.sensei.email)
  WHERE public.sensei.id::text = target_request.sensei_id
  LIMIT 1;

  IF student_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, booking_request_id, schedule_id)
    VALUES (student_profile_id, 'booking_approved', 'Booking disetujui',
      'Jadwal Anda sudah disetujui dan masuk ke kalender.', target_request.id, new_schedule_id);
  END IF;

  IF sensei_profile_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, booking_request_id, schedule_id)
    VALUES (sensei_profile_id, 'schedule_created', 'Jadwal baru',
      'Ada jadwal ANS baru yang sudah disetujui.', target_request.id, new_schedule_id);
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_email, action, collection_name, record_id, payload
  ) VALUES (
    auth.uid(), auth.jwt() ->> 'email', 'approve_booking_request',
    'booking_requests', target_request.id::text,
    jsonb_build_object('schedule_id', new_schedule_id)
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Booking disetujui dan jadwal berhasil dibuat.',
    'status', 'approved',
    'schedule_id', new_schedule_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'message', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.review_booking_request(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_booking_request(UUID, TEXT, TEXT) TO authenticated;

COMMIT;

-- Verification only.
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'find_booking_conflicts',
    'submit_booking_request',
    'review_booking_request'
  )
ORDER BY routine_name;
