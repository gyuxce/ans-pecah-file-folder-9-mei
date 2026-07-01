/**
 * scheduleUtils.ts
 * Shared utilities untuk deteksi overlap/bentrok jadwal.
 *
 * Sebelumnya logika ini duplikat di 4 tempat:
 *   - dataIntegrity.ts (private overlaps())
 *   - ScheduleModal.tsx (inline)
 *   - SenseiDashboard.tsx (inline)
 *   - AnalyticsCards.tsx (inline)
 *
 * Setelah refactor: semua pakai fungsi dari file ini.
 */

import type { OffDay, SenseiTimeBlock } from '../types';

/**
 * Cek apakah dua rentang waktu string ('HH:mm') saling overlap.
 * Menggunakan algoritma standar interval intersection:
 *   A dan B overlap jika A.start < B.end DAN A.end > B.start
 *
 * @param aStart - Waktu mulai A ('HH:mm')
 * @param aEnd   - Waktu selesai A ('HH:mm')
 * @param bStart - Waktu mulai B ('HH:mm')
 * @param bEnd   - Waktu selesai B ('HH:mm')
 */
export const timesOverlap = (
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean => aStart < bEnd && aEnd > bStart;

// ---------------------------------------------------------------------------
// Tipe Blocker: representasi unified untuk hari libur & time block
// ---------------------------------------------------------------------------

export type ScheduleBlocker = {
  senseiId: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Label deskriptif untuk ditampilkan di UI */
  label: string;
};

/**
 * Bangun daftar "blocker" dari senseiTimeBlocks + offDays.
 * Blocker = jadwal yang membuat sensei tidak bisa menerima kelas baru.
 *
 * @param senseiTimeBlocks - Seluruh time block sensei
 * @param offDays          - Seluruh hari libur sensei
 * @param filterDate       - (Opsional) Saring hanya blocker pada tanggal ini
 */
export const buildBlockers = (
  senseiTimeBlocks: SenseiTimeBlock[],
  offDays: OffDay[],
  filterDate?: string
): ScheduleBlocker[] => {
  const timeBlockBlockers: ScheduleBlocker[] = senseiTimeBlocks
    .filter(block =>
      block.status !== 'available_ans' &&
      (filterDate === undefined || block.date === filterDate)
    )
    .map(block => ({
      senseiId: block.senseiId,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      label:
        block.status === 'ans_class'
          ? 'Kelas ANS'
          : block.status === 'busy_cakap'
          ? 'Kelas Cakap'
          : block.status === 'busy_personal'
          ? 'Tidak Bisa Mengajar'
          : 'Tidak Bisa Mengajar'
    }));

  const offDayBlockers: ScheduleBlocker[] = offDays
    .filter(offDay =>
      filterDate === undefined || offDay.date === filterDate
    )
    .map(offDay => ({
      senseiId: offDay.senseiId,
      date: offDay.date,
      startTime: '00:00',
      endTime: '23:59',
      label: 'Tidak Bisa Mengajar'
    }));

  return [...timeBlockBlockers, ...offDayBlockers];
};

/**
 * Cek apakah satu jadwal bertabrakan dengan salah satu blocker.
 *
 * @param schedule - Jadwal yang dicek (butuh senseiId, date, startTime, endTime)
 * @param blockers - Daftar blocker dari buildBlockers()
 */
export const isScheduleBlocked = (
  schedule: { senseiId: string; date: string; startTime: string; endTime: string },
  blockers: ScheduleBlocker[]
): boolean =>
  blockers.some(
    blocker =>
      blocker.senseiId === schedule.senseiId &&
      blocker.date === schedule.date &&
      timesOverlap(schedule.startTime, schedule.endTime, blocker.startTime, blocker.endTime)
  );

/**
 * Ambil semua blocker yang bertabrakan dengan satu jadwal.
 * Berguna untuk menampilkan detail konflik di UI.
 *
 * @param schedule - Jadwal yang dicek
 * @param blockers - Daftar blocker dari buildBlockers()
 */
export const getScheduleBlockers = (
  schedule: { senseiId: string; date: string; startTime: string; endTime: string },
  blockers: ScheduleBlocker[]
): ScheduleBlocker[] =>
  blockers.filter(
    blocker =>
      blocker.senseiId === schedule.senseiId &&
      blocker.date === schedule.date &&
      timesOverlap(schedule.startTime, schedule.endTime, blocker.startTime, blocker.endTime)
  );
