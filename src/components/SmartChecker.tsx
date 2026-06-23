import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'motion/react';

import { Sensei } from '../types';
import { useAppContext } from '../context/AppContext';
import { auditDataIntegrity } from '../utils/dataIntegrity';

export const SmartChecker = () => {
  const { senseiList, studentList, groupList, offDays, schedules, lessonTrackers } = useAppContext(state => ({
    senseiList: state.senseiList,
    studentList: state.studentList,
    groupList: state.groupList,
    offDays: state.offDays,
    schedules: state.schedules,
    lessonTrackers: state.lessonTrackers
  }));

  const [checkDate, setCheckDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [availableSensei, setAvailableSensei] = useState<Sensei[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const integrityIssues = useMemo(() => {
    return auditDataIntegrity({ senseiList, studentList, groupList, schedules, lessonTrackers });
  }, [senseiList, studentList, groupList, schedules, lessonTrackers]);

  const integritySummary = useMemo(() => {
    return integrityIssues.reduce(
      (summary, issue) => {
        summary[issue.severity] += 1;
        return summary;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [integrityIssues]);

  const handleSearch = () => {
    const inputStart = startTime;
    const inputEnd = endTime;

    const results = senseiList.filter(sensei => {
      const isOff = offDays.some(o => o.senseiId === sensei.id && o.date === checkDate);
      if (isOff) return false;

      const hasOverlap = schedules.some(s => {
        if (s.senseiId !== sensei.id || s.date !== checkDate || s.status === 'cancelled') return false;
        return s.startTime < inputEnd && s.endTime > inputStart;
      });

      return !hasOverlap;
    });

    setAvailableSensei(results);
    setHasSearched(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Audit Integritas Data</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Cek data nyangkut: schedule, tracker, group, student inactive, dan duplikat.</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest ${
            integrityIssues.length === 0
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
          }`}>
            {integrityIssues.length === 0 ? 'Data Aman' : `${integrityIssues.length} Temuan`}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-4 border border-rose-100 dark:border-rose-900/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Tinggi</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{integritySummary.high}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-100 dark:border-amber-900/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Sedang</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{integritySummary.medium}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rendah</p>
            <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{integritySummary.low}</p>
          </div>
        </div>

        {integrityIssues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">Tidak ditemukan data nyangkut dari audit otomatis saat ini.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {integrityIssues.map(issue => (
              <div key={issue.id} className="rounded-2xl bg-slate-50 dark:bg-slate-900/40 p-4 border border-slate-100 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    issue.severity === 'high'
                      ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300'
                      : issue.severity === 'medium'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300'
                  }`}>
                    {issue.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                    {issue.category}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 dark:text-white text-sm">{issue.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{issue.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-2xl text-pink-600 dark:text-pink-400">
            <Search size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Cari Sensei Tersedia</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Temukan pengajar yang tidak memiliki jadwal tumpang tindih.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={checkDate}
                onChange={e => setCheckDate(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500/20 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jam Mulai</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500/20 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jam Selesai</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500/20 dark:text-white"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="w-full mt-8 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-pink-200 dark:shadow-none hover:scale-[1.01] transition-all active:scale-[0.99]"
        >
          Cek Ketersediaan
        </button>
      </div>

      {hasSearched && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            Hasil Pencarian
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-1 rounded-full">{availableSensei.length} Ditemukan</span>
          </h3>

          {availableSensei.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
              <AlertCircle size={48} className="mx-auto text-rose-300 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Maaf, tidak ada Sensei yang tersedia pada waktu tersebut.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableSensei.map(sensei => (
                <div key={sensei.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between group hover:border-pink-200 dark:hover:border-pink-900 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-pink-50 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center text-pink-500 dark:text-pink-400 font-bold text-xl">
                      {sensei.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{sensei.name}</h4>
                      <p className="text-xs text-slate-400">{sensei.note || 'Tidak ada catatan'}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Tersedia
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
