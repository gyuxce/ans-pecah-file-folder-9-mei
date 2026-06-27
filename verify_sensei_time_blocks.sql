-- Cek 1: Adakah time block yang ID senseinya bukan format UUID?
-- (Jika hasil query ini kosong / 0 baris, berarti aman)
SELECT id, sensei_id, date, start_time, end_time, status 
FROM sensei_time_blocks
WHERE sensei_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Cek 2: Adakah time block yang ID senseinya adalah UUID, TAPI senseinya sudah terhapus di tabel master?
-- (Jika hasil query ini kosong / 0 baris, berarti aman)
SELECT stb.id, stb.sensei_id, stb.date, stb.start_time, stb.status
FROM sensei_time_blocks stb
LEFT JOIN sensei s ON s.id::text = stb.sensei_id::text
WHERE s.id IS NULL;
