import { differenceInMinutes, parse } from 'date-fns';
import type { LessonTracker, Schedule } from '../types';
import { getScheduleStudentIds } from './helpers';
import { createId } from './id';

/**
 * Mengecek apakah sesi mengajar terlambat lebih dari 10 menit
 * dibandingkan dengan jadwal seharusnya.
 */
export const isScheduleDelayedAt = (schedule: Pick<Schedule, 'date' | 'startTime'>, actualTime: Date): boolean => {
  if (!schedule.date || !schedule.startTime) return false;
  try {
    // Parse tanggal dan waktu dari jadwal
    const scheduledDateTime = parse(`${schedule.date} ${schedule.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const diff = differenceInMinutes(actualTime, scheduledDateTime);
    return diff > 10;
  } catch (e) {
    return false;
  }
};

/**
 * Membuat data LessonTracker baru saat tombol "Mulai" diklik
 */
export const buildTrackersForSessionStart = (
  schedule: Schedule,
  actualStartTime: string,
  actualTime: Date
): Partial<LessonTracker>[] => {
  const isDelayed = isScheduleDelayedAt(schedule, actualTime);
  const studentIds = getScheduleStudentIds(schedule);
  
  return studentIds.map(studentId => ({
    id: createId(),
    scheduleId: schedule.id,
    studentId,
    senseiId: schedule.senseiId,
    date: schedule.date,
    attendance: 'Hadir',
    material: '',
    score: 0,
    notes: '',
    actualStartTime,
    isDelayed,
    createdAt: actualTime.toISOString()
  }));
};
