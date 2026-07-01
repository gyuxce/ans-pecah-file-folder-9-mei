import { LessonTracker, Schedule, SenseiTimezone } from '../types';
import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz';

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
  const rawIds = schedule.studentIds ?? schedule.student_ids;
  let studentIds: unknown[] = [];

  if (Array.isArray(rawIds)) {
    studentIds = rawIds;
  } else if (typeof rawIds === 'string' && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds);
      studentIds = Array.isArray(parsed) ? parsed : [rawIds];
    } catch {
      studentIds = [rawIds];
    }
  }

  const normalizedIds = studentIds
    .map(value => typeof value === 'object' && value !== null && 'id' in value ? (value as { id: unknown }).id : value)
    .map(value => String(value || '').trim())
    .filter(Boolean);

  if (normalizedIds.length > 0) return [...new Set(normalizedIds)];

  const singleStudentId = schedule.studentId ?? schedule.student_id;
  return singleStudentId ? [String(singleStudentId)] : [];
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

export const normalizeTimezone = (timezone?: string | null): SenseiTimezone => {
  if (timezone === 'Asia/Makassar' || timezone === 'WITA') return 'Asia/Makassar';
  if (timezone === 'Asia/Jayapura' || timezone === 'WIT') return 'Asia/Jayapura';
  return WIB_TIMEZONE;
};

export const getTimezoneAbbreviation = (timezone: string | null | undefined = WIB_TIMEZONE): 'WIB' | 'WITA' | 'WIT' => {
  const normalizedTimezone = normalizeTimezone(timezone);
  if (normalizedTimezone === 'Asia/Makassar') return 'WITA';
  if (normalizedTimezone === 'Asia/Jayapura') return 'WIT';
  return 'WIB';
};

export const getCurrentTimeInTimezone = (timezone: string | null | undefined = WIB_TIMEZONE): string => (
  formatInTimeZone(new Date(), normalizeTimezone(timezone), 'HH:mm')
);

export const getDateInTimezone = (
  timezone: string | null | undefined = WIB_TIMEZONE,
  date: Date | number | string = new Date()
): Date => toZonedTime(new Date(date), normalizeTimezone(timezone));

export const formatTimestampInTimezone = (
  timestamp: string | null | undefined,
  timezone: string | null | undefined = WIB_TIMEZONE,
  pattern = 'HH:mm'
): string => timestamp ? formatInTimeZone(timestamp, normalizeTimezone(timezone), pattern) : '';

/**
 * Mendapatkan jam saat ini dalam format WIB ('HH:mm')
 */
export const getCurrentWIBTime = (): string => {
  return getCurrentTimeInTimezone(WIB_TIMEZONE);
};

/**
 * Mengubah Date biasa (lokal/UTC) menjadi Date yang sudah disesuaikan dengan WIB
 * Berguna untuk komparasi hari ini dalam zona WIB
 */
export const getWIBDate = (date: Date | number | string = new Date()): Date => {
  return getDateInTimezone(WIB_TIMEZONE, date);
};
