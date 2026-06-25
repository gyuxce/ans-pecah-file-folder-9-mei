import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, ClipboardList, PlayCircle } from 'lucide-react';
import { differenceInMinutes, format, parse } from 'date-fns';
import { useMemo } from 'react';
import { toast } from 'sonner';

import { LessonTracker, Schedule, Student } from '../types';
import { useAppContext } from '../context/AppContext';

type TodaySession = Schedule & {
  title: string;
  trackerCount: number;
  expectedCount: number;
  statusLabel: string;
};

export const SenseiDashboard = () => {
  const {
    schedules,
    studentList,
    groupList,
    lessonTrackers,
    senseiTimeBlocks,
    offDays,
    setActiveTab,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    dbOps,
    isDataLoading
  } = useAppContext(state => ({
    schedules: state.scopedSchedules,
    studentList: state.scopedStudentList,
    groupList: state.groupList,
    lessonTrackers: state.scopedLessonTrackers,
    senseiTimeBlocks: state.scopedSenseiTimeBlocks,
    offDays: state.offDays,
    setActiveTab: state.setActiveTab,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    dbOps: state.dbOps,
    isDataLoading: state.isDataLoading
  }));

  const today = format(new Date(), 'yyyy-MM-dd');
  const studentById = new Map<string, Student>(studentList.map(student => [student.id, student]));
  const groupById = new Map<string, any>((groupList || []).map((group: any) => [group.id, group]));

  const todaySessions: TodaySession[] = useMemo(() => (
    schedules
      .filter(schedule => schedule.date === today && schedule.status !== 'cancelled')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map(schedule => {
        const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
        const group = groupById.get(schedule.groupId || '');
        const title = group
          ? group.name
          : studentIds.map(id => studentById.get(id)?.name || 'Siswa').join(', ') || 'Siswa';
        const trackers = lessonTrackers.filter((tracker: LessonTracker) => tracker.scheduleId === schedule.id && tracker.date === schedule.date);
        const expectedCount = Math.max(1, studentIds.length);
        const completedCount = trackers.filter(tracker => tracker.material).length;
        const statusLabel = trackers.length === 0
          ? 'Belum mulai'
          : completedCount >= expectedCount
            ? 'Selesai'
            : 'Sedang berjalan';

        return {
          ...schedule,
          title,
          trackerCount: trackers.length,
          expectedCount,
          statusLabel
        };
      })
  ), [groupById, lessonTrackers, schedules, studentById, today]);

  const completedCount = todaySessions.filter(session => session.statusLabel === 'Selesai').length;
  const activeCount = todaySessions.filter(session => session.statusLabel === 'Sedang berjalan').length;
  const pendingCount = todaySessions.filter(session => session.statusLabel === 'Belum mulai').length;
  const nextSession = todaySessions.find(session => session.statusLabel !== 'Selesai') || todaySessions[0];

  const todayConflicts = useMemo(() => {
    const blockers = [
      ...senseiTimeBlocks
        .filter(block => block.date === today && block.status !== 'available_ans')
        .map(block => ({
          senseiId: block.senseiId,
          startTime: block.startTime,
          endTime: block.endTime,
          label: block.status === 'busy_cakap' ? 'Busy Cakap' : block.status === 'busy_personal' ? 'Busy Pribadi' : 'Off'
        })),
      ...offDays
        .filter(offDay => offDay.date === today)
        .map(offDay => ({
          senseiId: offDay.senseiId,
          startTime: '00:00',
          endTime: '23:59',
          label: 'Hari Libur'
        }))
    ];

    return todaySessions
      .flatMap(session => blockers
        .filter(blocker =>
          blocker.senseiId === session.senseiId &&
          session.startTime < blocker.endTime &&
          session.endTime > blocker.startTime
        )
        .map(blocker => ({
          id: `${session.id}-${blocker.label}`,
          time: `${session.startTime}-${session.endTime}`,
          title: session.title,
          label: blocker.label
        }))
      );
  }, [offDays, senseiTimeBlocks, today, todaySessions]);

  const openTracker = (schedule: Schedule) => {
    setSelectedTrackerSchedule(schedule);
    setShowTrackerModal(true);
  };

  const startSession = async (schedule: Schedule) => {
    try {
      const now = new Date();
      const actualStartTime = format(now, 'HH:mm');
      const scheduledTime = parse(schedule.startTime, 'HH:mm', now);
      const diff = differenceInMinutes(now, scheduledTime);
      const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);

      if (studentIds.length === 0) {
        toast.error('Tidak ada siswa di jadwal ini.');
        return;
      }

      const trackers = studentIds.map(studentId => ({
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
        isDelayed: diff > 10,
        createdAt: now.toISOString()
      }));

      if (trackers.length === 1) await dbOps.save('lesson_trackers', trackers[0]);
      else await dbOps.bulkSave('lesson_trackers', trackers);

      toast.success(diff > 10 ? 'Sesi dimulai. Tercatat terlambat.' : 'Sesi dimulai.');
      openTracker(schedule);
    } catch (error) {
      toast.error('Gagal memulai sesi.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Workspace Sensei</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Hari Ini</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Fokus ke sesi mengajar dan update progress siswa.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('teaching')}
              className="inline-flex h-11 items-center gap-2 border border-indigo-600 bg-indigo-600 px-4 text-sm font-black text-white hover:bg-indigo-700"
            >
              <PlayCircle size={15} />
              Sesi Mengajar
            </button>
            <button
              onClick={() => setActiveTab('sensei-schedule')}
              className="inline-flex h-11 items-center gap-2 border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <CalendarDays size={15} />
              Availability
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Jadwal Hari Ini" value={todaySessions.length} icon={<CalendarDays size={18} />} tone="indigo" />
        <MetricCard label="Perlu Mulai" value={pendingCount} icon={<Clock3 size={18} />} tone="amber" />
        <MetricCard label="Selesai" value={completedCount} icon={<CheckCircle2 size={18} />} tone="emerald" />
        <MetricCard label="Bentrok" value={todayConflicts.length} icon={<AlertTriangle size={18} />} tone={todayConflicts.length > 0 ? 'rose' : 'emerald'} />
      </div>

      <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Sesi Berikutnya</p>
          {nextSession ? (
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-lg font-black text-indigo-600 dark:text-indigo-300">{nextSession.startTime}-{nextSession.endTime}</p>
                <p className="mt-1 truncate text-base font-black text-slate-900 dark:text-white">{nextSession.title}</p>
                <p className="text-xs font-bold text-slate-400">{nextSession.level} / {nextSession.type}</p>
              </div>
              <button
                onClick={() => nextSession.statusLabel === 'Belum mulai' ? startSession(nextSession) : openTracker(nextSession)}
                className="inline-flex h-10 items-center justify-center gap-2 bg-indigo-600 px-4 text-xs font-black text-white hover:bg-indigo-700"
              >
                {nextSession.statusLabel === 'Belum mulai' ? <PlayCircle size={14} /> : <ClipboardList size={14} />}
                {nextSession.statusLabel === 'Belum mulai' ? 'Mulai Sesi' : 'Isi Progress'}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-400">Tidak ada sesi berikutnya hari ini.</p>
          )}
          {todayConflicts.length > 0 && (
            <button
              onClick={() => setActiveTab('sensei-schedule')}
              className="mt-3 border border-rose-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              Cek Availability
            </button>
          )}
      </div>

      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Sesi Hari Ini</h3>
          {activeCount > 0 && (
            <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
              {activeCount} berjalan
            </span>
          )}
        </div>

        {isDataLoading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">Memuat jadwal...</div>
        ) : todaySessions.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarDays size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-black text-slate-600 dark:text-slate-300">Tidak ada sesi hari ini.</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">Cek tab Sesi Mengajar untuk jadwal mendatang.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {todaySessions.map(session => (
              <div key={session.id} className="grid gap-3 p-4 md:grid-cols-[96px_1fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-300">{session.startTime}</p>
                  <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{session.endTime}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{session.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{session.level} / {session.type}</p>
                </div>
                {session.statusLabel === 'Belum mulai' ? (
                  <button
                    onClick={() => startSession(session)}
                    className="inline-flex items-center justify-center gap-2 bg-indigo-600 px-3 py-2 text-xs font-black text-white hover:bg-indigo-700"
                  >
                    <PlayCircle size={14} />
                    Mulai
                  </button>
                ) : (
                  <button
                    onClick={() => openTracker(session)}
                    className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-xs font-black ${
                      session.statusLabel === 'Selesai'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                    }`}
                  >
                    {session.statusLabel === 'Selesai' ? <CheckCircle2 size={14} /> : <ClipboardList size={14} />}
                    {session.statusLabel === 'Selesai' ? 'Tercatat' : 'Lanjut Isi'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  icon,
  tone
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'indigo' | 'amber' | 'emerald' | 'rose';
}) => {
  const toneClass = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300',
    amber: 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300',
    rose: 'text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300'
  }[tone];

  return (
    <div className={`border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black uppercase tracking-[0.16em]">{label}</p>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-black leading-none">{value}</p>
    </div>
  );
};
