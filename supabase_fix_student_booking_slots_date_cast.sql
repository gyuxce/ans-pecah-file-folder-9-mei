-- Fix student booking slot RPC when existing date columns are stored as text.
-- Safe to rerun. This does not delete or alter existing data.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_available_booking_slots(
  p_start_date DATE,
  p_end_date DATE,
  p_sensei_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  availability_id UUID,
  sensei_id TEXT,
  sensei_name TEXT,
  slot_date DATE,
  start_time TIME,
  end_time TIME,
  slot_duration_minutes INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_profile_role() IS NULL THEN
    RAISE EXCEPTION 'Akun belum disetujui.';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Rentang tanggal tidak valid.';
  END IF;
  IF p_end_date - p_start_date > 31 THEN
    RAISE EXCEPTION 'Rentang pencarian maksimal 31 hari.';
  END IF;

  RETURN QUERY
  WITH availability_rows AS (
    SELECT
      availability.id,
      availability.sensei_id::text AS sensei_id,
      availability.pattern,
      nullif(availability.availability_date::text, '')::date AS availability_date,
      availability.start_time::time AS start_time,
      availability.end_time::time AS end_time,
      coalesce(availability.slot_duration_minutes, 90)::integer AS slot_duration_minutes,
      nullif(availability.valid_from::text, '')::date AS valid_from,
      nullif(availability.valid_until::text, '')::date AS valid_until,
      availability.weekday,
      availability.is_active
    FROM public.sensei_availability availability
  ), occurrences AS (
    SELECT
      availability.id,
      availability.sensei_id,
      day_value.slot_date,
      availability.start_time,
      availability.end_time,
      availability.slot_duration_minutes
    FROM availability_rows availability
    CROSS JOIN LATERAL (
      SELECT availability.availability_date AS slot_date
      WHERE availability.pattern = 'specific_date'
        AND availability.availability_date IS NOT NULL
        AND availability.availability_date BETWEEN p_start_date AND p_end_date
      UNION ALL
      SELECT generated_day::date AS slot_date
      FROM generate_series(
        greatest(coalesce(availability.valid_from, p_start_date), p_start_date),
        least(coalesce(availability.valid_until, p_end_date), p_end_date),
        interval '1 day'
      ) generated_day
      WHERE availability.pattern = 'weekly'
        AND extract(dow FROM generated_day)::smallint = availability.weekday
    ) day_value
    WHERE availability.is_active = TRUE
      AND (p_sensei_id IS NULL OR availability.sensei_id = p_sensei_id)
  ), generated_slots AS (
    SELECT
      occurrence.id,
      occurrence.sensei_id,
      occurrence.slot_date,
      slot_start::time AS slot_start,
      (slot_start + make_interval(mins => occurrence.slot_duration_minutes))::time AS slot_end,
      occurrence.slot_duration_minutes
    FROM occurrences occurrence
    CROSS JOIN LATERAL generate_series(
      occurrence.slot_date + occurrence.start_time,
      occurrence.slot_date + occurrence.end_time - make_interval(mins => occurrence.slot_duration_minutes),
      make_interval(mins => occurrence.slot_duration_minutes)
    ) slot_start
  )
  SELECT DISTINCT ON (slot.sensei_id, slot.slot_date, slot.slot_start, slot.slot_end)
    slot.id,
    slot.sensei_id,
    public.resolve_sensei_name(slot.sensei_id),
    slot.slot_date,
    slot.slot_start,
    slot.slot_end,
    slot.slot_duration_minutes
  FROM generated_slots slot
  WHERE slot.slot_date >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.schedules schedule
      WHERE schedule.sensei_id::text = slot.sensei_id
        AND nullif(schedule.date::text, '')::date = slot.slot_date
        AND coalesce(schedule.status, 'active') <> 'cancelled'
        AND public.safe_schedule_time(schedule.start_time::text) < slot.slot_end
        AND public.safe_schedule_time(schedule.end_time::text) > slot.slot_start
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.sensei_time_blocks block
      WHERE block.sensei_id::text = slot.sensei_id
        AND nullif(block.date::text, '')::date = slot.slot_date
        AND coalesce(block.status, '') <> 'available_ans'
        AND public.safe_schedule_time(block.start_time::text) < slot.slot_end
        AND public.safe_schedule_time(block.end_time::text) > slot.slot_start
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.offdays offday
      WHERE offday.sensei_id::text = slot.sensei_id
        AND nullif(offday.date::text, '')::date = slot.slot_date
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.leave_requests request
      WHERE request.sensei_id::text = slot.sensei_id
        AND request.status = 'approved'
        AND slot.slot_date BETWEEN nullif(request.start_date::text, '')::date AND nullif(request.end_date::text, '')::date
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.booking_requests request
      WHERE request.sensei_id = slot.sensei_id
        AND nullif(request.requested_date::text, '')::date = slot.slot_date
        AND request.status IN ('pending', 'approved')
        AND request.start_time::time < slot.slot_end
        AND request.end_time::time > slot.slot_start
    )
  ORDER BY slot.sensei_id, slot.slot_date, slot.slot_start, slot.slot_end, slot.id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_booking_slots(DATE, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_booking_slots(DATE, DATE, TEXT) TO authenticated;

COMMIT;

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_available_booking_slots';
