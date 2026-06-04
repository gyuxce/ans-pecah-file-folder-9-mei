import type { LessonTracker, Schedule, Sensei, Student } from '../types';
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
};

const getScheduleStudentIds = (schedule: Schedule) => {
  return schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
};

export const auditDataIntegrity = ({
  senseiList,
  studentList,
  groupList,
  schedules,
  lessonTrackers
}: AuditInput): DataIntegrityIssue[] => {
  const issues: DataIntegrityIssue[] = [];
  const senseiIds = new Set(senseiList.map(sensei => sensei.id));
  const studentById = new Map(studentList.map(student => [student.id, student]));
  const groupById = new Map(groupList.map(group => [group.id, group]));
  const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
  const activeScheduleKeys = new Map<string, Schedule>();

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
  });

  return issues;
};
