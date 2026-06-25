-- Restore helper for accidentally deleted student:
-- Fathir Putra Wardoyo / 081936595556
--
-- Jalankan BAGIAN 1 dulu di Supabase SQL Editor.
-- Kalau ketemu 1 candidate id yang benar, copy id tersebut ke BAGIAN 2.

-- BAGIAN 1: cek apakah siswa masih ada atau cari kandidat id lama dari jadwal.
SELECT
  'existing_student' AS source,
  s.id::text AS candidate_student_id,
  s.name,
  s.phone,
  s.sensei_name,
  s.level_awal,
  s.level_sekarang,
  s.type,
  s.durasi_kelas
FROM students s
WHERE lower(s.name) LIKE '%fathir%'
   OR regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = '081936595556';

WITH schedule_student_ids AS (
  SELECT
    jsonb_array_elements_text(coalesce(sc.student_ids, '[]'::jsonb))::uuid AS student_id,
    sc.id AS schedule_id,
    sc.date,
    sc.start_time,
    sc.end_time,
    sc.level,
    sc.type,
    se.name AS sensei_name
  FROM schedules sc
  LEFT JOIN sensei se ON se.id = sc.sensei_id
  WHERE sc.status <> 'cancelled'
    AND (
      lower(coalesce(sc.level, '')) LIKE '%guntai9%'
      OR lower(coalesce(se.name, '')) LIKE '%millenian%'
      OR lower(coalesce(se.name, '')) LIKE '%adrian%'
    )
),
missing_schedule_students AS (
  SELECT ssi.*
  FROM schedule_student_ids ssi
  LEFT JOIN students st ON st.id = ssi.student_id
  WHERE st.id IS NULL
)
SELECT
  'missing_schedule_student' AS source,
  student_id::text AS candidate_student_id,
  count(*) AS schedule_count,
  min(date) AS first_schedule,
  max(date) AS last_schedule,
  string_agg(DISTINCT sensei_name, ', ') AS sensei_names,
  string_agg(DISTINCT level, ', ') AS levels
FROM missing_schedule_students
GROUP BY student_id
ORDER BY schedule_count DESC, last_schedule DESC;

-- BAGIAN 2: setelah candidate_student_id yang benar ketemu, ganti UUID di bawah.
-- Jangan jalankan sebelum id-nya dipastikan.
/*
INSERT INTO students (
  id,
  name,
  phone,
  level,
  type,
  sensei_name,
  level_awal,
  level_sekarang,
  durasi_kelas,
  session_quota,
  student_leave_quota,
  payment_status,
  is_active
) VALUES (
  'PASTE_CANDIDATE_STUDENT_ID_DI_SINI'::uuid,
  'Fathir Putra Wardoyo',
  '081936595556',
  'GUNTAI 9',
  'Private',
  'Millenian Ibnu Andriansyah Karinda (Adrian)',
  'GUNTAI 9',
  'GUNTAI 9',
  '90',
  10,
  3,
  'Paid',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  level = EXCLUDED.level,
  type = EXCLUDED.type,
  sensei_name = EXCLUDED.sensei_name,
  level_awal = EXCLUDED.level_awal,
  level_sekarang = EXCLUDED.level_sekarang,
  durasi_kelas = EXCLUDED.durasi_kelas,
  session_quota = EXCLUDED.session_quota,
  student_leave_quota = EXCLUDED.student_leave_quota,
  payment_status = EXCLUDED.payment_status,
  is_active = EXCLUDED.is_active;

-- Sambungkan ulang tracker lama kalau student_id sempat jadi NULL saat student terhapus.
UPDATE lesson_trackers lt
SET student_id = 'PASTE_CANDIDATE_STUDENT_ID_DI_SINI'::uuid
FROM schedules sc
WHERE lt.student_id IS NULL
  AND lt.schedule_id = sc.id
  AND coalesce(sc.student_ids, '[]'::jsonb) ? 'PASTE_CANDIDATE_STUDENT_ID_DI_SINI';

-- Cek hasil restore.
SELECT
  s.id,
  s.name,
  s.phone,
  count(lt.id) AS tracker_count,
  avg(NULLIF(lt.score, 0)) AS avg_non_zero_score
FROM students s
LEFT JOIN lesson_trackers lt ON lt.student_id = s.id
WHERE s.id = 'PASTE_CANDIDATE_STUDENT_ID_DI_SINI'::uuid
GROUP BY s.id, s.name, s.phone;
*/
