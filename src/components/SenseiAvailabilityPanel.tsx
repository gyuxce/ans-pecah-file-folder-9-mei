import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addMonths, format, parseISO } from 'date-fns';
import { CalendarPlus, Clock3, Edit2, Loader2, Pause, Play, Plus, Repeat2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import type { AvailabilityPattern, SenseiAvailability } from '../types';

const DAY_OPTIONS = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Minggu' }
];

const toAvailability = (row: any): SenseiAvailability => ({
  id: row.id,
  senseiId: row.sensei_id,
  pattern: row.pattern,
  date: row.availability_date,
  weekday: row.weekday,
  validFrom: row.valid_from,
  validUntil: row.valid_until,
  startTime: String(row.start_time || '').slice(0, 5),
  endTime: String(row.end_time || '').slice(0, 5),
  slotDurationMinutes: Number(row.slot_duration_minutes || 60),
  isActive: row.is_active !== false,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

interface Props {
  senseiId: string;
  supabase: SupabaseClient;
}

export const SenseiAvailabilityPanel = ({ senseiId, supabase }: Props) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [items, setItems] = useState<SenseiAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    pattern: 'specific_date' as AvailabilityPattern,
    date: today,
    weekday: 1,
    validFrom: today,
    validUntil: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    slotDurationMinutes: 60
  });

  const loadAvailability = useCallback(async () => {
    if (!senseiId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('sensei_availability')
      .select('*')
      .eq('sensei_id', senseiId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(`Gagal memuat jam mengajar: ${error.message}`);
    } else {
      setItems((data || []).map(toAvailability));
    }
    setLoading(false);
  }, [senseiId, supabase]);

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  const activeItems = useMemo(() => items.filter(item => item.isActive), [items]);

  const resetAndClose = () => {
    setIsOpen(false);
    setEditingId(null);
    setForm(previous => ({
      ...previous,
      date: today,
      validFrom: today,
      validUntil: format(addMonths(new Date(), 3), 'yyyy-MM-dd')
    }));
  };

  const openCreateForm = () => {
    setEditingId(null);
    setForm(previous => ({
      ...previous,
      pattern: 'specific_date',
      date: today,
      validFrom: today,
      validUntil: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '10:00',
      slotDurationMinutes: 60
    }));
    setIsOpen(true);
  };

  const openEditForm = (item: SenseiAvailability) => {
    setEditingId(item.id);
    setForm({
      pattern: item.pattern,
      date: item.date || today,
      weekday: item.weekday ?? 1,
      validFrom: item.validFrom || today,
      validUntil: item.validUntil || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      startTime: item.startTime,
      endTime: item.endTime,
      slotDurationMinutes: item.slotDurationMinutes
    });
    setIsOpen(true);
  };

  const saveAvailability = async () => {
    if (form.startTime >= form.endTime) {
      toast.error('Jam selesai harus setelah jam mulai.');
      return;
    }
    if (form.pattern === 'specific_date' && !form.date) {
      toast.error('Tanggal wajib dipilih.');
      return;
    }
    if (form.pattern === 'weekly' && (!form.validFrom || !form.validUntil || form.validUntil < form.validFrom)) {
      toast.error('Rentang jadwal mingguan belum benar.');
      return;
    }

    const overlapsExisting = items.some(item => (
      item.id !== editingId
      && item.isActive
      && item.pattern === form.pattern
      && item.startTime < form.endTime
      && item.endTime > form.startTime
      && (form.pattern === 'specific_date'
        ? item.date === form.date
        : item.weekday === form.weekday
          && (item.validFrom || today) <= form.validUntil
          && (item.validUntil || form.validUntil) >= form.validFrom)
    ));
    if (overlapsExisting) {
      toast.error('Jam ini bertumpuk dengan jam bisa mengajar yang sudah ada. Ubah jam atau edit jadwal sebelumnya.');
      return;
    }

    setSaving(true);
    const payload = {
      sensei_id: senseiId,
      pattern: form.pattern,
      availability_date: form.pattern === 'specific_date' ? form.date : null,
      weekday: form.pattern === 'weekly' ? form.weekday : null,
      valid_from: form.pattern === 'weekly' ? form.validFrom : null,
      valid_until: form.pattern === 'weekly' ? form.validUntil : null,
      start_time: form.startTime,
      end_time: form.endTime,
      slot_duration_minutes: form.slotDurationMinutes,
      is_active: true
    };
    const query = editingId
      ? supabase.from('sensei_availability').update(payload).eq('id', editingId).eq('sensei_id', senseiId)
      : supabase.from('sensei_availability').insert(payload);
    const { error } = await query;
    setSaving(false);

    if (error) {
      toast.error(`Gagal menyimpan jam mengajar: ${error.message}`);
      return;
    }
    toast.success(editingId ? 'Jam bisa mengajar berhasil diperbarui.' : 'Jam bisa mengajar berhasil ditambahkan.');
    resetAndClose();
    await loadAvailability();
  };

  const deleteAvailability = async (item: SenseiAvailability) => {
    if (!window.confirm(`Hapus jam bisa mengajar ${itemTitle(item)} pukul ${item.startTime}-${item.endTime}?`)) return;
    const { error } = await supabase
      .from('sensei_availability')
      .delete()
      .eq('id', item.id)
      .eq('sensei_id', senseiId);
    if (error) {
      toast.error(`Gagal menghapus jam mengajar: ${error.message}`);
      return;
    }
    toast.success('Jam bisa mengajar berhasil dihapus.');
    setItems(previous => previous.filter(value => value.id !== item.id));
  };

  const toggleAvailability = async (item: SenseiAvailability) => {
    const { error } = await supabase
      .from('sensei_availability')
      .update({ is_active: !item.isActive })
      .eq('id', item.id);
    if (error) {
      toast.error(`Gagal mengubah jam mengajar: ${error.message}`);
      return;
    }
    toast.success(item.isActive ? 'Jam mengajar dijeda.' : 'Jam mengajar diaktifkan kembali.');
    setItems(previous => previous.map(value => value.id === item.id ? { ...value, isActive: !value.isActive } : value));
  };

  const itemTitle = (item: SenseiAvailability) => {
    if (item.pattern === 'specific_date' && item.date) {
      return format(parseISO(item.date), 'dd MMM yyyy');
    }
    return DAY_OPTIONS.find(day => day.value === item.weekday)?.label || 'Mingguan';
  };

  const itemSubtitle = (item: SenseiAvailability) => {
    if (item.pattern === 'weekly' && item.validFrom && item.validUntil) {
      return `${format(parseISO(item.validFrom), 'dd MMM')} - ${format(parseISO(item.validUntil), 'dd MMM yyyy')}`;
    }
    return 'Tanggal tertentu';
  };

  return (
    <>
      <section className="ui-panel">
        <div className="ui-panel-body">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Clock3 size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-white">Jam Bisa Mengajar</p>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Tentukan jam yang boleh dipilih siswa. Kelas ANS, kelas Cakap, dan waktu tidak tersedia otomatis mengurangi slot ini.
                </p>
              </div>
            </div>
            <button type="button" onClick={openCreateForm} className="ui-btn-primary shrink-0">
              <Plus size={15} /> Tambah Jam
            </button>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            {loading ? (
              <div className="flex items-center gap-2 py-2 text-xs font-medium text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Memuat jam mengajar...
              </div>
            ) : items.length === 0 ? (
              <p className="py-2 text-xs font-medium text-slate-400">Belum ada jam yang dibuka untuk siswa.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {items.map(item => (
                  <div key={item.id} className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${
                    item.isActive
                      ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-950'
                  }`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {item.pattern === 'weekly' ? <Repeat2 size={13} className="text-emerald-600" /> : <CalendarPlus size={13} className="text-emerald-600" />}
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{itemTitle(item)}</p>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {item.startTime}-{item.endTime} / kelas {item.slotDurationMinutes} menit
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">{itemSubtitle(item)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => openEditForm(item)} className="ui-btn-secondary h-9 px-2.5" title="Ubah jam mengajar">
                        <Edit2 size={14} />
                      </button>
                      <button type="button" onClick={() => toggleAvailability(item)} className="ui-btn-secondary h-9 px-2.5" title={item.isActive ? 'Jeda jam mengajar' : 'Aktifkan jam mengajar'}>
                        {item.isActive ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <button type="button" onClick={() => deleteAvailability(item)} className="ui-btn-secondary h-9 px-2.5 text-rose-600" title="Hapus jam mengajar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && activeItems.length > 0 && (
              <p className="mt-3 text-[11px] font-medium text-slate-400">{activeItems.length} aturan jam mengajar aktif.</p>
            )}
          </div>
        </div>
      </section>

      {isOpen && (
        <div className="ui-modal-overlay">
          <button className="absolute inset-0 cursor-default" onClick={resetAndClose} aria-label="Tutup form jam mengajar" />
          <div className="ui-modal-panel relative max-w-2xl">
            <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
              <div>
                <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Ketersediaan ANS</p>
                <h4 className="ui-modal-title">{editingId ? 'Ubah Jam Bisa Mengajar' : 'Tambah Jam Bisa Mengajar'}</h4>
              </div>
              <button type="button" onClick={resetAndClose} className="ui-btn-secondary h-10 px-3" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="ui-modal-body space-y-4">
              <div>
                <span className="ui-label">Pola Jadwal</span>
                <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setForm(previous => ({ ...previous, pattern: 'specific_date' }))}
                    className={`h-10 rounded-md text-sm font-semibold ${form.pattern === 'specific_date' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}
                  >
                    Tanggal Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(previous => ({ ...previous, pattern: 'weekly' }))}
                    className={`h-10 rounded-md text-sm font-semibold ${form.pattern === 'weekly' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-950' : 'text-slate-500'}`}
                  >
                    Berulang Mingguan
                  </button>
                </div>
              </div>

              {form.pattern === 'specific_date' ? (
                <label className="block">
                  <span className="ui-label">Tanggal</span>
                  <input type="date" min={today} value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))} className="ui-input" />
                </label>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="ui-label">Setiap Hari</span>
                    <select value={form.weekday} onChange={event => setForm(previous => ({ ...previous, weekday: Number(event.target.value) }))} className="ui-input">
                      {DAY_OPTIONS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="ui-label">Berlaku Mulai</span>
                    <input type="date" min={today} value={form.validFrom} onChange={event => setForm(previous => ({ ...previous, validFrom: event.target.value, validUntil: previous.validUntil < event.target.value ? event.target.value : previous.validUntil }))} className="ui-input" />
                  </label>
                  <label className="block">
                    <span className="ui-label">Sampai</span>
                    <input type="date" min={form.validFrom} value={form.validUntil} onChange={event => setForm(previous => ({ ...previous, validUntil: event.target.value }))} className="ui-input" />
                  </label>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <label className="block">
                  <span className="ui-label">Jam Mulai</span>
                  <input type="time" value={form.startTime} onChange={event => setForm(previous => ({ ...previous, startTime: event.target.value }))} className="ui-input" />
                </label>
                <label className="block">
                  <span className="ui-label">Jam Selesai</span>
                  <input type="time" value={form.endTime} onChange={event => setForm(previous => ({ ...previous, endTime: event.target.value }))} className="ui-input" />
                </label>
                <label className="block">
                  <span className="ui-label">Durasi per Kelas</span>
                  <select value={form.slotDurationMinutes} onChange={event => setForm(previous => ({ ...previous, slotDurationMinutes: Number(event.target.value) }))} className="ui-input">
                    {[30, 45, 60, 90, 120].map(duration => <option key={duration} value={duration}>{duration} menit</option>)}
                  </select>
                </label>
              </div>

              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                Siswa hanya melihat jam yang masih kosong setelah kelas ANS, kelas Cakap, dan waktu tidak tersedia diperhitungkan.
              </p>
            </div>

            <div className="ui-modal-footer">
              <button type="button" onClick={resetAndClose} className="ui-btn-secondary">Batal</button>
              <button type="button" onClick={saveAvailability} disabled={saving} className="ui-btn-primary disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                {editingId ? 'Simpan Perubahan' : 'Simpan Jam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
