import { CalendarDays, CheckCircle2, Clock3, ClipboardList, Globe2, LogOut, PlayCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LessonTracker, Schedule, SessionLog, Student } from '../types';
import { formatTimestampInTimezone, getDateInTimezone, getScheduleStudentIds, getTimezoneAbbreviation, normalizeTimezone } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
import { buildBlockers, timesOverlap } from '../utils/scheduleUtils';
import { useSessionClock } from '../hooks/useSessionClock';
import { getSessionWorkflowLabel, getSessionWorkflowState, SessionWorkflowState } from '../utils/sessionWorkflow';
import { SENSEI_TIMEZONE_OPTIONS } from '../utils/senseiOperations';

type TodaySession = Schedule & {
  title: string;
  trackerCount: number;
  expectedCount: number;
  statusLabel: string;
  workflowState: SessionWorkflowState;
  sessionLog?: SessionLog;
};

export const SenseiDashboard = () => {
  const {
    schedules,
    studentList,
    groupList,
    lessonTrackers,
    sessionLogs,
    currentSensei,
    supabase,
    setSenseiList,
    senseiTimeBlocks,
    offDays,
    setActiveTab,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    isDataLoading
  } = useAppContext(state => ({
    schedules: state.scopedSchedules,
    studentList: state.scopedStudentList,
    groupList: state.groupList,
    lessonTrackers: state.scopedLessonTrackers,
    sessionLogs: state.scopedSessionLogs,
    currentSensei: state.currentSensei,
    supabase: state.supabase,
    setSenseiList: state.setSenseiList,
    senseiTimeBlocks: state.scopedSenseiTimeBlocks,
    offDays: state.offDays,
    setActiveTab: state.setActiveTab,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    isDataLoading: state.isDataLoading
  }));

  const { clockIn, clockOut } = useSessionClock();
  const timezone = normalizeTimezone(currentSensei?.timezone);
  const today = format(getDateInTimezone(timezone), 'yyyy-MM-dd');

  // FIX #4: Bungkus dengan useMemo agar tidak di-rebuild setiap render
  const studentById = useMemo(
    () => new Map<string, Student>(studentList.map(student => [student.id, student])),
    [studentList]
  );
  const groupById = useMemo(
    () => new Map<string, any>((groupList || []).map((group: any) => [group.id, group])),
    [groupList]
  );

  // FIX #3: State untuk mencegah klik ganda tombol Mulai Sesi
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isUpdatingTimezone, setIsUpdatingTimezone] = useState(false);

  const todaySessions: TodaySession[] = useMemo(() => (
    schedules
      .filter(schedule => schedule.date === today && schedule.status !== 'cancelled')
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
      .map(schedule => {
        const studentIds = getScheduleStudentIds(schedule);
        const group = groupById.get(schedule.groupId || '');
        const title = group
          ? group.name
          : studentIds.map(id => studentById.get(id)?.name || 'Siswa').join(', ') || 'Siswa';
        const trackers = lessonTrackers.filter((tracker: LessonTracker) => tracker.scheduleId === schedule.id && tracker.date === schedule.date);
        const expectedCount = Math.max(1, studentIds.length);
        const completedCount = trackers.filter(tracker => tracker.material).length;
        const sessionLog = sessionLogs.find(log => log.scheduleId === schedule.id);
        const workflowState = getSessionWorkflowState(sessionLog, trackers, expectedCount);
        const statusLabel = getSessionWorkflowLabel(workflowState);

        return {
          ...schedule,
          title,
          trackerCount: trackers.length,
          expectedCount,
          statusLabel,
          workflowState,
          sessionLog
        };
      })
  ), [groupById, lessonTrackers, schedules, sessionLogs, studentById, today]);

  const completedCount = todaySessions.filter(session => session.statusLabel === 'Selesai').length;
  const activeCount = todaySessions.filter(session => session.workflowState === 'in_progress').length;
  const reportCount = todaySessions.filter(session => session.workflowState === 'report_pending').length;
  const nextSession = todaySessions.find(session => session.statusLabel !== 'Selesai') || null;

  const todayConflicts = useMemo(() => {
    // Gunakan buildBlockers() dari scheduleUtils — tidak lagi duplikat di sini
    const blockers = buildBlockers(senseiTimeBlocks, offDays, today);

    return todaySessions
      .flatMap(session => blockers
        .filter(blocker =>
          blocker.senseiId === session.senseiId &&
          timesOverlap(session.startTime, session.endTime, blocker.startTime, blocker.endTime)
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
    if (processingId === schedule.id) return;
    setProcessingId(schedule.id);
    try {
      const studentIds = getScheduleStudentIds(schedule);
      if (studentIds.length === 0) {
        toast.error('Tidak ada siswa di jadwal ini.');
        return;
      }
      await clockIn(schedule.id);
      toast.success('Clock-in berhasil. Selamat mengajar!');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal melakukan clock-in.');
    } finally {
      setProcessingId(null);
    }
  };

  const endSession = async (schedule: Schedule) => {
    if (processingId === schedule.id) return;
    setProcessingId(schedule.id);
    try {
      await clockOut(schedule.id);
      toast.success('Clock-out berhasil. Silakan isi laporan sesi.');
      openTracker(schedule);
    } catch (error: any) {
      toast.error(error?.message || 'Gagal melakukan clock-out.');
    } finally {
      setProcessingId(null);
    }
  };

  const runSessionAction = (session: TodaySession) => {
    if (session.workflowState === 'ready') return startSession(session);
    if (session.workflowState === 'in_progress') return endSession(session);
    return openTracker(session);
  };

  const actionLabel = (session: TodaySession) => {
    if (session.workflowState === 'ready') return 'Clock-in';
    if (session.workflowState === 'in_progress') return 'Clock-out';
    if (session.workflowState === 'report_pending') return 'Isi Laporan';
    return 'Lihat Laporan';
  };

  const clockLabel = (session: TodaySession) => {
    const log = session.sessionLog;
    if (!log) return session.statusLabel;
    const abbreviation = getTimezoneAbbreviation(log.timezone);
    if (session.workflowState === 'in_progress') {
      return `Clock-in ${formatTimestampInTimezone(log.checkInAt, log.timezone)} ${abbreviation}`;
    }
    if (session.workflowState === 'report_pending' || session.workflowState === 'completed') {
      return `Clock-out ${formatTimestampInTimezone(log.checkOutAt, log.timezone)} ${abbreviation}`;
    }
    return session.statusLabel;
  };

  const updateTimezone = async (nextTimezone: string) => {
    if (!supabase || !currentSensei || isUpdatingTimezone) return;
    setIsUpdatingTimezone(true);
    try {
      const { error } = await supabase.rpc('set_my_timezone', { p_timezone: nextTimezone });
      if (error) throw error;
      setSenseiList(previous => previous.map(sensei => (
        sensei.id === currentSensei.id ? { ...sensei, timezone: nextTimezone as typeof currentSensei.timezone } : sensei
      )));
      toast.success('Zona waktu berhasil diperbarui.');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memperbarui zona waktu.');
    } finally {
      setIsUpdatingTimezone(false);
    }
  };

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel-body">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Workspace Sensei</p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Hari Ini</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Ikuti alur sederhana: clock-in, mengajar, clock-out, isi laporan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="ui-btn-secondary">
              <Globe2 size={15} className="shrink-0" />
              <span className="sr-only">Zona waktu</span>
              <select
                value={timezone}
                disabled={isUpdatingTimezone}
                onChange={event => updateTimezone(event.target.value)}
                className="min-w-0 bg-transparent text-xs font-black outline-none disabled:opacity-60"
              >
                {SENSEI_TIMEZONE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.abbreviation}</option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setActiveTab('teaching')}
              className="ui-btn-primary"
            >
              <PlayCircle size={15} />
              Sesi Mengajar
            </button>
            <button
              onClick={() => setActiveTab('sensei-schedule')}
              className="ui-btn-secondary"
            >
              <CalendarDays size={15} />
              Jadwal Saya
            </button>
          </div>
        </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Jadwal Hari Ini" value={todaySessions.length} icon={<CalendarDays size={18} />} tone="slate" />
        <MetricCard label="Sedang Berjalan" value={activeCount} icon={<Clock3 size={18} />} tone="amber" />
        <MetricCard label="Perlu Laporan" value={reportCount} icon={<ClipboardList size={18} />} tone={reportCount > 0 ? 'rose' : 'emerald'} />
        <MetricCard label="Selesai" value={completedCount} icon={<CheckCircle2 size={18} />} tone="emerald" />
      </div>

      <div className="ui-panel">
        <div className="ui-panel-body">
          <p className="ui-section-title">Sesi Berikutnya</p>
          {nextSession ? (
            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{nextSession.startTime}-{nextSession.endTime}</p>
                <p className="mt-1 truncate text-base font-bold text-slate-900 dark:text-white">{nextSession.title}</p>
                <p className="text-xs font-medium text-slate-500">{nextSession.level} / {nextSession.type}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{clockLabel(nextSession)}</p>
              </div>
              <button
                onClick={() => runSessionAction(nextSession)}
                disabled={processingId === nextSession.id}
                className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {nextSession.workflowState === 'ready' ? <PlayCircle size={14} /> : nextSession.workflowState === 'in_progress' ? <LogOut size={14} /> : <ClipboardList size={14} />}
                {actionLabel(nextSession)}
              </button>
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-400">Tidak ada sesi berikutnya hari ini.</p>
          )}
          {todayConflicts.length > 0 && (
            <button
              onClick={() => setActiveTab('sensei-schedule')}
              className="mt-3 ui-btn-secondary border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
            >
              Cek Jadwal Bentrok
            </button>
          )}
        </div>
      </div>

      <div className="ui-panel">
        <div className="ui-panel-header">
          <h3 className="text-sm font-bold text-slate-950 dark:text-white">Sesi Hari Ini</h3>
          {activeCount > 0 && (
            <span className="ui-status border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
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
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-white">{session.startTime}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase text-slate-400">{session.endTime}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{session.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{session.level} / {session.type}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{clockLabel(session)}</p>
                </div>
                <button
                  onClick={() => runSessionAction(session)}
                  disabled={processingId === session.id}
                  className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                    session.workflowState === 'completed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : session.workflowState === 'report_pending'
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                        : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {session.workflowState === 'ready' ? <PlayCircle size={14} /> : session.workflowState === 'in_progress' ? <LogOut size={14} /> : session.workflowState === 'completed' ? <CheckCircle2 size={14} /> : <ClipboardList size={14} />}
                  {actionLabel(session)}
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
  tone: 'slate' | 'amber' | 'emerald' | 'rose';
}) => {
  const toneClass = {
    slate: 'text-slate-700 bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300',
    rose: 'text-rose-700 bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300'
  }[tone];

  return (
    <div className={`rounded-md border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{label}</p>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-bold leading-none">{value}</p>
    </div>
  );
};
