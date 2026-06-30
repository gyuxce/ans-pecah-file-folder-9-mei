import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Loader2,
  LogOut,
  PlayCircle,
  UserRoundCog,
  X
} from 'lucide-react';
import { addDays, format, subDays } from 'date-fns';
import { toast } from 'sonner';

import { LessonTracker, Schedule, Sensei, SessionLog, Student } from '../types';
import { formatTimestampInTimezone, getDateInTimezone, getScheduleStudentIds, getTimezoneAbbreviation } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
import { useSessionClock } from '../hooks/useSessionClock';
import { getSessionWorkflowState, SessionWorkflowState } from '../utils/sessionWorkflow';
import { timesOverlap } from '../utils/scheduleUtils';

type SessionRow = Schedule & {
  displayName: string;
  senseiName: string;
  trackerCount: number;
  completedCount: number;
  expectedCount: number;
  attendanceLabel: string;
  state: SessionWorkflowState;
  sessionLog?: SessionLog;
  delayed: boolean;
};

export const TeachingSessionsView = () => {
  const {
    senseiList,
    studentList,
    groupList,
    schedules,
    lessonTrackers,
    sessionLogs,
    offDays,
    senseiTimeBlocks,
    currentSensei,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    isDataLoading,
    permissions,
    dbOps,
    supabase,
    syncConfig,
    setSchedules,
    user
  } = useAppContext(state => ({
    senseiList: state.senseiList,
    studentList: state.permissions.role === 'Sensei' ? state.scopedStudentList : state.studentList,
    groupList: state.groupList,
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    lessonTrackers: state.permissions.role === 'Sensei' ? state.scopedLessonTrackers : state.lessonTrackers,
    sessionLogs: state.permissions.role === 'Sensei' ? state.scopedSessionLogs : state.sessionLogs,
    offDays: state.offDays,
    senseiTimeBlocks: state.senseiTimeBlocks,
    currentSensei: state.currentSensei,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    isDataLoading: state.isDataLoading,
    permissions: state.permissions,
    dbOps: state.dbOps,
    supabase: state.supabase,
    syncConfig: state.syncConfig,
    setSchedules: state.setSchedules,
    user: state.user
  }));

  const isSensei = permissions.role === 'Sensei';
  const [subTab, setSubTab] = useState<'attention' | 'today' | 'tomorrow' | 'upcoming'>(
    isSensei ? 'today' : 'attention'
  );
  // FIX #3: Track schedule ID yang sedang di-start untuk cegah klik ganda
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [requestConfirmId, setRequestConfirmId] = useState<string | null>(null);
  const [replacementTarget, setReplacementTarget] = useState<SessionRow | null>(null);
  const [replacementSenseiId, setReplacementSenseiId] = useState('');
  const { clockIn, clockOut } = useSessionClock();

  const timezone = currentSensei?.timezone || 'Asia/Jakarta';
  const today = useMemo(() => getDateInTimezone(timezone), [timezone]);
  const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
  const tomorrowStr = useMemo(() => format(addDays(today, 1), 'yyyy-MM-dd'), [today]);
  const upcomingEndStr = useMemo(() => format(addDays(today, 7), 'yyyy-MM-dd'), [today]);

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
    const attentionStart = format(subDays(today, 14), 'yyyy-MM-dd');
    return schedules
      .filter(schedule => {
        if (subTab === 'attention') {
          if (schedule.substitutionStatus === 'requested') return true;
          if (schedule.date < attentionStart || schedule.date > todayStr) return false;
          const trackers = trackerByScheduleDate.get(`${schedule.id}|${schedule.date}`) || [];
          const expectedCount = Math.max(1, getScheduleStudentIds(schedule).length);
          const log = sessionLogs.find(item => item.scheduleId === schedule.id);
          const state = getSessionWorkflowState(log, trackers, expectedCount);
          return state === 'report_pending'
            || (state === 'in_progress' && schedule.date < todayStr)
            || (state === 'ready' && schedule.date < todayStr);
        }
        if (subTab === 'today') return schedule.date === todayStr;
        if (subTab === 'tomorrow') return schedule.date === tomorrowStr;
        if (subTab === 'upcoming') return schedule.date > tomorrowStr && schedule.date <= upcomingEndStr;
        return false;
      })
      .filter(schedule => schedule.status !== 'cancelled')
      .sort((a, b) => {
        const direction = subTab === 'attention' ? -1 : 1;
        if (a.date !== b.date) return a.date.localeCompare(b.date) * direction;
        return (a.startTime || '').localeCompare(b.startTime || '') * direction;
      });
  }, [schedules, sessionLogs, subTab, today, todayStr, tomorrowStr, upcomingEndStr, trackerByScheduleDate]);

  const tabCounts = useMemo(() => {
    const attentionStart = format(subDays(today, 14), 'yyyy-MM-dd');
    const activeSchedules = schedules.filter(schedule => schedule.status !== 'cancelled');
    const attention = activeSchedules.filter(schedule => {
      if (schedule.substitutionStatus === 'requested') return true;
      if (schedule.date < attentionStart || schedule.date > todayStr) return false;
      const trackers = trackerByScheduleDate.get(`${schedule.id}|${schedule.date}`) || [];
      const expectedCount = Math.max(1, getScheduleStudentIds(schedule).length);
      const log = sessionLogs.find(item => item.scheduleId === schedule.id);
      const state = getSessionWorkflowState(log, trackers, expectedCount);
      return state === 'report_pending'
        || (state === 'in_progress' && schedule.date < todayStr)
        || (state === 'ready' && schedule.date < todayStr);
    }).length;

    return {
      attention,
      today: activeSchedules.filter(schedule => schedule.date === todayStr).length,
      tomorrow: activeSchedules.filter(schedule => schedule.date === tomorrowStr).length,
      upcoming: activeSchedules.filter(schedule => schedule.date > tomorrowStr && schedule.date <= upcomingEndStr).length
    };
  }, [schedules, sessionLogs, today, todayStr, tomorrowStr, trackerByScheduleDate, upcomingEndStr]);

  const sessionRows = useMemo(() => {
    return filteredSchedules.map((schedule): SessionRow => {
      const studentIds = getScheduleStudentIds(schedule);
      const studentsForSchedule = studentIds.map(id => studentById.get(id)).filter((student): student is Student => Boolean(student));
      const group = groupById.get(schedule.groupId || '');
      const displayName = group ? group.name : (studentsForSchedule.map(student => student.name).join(', ') || 'Siswa tidak ditemukan');
      const attendanceLabel = studentsForSchedule.length === 1
        ? `${attendanceCountByStudentId.get(studentsForSchedule[0].id) || 0} sesi`
        : studentsForSchedule.length > 1
          ? `${studentsForSchedule.length} siswa`
          : '-';
      const trackers = trackerByScheduleDate.get(`${schedule.id}|${schedule.date}`) || [];
      const expectedCount = Math.max(1, studentIds.length);
      const completedCount = trackers.filter(tracker => tracker.material).length;
      const sessionLog = sessionLogs.find(log => log.scheduleId === schedule.id);
      const state = getSessionWorkflowState(sessionLog, trackers, expectedCount);

      return {
        ...schedule,
        displayName,
        senseiName: senseiById.get(schedule.senseiId)?.name
          || schedule.substitutionSenseiName
          || (schedule.senseiId === currentSensei?.id ? currentSensei.name : 'Sensei pengganti'),
        trackerCount: trackers.length,
        completedCount,
        expectedCount,
        attendanceLabel,
        state,
        sessionLog,
        delayed: trackers.some(tracker => tracker.isDelayed)
      };
    });
  }, [attendanceCountByStudentId, currentSensei, filteredSchedules, groupById, senseiById, sessionLogs, studentById, trackerByScheduleDate]);

  const handleStartLesson = async (schedule: Schedule) => {
    if (processingId === schedule.id) return;
    setProcessingId(schedule.id);
    try {
      if (getScheduleStudentIds(schedule).length === 0) {
        toast.error('Tidak ada student di jadwal ini');
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

  const handleClockOut = async (schedule: Schedule) => {
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

  const handleRequestSubstitute = async (schedule: Schedule) => {
    if (!currentSensei || schedule.senseiId !== currentSensei.id || processingId === schedule.id) return;
    setProcessingId(schedule.id);
    try {
      if (syncConfig.type === 'supabase') {
        if (!supabase) throw new Error('Koneksi database belum siap.');
        const { error } = await supabase.rpc('request_schedule_substitute', { p_schedule_id: schedule.id });
        if (error) throw error;
      }

      const updatedSchedule: Schedule = {
        ...toScheduleRecord(schedule),
        originalSenseiId: schedule.originalSenseiId || schedule.senseiId,
        substitutionStatus: 'requested',
        substitutionRequestedAt: new Date().toISOString(),
        substitutionRequestedBy: user?.email || currentSensei.email,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || currentSensei.email
      };
      setSchedules(previous => previous.map(item => item.id === schedule.id ? updatedSchedule : item));
      setRequestConfirmId(null);
      toast.success('Permintaan pengganti dikirim ke admin.');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal mengirim permintaan pengganti.');
    } finally {
      setProcessingId(null);
    }
  };

  const replacementOptions = useMemo(() => {
    if (!replacementTarget) return [];
    const originalSenseiId = replacementTarget.originalSenseiId || replacementTarget.senseiId;
    return senseiList.filter(candidate => {
      if (candidate.id === originalSenseiId) return false;
      if (offDays.some(day => day.senseiId === candidate.id && day.date === replacementTarget.date)) return false;
      if (schedules.some(schedule => (
        schedule.id !== replacementTarget.id
        && schedule.senseiId === candidate.id
        && schedule.date === replacementTarget.date
        && schedule.status !== 'cancelled'
        && timesOverlap(replacementTarget.startTime, replacementTarget.endTime, schedule.startTime, schedule.endTime)
      ))) return false;
      if (senseiTimeBlocks.some(block => (
        block.senseiId === candidate.id
        && block.date === replacementTarget.date
        && block.status !== 'available_ans'
        && timesOverlap(replacementTarget.startTime, replacementTarget.endTime, block.startTime, block.endTime)
      ))) return false;
      return true;
    });
  }, [offDays, replacementTarget, schedules, senseiList, senseiTimeBlocks]);

  const openReplacementPicker = (schedule: SessionRow) => {
    setReplacementTarget(schedule);
    setReplacementSenseiId('');
  };

  const handleAssignSubstitute = async () => {
    if (!replacementTarget || !replacementSenseiId) return toast.error('Pilih sensei pengganti.');
    const replacementName = senseiList.find(item => item.id === replacementSenseiId)?.name || 'Sensei pengganti';
    setProcessingId(replacementTarget.id);
    try {
      const originalSenseiId = replacementTarget.originalSenseiId || replacementTarget.senseiId;
      await dbOps.save('schedules', {
        ...toScheduleRecord(replacementTarget),
        senseiId: replacementSenseiId,
        originalSenseiId,
        substitutionStatus: 'assigned',
        substitutionAssignedAt: new Date().toISOString(),
        substitutionAssignedBy: user?.email || 'Admin',
        substitutionSenseiName: replacementName,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Admin'
      });
      toast.success(`${replacementName} berhasil ditugaskan sebagai pengganti.`);
      setReplacementTarget(null);
      setReplacementSenseiId('');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memilih sensei pengganti.');
    } finally {
      setProcessingId(null);
    }
  };

  const openTracker = (schedule: Schedule) => {
    setSelectedTrackerSchedule(schedule);
    setShowTrackerModal(true);
  };

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel-header">
        <div>
          <p className="ui-section-title mb-1 text-indigo-600 dark:text-indigo-300">Sesi Mengajar</p>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">{isSensei ? 'Sesi Saya' : 'Operasional Mengajar'}</h2>
          <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
            {isSensei ? 'Clock-in, mengajar, clock-out, lalu isi laporan.' : 'Fokus pada sesi yang perlu ditindaklanjuti admin.'}
          </p>
        </div>
        <div className="flex w-full rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950 md:w-auto">
          {!isSensei && <FilterButton count={tabCounts.attention} active={subTab === 'attention'} onClick={() => setSubTab('attention')}>Perlu Ditindak</FilterButton>}
          <FilterButton count={tabCounts.today} active={subTab === 'today'} onClick={() => setSubTab('today')}>Hari Ini</FilterButton>
          <FilterButton count={tabCounts.tomorrow} active={subTab === 'tomorrow'} onClick={() => setSubTab('tomorrow')}>Besok</FilterButton>
          <FilterButton count={tabCounts.upcoming} active={subTab === 'upcoming'} onClick={() => setSubTab('upcoming')}>{isSensei ? 'Mendatang' : '7 Hari'}</FilterButton>
        </div>
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
        <div className="ui-table-shell">
          <div className="overflow-x-auto">
            <table className={`ui-table ${isSensei ? 'min-w-[720px]' : 'min-w-[760px]'}`}>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>Sesi</Th>
                  {!isSensei && <Th>Sensei</Th>}
                  <Th>Level</Th>
                  <Th>Sesi Tercatat</Th>
                  <Th>Status</Th>
                  <Th align="right">Aksi</Th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.map(row => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-3 py-3 align-top">
                      <p className="font-mono text-sm font-semibold text-indigo-600 dark:text-indigo-300">{row.startTime}</p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{format(parseDate(row.date), 'dd MMM')}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <p className="max-w-[220px] truncate text-sm font-semibold text-slate-900 dark:text-white" title={row.displayName}>
                        {row.displayName}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-400">{row.type}</p>
                    </td>
                    {!isSensei && (
                      <td className="px-3 py-3 align-top">
                        <p className="max-w-[180px] truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={row.senseiName}>
                          {row.senseiName}
                        </p>
                      </td>
                    )}
                    <td className="px-3 py-3 align-top">
                      <p className="max-w-[160px] truncate text-sm font-medium text-slate-600 dark:text-slate-300">{row.level}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                        {row.attendanceLabel}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusBadge row={row} isPast={row.date < todayStr} />
                      {row.substitutionStatus === 'assigned' && (
                        <span className="mt-1 inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                          Kelas Pengganti
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      {row.substitutionStatus === 'requested' ? (
                        isSensei ? (
                        <span className="ui-status h-9 border-amber-200 bg-amber-50 text-amber-700">
                          Menunggu Admin
                        </span>
                        ) : (
                          <button
                            onClick={() => openReplacementPicker(row)}
                            className="ui-btn-primary h-9 px-3 text-xs"
                          >
                            <UserRoundCog size={14} /> Pilih Pengganti
                          </button>
                        )
                      ) : isSensei && row.substitutionStatus === 'assigned' && row.originalSenseiId === currentSensei?.id && row.senseiId !== currentSensei.id ? (
                        <span className="ui-status h-9 border-slate-200 bg-slate-50 text-slate-600">
                          Digantikan {row.senseiName}
                        </span>
                      ) : row.state === 'completed' ? (
                        <span className="ui-status h-9 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                          <CheckCircle2 size={13} /> Tercatat
                        </span>
                      ) : row.state === 'report_pending' ? (
                        <button
                          onClick={() => openTracker(row)}
                          className="ui-btn-danger h-9 px-3 text-xs"
                        >
                          <ClipboardList size={13} />
                          {isSensei ? 'Isi Laporan' : 'Cek Laporan'}
                        </button>
                      ) : row.state === 'in_progress' ? (
                        isSensei ? (
                          <button
                            disabled={processingId === row.id}
                            onClick={() => handleClockOut(row)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-amber-600 bg-amber-500 px-3 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <LogOut size={13} />
                            Clock-out
                          </button>
                        ) : <span className="text-xs font-semibold text-amber-700">Sedang berjalan</span>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2">
                          {isSensei && subTab === 'today' && row.senseiId === currentSensei?.id && (
                            <button
                              disabled={processingId === row.id}
                              onClick={() => handleStartLesson(row)}
                              className="ui-btn-primary h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <PlayCircle size={13} /> Clock-in
                            </button>
                          )}
                          {isSensei && row.senseiId === currentSensei?.id && (
                            requestConfirmId === row.id ? (
                              <>
                                <button
                                  disabled={processingId === row.id}
                                  onClick={() => handleRequestSubstitute(row)}
                                  className="ui-btn-danger h-9 px-3 text-xs disabled:opacity-60"
                                >
                                  Ya, Minta Pengganti
                                </button>
                                <button
                                  onClick={() => setRequestConfirmId(null)}
                                  className="ui-btn-secondary h-9 px-3 text-xs"
                                >
                                  Batal
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setRequestConfirmId(row.id)}
                                className="ui-btn-secondary h-9 px-3 text-xs"
                              >
                                Minta Pengganti
                              </button>
                            )
                          )}
                          {!isSensei && <span className={`text-xs font-semibold ${row.date < todayStr ? 'text-rose-600' : 'text-slate-400'}`}>{row.date < todayStr ? 'Perlu konfirmasi' : 'Terjadwal'}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {replacementTarget && (
        <div className="ui-modal-overlay">
          <div className="ui-modal-panel max-w-lg">
            <div className="ui-modal-header">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Pengganti Sesi</p>
                <h3 className="ui-modal-title">Pilih Sensei Pengganti</h3>
              </div>
              <button onClick={() => setReplacementTarget(null)} className="border border-slate-200 p-2 text-slate-500">
                <X size={18} />
              </button>
            </div>
            <div className="ui-modal-body space-y-4">
              <div className="border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-black text-slate-900">{replacementTarget.displayName}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {replacementTarget.date} / {replacementTarget.startTime}-{replacementTarget.endTime}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Sensei asal: {senseiById.get(replacementTarget.originalSenseiId || replacementTarget.senseiId)?.name || replacementTarget.senseiName}</p>
              </div>
              <div>
                <label className="ui-label">Sensei Pengganti</label>
                <select value={replacementSenseiId} onChange={event => setReplacementSenseiId(event.target.value)} className="ui-input">
                  <option value="">Pilih sensei yang tersedia...</option>
                  {replacementOptions.map(sensei => <option key={sensei.id} value={sensei.id}>{sensei.name}</option>)}
                </select>
                {replacementOptions.length === 0 && <p className="mt-2 text-xs font-semibold text-rose-600">Belum ada sensei yang tersedia pada jam tersebut.</p>}
              </div>
            </div>
            <div className="ui-modal-footer">
              <button onClick={() => setReplacementTarget(null)} className="ui-btn-secondary">Batal</button>
              <button disabled={!replacementSenseiId || processingId === replacementTarget.id} onClick={handleAssignSubstitute} className="ui-btn-primary disabled:opacity-50">
                {processingId === replacementTarget.id ? 'Menyimpan...' : 'Simpan Pengganti'}
              </button>
            </div>
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

const toScheduleRecord = (schedule: Schedule): Schedule => ({
  id: schedule.id,
  senseiId: schedule.senseiId,
  studentId: schedule.studentId,
  studentIds: schedule.studentIds,
  groupId: schedule.groupId,
  type: schedule.type,
  level: schedule.level,
  date: schedule.date,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  status: schedule.status,
  updatedAt: schedule.updatedAt,
  updatedBy: schedule.updatedBy,
  originalSenseiId: schedule.originalSenseiId,
  substitutionStatus: schedule.substitutionStatus,
  substitutionRequestedAt: schedule.substitutionRequestedAt,
  substitutionRequestedBy: schedule.substitutionRequestedBy,
    substitutionAssignedAt: schedule.substitutionAssignedAt,
    substitutionAssignedBy: schedule.substitutionAssignedBy,
    substitutionSenseiName: schedule.substitutionSenseiName
});

const FilterButton = ({
  active,
  onClick,
  count,
  children
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 whitespace-nowrap rounded px-3 py-2 text-xs font-semibold transition-colors md:flex-none ${
      active
        ? 'bg-indigo-600 text-white'
        : 'bg-slate-50 text-slate-500 hover:bg-white dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
    }`}
  >
    <span>{children}</span>
    {count !== undefined && (
      <span className={`ml-1.5 inline-flex min-w-5 justify-center rounded px-1.5 py-0.5 text-[9px] font-semibold ${active ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
        {count}
      </span>
    )}
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
  <div className="ui-panel border-dashed p-10 text-center">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
    <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{detail}</p>
  </div>
);

const Th = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => (
  <th className={`px-3 py-3 text-${align} text-xs font-semibold text-slate-500`}>
    {children}
  </th>
);

const StatusBadge = ({ row, isPast }: { row: SessionRow; isPast: boolean }) => {
  if (row.substitutionStatus === 'requested') {
    return (
      <span className="ui-status border-amber-200 bg-amber-50 text-amber-700">
        Butuh Pengganti
      </span>
    );
  }

  if (row.state === 'completed') {
    return (
      <span className="ui-status border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
        Selesai {row.completedCount}/{row.expectedCount}
      </span>
    );
  }

  if (row.state === 'in_progress') {
    const timezone = row.sessionLog?.timezone || 'Asia/Jakarta';
    return (
      <span className="ui-status border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
        Berjalan · {formatTimestampInTimezone(row.sessionLog?.checkInAt, timezone)} {getTimezoneAbbreviation(timezone)}
      </span>
    );
  }

  if (row.state === 'report_pending') {
    const timezone = row.sessionLog?.timezone || 'Asia/Jakarta';
    return (
      <span className="ui-status border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300" title={`Clock-out ${formatTimestampInTimezone(row.sessionLog?.checkOutAt, timezone)} ${getTimezoneAbbreviation(timezone)}`}>
        Laporan Belum Diisi
      </span>
    );
  }

  if (isPast) {
    return (
      <span className="ui-status border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
        Belum Terlaksana
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="ui-status border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        Siap
      </span>
      {row.delayed && (
        <span className="ui-status border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          Terlambat
        </span>
      )}
    </div>
  );
};
