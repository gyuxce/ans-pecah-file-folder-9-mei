import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import type { BookingRequest } from '../types';
import { useAppContext } from '../context/AppContext';
import { reviewBookingRequest } from '../services/bookingService';

export const BookingRequestReviewPanel = ({ onCountChange }: { onCountChange: (count: number) => void }) => {
  const { supabase, studentList, senseiList } = useAppContext(state => ({ supabase: state.supabase, studentList: state.studentList, senseiList: state.senseiList }));
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const students = useMemo(() => new Map(studentList.map(item => [item.id, item.name])), [studentList]);
  const senseis = useMemo(() => new Map(senseiList.map(item => [item.id, item.name])), [senseiList]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('booking_requests').select('*').eq('status', 'pending').order('requested_date').order('start_time');
    if (error) toast.error(`Gagal memuat booking: ${error.message}`);
    const mapped = (data || []).map((row: any): BookingRequest => ({ id: row.id, studentId: row.student_id, senseiId: row.sensei_id, availabilityId: row.availability_id, date: row.requested_date, startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5), classType: row.class_type, level: row.level, note: row.note, status: row.status, createdAt: row.created_at }));
    setItems(mapped);
    onCountChange(mapped.length);
    setLoading(false);
  }, [onCountChange, supabase]);

  useEffect(() => { void load(); }, [load]);

  const review = async (item: BookingRequest, decision: 'approve' | 'reject') => {
    setProcessingId(item.id);
    try {
      const result = await reviewBookingRequest(supabase, item.id, decision);
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      await load();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="ui-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div><p className="text-xs font-semibold text-indigo-600">Booking Siswa</p><h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">Menunggu Persetujuan</h3></div>
        <button onClick={load} className="ui-btn-secondary h-9 px-2.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
      </div>
      {loading && items.length === 0 ? <div className="flex min-h-36 items-center justify-center text-sm text-slate-400"><Loader2 size={16} className="mr-2 animate-spin" /> Memuat booking...</div> : items.length === 0 ? <div className="min-h-36 p-8 text-center text-sm text-slate-400">Tidak ada booking siswa yang menunggu.</div> : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{items.map(item => <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_190px_auto] lg:items-center"><div><p className="text-sm font-bold text-slate-900 dark:text-white">{students.get(item.studentId) || 'Siswa'}</p><p className="mt-1 text-xs text-slate-500">{item.level || 'Level belum ditentukan'} · {item.classType || 'Private'}</p></div><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{senseis.get(item.senseiId) || 'Sensei'}</p><p className="mt-1 text-xs text-slate-500">{item.note || 'Tanpa catatan'}</p></div><div><p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(item.date), 'dd MMM yyyy')}</p><p className="mt-1 text-xs font-semibold text-indigo-600">{item.startTime}-{item.endTime}</p></div><div className="flex gap-2 lg:justify-end"><button onClick={() => review(item, 'reject')} disabled={processingId === item.id} className="ui-btn-secondary"><X size={14} /> Tolak</button><button onClick={() => review(item, 'approve')} disabled={processingId === item.id} className="ui-btn-primary">{processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Setujui</button></div></div>)}</div>
      )}
    </section>
  );
};
