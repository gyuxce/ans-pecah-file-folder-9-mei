import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { BookOpen, CalendarCheck2, Clock3, Search } from 'lucide-react';

import { useAppContext } from '../context/AppContext';

export const StudentDashboard = () => {
  const { currentStudent, schedules, trackers, supabase, setActiveTab } = useAppContext(state => ({
    currentStudent: state.currentStudent,
    schedules: state.scopedSchedules,
    trackers: state.scopedLessonTrackers,
    supabase: state.supabase,
    setActiveTab: state.setActiveTab
  }));
  const [pendingCount, setPendingCount] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!currentStudent?.id) return;
    void supabase
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', currentStudent.id)
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count || 0));
  }, [currentStudent?.id, supabase]);

  const upcoming = useMemo(() => schedules
    .filter(schedule => schedule.status === 'active' && schedule.date >= today)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), [schedules, today]);
  const latestTracker = useMemo(() => [...trackers].sort((a, b) => b.date.localeCompare(a.date))[0], [trackers]);

  if (!currentStudent) {
    return (
      <div className="ui-panel p-8 text-center">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Akun siswa belum terhubung</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Minta admin mengisi email akun ini pada Data Siswa atau menghubungkan profile ID.</p>
      </div>
    );
  }

  return (
    <div className="ui-page">
      <section className="ui-panel">
        <div className="ui-panel-body flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Halo, {currentStudent.name}</p>
            <h3 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Belajar berikutnya sudah siap?</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setActiveTab('student-booking')} className="ui-btn-primary"><Search size={15} /> Cari Jadwal</button>
            <button onClick={() => setActiveTab('student-classes')} className="ui-btn-secondary"><BookOpen size={15} /> Kelas Saya</button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-indigo-100 bg-indigo-50/70 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
          <CalendarCheck2 size={17} className="text-indigo-600" />
          <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{upcoming.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Kelas mendatang</p>
        </div>
        <div className="rounded-md border border-amber-100 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <Clock3 size={17} className="text-amber-600" />
          <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{pendingCount}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Booking menunggu admin</p>
        </div>
        <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <BookOpen size={17} className="text-emerald-600" />
          <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{trackers.length}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">Laporan belajar</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="ui-panel">
          <div className="ui-panel-body">
            <p className="ui-section-title">Kelas Berikutnya</p>
            {upcoming[0] ? (
              <div className="mt-3 flex flex-col gap-3 border-l-2 border-indigo-500 pl-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-950 dark:text-white">{format(parseISO(upcoming[0].date), 'dd MMMM yyyy')}</p>
                  <p className="mt-1 text-lg font-semibold text-indigo-600">{upcoming[0].startTime}-{upcoming[0].endTime}</p>
                  <p className="mt-1 text-xs text-slate-500">{upcoming[0].level || 'Level belum ditentukan'} · {upcoming[0].type}</p>
                </div>
                <button onClick={() => setActiveTab('student-classes')} className="ui-btn-secondary">Lihat Detail</button>
              </div>
            ) : <p className="mt-3 text-sm text-slate-400">Belum ada kelas mendatang.</p>}
          </div>
        </div>

        <div className="ui-panel">
          <div className="ui-panel-body">
            <p className="ui-section-title">Progress Terakhir</p>
            {latestTracker ? (
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-950 dark:text-white">{latestTracker.score}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Nilai · {format(parseISO(latestTracker.date), 'dd MMM yyyy')}</p>
                <p className="mt-3 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">{latestTracker.material || 'Materi belum dicatat.'}</p>
              </div>
            ) : <p className="mt-3 text-sm text-slate-400">Belum ada progress belajar.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};
