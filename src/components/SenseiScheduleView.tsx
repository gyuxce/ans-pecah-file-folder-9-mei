import { useEffect, useMemo, useState } from 'react';
import { getScheduleStudentIds } from '../utils/helpers';
import { addDays, format, startOfWeek } from 'date-fns';
import { AlertTriangle, CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { LeaveRequestType, SenseiTimeBlock, SenseiTimeBlockStatus } from '../types';
import { useAppContext } from '../context/AppContext';
import { createId } from '../utils/id';
import { SenseiAvailabilityPanel } from './SenseiAvailabilityPanel';

const STATUS_OPTIONS: Array<{ value: SenseiTimeBlockStatus; label: string }> = [
  { value: 'busy_cakap', label: 'Kelas Cakap' },
  { value: 'busy_personal', label: 'Keperluan Pribadi' }
];

const LEAVE_OPTIONS: LeaveRequestType[] = [
  'Izin/Cuti',
  'Sakit',
  'Keperluan Pribadi',
  'Training/Meeting',
  'Lainnya'
];

const leaveTypeLabel = (leaveType: LeaveRequestType) => {
  if (leaveType === 'Izin/Cuti') return 'Cuti';
  if (leaveType === 'Training/Meeting') return 'Training / Meeting';
  return leaveType;
};
const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const statusStyle: Record<SenseiTimeBlockStatus, string> = {
  available_ans: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200',
  busy_cakap: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  busy_personal: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  off: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
};
const statusLabel = (status: SenseiTimeBlockStatus) =>
  STATUS_OPTIONS.find(option => option.value === status)?.label || (status === 'available_ans' ? 'Jadwal ANS' : status === 'off' ? 'Libur' : status);
import { timesOverlap } from '../utils/scheduleUtils';

type SenseiBlockView = SenseiTimeBlock & {
  source: 'Jadwal Lain' | 'Hari Libur';
  senseiName: string;
  readOnly?: boolean;
};

type DayDetail = {
  dateKey: string;
  label: string;
  blocks: SenseiBlockView[];
  bookings: any[];
} | null;

export const SenseiScheduleView = () => {
  const {
    senseiList,
    schedules,
    senseiTimeBlocks,
    leaveRequests,
    offDays,
    studentList,
    groupList,
    currentSensei,
    permissions,
    user,
    supabase,
    dbOps
  } = useAppContext(state => ({
    senseiList: state.permissions.role === 'Sensei' ? state.scopedSenseiList : state.senseiList,
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    senseiTimeBlocks: state.permissions.role === 'Sensei' ? state.scopedSenseiTimeBlocks : state.senseiTimeBlocks,
    leaveRequests: state.permissions.role === 'Sensei' ? state.scopedLeaveRequests : state.leaveRequests,
    offDays: state.offDays,
    studentList: state.studentList,
    groupList: state.groupList,
    currentSensei: state.currentSensei,
    permissions: state.permissions,
    user: state.user,
    supabase: state.supabase,
    dbOps: state.dbOps
  }));

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedSenseiId, setSelectedSenseiId] = useState(
    permissions.role === 'Sensei' ? (currentSensei?.id || '') : 'all'
  );
  const [formSenseiId, setFormSenseiId] = useState(currentSensei?.id || senseiList[0]?.id || '');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isOffRequestOpen, setIsOffRequestOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState<DayDetail>(null);
  const [editingBlock, setEditingBlock] = useState<SenseiTimeBlock | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'busy_cakap' as SenseiTimeBlockStatus,
    note: ''
  });
  const [offRequest, setOffRequest] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    leaveType: 'Izin/Cuti' as LeaveRequestType,
    note: ''
  });

  useEffect(() => {
    if (permissions.role === 'Sensei' && currentSensei?.id) {
      setSelectedSenseiId(currentSensei.id);
      setFormSenseiId(currentSensei.id);
      return;
    }
    if (!selectedSenseiId) setSelectedSenseiId('all');
    if (!formSenseiId && senseiList[0]?.id) setFormSenseiId(senseiList[0].id);
  }, [currentSensei?.id, formSenseiId, permissions.role, selectedSenseiId, senseiList]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [weekAnchor]);

  const studentNameById = useMemo(() => new Map(studentList.map(student => [student.id, student.name])), [studentList]);
  const groupNameById = useMemo(() => new Map(groupList.map(group => [group.id, group.name])), [groupList]);

  const senseiNameById = useMemo(() => new Map(senseiList.map(sensei => [sensei.id, sensei.name])), [senseiList]);
  const formSensei = senseiList.find(sensei => sensei.id === formSenseiId) || null;
  const isAllSensei = selectedSenseiId === 'all';
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const statusOptionsForForm = STATUS_OPTIONS;

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    schedules
      .filter(schedule => (isAllSensei || schedule.senseiId === selectedSenseiId) && schedule.status !== 'cancelled')
      .forEach(schedule => {
        const items = map.get(schedule.date) || [];
        items.push(schedule);
        map.set(schedule.date, items);
      });
    map.forEach(items => items.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [isAllSensei, schedules, selectedSenseiId]);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, SenseiBlockView[]>();
    senseiTimeBlocks
      .filter(block => (isAllSensei || block.senseiId === selectedSenseiId) && block.status !== 'available_ans')
      .forEach(block => {
        const items = map.get(block.date) || [];
        items.push({
          ...block,
          source: 'Jadwal Lain',
          senseiName: senseiNameById.get(block.senseiId) || 'Sensei tidak ditemukan'
        });
        map.set(block.date, items);
      });

    offDays
      .filter(offDay => isAllSensei || offDay.senseiId === selectedSenseiId)
      .forEach(offDay => {
        const items = map.get(offDay.date) || [];
        items.push({
          id: `offday-${offDay.id}`,
          senseiId: offDay.senseiId,
          date: offDay.date,
          startTime: '00:00',
          endTime: '23:59',
          status: 'off',
          note: offDay.reason,
          source: 'Hari Libur',
          senseiName: senseiNameById.get(offDay.senseiId) || 'Sensei tidak ditemukan',
          readOnly: true
        });
        map.set(offDay.date, items);
      });

    map.forEach(items => items.sort((a, b) => {
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.senseiName.localeCompare(b.senseiName);
    }));
    return map;
  }, [isAllSensei, offDays, senseiNameById, senseiTimeBlocks, selectedSenseiId]);

  const blockingWarnings = useMemo(() => {
    return schedules
      .filter(schedule => (isAllSensei || schedule.senseiId === selectedSenseiId) && schedule.status !== 'cancelled')
      .flatMap(schedule => {
        const blockers = (blocksByDate.get(schedule.date) || []).filter(block =>
          block.senseiId === schedule.senseiId &&
          block.status !== 'available_ans' &&
          timesOverlap(schedule.startTime, schedule.endTime, block.startTime, block.endTime)
        );
        return blockers.map(block => ({
          id: `${schedule.id}-${block.id}`,
          date: schedule.date,
          time: `${schedule.startTime}-${schedule.endTime}`,
          status: statusLabel(block.status)
        }));
      })
      .slice(0, 5);
  }, [blocksByDate, isAllSensei, schedules, selectedSenseiId]);

  const myUpcomingOffDays = useMemo(() => {
    if (!currentSensei?.id) return [];
    return offDays
      .filter(offDay => offDay.senseiId === currentSensei.id && offDay.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [currentSensei?.id, offDays, todayKey]);

  const myLeaveRequests = useMemo(() => {
    if (!currentSensei?.id) return [];
    return leaveRequests
      .filter(request => request.source !== 'legacy_offday' && request.endDate >= todayKey)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 5);
  }, [currentSensei?.id, leaveRequests, todayKey]);

  const legacyUpcomingOffDays = useMemo(() => myUpcomingOffDays.filter(offDay => (
    !myLeaveRequests.some(request => (
      request.status === 'approved'
      && request.startDate <= offDay.date
      && request.endDate >= offDay.date
    ))
  )), [myLeaveRequests, myUpcomingOffDays]);

  const resetForm = (date = form.date, open = true) => {
    setEditingBlock(null);
    setIsFormOpen(open);
    setForm({
      date,
      startTime: '09:00',
      endTime: '10:00',
      status: 'busy_cakap',
      note: ''
    });
  };

  const editBlock = (block: SenseiBlockView) => {
    if (block.readOnly) return;
    if (block.status === 'off') {
        toast.info('Libur seharian dikelola melalui pengajuan libur.');
      return;
    }
    setFormSenseiId(block.senseiId);
    setIsFormOpen(true);
    setEditingBlock(block);
    setForm({
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      status: block.status,
      note: block.note || ''
    });
  };

  const saveBlock = async () => {
    if (!formSenseiId) return toast.error('Pilih sensei dulu.');
    if (!form.date || !form.startTime || !form.endTime) return toast.error('Tanggal dan jam wajib diisi.');
    if (form.startTime >= form.endTime) return toast.error('Jam selesai harus lebih besar dari jam mulai.');

    try {
      await dbOps.save('sensei_time_blocks', {
        id: editingBlock?.id,
        senseiId: formSenseiId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        note: form.note.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'System'
      });
      if (formConflictBookings.length > 0) {
        toast.warning(`Jadwal tersimpan, tetapi bentrok dengan ${formConflictBookings.length} jadwal ANS.`);
      } else {
        toast.success(editingBlock ? 'Jadwal lain berhasil diperbarui.' : 'Jadwal lain berhasil ditambahkan.');
      }
      resetForm(form.date, false);
    } catch (error: any) {
      toast.error(`Gagal menyimpan jadwal lain: ${error.message}`);
    }
  };

  const submitOffRequest = async () => {
    if (!currentSensei?.id) {
      toast.error('Akun sensei belum terhubung ke data sensei.');
      return;
    }
    if (!offRequest.startDate || !offRequest.endDate) {
      toast.error('Tanggal mulai dan selesai wajib diisi.');
      return;
    }
    if (offRequest.endDate < offRequest.startDate) {
      toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    const duplicate = leaveRequests.some(request =>
      request.senseiId === currentSensei.id
      && ['pending', 'approved'].includes(request.status)
      && request.startDate <= offRequest.endDate
      && request.endDate >= offRequest.startDate
    ) || offDays.some(offDay =>
      offDay.senseiId === currentSensei.id
      && offDay.date >= offRequest.startDate
      && offDay.date <= offRequest.endDate
    );
    if (duplicate) {
      toast.error('Rentang tanggal ini sudah memiliki pengajuan atau Hari Libur.');
      return;
    }

    try {
      await dbOps.save('leave_requests', {
        id: createId(),
        senseiId: currentSensei.id,
        startDate: offRequest.startDate,
        endDate: offRequest.endDate,
        leaveType: offRequest.leaveType,
        note: offRequest.note.trim(),
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null
      });
      toast.success('Pengajuan dikirim. Tunggu persetujuan admin.');
      setOffRequest({ startDate: todayKey, endDate: todayKey, leaveType: 'Izin/Cuti', note: '' });
      setIsOffRequestOpen(false);
    } catch (error: any) {
      toast.error(`Gagal mengirim pengajuan libur: ${error.message}`);
    }
  };

  const deleteBlock = async (block: SenseiBlockView) => {
    if (block.readOnly) {
      toast.info('Slot dari Hari Libur diubah dari menu Hari Libur.');
      return;
    }

    try {
      await dbOps.delete('sensei_time_blocks', block.id);
      if (editingBlock?.id === block.id) resetForm(block.date, false);
      toast.success('Jadwal lain berhasil dihapus.');
    } catch (error: any) {
      toast.error(`Gagal menghapus jadwal lain: ${error.message}`);
    }
  };

  const bookingTitle = (schedule: any) => {
    if (schedule.groupId) return groupNameById.get(schedule.groupId) || 'Grup/SP';
    const ids = getScheduleStudentIds(schedule);
    return ids.map((id: string) => studentNameById.get(id) || 'Siswa').join(', ') || 'Jadwal ANS';
  };

  const bookingSubtitle = (schedule: any) => {
    const prefix = isAllSensei ? `${senseiNameById.get(schedule.senseiId) || 'Sensei'} / ` : '';
    return `${prefix}${schedule.type} / ${schedule.level}`;
  };

  const getBookingConflicts = (block: Pick<SenseiTimeBlock, 'senseiId' | 'date' | 'startTime' | 'endTime'>) => {
    return schedules
      .filter(schedule =>
        schedule.status !== 'cancelled' &&
        schedule.senseiId === block.senseiId &&
        schedule.date === block.date &&
        timesOverlap(block.startTime, block.endTime, schedule.startTime, schedule.endTime)
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const conflictBookingsByBlockId = useMemo(() => {
    const map = new Map<string, any[]>();
    blocksByDate.forEach(blocks => {
      blocks.forEach(block => {
        const conflicts = getBookingConflicts(block);
        if (conflicts.length > 0) map.set(block.id, conflicts);
      });
    });
    return map;
  }, [blocksByDate, schedules]);

  const formConflictBookings = useMemo(() => {
    if (!formSenseiId || !form.date || !form.startTime || !form.endTime || form.startTime >= form.endTime) return [];
    return getBookingConflicts({
      senseiId: formSenseiId,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime
    });
  }, [form.date, form.endTime, form.startTime, formSenseiId, schedules]);

  return (
    <div className="ui-page">
      <div className="ui-panel">
        <div className="ui-panel-body">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <CalendarDays size={18} />
              <p className="ui-section-title mb-0 text-indigo-600 dark:text-indigo-300">Jadwal Mingguan</p>
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{permissions.role === 'Sensei' ? 'Jadwal Saya' : 'Jadwal Sensei'}</h3>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
              {permissions.role === 'Sensei'
                ? 'Lihat jadwal ANS. Catat jadwal Cakap/pribadi hanya kalau berpotensi bentrok.'
                : 'Pantau jadwal ANS, jadwal di luar ANS, pengajuan libur, dan bentrok sensei.'}
            </p>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
            {permissions.role !== 'Sensei' && (
              <select
                value={selectedSenseiId}
                onChange={(event) => setSelectedSenseiId(event.target.value)}
                className="ui-input w-full min-w-0 sm:w-64"
              >
                <option value="all">Semua Sensei</option>
                {senseiList.map(sensei => (
                  <option key={sensei.id} value={sensei.id}>{sensei.name}</option>
                ))}
              </select>
            )}
            {permissions.role !== 'Sensei' && (
              <button
                onClick={() => resetForm(form.date, true)}
                className="ui-btn-primary shrink-0 text-xs"
              >
                <Plus size={14} />
                Tambah Jadwal Lain
              </button>
            )}
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
              className="ui-btn-secondary h-10 shrink-0 px-3"
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekAnchor(new Date())}
              className="ui-btn-secondary h-10 shrink-0 px-4 text-xs"
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
              className="ui-btn-secondary h-10 shrink-0 px-3"
              aria-label="Minggu berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        </div>
      </div>

      {permissions.role === 'Sensei' && currentSensei?.id && (
        <SenseiAvailabilityPanel senseiId={currentSensei.id} supabase={supabase} />
      )}

      {permissions.role === 'Sensei' && (
        <section className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => resetForm(form.date, true)}
            className="flex min-h-20 items-center gap-3 rounded-md border border-indigo-200 bg-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-900 dark:hover:bg-indigo-950/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white">
              <Plus size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 dark:text-white">Tambah Jadwal Lain</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Untuk kelas Cakap atau keperluan pribadi beberapa jam.</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsOffRequestOpen(true)}
            className="flex min-h-20 items-center gap-3 rounded-md border border-sky-200 bg-sky-50 p-4 text-left transition-colors hover:border-sky-400 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/20 dark:hover:bg-sky-950/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white">
              <CalendarOff size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 dark:text-white">Libur Seharian</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">Pilih tanggal lalu kirim pengajuan ke admin.</span>
            </span>
          </button>
        </section>
      )}

      {blockingWarnings.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Jadwal bentrok: kelas ANS {blockingWarnings[0].date} pukul {blockingWarnings[0].time} bertabrakan dengan {blockingWarnings[0].status}.
          {blockingWarnings.length > 1 && ` Ada ${blockingWarnings.length - 1} bentrok lainnya.`}
        </div>
      )}

      {permissions.role === 'Sensei' && (
        <section className="ui-panel px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarOff size={15} className="shrink-0 text-sky-600 dark:text-sky-300" />
            <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Pengajuan Libur</p>
            {myLeaveRequests.length > 0 || legacyUpcomingOffDays.length > 0 ? (
              <div className="flex min-w-0 flex-wrap gap-2">
                {myLeaveRequests.map(request => (
                  <span key={request.id} className={`max-w-full truncate rounded border px-2 py-1 text-[11px] font-semibold ${
                    request.status === 'pending'
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                      : request.status === 'approved'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                  }`}>
                    {leaveTypeLabel(request.leaveType)} / {request.startDate}{request.endDate !== request.startDate ? ` - ${request.endDate}` : ''} / {request.status === 'pending' ? 'Menunggu' : request.status === 'approved' ? 'Disetujui' : request.status === 'rejected' ? 'Ditolak' : 'Dibatalkan'}
                  </span>
                ))}
                {legacyUpcomingOffDays.map(offDay => (
                  <span key={offDay.id} className="max-w-full truncate rounded border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                    {offDay.date} / {offDay.reason}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Belum ada pengajuan libur.</span>
            )}
          </div>
        </section>
      )}

      <div className="space-y-4">
        {isOffRequestOpen && (
          <div className="ui-modal-overlay">
            <button
              className="absolute inset-0 cursor-default"
              onClick={() => setIsOffRequestOpen(false)}
              aria-label="Tutup form libur"
            />
            <div className="ui-modal-panel relative max-w-2xl">
              <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">Pengajuan ke Admin</p>
                  <h4 className="ui-modal-title">Libur Seharian</h4>
                </div>
                <button
                  onClick={() => setIsOffRequestOpen(false)}
                  className="border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Tutup form libur"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ui-modal-body grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="ui-label">Mulai</span>
                  <input
                    type="date"
                    value={offRequest.startDate}
                    onChange={event => setOffRequest(prev => ({ ...prev, startDate: event.target.value, endDate: prev.endDate < event.target.value ? event.target.value : prev.endDate }))}
                    className="ui-input"
                  />
                </label>
                <label className="block">
                  <span className="ui-label">Selesai</span>
                  <input
                    type="date"
                    min={offRequest.startDate}
                    value={offRequest.endDate}
                    onChange={event => setOffRequest(prev => ({ ...prev, endDate: event.target.value }))}
                    className="ui-input"
                  />
                </label>
                <label className="block">
                  <span className="ui-label">Jenis</span>
                  <select
                    value={offRequest.leaveType}
                    onChange={event => setOffRequest(prev => ({ ...prev, leaveType: event.target.value as LeaveRequestType }))}
                    className="ui-input"
                  >
                    {LEAVE_OPTIONS.map(reason => (
                      <option key={reason} value={reason}>{leaveTypeLabel(reason)}</option>
                    ))}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="ui-label">Catatan</span>
                  <input
                    type="text"
                    value={offRequest.note}
                    onChange={event => setOffRequest(prev => ({ ...prev, note: event.target.value }))}
                    className="ui-input"
                    placeholder="Opsional"
                  />
                </label>
                <p className="text-xs font-semibold text-slate-400 md:col-span-2">
                  Pengajuan masuk ke admin. Kalender baru diblokir setelah disetujui.
                </p>
              </div>

              <div className="ui-modal-footer">
                <button
                  onClick={() => setIsOffRequestOpen(false)}
                  className="ui-btn-secondary"
                >
                  Batal
                </button>
                <button
                  onClick={submitOffRequest}
                  className="ui-btn-primary"
                >
                  Kirim ke Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && (
        <div className="ui-modal-overlay">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => resetForm(form.date, false)}
            aria-label="Tutup form jadwal lain"
          />
          <div className="ui-modal-panel relative max-w-3xl">
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Di Luar Jadwal ANS</p>
              <h4 className="ui-modal-title">
                {editingBlock ? 'Ubah Jadwal Lain' : 'Tambah Jadwal Lain'}
              </h4>
            </div>
            <button
              onClick={() => resetForm(form.date, false)}
              className="border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Tutup form jadwal lain"
            >
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body grid gap-3 md:grid-cols-3">
            <label className="block md:col-span-3">
              <span className="ui-label">Sensei</span>
              {permissions.role === 'Sensei' ? (
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  {formSensei?.name || 'Belum ada sensei'}
                </div>
              ) : (
                <select
                  value={formSenseiId}
                  onChange={(event) => setFormSenseiId(event.target.value)}
                  className="ui-input"
                >
                  {senseiList.map(sensei => (
                    <option key={sensei.id} value={sensei.id}>{sensei.name}</option>
                  ))}
                </select>
              )}
            </label>

            <label className="block">
              <span className="ui-label">Tanggal</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm(prev => ({ ...prev, date: event.target.value }))}
                className="ui-input"
              />
            </label>

            <label className="block">
              <span className="ui-label">Mulai</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => setForm(prev => ({ ...prev, startTime: event.target.value }))}
                className="ui-input"
              />
            </label>

            <label className="block">
              <span className="ui-label">Selesai</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => setForm(prev => ({ ...prev, endTime: event.target.value }))}
                className="ui-input"
              />
            </label>

            <label className="block md:col-span-3">
              <span className="ui-label">Jenis Jadwal</span>
              <select
                value={form.status}
                onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value as SenseiTimeBlockStatus }))}
                className="ui-input"
              >
                {statusOptionsForForm.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {formConflictBookings.length > 0 && (
              <div className="border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 md:col-span-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-300" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide">Bentrok dengan Jadwal ANS</p>
                    <p className="mt-1 text-xs font-semibold">
                      Sensei sudah punya kelas ANS di jam ini. Cek sebelum ambil/konfirmasi jadwal Cakap.
                    </p>
                    <div className="mt-2 space-y-1">
                      {formConflictBookings.slice(0, 3).map(schedule => (
                        <div key={schedule.id} className="border border-amber-200 bg-white/70 px-2 py-1.5 text-xs font-bold dark:border-amber-900 dark:bg-slate-950/40">
                          {schedule.startTime}-{schedule.endTime} / {bookingTitle(schedule)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <label className="block md:col-span-3">
              <span className="ui-label">Catatan</span>
              <textarea
                value={form.note}
                onChange={(event) => setForm(prev => ({ ...prev, note: event.target.value }))}
                rows={2}
                className="ui-textarea resize-none"
                placeholder="Opsional"
              />
            </label>
          </div>
          <div className="ui-modal-footer">
            <button
              onClick={() => resetForm(form.date, false)}
              className="ui-btn-secondary"
            >
              Batal
            </button>
            <button
              onClick={saveBlock}
              className="ui-btn-primary"
            >
              {editingBlock ? 'Simpan Perubahan' : 'Simpan Jadwal'}
            </button>
          </div>
          </div>
        </div>
        )}

          <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-7">
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const blocks = blocksByDate.get(dateKey) || [];
            const bookings = bookingsByDate.get(dateKey) || [];
            const previewBlocks = blocks.slice(0, 3);
            const previewBookings = bookings.slice(0, 3);

            return (
              <div key={dateKey} className="ui-panel overflow-hidden">
                <div className="w-full border-b border-slate-200 bg-slate-50 px-3 py-3 text-left dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{DAY_LABELS[day.getDay()]}</p>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">{format(day, 'dd MMM yyyy')}</p>
                </div>

                <div className="space-y-2 p-2.5">
                  {previewBookings.map(schedule => (
                    <div key={schedule.id} className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <div className="flex items-center justify-between gap-2">
                        <p className="whitespace-nowrap text-[11px] font-black leading-tight">{schedule.startTime}-{schedule.endTime}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wide">ANS</span>
                      </div>
                      <p className="mt-1 truncate text-[10px] font-bold">{bookingTitle(schedule)}</p>
                    </div>
                  ))}

                  {previewBlocks.map(block => (
                    <div key={block.id} className={`rounded-md border px-2.5 py-2 ${statusStyle[block.status]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="whitespace-nowrap text-[11px] font-black leading-tight">{block.startTime}-{block.endTime}</p>
                          {isAllSensei && <p className="mt-0.5 truncate text-[10px] font-black leading-tight">{block.senseiName}</p>}
                          <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{statusLabel(block.status)}</p>
                          {(conflictBookingsByBlockId.get(block.id)?.length || 0) > 0 && (
                            <p className="mt-1 inline-flex rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                              Bentrok ANS
                            </p>
                          )}
                        </div>
                        {!block.readOnly && block.status !== 'off' && (
                          <button
                            onClick={() => editBlock(block)}
                            className="rounded border border-current/20 p-1 hover:bg-white/50"
                            aria-label="Ubah jadwal lain"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && blocks.length === 0 && (
                    <div className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-xs font-semibold text-slate-400 dark:border-slate-700">
                      Tidak ada jadwal
                    </div>
                  )}

                  {(blocks.length > previewBlocks.length || bookings.length > previewBookings.length) && (
                    <button
                      onClick={() => setDayDetail({ dateKey, label: format(day, 'dd MMM yyyy'), blocks, bookings })}
                      className="ui-btn-secondary h-9 w-full text-xs"
                    >
                      Detail
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {dayDetail && (
          <div className="ui-modal-overlay">
            <button
              className="absolute inset-0 cursor-default"
              onClick={() => setDayDetail(null)}
              aria-label="Tutup detail hari"
            />
            <div className="ui-modal-panel relative">
              <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Detail Jadwal</p>
                  <h4 className="ui-modal-title">{dayDetail.label}</h4>
                </div>
                <button onClick={() => setDayDetail(null)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  <X size={18} />
                </button>
              </div>

              <div className="ui-modal-body">
                {dayDetail.blocks.length > 0 && (
                  <section>
                    <p className="ui-section-title">Jadwal di Luar ANS</p>
                    <div className="space-y-2">
                      {dayDetail.blocks.map(block => (
                        <div key={block.id} className={`rounded-md border px-3 py-2 ${statusStyle[block.status]}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-black">{block.startTime}-{block.endTime}</p>
                              {isAllSensei && <p className="truncate text-[11px] font-black">{block.senseiName}</p>}
                              <p className="text-[10px] font-bold uppercase tracking-wide">{statusLabel(block.status)}</p>
                              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide opacity-60">{block.source}</p>
                              {block.note && <p className="mt-1 text-[11px] font-semibold opacity-80">{block.note}</p>}
                              {(conflictBookingsByBlockId.get(block.id)?.length || 0) > 0 && (
                                <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">
                                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                                    <AlertTriangle size={12} /> Bentrok ANS
                                  </p>
                                  <div className="mt-1 space-y-1">
                                    {(conflictBookingsByBlockId.get(block.id) || []).map(schedule => (
                                      <p key={schedule.id} className="text-[11px] font-bold">
                                        {schedule.startTime}-{schedule.endTime} / {bookingTitle(schedule)}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {block.readOnly || block.status === 'off' ? (
                              <span className="shrink-0 rounded border border-current/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wide opacity-70">
                                {block.readOnly ? 'Sync' : 'Off'}
                              </span>
                            ) : (
                              <div className="flex shrink-0 gap-1">
                                <button
                                  onClick={() => {
                                    setDayDetail(null);
                                    editBlock(block);
                                  }}
                                  className="rounded border border-current/20 p-1 hover:bg-white/50"
                                  aria-label="Ubah jadwal lain"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => deleteBlock(block)}
                                  className="rounded border border-current/20 p-1 hover:bg-white/50"
                                  aria-label="Hapus jadwal lain"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {dayDetail.bookings.length > 0 && (
                  <section>
                    <p className="ui-section-title">Jadwal ANS</p>
                    <div className="space-y-2">
                      {dayDetail.bookings.map(schedule => (
                        <div key={schedule.id} className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black">{schedule.startTime}-{schedule.endTime}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wide">ANS</span>
                          </div>
                          <p className="mt-1 truncate text-xs font-bold">{bookingTitle(schedule)}</p>
                          <p className="truncate text-[10px] font-semibold opacity-70">{bookingSubtitle(schedule)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
