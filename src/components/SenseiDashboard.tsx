import { CalendarDays, CheckCircle2, Clock3, ClipboardList, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';

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
    setActiveTab,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    isDataLoading
  } = useAppContext(state => ({
    schedules: state.scopedSchedules,
    studentList: state.scopedStudentList,
    groupList: state.groupList,
    lessonTrackers: state.scopedLessonTrackers,
    setActiveTab: state.setActiveTab,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    isDataLoading: state.isDataLoading
  }));

  const today = format(new Date(), 'yyyy-MM-dd');
  const studentById = new Map<string, Student>(studentList.map(student => [student.id, student]));
  const groupById = new Map<string, any>((groupList || []).map((group: any) => [group.id, group]));

  const todaySessions: TodaySession[] = schedules
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
    });

  const completedCount = todaySessions.filter(session => session.statusLabel === 'Selesai').length;
  const activeCount = todaySessions.filter(session => session.statusLabel === 'Sedang berjalan').length;
  const pendingCount = todaySessions.filter(session => session.statusLabel === 'Belum mulai').length;

  const openTracker = (schedule: Schedule) => {
    setSelectedTrackerSchedule(schedule);
    setShowTrackerModal(true);
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Workspace Sensei</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Hari Ini</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Fokus ke sesi mengajar, tracker, dan availability pribadi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('teaching')}
              className="inline-flex items-center gap-2 bg-indigo-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              <PlayCircle size={15} />
              Sesi Mengajar
            </button>
            <button
              onClick={() => setActiveTab('sensei-schedule')}
              className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <CalendarDays size={15} />
              Availability
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label="Jadwal Hari Ini" value={todaySessions.length} icon={<CalendarDays size={18} />} tone="indigo" />
        <MetricCard label="Perlu Mulai" value={pendingCount} icon={<Clock3 size={18} />} tone="amber" />
        <MetricCard label="Selesai" value={completedCount} icon={<CheckCircle2 size={18} />} tone="emerald" />
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
                <button
                  onClick={() => session.trackerCount > 0 ? openTracker(session) : setActiveTab('teaching')}
                  className="inline-flex items-center justify-center gap-2 border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <ClipboardList size={14} />
                  {session.statusLabel}
                </button>
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
  tone: 'indigo' | 'amber' | 'emerald';
}) => {
  const toneClass = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300',
    amber: 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300'
  }[tone];

  return (
    <div className={`border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-black leading-none">{value}</p>
    </div>
  );
};
