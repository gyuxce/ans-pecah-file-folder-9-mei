import { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Edit2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { SenseiTimeBlock, SenseiTimeBlockStatus } from '../types';
import { useAppContext } from '../context/AppContext';

const STATUS_OPTIONS: Array<{ value: SenseiTimeBlockStatus; label: string }> = [
  { value: 'available_ans', label: 'Available ANS' },
  { value: 'busy_cakap', label: 'Busy Cakap' },
  { value: 'busy_personal', label: 'Busy Personal' },
  { value: 'off', label: 'Off' }
];

const statusStyle: Record<SenseiTimeBlockStatus, string> = {
  available_ans: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200',
  busy_cakap: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  busy_personal: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  off: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
};

const statusLabel = (status: SenseiTimeBlockStatus) =>
  STATUS_OPTIONS.find(option => option.value === status)?.label || status;

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && aEnd > bStart;

export const SenseiScheduleView = () => {
  const {
    senseiList,
    schedules,
    senseiTimeBlocks,
    studentList,
    groupList,
    currentSensei,
    permissions,
    user,
    dbOps
  } = useAppContext(state => ({
    senseiList: state.permissions.role === 'Sensei' ? state.scopedSenseiList : state.senseiList,
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    senseiTimeBlocks: state.permissions.role === 'Sensei' ? state.scopedSenseiTimeBlocks : state.senseiTimeBlocks,
    studentList: state.studentList,
    groupList: state.groupList,
    currentSensei: state.currentSensei,
    permissions: state.permissions,
    user: state.user,
    dbOps: state.dbOps
  }));

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedSenseiId, setSelectedSenseiId] = useState(currentSensei?.id || senseiList[0]?.id || '');
  const [editingBlock, setEditingBlock] = useState<SenseiTimeBlock | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'available_ans' as SenseiTimeBlockStatus,
    note: ''
  });

  useEffect(() => {
    if (permissions.role === 'Sensei' && currentSensei?.id) {
      setSelectedSenseiId(currentSensei.id);
      return;
    }
    if (!selectedSenseiId && senseiList[0]?.id) setSelectedSenseiId(senseiList[0].id);
  }, [currentSensei?.id, permissions.role, selectedSenseiId, senseiList]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(weekAnchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [weekAnchor]);

  const studentNameById = useMemo(() => new Map(studentList.map(student => [student.id, student.name])), [studentList]);
  const groupNameById = useMemo(() => new Map(groupList.map(group => [group.id, group.name])), [groupList]);

  const selectedSensei = senseiList.find(sensei => sensei.id === selectedSenseiId) || null;

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    schedules
      .filter(schedule => schedule.senseiId === selectedSenseiId && schedule.status !== 'cancelled')
      .forEach(schedule => {
        const items = map.get(schedule.date) || [];
        items.push(schedule);
        map.set(schedule.date, items);
      });
    map.forEach(items => items.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [schedules, selectedSenseiId]);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, SenseiTimeBlock[]>();
    senseiTimeBlocks
      .filter(block => block.senseiId === selectedSenseiId)
      .forEach(block => {
        const items = map.get(block.date) || [];
        items.push(block);
        map.set(block.date, items);
      });
    map.forEach(items => items.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [senseiTimeBlocks, selectedSenseiId]);

  const blockingWarnings = useMemo(() => {
    return schedules
      .filter(schedule => schedule.senseiId === selectedSenseiId && schedule.status !== 'cancelled')
      .flatMap(schedule => {
        const blockers = (blocksByDate.get(schedule.date) || []).filter(block =>
          block.status !== 'available_ans' && overlaps(schedule.startTime, schedule.endTime, block.startTime, block.endTime)
        );
        return blockers.map(block => ({
          id: `${schedule.id}-${block.id}`,
          date: schedule.date,
          time: `${schedule.startTime}-${schedule.endTime}`,
          status: statusLabel(block.status)
        }));
      })
      .slice(0, 5);
  }, [blocksByDate, schedules, selectedSenseiId]);

  const resetForm = (date = form.date) => {
    setEditingBlock(null);
    setForm({
      date,
      startTime: '09:00',
      endTime: '10:00',
      status: 'available_ans',
      note: ''
    });
  };

  const editBlock = (block: SenseiTimeBlock) => {
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
    if (!selectedSenseiId) return toast.error('Pilih sensei dulu.');
    if (!form.date || !form.startTime || !form.endTime) return toast.error('Tanggal dan jam wajib diisi.');
    if (form.startTime >= form.endTime) return toast.error('Jam selesai harus lebih besar dari jam mulai.');

    try {
      await dbOps.save('sensei_time_blocks', {
        id: editingBlock?.id,
        senseiId: selectedSenseiId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        status: form.status,
        note: form.note.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || 'System'
      });
      toast.success(editingBlock ? 'Slot jadwal sensei diperbarui.' : 'Slot jadwal sensei ditambahkan.');
      resetForm(form.date);
    } catch (error: any) {
      toast.error(`Gagal menyimpan slot: ${error.message}`);
    }
  };

  const deleteBlock = async (block: SenseiTimeBlock) => {
    try {
      await dbOps.delete('sensei_time_blocks', block.id);
      if (editingBlock?.id === block.id) resetForm(block.date);
      toast.success('Slot jadwal sensei dihapus.');
    } catch (error: any) {
      toast.error(`Gagal menghapus slot: ${error.message}`);
    }
  };

  const bookingTitle = (schedule: any) => {
    if (schedule.groupId) return groupNameById.get(schedule.groupId) || 'Group/SP';
    const ids = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
    return ids.map((id: string) => studentNameById.get(id) || 'Student').join(', ') || 'ANS Booking';
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <CalendarDays size={18} />
              <p className="text-xs font-black uppercase tracking-widest">Availability dan Cakap</p>
            </div>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Jadwal Sensei</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Satu tempat untuk melihat booking ANS dan input slot available, busy Cakap, personal, atau off.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {permissions.role !== 'Sensei' && (
              <select
                value={selectedSenseiId}
                onChange={(event) => setSelectedSenseiId(event.target.value)}
                className="h-10 min-w-56 border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {senseiList.map(sensei => (
                  <option key={sensei.id} value={sensei.id}>{sensei.name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
              className="h-10 border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekAnchor(new Date())}
              className="h-10 border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
              className="h-10 border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              aria-label="Minggu berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {blockingWarnings.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Ada {blockingWarnings.length} booking ANS yang overlap dengan blok busy/off. Cek lagi slot {blockingWarnings[0].date} {blockingWarnings[0].time}.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Input Slot</p>
              <h4 className="text-base font-black text-slate-900 dark:text-white">{editingBlock ? 'Edit Slot' : 'Tambah Slot'}</h4>
            </div>
            <button
              onClick={() => resetForm()}
              className="flex items-center gap-1 border border-slate-200 px-2 py-1 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
            >
              <Plus size={14} />
              Baru
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Sensei</span>
              <div className="border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {selectedSensei?.name || 'Belum ada sensei'}
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm(prev => ({ ...prev, date: event.target.value }))}
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Mulai</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => setForm(prev => ({ ...prev, startTime: event.target.value }))}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Selesai</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => setForm(prev => ({ ...prev, endTime: event.target.value }))}
                  className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value as SenseiTimeBlockStatus }))}
                className="w-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Catatan</span>
              <textarea
                value={form.note}
                onChange={(event) => setForm(prev => ({ ...prev, note: event.target.value }))}
                rows={3}
                className="w-full resize-none border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="Opsional"
              />
            </label>

            <button
              onClick={saveBlock}
              className="w-full bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              {editingBlock ? 'Simpan Perubahan' : 'Tambah Slot'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-7">
          {weekDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const blocks = blocksByDate.get(dateKey) || [];
            const bookings = bookingsByDate.get(dateKey) || [];

            return (
              <div key={dateKey} className="min-h-72 border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => resetForm(dateKey)}
                  className="w-full border-b border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(day, 'EEE')}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{format(day, 'dd MMM yyyy')}</p>
                </button>

                <div className="space-y-2 p-3">
                  {bookings.map(schedule => (
                    <div key={schedule.id} className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black">{schedule.startTime}-{schedule.endTime}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest">ANS</span>
                      </div>
                      <p className="mt-1 truncate text-xs font-bold">{bookingTitle(schedule)}</p>
                      <p className="truncate text-[10px] font-semibold opacity-70">{schedule.type} / {schedule.level}</p>
                    </div>
                  ))}

                  {blocks.map(block => (
                    <div key={block.id} className={`border px-3 py-2 ${statusStyle[block.status]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black">{block.startTime}-{block.endTime}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest">{statusLabel(block.status)}</p>
                          {block.note && <p className="mt-1 line-clamp-2 text-[11px] font-semibold opacity-80">{block.note}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => editBlock(block)}
                            className="border border-current/20 p-1 hover:bg-white/50"
                            aria-label="Edit slot"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => deleteBlock(block)}
                            className="border border-current/20 p-1 hover:bg-white/50"
                            aria-label="Hapus slot"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && blocks.length === 0 && (
                    <div className="border border-dashed border-slate-200 px-3 py-8 text-center text-xs font-bold text-slate-400 dark:border-slate-700">
                      Belum ada slot
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
