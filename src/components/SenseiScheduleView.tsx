import { useEffect, useMemo, useState } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { SenseiTimeBlock, SenseiTimeBlockStatus } from '../types';
import { useAppContext } from '../context/AppContext';

const STATUS_OPTIONS: Array<{ value: SenseiTimeBlockStatus; label: string }> = [
  { value: 'busy_cakap', label: 'Busy Cakap' },
  { value: 'busy_personal', label: 'Busy Pribadi' },
  { value: 'off', label: 'Off' }
];

const DAY_LABELS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const statusStyle: Record<SenseiTimeBlockStatus, string> = {
  available_ans: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200',
  busy_cakap: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200',
  busy_personal: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  off: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200'
};

const statusLabel = (status: SenseiTimeBlockStatus) =>
  STATUS_OPTIONS.find(option => option.value === status)?.label || (status === 'available_ans' ? 'Tersedia ANS' : status);

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  aStart < bEnd && aEnd > bStart;

type SenseiBlockView = SenseiTimeBlock & {
  source: 'Jadwal Sensei' | 'Hari Libur';
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
    offDays,
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
    offDays: state.offDays,
    studentList: state.studentList,
    groupList: state.groupList,
    currentSensei: state.currentSensei,
    permissions: state.permissions,
    user: state.user,
    dbOps: state.dbOps
  }));

  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedSenseiId, setSelectedSenseiId] = useState(
    permissions.role === 'Sensei' ? (currentSensei?.id || '') : 'all'
  );
  const [formSenseiId, setFormSenseiId] = useState(currentSensei?.id || senseiList[0]?.id || '');
  const [showAnsSchedules, setShowAnsSchedules] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState<DayDetail>(null);
  const [editingBlock, setEditingBlock] = useState<SenseiTimeBlock | null>(null);
  const [form, setForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'busy_cakap' as SenseiTimeBlockStatus,
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

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, typeof schedules>();
    if (!showAnsSchedules) return map;

    schedules
      .filter(schedule => (isAllSensei || schedule.senseiId === selectedSenseiId) && schedule.status !== 'cancelled')
      .forEach(schedule => {
        const items = map.get(schedule.date) || [];
        items.push(schedule);
        map.set(schedule.date, items);
      });
    map.forEach(items => items.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [isAllSensei, schedules, selectedSenseiId, showAnsSchedules]);

  const blocksByDate = useMemo(() => {
    const map = new Map<string, SenseiBlockView[]>();
    senseiTimeBlocks
      .filter(block => (isAllSensei || block.senseiId === selectedSenseiId) && block.status !== 'available_ans')
      .forEach(block => {
        const items = map.get(block.date) || [];
        items.push({
          ...block,
          source: 'Jadwal Sensei',
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
          overlaps(schedule.startTime, schedule.endTime, block.startTime, block.endTime)
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
      toast.success(editingBlock ? 'Slot jadwal sensei diperbarui.' : 'Slot jadwal sensei ditambahkan.');
      resetForm(form.date, false);
    } catch (error: any) {
      toast.error(`Gagal menyimpan slot: ${error.message}`);
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
      toast.success('Slot jadwal sensei dihapus.');
    } catch (error: any) {
      toast.error(`Gagal menghapus slot: ${error.message}`);
    }
  };

  const bookingTitle = (schedule: any) => {
    if (schedule.groupId) return groupNameById.get(schedule.groupId) || 'Grup/SP';
    const ids = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
    return ids.map((id: string) => studentNameById.get(id) || 'Siswa').join(', ') || 'Jadwal ANS';
  };

  const bookingSubtitle = (schedule: any) => {
    const prefix = isAllSensei ? `${senseiNameById.get(schedule.senseiId) || 'Sensei'} / ` : '';
    return `${prefix}${schedule.type} / ${schedule.level}`;
  };

  const summarizeBlocks = (blocks: SenseiBlockView[]) => {
    return {
      cakap: blocks.filter(block => block.status === 'busy_cakap').length,
      personal: blocks.filter(block => block.status === 'busy_personal').length,
      off: blocks.filter(block => block.status === 'off').length
    };
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <CalendarDays size={18} />
              <p className="text-xs font-black uppercase tracking-widest">Ketersediaan dan Cakap</p>
            </div>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Jadwal Sensei</h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Kelola blok Busy Cakap, Busy Pribadi, dan Off.
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
            <button
              onClick={() => setShowAnsSchedules(prev => !prev)}
              className={`h-10 shrink-0 border px-3 text-xs font-black uppercase tracking-widest ${
                showAnsSchedules
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
              }`}
            >
              Jadwal ANS
            </button>
            <button
              onClick={() => resetForm(form.date, true)}
              className="flex h-10 shrink-0 items-center gap-1.5 bg-indigo-600 px-4 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              <Plus size={14} />
              Tambah Slot
            </button>
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
              className="h-10 shrink-0 border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekAnchor(new Date())}
              className="h-10 shrink-0 border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
              className="h-10 shrink-0 border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
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

      <div className="space-y-4">
        {isFormOpen && (
        <div className="ui-modal-overlay">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => resetForm(form.date, false)}
            aria-label="Tutup form slot"
          />
          <div className="ui-modal-panel-wide relative">
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Slot Jadwal</p>
              <h4 className="ui-modal-title">{editingBlock ? 'Ubah Slot' : 'Tambah Slot'}</h4>
            </div>
            <button
              onClick={() => resetForm(form.date, false)}
              className="border border-slate-200 p-2 text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Tutup form slot"
            >
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block md:col-span-2 xl:col-span-2">
              <span className="ui-label">Sensei</span>
              {permissions.role === 'Sensei' ? (
                <div className="flex h-10 items-center border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
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

            <label className="block">
              <span className="ui-label">Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm(prev => ({ ...prev, status: event.target.value as SenseiTimeBlockStatus }))}
                className="ui-input"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2 xl:col-span-3">
              <span className="ui-label">Catatan</span>
              <textarea
                value={form.note}
                onChange={(event) => setForm(prev => ({ ...prev, note: event.target.value }))}
                rows={2}
                className="ui-textarea resize-none"
                placeholder="Opsional"
              />
            </label>

            <button
              onClick={saveBlock}
              className="ui-btn-primary self-end"
            >
              {editingBlock ? 'Simpan Perubahan' : 'Tambah Slot'}
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
            const summary = summarizeBlocks(blocks);
            const previewBlocks = blocks.slice(0, 3);

            return (
              <div key={dateKey} className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => resetForm(dateKey, true)}
                  className="w-full border-b border-slate-200 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{DAY_LABELS[day.getDay()]}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{format(day, 'dd MMM yyyy')}</p>
                </button>

                <div className="space-y-2 p-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <SummaryPill label="Cakap" value={summary.cakap} tone="violet" />
                    <SummaryPill label="Pribadi" value={summary.personal} tone="slate" />
                    <SummaryPill label="Off" value={summary.off} tone="rose" />
                    <SummaryPill label="ANS" value={bookings.length} tone="emerald" dim={!showAnsSchedules} />
                  </div>

                  {previewBlocks.map(block => (
                    <div key={block.id} className={`border px-2.5 py-2 ${statusStyle[block.status]}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="whitespace-nowrap text-[11px] font-black leading-tight">{block.startTime}-{block.endTime}</p>
                          {isAllSensei && <p className="mt-0.5 truncate text-[10px] font-black leading-tight">{block.senseiName}</p>}
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{statusLabel(block.status)}</p>
                        </div>
                        {!block.readOnly && (
                          <button
                            onClick={() => editBlock(block)}
                            className="border border-current/20 p-1 hover:bg-white/50"
                            aria-label="Ubah slot"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {bookings.length === 0 && blocks.length === 0 && (
                    <div className="border border-dashed border-slate-200 px-3 py-8 text-center text-xs font-bold text-slate-400 dark:border-slate-700">
                      Tidak ada blok
                    </div>
                  )}

                  {(blocks.length > previewBlocks.length || bookings.length > 0) && (
                    <button
                      onClick={() => setDayDetail({ dateKey, label: format(day, 'dd MMM yyyy'), blocks, bookings })}
                      className="w-full border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Detail Availability</p>
                  <h4 className="ui-modal-title">{dayDetail.label}</h4>
                </div>
                <button onClick={() => setDayDetail(null)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  <X size={18} />
                </button>
              </div>

              <div className="ui-modal-body">
                {dayDetail.blocks.length > 0 && (
                  <section>
                    <p className="ui-section-title">Blok Sensei</p>
                    <div className="space-y-2">
                      {dayDetail.blocks.map(block => (
                        <div key={block.id} className={`border px-3 py-2 ${statusStyle[block.status]}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-black">{block.startTime}-{block.endTime}</p>
                              {isAllSensei && <p className="truncate text-[11px] font-black">{block.senseiName}</p>}
                              <p className="text-[10px] font-black uppercase tracking-widest">{statusLabel(block.status)}</p>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest opacity-60">{block.source}</p>
                              {block.note && <p className="mt-1 text-[11px] font-semibold opacity-80">{block.note}</p>}
                            </div>
                            {block.readOnly ? (
                              <span className="shrink-0 border border-current/20 px-2 py-1 text-[9px] font-black uppercase tracking-widest opacity-70">
                                Sync
                              </span>
                            ) : (
                              <div className="flex shrink-0 gap-1">
                                <button
                                  onClick={() => {
                                    setDayDetail(null);
                                    editBlock(block);
                                  }}
                                  className="border border-current/20 p-1 hover:bg-white/50"
                                  aria-label="Ubah slot"
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
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {showAnsSchedules && dayDetail.bookings.length > 0 && (
                  <section>
                    <p className="ui-section-title">Jadwal ANS</p>
                    <div className="space-y-2">
                      {dayDetail.bookings.map(schedule => (
                        <div key={schedule.id} className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black">{schedule.startTime}-{schedule.endTime}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">ANS</span>
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

const SummaryPill = ({
  label,
  value,
  tone,
  dim = false
}: {
  label: string;
  value: number;
  tone: 'violet' | 'slate' | 'rose' | 'emerald';
  dim?: boolean;
}) => {
  const toneClass = {
    violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200',
    slate: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
  }[tone];

  return (
    <div className={`border px-2 py-1.5 ${toneClass} ${dim ? 'opacity-50' : ''}`}>
      <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-base font-black leading-none">{value}</p>
    </div>
  );
};
