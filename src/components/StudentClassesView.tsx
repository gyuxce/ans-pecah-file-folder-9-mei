import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { BookOpen, CalendarDays, ExternalLink } from 'lucide-react';

import type { BookingRequest } from '../types';
import { useAppContext } from '../context/AppContext';

const requestStyle: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  cancelled: 'border-slate-200 bg-slate-50 text-slate-500'
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
  const senseiName = useMemo(() => new Map(senseiList.map(item => [item.id, item.name])), [senseiList]);

  useEffect(() => {
    if (!currentStudent?.id) return;
    void supabase.from('booking_requests').select('*').eq('student_id', currentStudent.id).order('created_at', { ascending: false }).then(({ data }) => {
      setRequests((data || []).map((row: any) => ({ id: row.id, studentId: row.student_id, senseiId: row.sensei_id, availabilityId: row.availability_id, scheduleId: row.schedule_id, date: row.requested_date, startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5), classType: row.class_type, level: row.level, note: row.note, status: row.status, reviewNote: row.review_note, createdAt: row.created_at })));
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
          {schedules.length === 0 ? <p className="mt-4 text-sm text-slate-400">Belum ada jadwal yang disetujui.</p> : (
            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {[...schedules].sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)).map(schedule => (
                <div key={schedule.id} className="grid gap-2 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-center">
                  <div><p className="text-sm font-bold text-slate-900 dark:text-white">{format(parseISO(schedule.date), 'dd MMM yyyy')}</p><p className="text-xs font-semibold text-indigo-600">{schedule.startTime}-{schedule.endTime}</p></div>
                  <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{senseiName.get(schedule.senseiId) || 'Sensei'}</p><p className="text-xs text-slate-500">{schedule.level || 'Level belum ditentukan'} · {schedule.type}</p></div>
                  <span className="w-fit rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Terjadwal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-panel"><div className="ui-panel-body"><h3 className="text-base font-bold text-slate-950 dark:text-white">Permintaan Booking</h3>{requests.length === 0 ? <p className="mt-4 text-sm text-slate-400">Belum ada permintaan booking.</p> : <div className="mt-3 space-y-2">{requests.map(request => <div key={request.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3 dark:border-slate-800"><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{format(parseISO(request.date), 'dd MMM yyyy')} · {request.startTime}-{request.endTime}</p><p className="mt-1 text-xs text-slate-500">{senseiName.get(request.senseiId) || 'Sensei'}</p></div><span className={`rounded border px-2 py-1 text-[11px] font-semibold ${requestStyle[request.status]}`}>{request.status === 'pending' ? 'Menunggu' : request.status === 'approved' ? 'Disetujui' : request.status === 'rejected' ? 'Ditolak' : 'Dibatalkan'}</span></div>)}</div>}</div></div>
        <div className="ui-panel"><div className="ui-panel-body"><h3 className="text-base font-bold text-slate-950 dark:text-white">Link Belajar</h3>{resources.length === 0 ? <p className="mt-4 text-sm text-slate-400">Admin belum menambahkan link belajar.</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{resources.map(([label, url]) => <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200"><span>{label}</span><ExternalLink size={14} /></a>)}</div>}</div></div>
      </section>

      <section className="ui-panel"><div className="ui-panel-body"><div className="flex items-center gap-2"><BookOpen size={17} className="text-emerald-600" /><h3 className="text-base font-bold text-slate-950 dark:text-white">Riwayat Progress</h3></div>{trackers.length === 0 ? <p className="mt-4 text-sm text-slate-400">Belum ada laporan belajar.</p> : <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{[...trackers].sort((a, b) => b.date.localeCompare(a.date)).map(tracker => <div key={tracker.id} className="grid gap-2 py-3 sm:grid-cols-[130px_80px_1fr]"><p className="text-sm font-semibold">{format(parseISO(tracker.date), 'dd MMM yyyy')}</p><p className="text-lg font-bold text-indigo-600">{tracker.score}</p><div><p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tracker.material || 'Materi belum dicatat'}</p><p className="mt-1 text-xs text-slate-500">{tracker.attendance}{tracker.studentFeedback ? ` · ${tracker.studentFeedback}` : ''}</p></div></div>)}</div>}</div></section>
    </div>
  );
};
