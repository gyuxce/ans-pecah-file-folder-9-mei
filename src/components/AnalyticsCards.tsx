import { 
  Users, UserCheck, Calendar, CheckCircle2, AlertCircle, Bell, CalendarDays, BookOpen} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  parseISO, differenceInDays, startOfDay} from 'date-fns';
import { motion } from 'motion/react';

import { scheduleHasStudent } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
export const AnalyticsCards = () => {
const { setActiveTab, setMasterSubTab, senseiList, studentList, schedules, setStudentStatusFilter, setGlobalSearchTerm, analytics } = useAppContext();
    const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

    const FollowUpReminder = () => {
      const today = startOfDay(new Date());
      const followUpStudents = studentList.filter(student => {
        const studentSchedules = schedules.filter(s => scheduleHasStudent(s, student.id) && s.status !== 'cancelled');
        if (studentSchedules.length === 0) return false;
        const dates = studentSchedules.map(s => {
          try { return parseISO(s.date).getTime(); } catch(e) { return 0; }
        }).filter(t => t > 0);
        if (dates.length === 0) return false;
        const maxDate = new Date(Math.max(...dates));
        const diff = differenceInDays(startOfDay(maxDate), today);
        return diff >= 0 && diff <= 1 && student.is_active !== false;
      });

      if (followUpStudents.length === 0) return null;

      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="col-span-1 md:col-span-2 lg:col-span-4 rounded-[2rem] p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-500 bg-white dark:bg-slate-900 border-2 border-rose-100 dark:border-rose-900/30 shadow-xl shadow-rose-100/10 dark:shadow-none"
        >
          <div className="flex items-center gap-4">
            <div className="bg-rose-500 text-white shadow-rose-200 animate-pulse p-3 rounded-2xl shadow-lg transition-all">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight underline decoration-rose-500/30">
                Follow-up Diperlukan!
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mt-1">
                Ada {followUpStudents.length} siswa yang masa belajarnya akan habis hari ini atau besok.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {followUpStudents.slice(0, 10).map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => {
                      setGlobalSearchTerm(s.name);
                      setActiveTab('students');
                      setMasterSubTab('student');
                      setStudentStatusFilter('Active');
                    }}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-lg border border-rose-100 dark:border-rose-800 uppercase tracking-tight hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all active:scale-95 shadow-sm"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => { 
              setActiveTab('students'); 
              setMasterSubTab('student');
              setStudentStatusFilter('Active');
              setGlobalSearchTerm('');
            }}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-200 dark:shadow-none text-xs uppercase tracking-widest"
          >
            Cek Detail
          </button>
        </motion.div>
      );
    };

    return (
      <div className="space-y-6 mb-8">
        {/* Top Stat Cards - 5 Columns Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.5rem] p-4 text-white shadow-xl shadow-indigo-200/40 dark:shadow-none flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <Users size={20} />
              </div>
              <div className="text-right">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest leading-none">Total Siswa</p>
                <h3 className="text-5xl font-black mt-1 font-mono">{analytics.totalStudents}</h3>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-black bg-white/10 w-fit px-3 py-1 rounded-full uppercase">
              <BookOpen size={12} />
              <span>Siswa Aktif</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[1.5rem] p-5 text-white shadow-xl shadow-emerald-200/40 dark:shadow-none flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <CheckCircle2 size={20} />
              </div>
              <div className="text-right">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest leading-none">Selesai</p>
                <h3 className="text-5xl font-black mt-1 font-mono">{analytics.completedThisMonth}</h3>
              </div>
            </div>
            <p className="mt-4 text-xs font-black opacity-80 uppercase tracking-wider">Materi Bulan Ini</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-[1.5rem] p-5 text-white shadow-xl shadow-rose-200/40 dark:shadow-none flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <AlertCircle size={20} />
              </div>
              <div className="text-right">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest leading-none">Unpaid</p>
                <h3 className="text-5xl font-black mt-1 font-mono">{analytics.unpaidStudents}</h3>
              </div>
            </div>
            <p className="mt-4 text-xs font-black opacity-80 uppercase tracking-wider">Perlu Ditagih</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.5rem] p-5 text-white shadow-xl shadow-amber-200/40 dark:shadow-none flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <UserCheck size={20} />
              </div>
              <div className="text-right">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest leading-none">Sensei</p>
                <h3 className="text-5xl font-black mt-1 font-mono">{senseiList.length}</h3>
              </div>
            </div>
            <p className="mt-4 text-xs font-black opacity-80 uppercase tracking-wider">Staff Mengajar</p>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-gradient-to-br from-cyan-400 to-blue-500 rounded-[1.5rem] p-5 text-white shadow-xl shadow-cyan-200/40 dark:shadow-none flex flex-col justify-between cursor-default transition-all duration-300"
          >
            <div className="flex justify-between items-start">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                <CalendarDays size={20} />
              </div>
              <div className="text-right">
                <p className="text-sm font-black opacity-80 uppercase tracking-widest leading-none">Jadwal</p>
                <h3 className="text-5xl font-black mt-1 font-mono">{analytics.total}</h3>
              </div>
            </div>
            <p className="mt-4 text-xs font-black opacity-80 uppercase tracking-wider">Plan Sesi Rutin</p>
          </motion.div>
        </div>

        {/* Main Bento Grid - 4 Columns Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-auto">
          {/* Follow Up Reminder - Full Width within bento */}
          <FollowUpReminder />

          {/* Weekly Activity - 1x2 Bento */}
          <div className="md:col-span-1 md:row-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                <div>
                  <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm md:text-base">Aktivitas</h4>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.weeklyActivityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 900 }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: '800' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Level Distribution - 2x2 Bento */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:col-span-2 md:row-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm md:text-base">Distribusi Level Siswa</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic font-mono mt-1">Consolidated Groups</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-8">
              <div className="w-full h-[220px] md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {analytics.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ border: 'none', borderRadius: '16px', fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 grid grid-cols-2 gap-x-4 gap-y-3">
                {analytics.pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[100px]">{entry.name}</span>
                      <span className="text-xs font-bold text-indigo-500">{entry.value} Siswa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Sessions - Vertical Tower */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm md:row-span-3 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase italic">Sesi Mendatang</h4>
              </div>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {analytics.upcomingSessions.length > 0 ? (
                analytics.upcomingSessions.map((s) => (
                  <div key={s.id} className="p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-black text-slate-800 dark:text-white font-mono">{s.time}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${s.type === 'Private' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {s.type}
                      </span>
                    </div>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase mb-1 truncate">{s.senseiName}</p>
                    <p className="text-xs text-slate-500 font-bold truncate">Siswa: <span className="text-slate-800 dark:text-slate-300 italic">{s.studentName}</span></p>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                  <Calendar size={32} className="mb-2 text-slate-300" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">No Classes Left</p>
                </div>
              )}
            </div>
          </div>

          {/* Workload Bento */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:row-span-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Workload</h4>
            </div>
            <div className="space-y-4">
              {analytics.workloadData.slice(0, 3).map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-black uppercase">
                    <span className="text-slate-500 truncate max-w-[120px]">{s.name}</span>
                    <span className="text-indigo-600 font-mono">{s.count} Sesi</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.count / Math.max(...analytics.workloadData.map(d => d.count))) * 100}%` }}
                      className="h-full bg-indigo-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity - 2 Wide */}
          <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm md:text-base">Log Aktivitas</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic font-mono mt-1">Real-time Updates</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.recentTrackers.slice(0, 2).map((lt) => (
                <div key={lt.id} className="flex items-start gap-4 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-3xl border border-transparent">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-2xl">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                      <span className="text-indigo-600 dark:text-indigo-400 font-black italic">{lt.senseiName}</span> menyelesaikan materi <span className="font-bold underline underline-offset-2 decoration-emerald-200 decoration-1 italic">"{lt.material}"</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status Bento - 1x1 */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-6 bg-pink-500 rounded-full"></div>
              <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">Pembayaran</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic mt-1">Status Overview</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center min-h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={10}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '16px', fontSize: '9px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={6} wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', left: '70%' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

