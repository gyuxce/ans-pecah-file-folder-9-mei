import { LessonTracker, Schedule } from '../types';
import { format, toZonedTime } from 'date-fns-tz';

export const fetchFromGAS = async (url: string) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching from GAS:', error);
    return null;
  }
};

export const pushToGAS = async (url: string, sheetName: string, data: any[]) => {
  if (!url) return false;
  try {
    // We use text/plain to avoid CORS preflight issues with GAS
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ sheetName, data }),
    });
    return true;
  } catch (error) {
    console.error(`Error pushing ${sheetName} to GAS:`, error);
    return false;
  }
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportToCsv = (data: any[], fileName: string) => {
  const downloadName = `${fileName}.csv`;
  const headers: string[] = Array.from(
    data.reduce<Set<string>>((keys, row) => {
      Object.keys(row || {}).forEach(key => keys.add(key));
      return keys;
    }, new Set<string>())
  );

  const rows = [
    headers.map(csvEscape).join(','),
    ...data.map(row => headers.map(header => csvEscape(row?.[header])).join(','))
  ];

  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return downloadName;
};

export const scheduleHasStudent = (s: Schedule, studentId: string): boolean => {
  if (s.studentIds && s.studentIds.length > 0) return s.studentIds.includes(studentId);
  return s.studentId === studentId;
};

export const getScheduleStudentIds = (schedule: Pick<Schedule, 'studentIds' | 'studentId'> | any): string[] => {
  if (!schedule) return [];
  return schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
};

export const getValidAcademicScore = (tracker: Pick<LessonTracker, 'attendance' | 'material' | 'score'> | any) => {
  const score = Number(tracker?.score);
  if (tracker?.attendance !== 'Hadir') return null;
  if (!tracker?.material) return null;
  if (!Number.isFinite(score) || score <= 0) return null;
  return score;
};

// --- Timezone Utilities ---
export const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Mendapatkan jam saat ini dalam format WIB ('HH:mm')
 */
export const getCurrentWIBTime = (): string => {
  const now = new Date();
  const zonedDate = toZonedTime(now, WIB_TIMEZONE);
  return format(zonedDate, 'HH:mm', { timeZone: WIB_TIMEZONE });
};

/**
 * Mengubah Date biasa (lokal/UTC) menjadi Date yang sudah disesuaikan dengan WIB
 * Berguna untuk komparasi hari ini dalam zona WIB
 */
export const getWIBDate = (date: Date | number | string = new Date()): Date => {
  return toZonedTime(new Date(date), WIB_TIMEZONE);
};
