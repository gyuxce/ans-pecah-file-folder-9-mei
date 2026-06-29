import { CalendarClock, Check, Loader2, UserRoundCog } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import type { Schedule, Sensei } from '../types';
import { timesOverlap } from '../utils/scheduleUtils';

export const SubstitutionRequestPanel = () => {
  const {
    schedules,
    senseiList,
    studentList,
    groupList,
    offDays,
    senseiTimeBlocks,
    dbOps,
    user
  } = useAppContext(state => ({
    schedules: state.schedules,
    senseiList: state.senseiList,
    studentList: state.studentList,
    groupList: state.groupList,
    offDays: state.offDays,
    senseiTimeBlocks: state.senseiTimeBlocks,
    dbOps: state.dbOps,
    user: state.user
  }));
  const [selectedReplacement, setSelectedReplacement] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const senseiById = useMemo(() => new Map(senseiList.map(sensei => [sensei.id, sensei])), [senseiList]);
  const studentById = useMemo(() => new Map(studentList.map(student => [student.id, student])), [studentList]);
  const groupById = useMemo(() => new Map(groupList.map(group => [group.id, group])), [groupList]);
  const pendingSchedules = useMemo(
    () => schedules
      .filter(schedule => schedule.substitutionStatus === 'requested' && schedule.status !== 'cancelled')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [schedules]
  );

  const getReplacementOptions = (target: Schedule): Sensei[] => {
    const originalSenseiId = target.originalSenseiId || target.senseiId;
    return senseiList.filter(candidate => {
      if (candidate.id === originalSenseiId) return false;
      if (offDays.some(day => day.senseiId === candidate.id && day.date === target.date)) return false;
      if (schedules.some(schedule => (
        schedule.id !== target.id
        && schedule.senseiId === candidate.id
        && schedule.date === target.date
        && schedule.status !== 'cancelled'
        && timesOverlap(target.startTime, target.endTime, schedule.startTime, schedule.endTime)
      ))) return false;
      if (senseiTimeBlocks.some(block => (
        block.senseiId === candidate.id
        && block.date === target.date
        && block.status !== 'available_ans'
        && timesOverlap(target.startTime, target.endTime, block.startTime, block.endTime)
      ))) return false;
      return true;
    });
  };

  const getClassName = (schedule: Schedule) => {
    if (schedule.groupId) return groupById.get(schedule.groupId)?.name || 'Grup / SP';
    const studentId = schedule.studentIds?.[0] || schedule.studentId;
    return studentId ? studentById.get(studentId)?.name || 'Siswa tidak ditemukan' : 'Peserta belum dipilih';
  };

  const assignReplacement = async (schedule: Schedule) => {
    const replacementSenseiId = selectedReplacement[schedule.id];
    if (!replacementSenseiId) return toast.error('Pilih sensei pengganti terlebih dahulu.');
    setProcessingId(schedule.id);
    try {
      await dbOps.save('schedules', {
        ...schedule,
        senseiId: replacementSenseiId,
        originalSenseiId: schedule.originalSenseiId || schedule.senseiId,
        substitutionStatus: 'assigned',
        substitutionAssignedAt: new Date().toISOString(),
        substitutionAssignedBy: user?.email || 'Admin',
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'Admin'
      });
      const replacementName = senseiById.get(replacementSenseiId)?.name || 'Sensei pengganti';
      toast.success(`${replacementName} berhasil ditugaskan.`);
      setSelectedReplacement(previous => {
        const next = { ...previous };
        delete next[schedule.id];
        return next;
      });
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menetapkan sensei pengganti.');
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingSchedules.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        <Check className="mr-2" size={18} /> Tidak ada permintaan pengganti yang perlu diproses.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {pendingSchedules.map(schedule => {
        const originalSenseiId = schedule.originalSenseiId || schedule.senseiId;
        const options = getReplacementOptions(schedule);
        const parsedDate = parseISO(schedule.date);
        return (
          <div key={schedule.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,0.9fr)_minmax(220px,1.1fr)_minmax(260px,1.2fr)] lg:items-center">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Meminta Pengganti</p>
              <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">
                {senseiById.get(originalSenseiId)?.name || 'Sensei tidak ditemukan'}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                Diajukan oleh {schedule.substitutionRequestedBy || 'sensei'}
              </p>
            </div>

            <div className="border-l-2 border-indigo-200 pl-3 dark:border-indigo-900">
              <p className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
                <CalendarClock size={14} />
                {Number.isNaN(parsedDate.getTime()) ? schedule.date : format(parsedDate, 'dd MMM yyyy')} · {schedule.startTime}-{schedule.endTime}
              </p>
              <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{getClassName(schedule)}</p>
              <p className="mt-1 text-[10px] font-black uppercase text-slate-400">{schedule.type} · {schedule.level}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedReplacement[schedule.id] || ''}
                onChange={event => setSelectedReplacement(previous => ({ ...previous, [schedule.id]: event.target.value }))}
                className="ui-input min-w-0 flex-1"
              >
                <option value="">Pilih sensei yang tersedia...</option>
                {options.map(sensei => <option key={sensei.id} value={sensei.id}>{sensei.name}</option>)}
              </select>
              <button
                type="button"
                disabled={processingId === schedule.id || options.length === 0}
                onClick={() => assignReplacement(schedule)}
                className="ui-btn-primary inline-flex shrink-0 items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId === schedule.id ? <Loader2 size={15} className="animate-spin" /> : <UserRoundCog size={15} />}
                Tetapkan
              </button>
              {options.length === 0 && <p className="text-xs font-semibold text-rose-600 sm:hidden">Tidak ada sensei yang bebas pada jam ini.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
