import { useState, useMemo } from 'react';
import { 
  X, FileText} from 'lucide-react';
import { 
  parseISO} from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import { exportToCsv } from '../utils/helpers';
export const RekapAbsensiModal = () => {
const { senseiList, studentList, lessonTrackers, setShowRekapModal } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  lessonTrackers: state.lessonTrackers,
  setShowRekapModal: state.setShowRekapModal
}));
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    const filteredTrackers = useMemo(() => {
      return lessonTrackers.filter(lt => {
        const d = parseISO(lt.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
    }, [selectedMonth, selectedYear, lessonTrackers]);

    // --- HELPERS ---

  const handleDownloadCsv = () => {
      if (filteredTrackers.length === 0) {
        toast.error('Tidak ada data untuk bulan/tahun ini');
        return;
      }

      const data = filteredTrackers.map(lt => {
        const student = studentList.find(s => s.id === lt.studentId);
        const sensei = senseiList.find(s => s.id === lt.senseiId);
        return {
          'Nama Siswa': student?.name || 'Unknown',
          'Nama Sensei': sensei?.name || 'Unknown',
          'Tanggal': lt.date,
          'Materi': lt.material,
          'Jam Mulai': lt.actualStartTime || '-',
          'Kehadiran': lt.attendance,
          'Nilai': lt.score,
          'Status Ketepatan Waktu': lt.isDelayed ? 'Delayed/Terlambat' : 'Tepat Waktu',
          'Catatan': lt.notes,
          'Internal Case': lt.caseNotes || '',
          'Feedback Siswa': lt.studentFeedback || ''
        };
      });

      const fileName = exportToCsv(data, `Rekap_Absensi_${months[selectedMonth]}_${selectedYear}`);
      toast.success(`CSV berhasil diunduh: ${fileName}`);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/20"
        >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500 p-3 rounded-2xl text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Rekap Absensi Bulanan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-bold">Progress Akademik & Performa</p>
              </div>
            </div>
            <button onClick={() => setShowRekapModal(false)} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bulan</label>
                <select 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tahun</label>
                <select 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ringkasan Data</h4>
                <div className="bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                  {filteredTrackers.length} Sesi Ditemukan
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Terlambat</p>
                  <p className="text-xl font-black text-rose-500">{filteredTrackers.filter(lt => lt.isDelayed).length}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tepat Waktu</p>
                  <p className="text-xl font-black text-emerald-500">{filteredTrackers.filter(lt => !lt.isDelayed).length}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadCsv}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] transition-all active:scale-[0.98]"
            >
              <FileText size={20} />
              Download Rekap CSV
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

