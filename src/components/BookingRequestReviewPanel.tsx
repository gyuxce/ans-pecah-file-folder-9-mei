import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

import type { BookingRequest } from '../types';
import { useAppContext } from '../context/AppContext';
import { reviewBookingRequest } from '../services/bookingService';

type ReviewTarget = {
  item: BookingRequest;
  decision: 'approve' | 'reject';
};

export const BookingRequestReviewPanel = ({ onCountChange }: { onCountChange: (count: number) => void }) => {
  const { supabase, studentList, senseiList } = useAppContext(state => ({
    supabase: state.supabase,
    studentList: state.studentList,
    senseiList: state.senseiList
  }));
  const [items, setItems] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const students = useMemo(() => new Map(studentList.map(item => [item.id, item.name])), [studentList]);
  const senseis = useMemo(() => new Map(senseiList.map(item => [item.id, item.name])), [senseiList]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('status', 'pending')
      .order('requested_date')
      .order('start_time');
    if (error) toast.error(`Gagal memuat booking: ${error.message}`);
    const mapped = (data || []).map((row: any): BookingRequest => ({
      id: row.id,
      studentId: row.student_id,
      senseiId: row.sensei_id,
      availabilityId: row.availability_id,
      date: row.requested_date,
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
      classType: row.class_type,
      level: row.level,
      note: row.note,
      status: row.status,
      createdAt: row.created_at
    }));
    setItems(mapped);
    onCountChange(mapped.length);
    setLoading(false);
  }, [onCountChange, supabase]);

  useEffect(() => { void load(); }, [load]);

  const openReview = (item: BookingRequest, decision: 'approve' | 'reject') => {
    setReviewTarget({ item, decision });
    setReviewNote('');
  };

  const closeReview = () => {
    if (processingId) return;
    setReviewTarget(null);
    setReviewNote('');
  };

  const confirmReview = async () => {
    if (!reviewTarget) return;
    const { item, decision } = reviewTarget;
    if (decision === 'reject' && !reviewNote.trim()) {
      toast.error('Tuliskan alasan penolakan agar siswa mengetahui penyebabnya.');
      return;
    }
    setProcessingId(item.id);
    try {
      const result = await reviewBookingRequest(supabase, item.id, decision, reviewNote.trim());
      if (!result.success) throw new Error(result.message);
      toast.success(result.message);
      setReviewTarget(null);
      setReviewNote('');
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
        <div>
          <p className="text-xs font-semibold text-indigo-600">Booking Siswa</p>
          <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">Menunggu Persetujuan</h3>
        </div>
        <button type="button" onClick={load} className="ui-btn-secondary h-9 px-2.5" title="Muat ulang">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex min-h-36 items-center justify-center text-sm text-slate-400"><Loader2 size={16} className="mr-2 animate-spin" /> Memuat booking...</div>
      ) : items.length === 0 ? (
        <div className="min-h-36 p-8 text-center text-sm text-slate-400">Tidak ada booking siswa yang menunggu.</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map(item => (
            <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_1fr_190px_auto] lg:items-center">
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{students.get(item.studentId) || 'Siswa'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.level || 'Level belum ditentukan'} / {item.classType || 'Private'}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{senseis.get(item.senseiId) || 'Sensei'}</p>
                <p className="mt-1 text-xs text-slate-500">{item.note || 'Tanpa catatan'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(item.date), 'dd MMM yyyy', { locale: idLocale })}</p>
                <p className="mt-1 text-xs font-semibold text-indigo-600">{item.startTime}-{item.endTime}</p>
              </div>
              <div className="flex gap-2 lg:justify-end">
                <button type="button" onClick={() => openReview(item, 'reject')} disabled={processingId === item.id} className="ui-btn-secondary"><X size={14} /> Tolak</button>
                <button type="button" onClick={() => openReview(item, 'approve')} disabled={processingId === item.id} className="ui-btn-primary"><Check size={14} /> Setujui</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reviewTarget && (
        <div className="ui-modal-overlay">
          <button className="absolute inset-0 cursor-default" onClick={closeReview} aria-label="Tutup konfirmasi booking" />
          <div className="ui-modal-panel relative max-w-xl">
            <div className="ui-modal-header">
              <div>
                <p className="text-xs font-semibold text-indigo-600">Keputusan Booking</p>
                <h4 className="ui-modal-title">{reviewTarget.decision === 'approve' ? 'Setujui Jadwal Siswa' : 'Tolak Permintaan'}</h4>
              </div>
              <button type="button" onClick={closeReview} className="ui-btn-secondary h-10 px-3"><X size={18} /></button>
            </div>
            <div className="ui-modal-body space-y-4">
              <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950">
                <div><p className="ui-label">Siswa</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{students.get(reviewTarget.item.studentId) || 'Siswa'}</p></div>
                <div><p className="ui-label">Sensei</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{senseis.get(reviewTarget.item.senseiId) || 'Sensei'}</p></div>
                <div><p className="ui-label">Tanggal</p><p className="text-sm font-semibold text-slate-900 dark:text-white">{format(parseISO(reviewTarget.item.date), 'dd MMMM yyyy', { locale: idLocale })}</p></div>
                <div><p className="ui-label">Jam</p><p className="text-sm font-semibold text-indigo-600">{reviewTarget.item.startTime}-{reviewTarget.item.endTime}</p></div>
              </div>
              {reviewTarget.item.note && <div><p className="ui-label">Catatan Siswa</p><p className="text-sm text-slate-600 dark:text-slate-300">{reviewTarget.item.note}</p></div>}
              <label className="block">
                <span className="ui-label">{reviewTarget.decision === 'reject' ? 'Alasan Penolakan' : 'Catatan untuk Siswa'}</span>
                <textarea value={reviewNote} onChange={event => setReviewNote(event.target.value)} rows={3} className="ui-textarea" placeholder={reviewTarget.decision === 'reject' ? 'Wajib diisi, misalnya jadwal perlu disesuaikan' : 'Opsional'} />
              </label>
              <p className="text-xs text-slate-500">{reviewTarget.decision === 'approve' ? 'Sistem akan mengecek bentrok sekali lagi. Jika aman, jadwal ANS dibuat otomatis dan langsung muncul di akun siswa serta sensei.' : 'Slot akan tersedia kembali dan siswa dapat memilih jadwal lain.'}</p>
            </div>
            <div className="ui-modal-footer">
              <button type="button" onClick={closeReview} disabled={Boolean(processingId)} className="ui-btn-secondary">Batal</button>
              <button type="button" onClick={confirmReview} disabled={Boolean(processingId)} className={reviewTarget.decision === 'approve' ? 'ui-btn-primary' : 'ui-btn-danger'}>
                {processingId ? <Loader2 size={15} className="animate-spin" /> : reviewTarget.decision === 'approve' ? <Check size={15} /> : <X size={15} />}
                {reviewTarget.decision === 'approve' ? 'Setujui & Buat Jadwal' : 'Tolak Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
