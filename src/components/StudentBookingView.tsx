import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AlertCircle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import { findBookingConflicts, submitBookingRequest } from '../services/bookingService';

type AvailableSlot = {
  availability_id: string;
  sensei_id: string;
  sensei_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
};

export const StudentBookingView = () => {
  const { currentStudent, supabase } = useAppContext(state => ({ currentStudent: state.currentStudent, supabase: state.supabase }));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [senseiFilter, setSenseiFilter] = useState('all');
  const [rangeStart, setRangeStart] = useState(() => new Date());
  const [selected, setSelected] = useState<AvailableSlot | null>(null);
  const [note, setNote] = useState('');
  const startDate = format(rangeStart, 'yyyy-MM-dd');
  const endDate = format(addDays(rangeStart, 13), 'yyyy-MM-dd');
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  const canGoPrevious = startDate > todayDate;

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const { data, error } = await supabase.rpc('get_available_booking_slots', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_sensei_id: null
    });
    if (error) {
      setLoadError(error.message);
      toast.error(`Gagal memuat jadwal: ${error.message}`);
    }
    setSlots((data || [])
      .map((item: any) => ({ ...item, start_time: String(item.start_time).slice(0, 5), end_time: String(item.end_time).slice(0, 5) }))
      .sort((a: AvailableSlot, b: AvailableSlot) => `${a.slot_date}${a.start_time}${a.sensei_name}`.localeCompare(`${b.slot_date}${b.start_time}${b.sensei_name}`)));
    setLoading(false);
  }, [endDate, startDate, supabase]);

  useEffect(() => { void loadSlots(); }, [loadSlots]);

  const senseiOptions = useMemo(() => {
    const map = new Map(slots.map(slot => [slot.sensei_id, slot.sensei_name]));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [slots]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    slots
      .filter(slot => senseiFilter === 'all' || slot.sensei_id === senseiFilter)
      .forEach(slot => map.set(slot.slot_date, [...(map.get(slot.slot_date) || []), slot]));
    return [...map.entries()];
  }, [senseiFilter, slots]);

  const visibleSlotCount = useMemo(
    () => grouped.reduce((total, [, dateSlots]) => total + dateSlots.length, 0),
    [grouped]
  );

  const submit = async () => {
    if (!currentStudent || !selected) return;
    setSaving(true);
    try {
      const conflicts = await findBookingConflicts(supabase, {
        studentId: currentStudent.id,
        senseiId: selected.sensei_id,
        date: selected.slot_date,
        startTime: selected.start_time,
        endTime: selected.end_time
      });
      if (conflicts.length > 0) {
        throw new Error(conflicts[0]?.conflict_message || 'Jam ini baru saja terisi. Silakan pilih jam lain.');
      }
      const result = await submitBookingRequest(supabase, {
        studentId: currentStudent.id,
        senseiId: selected.sensei_id,
        availabilityId: selected.availability_id,
        date: selected.slot_date,
        startTime: selected.start_time,
        endTime: selected.end_time,
        classType: currentStudent.type || 'Private',
        level: currentStudent.level_sekarang || currentStudent.level,
        note
      });
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      setSelected(null);
      setNote('');
      await loadSlots();
    } catch (error: any) {
      toast.error(error.message);
      setSelected(null);
      await loadSlots();
    } finally {
      setSaving(false);
    }
  };

  if (!currentStudent) return <div className="ui-panel p-8 text-center text-sm text-slate-500">Akun belum terhubung ke data siswa.</div>;

  return (
    <div className="ui-page">
      <section className="ui-panel">
        <div className="ui-panel-body flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Pilih Jam Kelas</h3>
            <p className="mt-1 text-sm text-slate-500">Slot berikut diambil dari Jam Bisa Mengajar sensei dan otomatis dikurangi jadwal yang sudah terisi.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRangeStart(previous => {
                  const candidate = addDays(previous, -14);
                  return format(candidate, 'yyyy-MM-dd') < todayDate ? new Date() : candidate;
                })}
                disabled={!canGoPrevious}
                className="ui-btn-secondary h-10 px-3 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Dua minggu sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button type="button" onClick={() => setRangeStart(new Date())} className="ui-btn-secondary h-10 min-w-40 px-3 text-xs">
                {format(rangeStart, 'dd MMM', { locale: idLocale })} - {format(addDays(rangeStart, 13), 'dd MMM yyyy', { locale: idLocale })}
              </button>
              <button type="button" onClick={() => setRangeStart(previous => addDays(previous, 14))} className="ui-btn-secondary h-10 px-3" aria-label="Dua minggu berikutnya"><ChevronRight size={16} /></button>
            </div>
            <label className="relative block w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={senseiFilter} onChange={event => setSenseiFilter(event.target.value)} className="ui-input pl-9">
                <option value="all">Semua Sensei</option>
                {senseiOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => void loadSlots()} disabled={loading} className="ui-btn-secondary h-10 px-3" title="Muat ulang slot"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>
      </section>

      {!loading && !loadError && slots.length > 0 && (
        <div className="flex items-center justify-between px-1 text-xs text-slate-500">
          <span>{senseiFilter === 'all' ? 'Semua sensei' : senseiOptions.find(([id]) => id === senseiFilter)?.[1]}</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{visibleSlotCount} jam tersedia</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={18} className="animate-spin" /> Memeriksa slot kosong...</div>
      ) : loadError ? (
        <div className="ui-panel p-10 text-center"><AlertCircle size={28} className="mx-auto text-rose-400" /><p className="mt-3 text-sm font-semibold text-slate-700">Jadwal belum dapat dimuat.</p><button type="button" onClick={() => void loadSlots()} className="ui-btn-secondary mx-auto mt-4"><RefreshCw size={14} /> Coba Lagi</button></div>
      ) : grouped.length === 0 ? (
        <div className="ui-panel p-10 text-center"><CalendarDays size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Belum ada jam tersedia.</p><p className="mt-1 text-xs text-slate-400">Coba lagi setelah sensei membuka jam mengajar.</p></div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, dateSlots]) => (
            <section key={date} className="ui-panel overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dateSlots.map(slot => (
                  <button key={`${slot.availability_id}-${slot.slot_date}-${slot.start_time}`} onClick={() => setSelected(slot)} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30"><Clock3 size={16} /></span>
                      <div><p className="text-sm font-bold text-slate-900 dark:text-white">{slot.start_time}-{slot.end_time}</p><p className="mt-0.5 text-xs text-slate-500">{slot.sensei_name} / {slot.slot_duration_minutes} menit</p></div>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600">Pilih</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <div className="ui-modal-overlay">
          <button className="absolute inset-0 cursor-default" onClick={() => setSelected(null)} aria-label="Tutup konfirmasi" />
          <div className="ui-modal-panel relative max-w-lg">
            <div className="ui-modal-header"><div><p className="text-xs font-semibold text-indigo-600">Konfirmasi Booking</p><h4 className="ui-modal-title">Ajukan Jadwal Ini</h4></div><button onClick={() => setSelected(null)} className="ui-btn-secondary h-10 px-3"><X size={18} /></button></div>
            <div className="ui-modal-body space-y-4">
              <div className="rounded-md bg-slate-50 p-4 dark:bg-slate-950"><p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(selected.slot_date), 'EEEE, dd MMMM yyyy', { locale: idLocale })}</p><p className="mt-2 text-xl font-semibold text-indigo-600">{selected.start_time}-{selected.end_time}</p><p className="mt-1 text-sm text-slate-500">{selected.sensei_name}</p></div>
              <label className="block"><span className="ui-label">Catatan untuk Admin</span><textarea value={note} onChange={event => setNote(event.target.value)} className="ui-textarea" rows={3} placeholder="Opsional, misalnya kebutuhan atau materi khusus" /></label>
              <p className="text-xs text-slate-500">Jadwal belum aktif sampai admin menyetujuinya.</p>
            </div>
            <div className="ui-modal-footer"><button onClick={() => setSelected(null)} className="ui-btn-secondary">Batal</button><button onClick={submit} disabled={saving} className="ui-btn-primary disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Kirim Booking</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
