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
  const { senseiList, studentList, groupList, offDays, schedules, senseiTimeBlocks, lessonTrackers } = useAppContext(state => ({
    senseiList: state.senseiList,
    studentList: state.studentList,
    groupList: state.groupList,
    offDays: state.offDays,
    schedules: state.schedules,
    senseiTimeBlocks: state.senseiTimeBlocks,
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

      const hasTimeBlock = senseiTimeBlocks.some(block => {
        if (block.senseiId !== sensei.id || block.date !== checkDate || block.status === 'available_ans') return false;
        return block.startTime < inputEnd && block.endTime > inputStart;
      });

      return !hasOverlap && !hasTimeBlock;
    });

    setAvailableSensei(results);
    setHasSearched(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="border border-indigo-100 bg-indigo-50 p-3 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Audit Integritas Data</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Cek data nyangkut: schedule, tracker, group, student inactive, dan duplikat.</p>
            </div>
          </div>
          <div className={`border px-4 py-2 text-xs font-black uppercase tracking-widest ${
            integrityIssues.length === 0
              ? 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
          }`}>
            {integrityIssues.length === 0 ? 'Data Aman' : `${integrityIssues.length} Temuan`}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Tinggi</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{integritySummary.high}</p>
          </div>
          <div className="border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Sedang</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{integritySummary.medium}</p>
          </div>
          <div className="border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rendah</p>
            <p className="text-2xl font-black text-slate-600 dark:text-slate-300">{integritySummary.low}</p>
          </div>
        </div>

        {integrityIssues.length === 0 ? (
          <div className="flex items-center gap-3 border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 size={20} />
            <p className="text-sm font-bold">Tidak ditemukan data nyangkut dari audit otomatis saat ini.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
            {integrityIssues.map(issue => (
              <div key={issue.id} className="border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
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

      <div className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 mb-6">
          <div className="border border-indigo-100 bg-indigo-50 p-3 text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Search size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Cari Sensei Tersedia</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Temukan pengajar yang tidak memiliki jadwal tumpang tindih.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="ui-label">Tanggal</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="date"
                value={checkDate}
                onChange={e => setCheckDate(e.target.value)}
                className="ui-input pl-11"
              />
            </div>
          </div>
          <div>
            <label className="ui-label">Jam Mulai</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="ui-input pl-11"
              />
            </div>
          </div>
          <div>
            <label className="ui-label">Jam Selesai</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="ui-input pl-11"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSearch}
          className="mt-6 w-full border border-indigo-600 bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700"
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
            <div className="border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <AlertCircle size={48} className="mx-auto text-rose-300 mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Maaf, tidak ada Sensei yang tersedia pada waktu tersebut.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableSensei.map(sensei => (
                <div key={sensei.id} className="group flex items-center justify-between border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center border border-indigo-100 bg-indigo-50 text-xl font-bold text-indigo-600 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300">
                      {sensei.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">{sensei.name}</h4>
                      <p className="text-xs text-slate-400">{sensei.note || 'Tidak ada catatan'}</p>
                    </div>
                  </div>
                  <div className="border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
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
