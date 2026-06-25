import {
  AlertCircle,
  BarChart2,
  CheckCircle2,
  Database,
  UserCheck
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { endOfMonth, isWithinInterval, parseISO, startOfMonth } from 'date-fns';
import { useMemo } from 'react';

import { useAppContext } from '../context/AppContext';
import { getValidAcademicScore } from '../utils/helpers';

const CHART_COLORS = ['#4f46e5', '#e11d48', '#d97706', '#059669', '#0891b2', '#7c3aed', '#db2777', '#ea580c'];

export const ReportingDashboard = () => {
  const { senseiList, studentList, lessonTrackers } = useAppContext(state => ({
    senseiList: state.senseiList,
    studentList: state.studentList,
    lessonTrackers: state.lessonTrackers
  }));

  const reportData = useMemo(() => {
    let activeStudentsCount = 0;
    let inactiveStudentsCount = 0;
    const reasonCounts: Record<string, number> = {};

    studentList.forEach(student => {
      if (student.is_active === false) {
        inactiveStudentsCount += 1;
        const reason = student.inactive_reason || 'Lainnya';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      } else {
        activeStudentsCount += 1;
      }
    });

    const scoreBySensei = new Map<string, { sum: number; sessions: number }>();
    const now = new Date();
    const monthRange = { start: startOfMonth(now), end: endOfMonth(now) };
    let sessionsThisMonth = 0;

    lessonTrackers.forEach(tracker => {
      const academicScore = getValidAcademicScore(tracker);
      if (tracker.senseiId && academicScore !== null) {
        const current = scoreBySensei.get(tracker.senseiId) || { sum: 0, sessions: 0 };
        current.sum += academicScore;
        current.sessions += 1;
        scoreBySensei.set(tracker.senseiId, current);
      }

      try {
        if (tracker.date && isWithinInterval(parseISO(tracker.date), monthRange)) {
          sessionsThisMonth += 1;
        }
      } catch (error) {
        // Skip invalid tracker dates.
      }
    });

    const senseiStats = senseiList
      .map(sensei => {
        const stats = scoreBySensei.get(sensei.id);
        const score = stats?.sessions ? Number((stats.sum / stats.sessions).toFixed(1)) : 0;
        return { name: sensei.name, score, sessions: stats?.sessions || 0 };
      })
      .sort((a, b) => b.score - a.score);

    return {
      activeStudentsCount,
      inactiveStudentsCount,
      dropRate: studentList.length > 0 ? ((inactiveStudentsCount / studentList.length) * 100).toFixed(1) : 0,
      reasonChartData: Object.entries(reasonCounts).map(([name, value]) => ({ name, value })),
      senseiStats,
      sessionsThisMonth
    };
  }, [studentList, lessonTrackers, senseiList]);

  const { activeStudentsCount, inactiveStudentsCount, dropRate, reasonChartData, senseiStats, sessionsThisMonth } = reportData;
  const averageSessionPerStudent = (lessonTrackers.length / (studentList.length || 1)).toFixed(1);
  const topSensei = senseiStats.filter(item => item.sessions > 0).slice(0, 3);

  return (
    <div className="space-y-4 pb-8">
      <section className="border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Laporan Operasional</p>
        <div className="mt-1 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Ringkasan performa siswa dan sensei.</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              Angka diambil dari data siswa, tracker sesi, dan status aktif yang sudah ada.
            </p>
          </div>
          <span className="w-fit border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            Bulan berjalan
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric icon={<UserCheck size={18} />} label="Siswa Aktif" value={activeStudentsCount} tone="emerald" />
        <ReportMetric icon={<AlertCircle size={18} />} label="Drop Rate" value={`${dropRate}%`} tone="rose" />
        <ReportMetric icon={<Database size={18} />} label="Inactive" value={inactiveStudentsCount} tone="amber" />
        <ReportMetric icon={<CheckCircle2 size={18} />} label="Avg Sesi/Siswa" value={averageSessionPerStudent} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <PanelTitle icon={<AlertCircle size={16} />} title="Alasan Berhenti" subtitle="Distribusi siswa inactive" />
          <div className="h-72">
            {reasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {reasonChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: 12, fontWeight: 700 }} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={value => <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart icon={<AlertCircle size={34} />} text="Belum ada data inactive" />
            )}
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <PanelTitle icon={<BarChart2 size={16} />} title="Performa Sensei" subtitle="Rata-rata nilai dari tracker sesi" />
          <div className="h-72">
            {senseiStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={senseiStats.slice(0, 6)} layout="vertical" margin={{ left: 24, right: 24 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                    width={110}
                  />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ border: '1px solid #e2e8f0', boxShadow: 'none', fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="score" fill="#4f46e5" barSize={18} isAnimationActive={false}>
                    {senseiStats.slice(0, 6).map(entry => (
                      <Cell key={entry.name} fill={entry.score > 8 ? '#059669' : entry.score > 7 ? '#4f46e5' : '#d97706'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart icon={<UserCheck size={34} />} text="Belum ada data nilai" />
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <PanelTitle icon={<Database size={16} />} title="Summary Sensei" subtitle="Kapasitas bulan ini" />
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Rasio Sensei/Siswa" value={(senseiList.length / (studentList.length || 1)).toFixed(2)} />
            <MiniStat label="Sesi Bulan Ini" value={sessionsThisMonth} />
          </div>
        </section>

        <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <PanelTitle icon={<CheckCircle2 size={16} />} title="Top Sensei Score" subtitle="3 nilai tertinggi dengan sesi tercatat" />
          <div className="grid gap-2 md:grid-cols-3">
            {topSensei.length > 0 ? topSensei.map((sensei, index) => (
              <div key={sensei.name} className="border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">#{index + 1}</p>
                <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{sensei.name}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-black text-slate-500 dark:text-slate-400">
                  <span>{sensei.sessions} sesi</span>
                  <span className="text-indigo-600 dark:text-indigo-300">{sensei.score}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm font-bold text-slate-400">Belum ada score sensei yang tercatat.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const ReportMetric = ({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: 'emerald' | 'rose' | 'amber' | 'indigo';
}) => {
  const toneClass = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
    rose: 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300',
    amber: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300'
  }[tone];

  return (
    <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center border ${toneClass}`}>{icon}</span>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 font-mono text-3xl font-black text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </section>
  );
};

const PanelTitle = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="mb-4 flex items-start gap-2">
    <span className="mt-0.5 text-indigo-600 dark:text-indigo-300">{icon}</span>
    <div>
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">{title}</h4>
      <p className="mt-1 text-xs font-semibold text-slate-400">{subtitle}</p>
    </div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
    <p className="font-mono text-3xl font-black text-slate-900 dark:text-white">{value}</p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
  </div>
);

const EmptyChart = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex h-full flex-col items-center justify-center text-slate-300 dark:text-slate-700">
    {icon}
    <p className="mt-3 text-xs font-black uppercase tracking-widest">{text}</p>
  </div>
);
