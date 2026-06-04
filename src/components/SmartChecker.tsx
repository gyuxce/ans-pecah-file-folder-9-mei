import { useState } from 'react';
import { 
  Calendar, Clock, Search, AlertCircle} from 'lucide-react';
import { 
  format} from 'date-fns';
import { motion } from 'motion/react';

import { Sensei } from '../types';
import { useAppContext } from '../context/AppContext';
export const SmartChecker = () => {
const { senseiList, offDays, schedules } = useAppContext(state => ({
  senseiList: state.senseiList,
  offDays: state.offDays,
  schedules: state.schedules
}));
    const [checkDate, setCheckDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [availableSensei, setAvailableSensei] = useState<Sensei[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = () => {
      const inputStart = startTime;
      const inputEnd = endTime;
      
      const results = senseiList.filter(sensei => {
        // Check Off Days
        const isOff = offDays.some(o => o.senseiId === sensei.id && o.date === checkDate);
        if (isOff) return false;

        // Check Schedule Overlaps
        const hasOverlap = schedules.some(s => {
          if (s.senseiId !== sensei.id || s.date !== checkDate || s.status === 'cancelled') return false;
          // Logic: (Existing Start < Input End) AND (Existing End > Input Start)
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
                        <p className="text-xs text-slate-400">{sensei.note || 'No notes'}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Available
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

