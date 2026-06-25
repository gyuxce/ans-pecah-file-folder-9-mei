import {
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  UserCheck,
  Users
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { differenceInDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';

import { useAppContext } from '../context/AppContext';

const CHART_COLORS = ['#4f46e5', '#e11d48', '#d97706', '#059669', '#0891b2', '#7c3aed'];

export const AnalyticsCards = () => {
  const {
    setActiveTab,
    setMasterSubTab,
    senseiList,
    studentList,
    schedules,
    senseiTimeBlocks,
    offDays,
    lessonTrackers,
    setStudentStatusFilter,
    setGlobalSearchTerm,
    analytics
  } = useAppContext(state => ({
    setActiveTab: state.setActiveTab,
    setMasterSubTab: state.setMasterSubTab,
    senseiList: state.senseiList,
    studentList: state.studentList,
    schedules: state.schedules,
    senseiTimeBlocks: state.senseiTimeBlocks,
    offDays: state.offDays,
    lessonTrackers: state.lessonTrackers,
    setStudentStatusFilter: state.setStudentStatusFilter,
    setGlobalSearchTerm: state.setGlobalSearchTerm,
    analytics: state.analytics
  }));

  const latestScheduleDateByStudentId = useMemo(() => {
    const latest = new Map<string, number>();
    schedules.forEach(schedule => {
      if (schedule.status === 'cancelled' || !schedule.date) return;
      const time = parseISO(schedule.date).getTime();
      if (Number.isNaN(time)) return;
      const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
      studentIds.forEach((studentId: string) => {
        const current = latest.get(studentId);
        if (!current || time > current) latest.set(studentId, time);
      });
    });
    return latest;
  }, [schedules]);

  const followUpStudents = useMemo(() => {
    const today = startOfDay(new Date());
    return studentList.filter(student => {
      const latestDate = latestScheduleDateByStudentId.get(student.id);
      if (!latestDate) return false;
      const diff = differenceInDays(startOfDay(new Date(latestDate)), today);
      return diff >= 0 && diff <= 1 && student.is_active !== false;
    });
  }, [latestScheduleDateByStudentId, studentList]);

  const maxWorkloadCount = useMemo(() => {
    return Math.max(1, ...analytics.workloadData.map(item => item.count));
  }, [analytics.workloadData]);

  const actionCenter = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const startWindowStr = format(subDays(today, 14), 'yyyy-MM-dd');
    const activeSchedules = schedules.filter(schedule => schedule.status === 'active');
    const paidStatuses = ['Paid', 'Lunas'];

    const loggedScheduleKeys = new Set(
      lessonTrackers.map(tracker => `${tracker.scheduleId}:${tracker.date}`)
    );

    const blockers = [
      ...senseiTimeBlocks
        .filter(block => block.status !== 'available_ans')
        .map(block => ({
          senseiId: block.senseiId,
          date: block.date,
          startTime: block.startTime,
          endTime: block.endTime,
          label: block.status === 'busy_cakap' ? 'Busy Cakap' : block.status === 'busy_personal' ? 'Busy Pribadi' : 'Off'
        })),
      ...offDays.map(offDay => ({
        senseiId: offDay.senseiId,
        date: offDay.date,
        startTime: '00:00',
        endTime: '23:59',
        label: 'Hari Libur'
      }))
    ];

    const conflictSchedules = activeSchedules.filter(schedule =>
      blockers.some(blocker =>
        blocker.senseiId === schedule.senseiId &&
        blocker.date === schedule.date &&
        schedule.startTime < blocker.endTime &&
        schedule.endTime > blocker.startTime
      )
    );

    const missingTrackerSchedules = activeSchedules.filter(schedule =>
      schedule.date >= startWindowStr &&
      schedule.date <= todayStr &&
      !loggedScheduleKeys.has(`${schedule.id}:${schedule.date}`)
    );

    const unpaidStudents = studentList.filter(student =>
      student.is_active !== false && !paidStatuses.includes(student.payment_status)
    );

    const todaySessions = activeSchedules.filter(schedule => schedule.date === todayStr);

    return {
      conflicts: conflictSchedules.length,
      missingTrackers: missingTrackerSchedules.length,
      unpaid: unpaidStudents.length,
      followUps: followUpStudents.length,
      todaySessions: todaySessions.length
    };
  }, [followUpStudents.length, lessonTrackers, offDays, schedules, senseiTimeBlocks, studentList]);

  const openActiveStudent = (name = '') => {
    setGlobalSearchTerm(name);
    setActiveTab('students');
    setMasterSubTab('student');
    setStudentStatusFilter('Active');
  };

  const actionItems = [
    {
      id: 'conflicts',
      icon: <AlertTriangle size={18} />,
      label: 'Bentrok Jadwal',
      value: actionCenter.conflicts,
      detail: 'Booking ANS overlap dengan Busy Cakap/Off.',
      tone: 'rose' as const,
      actionLabel: 'Cek Jadwal',
      onClick: () => setActiveTab('sensei-schedule')
    },
    {
      id: 'followup',
      icon: <BellIcon />,
      label: 'Follow-up Siswa',
      value: actionCenter.followUps,
      detail: 'Masa belajar habis hari ini atau besok.',
      tone: 'amber' as const,
      actionLabel: 'Cek Siswa',
      onClick: () => openActiveStudent()
    },
    {
      id: 'tracker',
      icon: <Clock3 size={18} />,
      label: 'Belum Dilog',
      value: actionCenter.missingTrackers,
      detail: 'Sesi 14 hari terakhir belum punya tracker.',
      tone: 'indigo' as const,
      actionLabel: 'Cek Sesi',
      onClick: () => setActiveTab('teaching')
    },
    {
      id: 'unpaid',
      icon: <CreditCard size={18} />,
      label: 'Pembayaran',
      value: actionCenter.unpaid,
      detail: 'Siswa aktif belum lunas atau masih cicilan.',
      tone: 'cyan' as const,
      actionLabel: 'Cek Bayar',
      onClick: () => openActiveStudent()
    },
    {
      id: 'today',
      icon: <CalendarDays size={18} />,
      label: 'Sesi Hari Ini',
      value: actionCenter.todaySessions,
      detail: 'Kelas aktif yang berjalan hari ini.',
      tone: 'emerald' as const,
      actionLabel: 'Buka Sesi',
      onClick: () => setActiveTab('teaching')
    }
  ];

  const urgentActionItems = actionItems.filter(item => item.value > 0);

  return (
    <div className="space-y-4 pb-8">
      <section className="border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Ringkasan Operasional</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Pantau kelas, siswa, dan follow-up dalam satu layar.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('calendar')}
              className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              Kalender
            </button>
            <button
              onClick={() => openActiveStudent()}
              className="border border-indigo-600 bg-indigo-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700"
            >
              Data Siswa
            </button>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Action Center</p>
            <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Prioritas yang perlu dicek admin.</h3>
          </div>
          <button
            onClick={() => setActiveTab('checker')}
            className="w-fit border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
          >
            Audit Data
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {actionItems.map(item => (
            <ActionCard key={item.id} {...item} />
          ))}
        </div>

        {urgentActionItems.length === 0 && (
          <div className="mt-3 border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            Tidak ada prioritas kritis saat ini.
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Users size={18} />} label="Siswa Aktif" value={analytics.totalStudents} tone="indigo" />
        <StatCard icon={<CheckCircle2 size={18} />} label="Selesai Bulan Ini" value={analytics.completedThisMonth} tone="emerald" />
        <StatCard icon={<AlertCircle size={18} />} label="Unpaid" value={analytics.unpaidStudents} tone="rose" />
        <StatCard icon={<UserCheck size={18} />} label="Sensei" value={senseiList.length} tone="amber" />
        <StatCard icon={<CalendarDays size={18} />} label="Jadwal Aktif" value={analytics.total} tone="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-9">
          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
            <SectionTitle icon={<BarChart2 size={16} />} title="Aktivitas 7 Hari" />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="count" fill="#4f46e5" barSize={18} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
            <SectionTitle icon={<Users size={16} />} title="Distribusi Level" />
            <div className="grid gap-4 md:grid-cols-[170px_1fr]">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 0, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid content-start gap-2 sm:grid-cols-2">
                {analytics.pieData.slice(0, 8).map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2 border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                      <span className="truncate text-xs font-black uppercase text-slate-700 dark:text-slate-200">{entry.name}</span>
                    </div>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-300">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
            <SectionTitle icon={<UserCheck size={16} />} title="Beban Mengajar" />
            <div className="space-y-3">
              {analytics.workloadData.slice(0, 5).map(item => (
                <div key={item.name}>
                  <div className="mb-1 flex justify-between gap-2 text-xs font-black">
                    <span className="truncate text-slate-600 dark:text-slate-300">{item.name}</span>
                    <span className="text-indigo-600 dark:text-indigo-300">{item.count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-indigo-600" style={{ width: `${(item.count / maxWorkloadCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
            <SectionTitle icon={<CheckCircle2 size={16} />} title="Log Aktivitas" />
            <div className="grid gap-2 md:grid-cols-2">
              {analytics.recentTrackers.slice(0, 4).map(tracker => (
                <div key={tracker.id} className="border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    <span className="font-black text-indigo-600 dark:text-indigo-300">{tracker.senseiName}</span>
                    {' '}menyelesaikan materi{' '}
                    <span className="font-black">"{tracker.material}"</span>
                  </p>
                </div>
              ))}
              {analytics.recentTrackers.length === 0 && (
                <p className="text-xs font-bold text-slate-400">Belum ada aktivitas terbaru.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="grid grid-cols-1 gap-4">
          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle icon={<Calendar size={16} />} title="Sesi Mendatang" />
            <div className="space-y-2">
              {analytics.upcomingSessions.length > 0 ? analytics.upcomingSessions.slice(0, 5).map(session => (
                <div key={session.id} className="border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-300">{session.time}</span>
                    <span className="text-[10px] font-black uppercase text-slate-400">{session.type}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-black text-slate-800 dark:text-slate-100">{session.senseiName}</p>
                  <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{session.studentName}</p>
                </div>
              )) : (
                <p className="py-8 text-center text-xs font-black uppercase tracking-widest text-slate-400">Tidak ada sesi tersisa</p>
              )}
            </div>
          </section>

          <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle icon={<AlertCircle size={16} />} title="Pembayaran" />
            <div className="space-y-2">
              {analytics.paymentData.map(item => (
                <div key={item.name} className="flex items-center justify-between border border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">{item.name}</span>
                  <span className="font-mono text-sm font-black text-slate-800 dark:text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const BellIcon = () => <AlertCircle size={18} />;

const ActionCard = ({
  icon,
  label,
  value,
  detail,
  tone,
  actionLabel,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: 'rose' | 'amber' | 'indigo' | 'cyan' | 'emerald';
  actionLabel: string;
  onClick: () => void;
}) => {
  const toneClass = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
    indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-300',
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group border p-3 text-left transition-colors hover:border-slate-900 dark:hover:border-white ${toneClass}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="shrink-0">{icon}</span>
        <span className="font-mono text-3xl font-black">{value}</span>
      </div>
      <p className="text-xs font-black uppercase tracking-widest">{label}</p>
      <p className="mt-1 min-h-9 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{detail}</p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-900 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
        {actionLabel}
      </p>
    </button>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan';
}) => {
  const toneClass = {
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-300 dark:bg-indigo-950/30 dark:border-indigo-900',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-900',
    rose: 'text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-300 dark:bg-rose-950/30 dark:border-rose-900',
    amber: 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-950/30 dark:border-amber-900',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100 dark:text-cyan-300 dark:bg-cyan-950/30 dark:border-cyan-900'
  }[tone];

  return (
    <section className={`border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="shrink-0">{icon}</div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
          <p className="mt-1 font-mono text-3xl font-black">{value}</p>
        </div>
      </div>
    </section>
  );
};

const SectionTitle = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="text-indigo-600 dark:text-indigo-300">{icon}</span>
    <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">{title}</h4>
  </div>
);
