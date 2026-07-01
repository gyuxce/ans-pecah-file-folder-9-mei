import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { BookOpen, CalendarDays, CheckCircle2, Clock3, ExternalLink, Loader2, XCircle } from 'lucide-react';

import type { BookingRequest, BookingRequestStatus } from '../types';
import { useAppContext } from '../context/AppContext';

const requestStyle: Record<BookingRequestStatus, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-500'
};

const requestLabel: Record<BookingRequestStatus, string> = {
  pending: 'Menunggu admin',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan'
};

const requestIcon = (status: BookingRequestStatus) => {
  if (status === 'approved') return <CheckCircle2 size={15} />;
  if (status === 'rejected' || status === 'cancelled') return <XCircle size={15} />;
  return <Clock3 size={15} />;
};

export const StudentClassesView = () => {
  const { currentStudent, schedules, trackers, senseiList, supabase } = useAppContext(state => ({
    currentStudent: state.currentStudent,
    schedules: state.scopedSchedules,
    trackers: state.scopedLessonTrackers,
    senseiList: state.senseiList,
    supabase: state.supabase
  }));
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const senseiName = useMemo(() => new Map(senseiList.map(item => [item.id, item.name])), [senseiList]);

  useEffect(() => {
    if (!currentStudent?.id) return;
    setLoadingRequests(true);
    void supabase
      .from('booking_requests')
      .select('*')
      .eq('student_id', currentStudent.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRequests((data || []).map((row: any) => ({
          id: row.id,
          studentId: row.student_id,
          senseiId: row.sensei_id,
          availabilityId: row.availability_id,
          scheduleId: row.schedule_id,
          date: row.requested_date,
          startTime: String(row.start_time).slice(0, 5),
          endTime: String(row.end_time).slice(0, 5),
          classType: row.class_type,
          level: row.level,
          note: row.note,
          status: row.status,
          reviewNote: row.review_note,
          reviewedAt: row.reviewed_at,
          createdAt: row.created_at
        })));
        setLoadingRequests(false);
      });
  }, [currentStudent?.id, supabase]);

  if (!currentStudent) return <div className="ui-panel p-8 text-center text-sm text-slate-500">Akun belum terhubung ke data siswa.</div>;

  const resources = [
    ['Google Classroom', currentStudent.classroom_link],
    ['Google Chat', currentStudent.chat_link],
    ['Progress Belajar', currentStudent.progress_link],
    ['Kurikulum', currentStudent.curriculum_link]
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="ui-page">
      <section className="ui-panel">
        <div className="ui-panel-body">
          <div className="flex items-center gap-2"><CalendarDays size={17} className="text-indigo-600" /><h3 className="text-base font-bold text-slate-950 dark:text-white">Jadwal Aktif</h3></div>
          {schedules.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Belum ada jadwal yang disetujui.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {[...schedules].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)).map(schedule => (
                <div key={schedule.id} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-center">
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(schedule.date), 'dd MMM yyyy', { locale: idLocale })}</p><p className="text-xs font-semibold text-indigo-600">{schedule.startTime}-{schedule.endTime}</p></div>
                  <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{senseiName.get(schedule.senseiId) || 'Sensei'}</p><p className="text-xs text-slate-500">{schedule.level || 'Level belum ditentukan'} / {schedule.type}</p></div>
                  <span className="w-fit rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Terjadwal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-panel">
          <div className="ui-panel-body">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">Status Booking</h3>
              {requests.some(request => request.status === 'pending') && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{requests.filter(request => request.status === 'pending').length} menunggu</span>}
            </div>
            {loadingRequests ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-400"><Loader2 size={15} className="animate-spin" /> Memuat status booking...</div>
            ) : requests.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Belum ada permintaan booking.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {requests.map(request => (
                  <div key={request.id} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{format(parseISO(request.date), 'dd MMM yyyy', { locale: idLocale })} / {request.startTime}-{request.endTime}</p>
                        <p className="mt-1 text-xs text-slate-500">{senseiName.get(request.senseiId) || 'Sensei'}</p>
                      </div>
                      <span className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ${requestStyle[request.status]}`}>{requestIcon(request.status)} {requestLabel[request.status]}</span>
                    </div>
                    {request.reviewNote && (
                      <div className={`mt-3 rounded-md px-3 py-2 text-xs ${request.status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300'}`}>
                        <span className="font-semibold">Catatan admin:</span> {request.reviewNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ui-panel">
          <div className="ui-panel-body">
            <h3 className="text-base font-bold text-slate-950 dark:text-white">Link Belajar</h3>
            {resources.length === 0 ? <p className="mt-4 text-sm text-slate-400">Admin belum menambahkan link belajar.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{resources.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200"><span>{label}</span><ExternalLink size={14} /></a>)}</div>}
          </div>
        </div>
      </section>

      <section className="ui-panel">
        <div className="ui-panel-body">
          <div className="flex items-center gap-2"><BookOpen size={17} className="text-emerald-600" /><h3 className="text-base font-bold text-slate-950 dark:text-white">Riwayat Progress</h3></div>
          {trackers.length === 0 ? <p className="mt-4 text-sm text-slate-400">Belum ada laporan belajar.</p> : <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{[...trackers].sort((a, b) => b.date.localeCompare(a.date)).map(tracker => <div key={tracker.id} className="grid gap-2 py-3 sm:grid-cols-[130px_80px_1fr]"><p className="text-sm font-semibold">{format(parseISO(tracker.date), 'dd MMM yyyy', { locale: idLocale })}</p><p className="text-lg font-bold text-indigo-600">{tracker.score}</p><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tracker.material || 'Materi belum dicatat'}</p><p className="mt-1 text-xs text-slate-500">{tracker.attendance}{tracker.studentFeedback ? ` / ${tracker.studentFeedback}` : ''}</p></div></div>)}</div>}
        </div>
      </section>
    </div>
  );
};
