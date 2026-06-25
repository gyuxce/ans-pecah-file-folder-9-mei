import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PlayCircle
} from 'lucide-react';
import { addDays, differenceInMinutes, format, parse } from 'date-fns';
import { toast } from 'sonner';

import { LessonTracker, Schedule, Sensei, Student } from '../types';
import { useAppContext } from '../context/AppContext';

type SessionState = 'done' | 'live' | 'ready';

type SessionRow = Schedule & {
  displayName: string;
  senseiName: string;
  trackerCount: number;
  completedCount: number;
  expectedCount: number;
  attendanceLabel: string;
  hasStudentNote: boolean;
  hasPendingAdjustment: boolean;
  state: SessionState;
  delayed: boolean;
};

export const TeachingSessionsView = () => {
  const {
    senseiList,
    studentList,
    groupList,
    schedules,
    lessonTrackers,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    dbOps,
    isDataLoading,
    permissions
  } = useAppContext(state => ({
    senseiList: state.permissions.role === 'Sensei' ? state.scopedSenseiList : state.senseiList,
    studentList: state.permissions.role === 'Sensei' ? state.scopedStudentList : state.studentList,
    groupList: state.groupList,
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    lessonTrackers: state.permissions.role === 'Sensei' ? state.scopedLessonTrackers : state.lessonTrackers,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    dbOps: state.dbOps,
    isDataLoading: state.isDataLoading,
    permissions: state.permissions
  }));

  const [subTab, setSubTab] = useState<'today' | 'tomorrow' | 'upcoming'>('today');
  const isSensei = permissions.role === 'Sensei';

  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const tomorrowStr = useMemo(() => format(addDays(today, 1), 'yyyy-MM-dd'), [today]);

  const studentById = useMemo(() => {
    return new Map<string, Student>(studentList.map(student => [student.id, student]));
  }, [studentList]);

  const groupById = useMemo(() => {
    return new Map<string, any>((groupList || []).map((group: any) => [group.id, group]));
  }, [groupList]);

  const senseiById = useMemo(() => {
    return new Map<string, Sensei>(senseiList.map(sensei => [sensei.id, sensei]));
  }, [senseiList]);

  const trackerByScheduleDate = useMemo(() => {
    const index = new Map<string, LessonTracker[]>();
    lessonTrackers.forEach(tracker => {
      if (!tracker.scheduleId || !tracker.date) return;
      const key = `${tracker.scheduleId}|${tracker.date}`;
      const existing = index.get(key);
      if (existing) existing.push(tracker);
      else index.set(key, [tracker]);
    });
    return index;
  }, [lessonTrackers]);

  const attendanceCountByStudentId = useMemo(() => {
    const counts = new Map<string, number>();
    lessonTrackers.forEach(tracker => {
      if (!tracker.studentId || tracker.attendance !== 'Hadir' || !tracker.material) return;
      counts.set(tracker.studentId, (counts.get(tracker.studentId) || 0) + 1);
    });
    return counts;
  }, [lessonTrackers]);

  const filteredSchedules = useMemo(() => {
    return schedules
      .filter(schedule => {
        if (subTab === 'today') return schedule.date === todayStr;
        if (subTab === 'tomorrow') return schedule.date === tomorrowStr;
        if (subTab === 'upcoming') return schedule.date > tomorrowStr;
        return false;
      })
      .filter(schedule => schedule.status !== 'cancelled')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime || '').localeCompare(b.startTime || '');
      });
  }, [schedules, todayStr, tomorrowStr, subTab]);

  const sessionRows = useMemo(() => {
    return filteredSchedules.map((schedule): SessionRow => {
      const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
      const studentsForSchedule = studentIds.map(id => studentById.get(id)).filter((student): student is Student => Boolean(student));
      const group = groupById.get(schedule.groupId || '');
      const displayName = group ? group.name : (studentsForSchedule.map(student => student.name).join(', ') || 'Siswa tidak ditemukan');
      const attendanceLabel = studentsForSchedule.length === 1
        ? `${attendanceCountByStudentId.get(studentsForSchedule[0].id) || 0}/${Number(studentsForSchedule[0].sessionQuota) || 10}`
        : studentsForSchedule.length > 1
          ? `${studentsForSchedule.length} siswa`
          : '-';
      const hasStudentNote = studentsForSchedule.some(student => Boolean(student.specialNote || student.examNote || student.adminNote));
      const trackers = trackerByScheduleDate.get(`${schedule.id}|${schedule.date}`) || [];
      const expectedCount = Math.max(1, studentIds.length);
      const completedCount = trackers.filter(tracker => tracker.material).length;
      const state: SessionState = trackers.length >= expectedCount && completedCount >= expectedCount
        ? 'done'
        : trackers.length > 0
          ? 'live'
          : 'ready';

      return {
        ...schedule,
        displayName,
        senseiName: senseiById.get(schedule.senseiId)?.name || 'Sensei tidak ditemukan',
        trackerCount: trackers.length,
        completedCount,
        expectedCount,
        attendanceLabel,
        hasStudentNote,
        hasPendingAdjustment: trackers.some(tracker => tracker.timeAdjustmentStatus === 'Pending'),
        state,
        delayed: trackers.some(tracker => tracker.isDelayed)
      };
    });
  }, [attendanceCountByStudentId, filteredSchedules, groupById, senseiById, studentById, trackerByScheduleDate]);

  const handleStartLesson = async (schedule: Schedule) => {
    try {
      const now = new Date();
      const actualStartTime = format(now, 'HH:mm');
      const scheduledTime = parse(schedule.startTime, 'HH:mm', now);
      const diff = differenceInMinutes(now, scheduledTime);
      const isDelayed = diff > 10;
      const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);

      const newTrackers = studentIds.map(studentId => ({
        id: crypto.randomUUID(),
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
        createdAt: now.toISOString()
      }));

      if (newTrackers.length === 1) {
        await dbOps.save('lesson_trackers', newTrackers[0]);
      } else if (newTrackers.length > 1) {
        await dbOps.bulkSave('lesson_trackers', newTrackers);
      } else {
        toast.error('Tidak ada student di jadwal ini');
        return;
      }

      toast.success(isDelayed ? 'Sesi dimulai! (Terlambat)' : 'Sesi dimulai tepat waktu!');
    } catch (error) {
      toast.error('Gagal memulai sesi');
    }
  };

  const openTracker = (schedule: Schedule) => {
    setSelectedTrackerSchedule(schedule);
    setShowTrackerModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Sesi Mengajar</p>
          <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{isSensei ? 'Sesi Saya' : 'Operasional Mengajar'}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {isSensei ? 'Mulai sesi, isi tracker, dan selesaikan catatan belajar.' : 'Kelola mulai dan selesaikan sesi belajar.'}
          </p>
        </div>
        <div className="flex w-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 md:w-auto">
          <FilterButton active={subTab === 'today'} onClick={() => setSubTab('today')}>Hari Ini</FilterButton>
          <FilterButton active={subTab === 'tomorrow'} onClick={() => setSubTab('tomorrow')}>Besok</FilterButton>
          <FilterButton active={subTab === 'upcoming'} onClick={() => setSubTab('upcoming')}>Mendatang</FilterButton>
        </div>
      </div>

      {isDataLoading ? (
        <EmptyState
          icon={<Loader2 size={26} className="animate-spin text-indigo-500" />}
          title="Memuat Sesi Mengajar"
          detail="Mengambil jadwal terbaru dari database."
        />
      ) : sessionRows.length === 0 ? (
        <EmptyState
          icon={<Calendar size={26} className="text-slate-400" />}
          title="Tidak Ada Jadwal"
          detail="Tidak ada jadwal mengajar untuk filter periode ini."
        />
      ) : (
        <div className="overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isSensei ? 'min-w-[720px]' : 'min-w-[760px]'}`}>
              <thead className="bg-slate-50 dark:bg-slate-950/40">
                <tr>
                  <Th>Waktu</Th>
                  <Th>Sesi</Th>
                  {!isSensei && <Th>Sensei</Th>}
                  <Th>Level</Th>
                  <Th>Hadir</Th>
                  <Th>Catatan</Th>
                  <Th>Status</Th>
                  <Th align="right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map(row => (
                  <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-3 py-3 align-top">
                      <p className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-300">{row.startTime}</p>
                      <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{format(parseDate(row.date), 'dd MMM')}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="max-w-[220px] truncate text-sm font-black text-slate-900 dark:text-white" title={row.displayName}>
                        {row.displayName}
                      </p>
                      <p className="mt-1 text-[11px] font-bold uppercase text-slate-400">{row.type}</p>
                    </td>
                    {!isSensei && (
                      <td className="px-3 py-3 align-top">
                        <p className="max-w-[180px] truncate text-xs font-black uppercase tracking-wide text-slate-700 dark:text-slate-200" title={row.senseiName}>
                          {row.senseiName}
                        </p>
                      </td>
                    )}
                    <td className="px-3 py-3 align-top">
                      <p className="max-w-[160px] truncate text-xs font-black uppercase text-slate-600 dark:text-slate-300">{row.level}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="inline-flex border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {row.attendanceLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.hasStudentNote ? (
                        <span className="inline-flex border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
                          Cek
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusBadge row={row} />
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      {row.state === 'done' ? (
                        <span className="inline-flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 size={13} />
                          Tercatat
                        </span>
                      ) : row.state === 'live' ? (
                        <button
                          onClick={() => openTracker(row)}
                          className="inline-flex items-center gap-1.5 border border-amber-600 bg-amber-500 px-3 py-2 text-[11px] font-black text-white hover:bg-amber-600"
                        >
                          <ClipboardList size={13} />
                          Selesaikan
                        </button>
                      ) : (
                        <button
                          disabled={subTab !== 'today'}
                          onClick={() => handleStartLesson(row)}
                          className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[11px] font-black ${
                            subTab === 'today'
                              ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-800'
                          }`}
                        >
                          <PlayCircle size={13} />
                          {subTab === 'today' ? 'Mulai' : 'Terkunci'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const parseDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const FilterButton = ({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 px-4 py-2.5 text-xs font-black md:flex-none ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-slate-50 text-slate-500 hover:bg-white dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
    }`}
  >
    {children}
  </button>
);

const EmptyState = ({
  icon,
  title,
  detail
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) => (
  <div className="border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      {icon}
    </div>
    <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{detail}</p>
  </div>
);

const Th = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <th className={`px-3 py-3 text-${align} text-[11px] font-black uppercase tracking-[0.16em] text-slate-400`}>
    {children}
  </th>
);

const StatusBadge = ({ row }: { row: SessionRow }) => {
  const adjustmentBadge = row.hasPendingAdjustment ? (
    <span className="inline-flex border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
      Adjust Pending
    </span>
  ) : null;

  if (row.state === 'done') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          Selesai {row.completedCount}/{row.expectedCount}
        </span>
        {adjustmentBadge}
      </div>
    );
  }

  if (row.state === 'live') {
    return (
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Berjalan {row.trackerCount}/{row.expectedCount}
        </span>
        {adjustmentBadge}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Siap
      </span>
      {row.delayed && (
        <span className="inline-flex border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black uppercase text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Terlambat
        </span>
      )}
      {adjustmentBadge}
    </div>
  );
};
