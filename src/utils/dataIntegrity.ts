import { format, subDays } from 'date-fns';
import type { LessonTracker, OffDay, Schedule, Sensei, SenseiTimeBlock, Student } from '../types';
import type { Group } from '../store/useAppStore';

export type DataIntegritySeverity = 'high' | 'medium' | 'low';

export type DataIntegrityIssue = {
  id: string;
  severity: DataIntegritySeverity;
  category: string;
  title: string;
  detail: string;
};

type AuditInput = {
  senseiList: Sensei[];
  studentList: Student[];
  groupList: Group[];
  schedules: Schedule[];
  lessonTrackers: LessonTracker[];
  offDays?: OffDay[];
  senseiTimeBlocks?: SenseiTimeBlock[];
};

const getScheduleStudentIds = (schedule: Schedule) => {
  return schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
};

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && aEnd > bStart;

export const auditDataIntegrity = ({
  senseiList,
  studentList,
  groupList,
  schedules,
  lessonTrackers,
  offDays = [],
  senseiTimeBlocks = []
}: AuditInput): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];
  const senseiIds = new Set(senseiList.map(sensei => sensei.id));
  const senseiNames = new Set(senseiList.map(sensei => sensei.name.trim().toLowerCase()).filter(Boolean));
  const studentById = new Map(studentList.map(student => [student.id, student]));
  const groupById = new Map(groupList.map(group => [group.id, group]));
  const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
  const activeScheduleKeys = new Map<string, Schedule>();
  const activeSchedules = schedules.filter(schedule => schedule.status === 'active');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const recentWindowStart = format(subDays(new Date(), 14), 'yyyy-MM-dd');

  studentList.forEach(student => {
    if (student.is_active === false) return;
    const assignedSensei = (student.sensei_name || '').trim();
    if (!assignedSensei) {
      issues.push({
        id: `student-no-sensei-${student.id}`,
        severity: 'medium',
        category: 'Student',
        title: 'Student aktif belum punya sensei',
        detail: `${student.name || 'Student tanpa nama'} masih aktif tapi kolom sensei kosong.`
      });
    } else if (!senseiNames.has(assignedSensei.toLowerCase())) {
      issues.push({
        id: `student-sensei-name-mismatch-${student.id}`,
        severity: 'low',
        category: 'Student',
        title: 'Nama sensei student tidak cocok master',
        detail: `${student.name || 'Student tanpa nama'} memakai sensei "${assignedSensei}", tapi tidak match persis dengan Data Sensei.`
      });
    }
  });

  groupList.forEach(group => {
    const studentIds = group.studentIds || [];
    if (studentIds.length === 0) {
      issues.push({
        id: `group-empty-${group.id}`,
        severity: 'medium',
        category: 'Group',
        title: 'Group tanpa member',
        detail: `${group.name || 'Group tanpa nama'} belum punya student.`
      });
      return;
    }

    studentIds.forEach(studentId => {
      const student = studentById.get(studentId);
      if (!student) {
        issues.push({
          id: `group-missing-student-${group.id}-${studentId}`,
          severity: 'high',
          category: 'Group',
          title: 'Group berisi student yang tidak ditemukan',
          detail: `${group.name || 'Group tanpa nama'} memakai student ID ${studentId}, tapi student tidak ada di Master Data.`
        });
      } else if (student.is_active === false) {
        issues.push({
          id: `group-inactive-student-${group.id}-${studentId}`,
          severity: 'low',
          category: 'Group',
          title: 'Group berisi student inactive',
          detail: `${group.name || 'Group tanpa nama'} masih berisi ${student.name} yang statusnya inactive.`
        });
      }
    });
  });

  schedules.forEach(schedule => {
    if (!senseiIds.has(schedule.senseiId)) {
      issues.push({
        id: `schedule-missing-sensei-${schedule.id}`,
        severity: 'high',
        category: 'Schedule',
        title: 'Schedule tanpa sensei valid',
        detail: `Schedule ${schedule.date || '-'} ${schedule.startTime || '-'} memakai sensei ID ${schedule.senseiId || '-'}, tapi sensei tidak ditemukan.`
      });
    }

    const studentIds = getScheduleStudentIds(schedule);
    if (studentIds.length === 0) {
      issues.push({
        id: `schedule-no-student-${schedule.id}`,
        severity: 'high',
        category: 'Schedule',
        title: 'Schedule tanpa student',
        detail: `Schedule ${schedule.date || '-'} ${schedule.startTime || '-'} belum punya student.`
      });
    }

    studentIds.forEach(studentId => {
      const student = studentById.get(studentId);
      if (!student) {
        issues.push({
          id: `schedule-missing-student-${schedule.id}-${studentId}`,
          severity: 'high',
          category: 'Schedule',
          title: 'Schedule memakai student yang tidak ditemukan',
          detail: `Schedule ${schedule.date || '-'} ${schedule.startTime || '-'} memakai student ID ${studentId}, tapi student tidak ada.`
        });
      } else if (schedule.status === 'active' && student.is_active === false) {
        issues.push({
          id: `schedule-inactive-student-${schedule.id}-${studentId}`,
          severity: 'medium',
          category: 'Schedule',
          title: 'Student inactive masih punya jadwal aktif',
          detail: `${student.name} sudah inactive, tapi masih punya schedule aktif pada ${schedule.date || '-'} ${schedule.startTime || '-'}.`
        });
      }
    });

    if (schedule.groupId) {
      const group = groupById.get(schedule.groupId);
      if (!group) {
        issues.push({
          id: `schedule-missing-group-${schedule.id}`,
          severity: 'high',
          category: 'Schedule',
          title: 'Schedule group tanpa group valid',
          detail: `Schedule ${schedule.date || '-'} ${schedule.startTime || '-'} memakai group ID ${schedule.groupId}, tapi group tidak ditemukan.`
        });
      } else if (!group.studentIds?.length) {
        issues.push({
          id: `schedule-empty-group-${schedule.id}`,
          severity: 'medium',
          category: 'Schedule',
          title: 'Schedule memakai group kosong',
          detail: `Schedule ${schedule.date || '-'} ${schedule.startTime || '-'} memakai group ${group.name}, tapi group belum punya member.`
        });
      }
    }

    if (schedule.status === 'active') {
      const duplicateKey = [
        schedule.senseiId,
        schedule.date,
        schedule.startTime,
        schedule.endTime,
        [...studentIds].sort().join('|'),
        schedule.groupId || ''
      ].join('::');
      const existing = activeScheduleKeys.get(duplicateKey);
      if (existing) {
        issues.push({
          id: `duplicate-schedule-${existing.id}-${schedule.id}`,
          severity: 'medium',
          category: 'Schedule',
          title: 'Duplicate schedule aktif',
          detail: `Ada schedule aktif duplikat pada ${schedule.date || '-'} ${schedule.startTime || '-'} sampai ${schedule.endTime || '-'}.`
        });
      } else {
        activeScheduleKeys.set(duplicateKey, schedule);
      }
    }
  });

  const scheduleOverlapIssues = new Set<string>();
  activeSchedules.forEach((schedule, index) => {
    activeSchedules.slice(index + 1).forEach(otherSchedule => {
      if (
        schedule.senseiId === otherSchedule.senseiId &&
        schedule.date === otherSchedule.date &&
        overlaps(schedule.startTime, schedule.endTime, otherSchedule.startTime, otherSchedule.endTime)
      ) {
        const key = [schedule.id, otherSchedule.id].sort().join('-');
        if (scheduleOverlapIssues.has(key)) return;
        scheduleOverlapIssues.add(key);
        issues.push({
          id: `schedule-overlap-${key}`,
          severity: 'high',
          category: 'Schedule',
          title: 'Jadwal ANS bentrok sesama ANS',
          detail: `Sensei punya 2 schedule aktif yang overlap pada ${schedule.date} ${schedule.startTime}-${schedule.endTime}.`
        });
      }
    });
  });

  const blockers = [
    ...senseiTimeBlocks
      .filter(block => block.status !== 'available_ans')
      .map(block => ({
        id: block.id,
        senseiId: block.senseiId,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        label: block.status === 'busy_cakap' ? 'Busy Cakap' : block.status === 'busy_personal' ? 'Busy Pribadi' : 'Off'
      })),
    ...offDays.map(offDay => ({
      id: offDay.id,
      senseiId: offDay.senseiId,
      date: offDay.date,
      startTime: '00:00',
      endTime: '23:59',
      label: 'Hari Libur'
    }))
  ];

  const blockedSchedules = activeSchedules.filter(schedule =>
    blockers.some(blocker =>
      blocker.senseiId === schedule.senseiId &&
      blocker.date === schedule.date &&
      overlaps(schedule.startTime, schedule.endTime, blocker.startTime, blocker.endTime)
    )
  );

  blockedSchedules.slice(0, 12).forEach(schedule => {
    issues.push({
      id: `schedule-blocked-${schedule.id}`,
      severity: 'high',
      category: 'Schedule',
      title: 'Jadwal aktif overlap dengan Busy/Off',
      detail: `Schedule ${schedule.date} ${schedule.startTime}-${schedule.endTime} bentrok dengan blok Cakap/Pribadi/Off atau Hari Libur.`
    });
  });

  if (blockedSchedules.length > 12) {
    issues.push({
      id: 'schedule-blocked-overflow',
      severity: 'medium',
      category: 'Schedule',
      title: 'Masih ada jadwal bentrok lain',
      detail: `${blockedSchedules.length - 12} jadwal bentrok lain disembunyikan agar daftar tetap ringan.`
    });
  }

  const trackerKeys = new Set(lessonTrackers.map(tracker => `${tracker.scheduleId}:${tracker.date}`));
  const schedulesWithoutTracker = activeSchedules.filter(schedule =>
    schedule.date >= recentWindowStart &&
    schedule.date <= todayStr &&
    !trackerKeys.has(`${schedule.id}:${schedule.date}`)
  );

  if (schedulesWithoutTracker.length > 0) {
    const samples = schedulesWithoutTracker
      .slice(0, 4)
      .map(schedule => `${schedule.date} ${schedule.startTime}`)
      .join(', ');
    issues.push({
      id: 'recent-schedules-without-tracker',
      severity: 'medium',
      category: 'Lesson Tracker',
      title: 'Sesi terbaru belum punya tracker',
      detail: `${schedulesWithoutTracker.length} sesi aktif dalam 14 hari terakhir belum tercatat di Lesson Tracker. Contoh: ${samples}.`
    });
  }

  lessonTrackers.forEach(tracker => {
    if (tracker.scheduleId && !scheduleById.has(tracker.scheduleId)) {
      issues.push({
        id: `tracker-missing-schedule-${tracker.id}`,
        severity: 'high',
        category: 'Lesson Tracker',
        title: 'Tracker tanpa schedule valid',
        detail: `Tracker tanggal ${tracker.date || '-'} memakai schedule ID ${tracker.scheduleId}, tapi schedule tidak ditemukan.`
      });
    }

    if (tracker.studentId && !studentById.has(tracker.studentId)) {
      issues.push({
        id: `tracker-missing-student-${tracker.id}`,
        severity: 'high',
        category: 'Lesson Tracker',
        title: 'Tracker memakai student yang tidak ditemukan',
        detail: `Tracker tanggal ${tracker.date || '-'} memakai student ID ${tracker.studentId}, tapi student tidak ada.`
      });
    }

    if (tracker.senseiId && !senseiIds.has(tracker.senseiId)) {
      issues.push({
        id: `tracker-missing-sensei-${tracker.id}`,
        severity: 'medium',
        category: 'Lesson Tracker',
        title: 'Tracker memakai sensei yang tidak ditemukan',
        detail: `Tracker tanggal ${tracker.date || '-'} memakai sensei ID ${tracker.senseiId}, tapi sensei tidak ada.`
      });
    }

    if (Number.isFinite(Number(tracker.score)) && (Number(tracker.score) < 0 || Number(tracker.score) > 100)) {
      issues.push({
        id: `tracker-invalid-score-${tracker.id}`,
        severity: 'medium',
        category: 'Lesson Tracker',
        title: 'Nilai tracker di luar range',
        detail: `Tracker tanggal ${tracker.date || '-'} punya nilai ${tracker.score}. Nilai normal sebaiknya 0 sampai 100.`
      });
    }
  });

  return issues;
};
