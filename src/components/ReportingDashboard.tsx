import { 
  UserCheck, Database, CheckCircle2, AlertCircle, TrendingUp, BarChart2} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  parseISO, startOfMonth, endOfMonth, isWithinInterval} from 'date-fns';
import { motion } from 'motion/react';

import { useAppContext } from '../context/AppContext';
export const ReportingDashboard = () => {
const { senseiList, studentList, lessonTrackers } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  lessonTrackers: state.lessonTrackers
}));
    // Data processing for reporting
    const activeStudentsCount = studentList.filter(s => s.is_active !== false).length;
    const inactiveStudentsCount = studentList.filter(s => s.is_active === false).length;
    const dropRate = studentList.length > 0 ? ((inactiveStudentsCount / studentList.length) * 100).toFixed(1) : 0;

    // Inactive reason data
    const reasonCounts = studentList
      .filter(s => s.is_active === false && s.inactive_reason)
      .reduce((acc, s) => {
        const reason = s.inactive_reason || 'Lainnya';
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const reasonChartData = Object.entries(reasonCounts).map(([name, value]) => ({ name, value }));

    // Sensei performance (Average score from trackers)
    const senseiStats = senseiList.map(sensei => {
      const trackers = lessonTrackers.filter(lt => lt.senseiId === sensei.id);
      const avgScore = trackers.length > 0 ? (trackers.reduce((sum, lt) => sum + (lt.score || 0), 0) / trackers.length).toFixed(1) : 0;
      const totalSesi = trackers.length;
      return { name: sensei.name, score: parseFloat(avgScore as string), sessions: totalSesi };
    }).sort((a, b) => b.score - a.score);

    const CHART_COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#f97316'];

    return (
      <div className="space-y-8 pb-12">
        {/* Top 4 Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-2xl text-emerald-600 dark:text-emerald-400">
                <UserCheck size={28} />
              </div>
              <TrendingUp size={20} className="text-emerald-500 opacity-40" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none">{activeStudentsCount}</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Siswa Aktif</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-rose-100 dark:bg-rose-900/30 p-3 rounded-2xl text-rose-600 dark:text-rose-400">
                <AlertCircle size={28} />
              </div>
              <TrendingUp size={20} className="text-rose-500 opacity-40 rotate-180" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none">{dropRate}%</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Drop Rate (Total)</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400">
                <BarChart2 size={28} />
              </div>
              <Database size={20} className="text-amber-500 opacity-40" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none">{inactiveStudentsCount}</h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Total Inactive</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 size={28} />
              </div>
              <TrendingUp size={20} className="text-indigo-500 opacity-40" />
            </div>
            <h3 className="text-4xl font-black text-slate-800 dark:text-white leading-none">
              {(lessonTrackers.length / (studentList.length || 1)).toFixed(1)}
            </h3>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2 px-1">Avg Sesi/Siswa</p>
          </motion.div>
        </div>

        {/* Charts Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reason Distribution Chart */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-8 bg-rose-500 rounded-full"></div>
              <div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Analisis Alasan Berhenti</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Mengapa siswa berhenti belajar?</p>
              </div>
            </div>

            <div className="h-[350px]">
              {reasonChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reasonChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {reasonChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <AlertCircle size={48} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-400 uppercase tracking-widest">Belum Ada Data Inactive</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Sensei Performance Chart */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
              <div>
                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Performa Rating Sensei</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Berdasarkan rata-rata nilai siswa</p>
              </div>
            </div>

            <div className="h-[350px]">
              {senseiStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={senseiStats.slice(0, 5)} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9' }}
                      contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="score" 
                      fill="#6366f1" 
                      radius={[0, 10, 10, 0]}
                      barSize={20}
                    >
                      {senseiStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 8 ? '#10b981' : entry.score > 7 ? '#6366f1' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-40">
                  <UserCheck size={48} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-400 uppercase tracking-widest">Belum Ada Data Nilai</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Detailed Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] opacity-60 mb-6 font-mono">Summary Sensei</h4>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-4xl font-black font-mono">{(senseiList.length / (studentList.length || 1)).toFixed(2)}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Rasio Sensei/Siswa</p>
              </div>
              <div>
                <p className="text-4xl font-black font-mono">{lessonTrackers.filter(lt => isWithinInterval(parseISO(lt.date), { start: startOfMonth(new Date()), end: endOfMonth(new Date()) })).length}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-60">Sesi Bulan Ini</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl overflow-hidden relative">
            <div className="relative z-10">
              <h4 className="text-sm font-black uppercase tracking-[0.3em] opacity-60 mb-6 font-mono">Top Sensei Score</h4>
              <div className="space-y-4">
                {senseiStats.slice(0, 3).map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black opacity-20 italic">#0{i+1}</span>
                      <span className="font-bold text-sm tracking-tight">{s.name}</span>
                    </div>
                    <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-black">
                      ★ {s.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Abstract visual background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          </div>
        </div>
      </div>
    );
  };

