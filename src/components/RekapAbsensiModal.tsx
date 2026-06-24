import { useState, useMemo } from 'react';
import { 
  X, FileText} from 'lucide-react';
import { 
  parseISO} from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import { exportToCsv } from '../utils/helpers';
import { Sensei, Student } from '../types';
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

    const studentById = useMemo(() => {
      return new Map<string, Student>(studentList.map(student => [student.id, student]));
    }, [studentList]);

    const senseiById = useMemo(() => {
      return new Map<string, Sensei>(senseiList.map(sensei => [sensei.id, sensei]));
    }, [senseiList]);

    const attendanceSummary = useMemo(() => {
      return filteredTrackers.reduce(
        (summary, tracker) => {
          if (tracker.isDelayed) summary.delayed += 1;
          else summary.onTime += 1;
          return summary;
        },
        { delayed: 0, onTime: 0 }
      );
    }, [filteredTrackers]);

    // --- HELPERS ---

  const handleDownloadCsv = () => {
      if (filteredTrackers.length === 0) {
        toast.error('Tidak ada data untuk bulan/tahun ini');
        return;
      }

      const data = filteredTrackers.map(lt => {
        const student = studentById.get(lt.studentId);
        const sensei = senseiById.get(lt.senseiId);
        return {
          'Nama Siswa': student?.name || 'Tidak diketahui',
          'Nama Sensei': sensei?.name || 'Tidak diketahui',
          'Tanggal': lt.date,
          'Materi': lt.material,
          'Jam Mulai': lt.actualStartTime || '-',
          'Jam Selesai': lt.actualEndTime || '-',
          'Kehadiran': lt.attendance,
          'Nilai': lt.score,
          'Status Ketepatan Waktu': lt.isDelayed ? 'Delayed/Terlambat' : 'Tepat Waktu',
          'Status Adjustment': lt.timeAdjustmentStatus || 'None',
          'Catatan Adjustment': lt.timeAdjustmentNote || '',
          'Catatan': lt.notes,
          'Catatan Internal': lt.caseNotes || '',
          'Feedback Siswa': lt.studentFeedback || ''
        };
      });

      const fileName = exportToCsv(data, `Rekap_Absensi_${months[selectedMonth]}_${selectedYear}`);
      toast.success(`CSV berhasil diunduh: ${fileName}`);
    };

    return (
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-3">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex w-full max-w-2xl flex-col overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-indigo-600 text-white">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">Rekap Absensi Bulanan</h3>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">Progress akademik dan performa</p>
              </div>
            </div>
            <button onClick={() => setShowRekapModal(false)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Bulan</label>
                <select 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tahun</label>
                <select 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4 border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ringkasan Data</h4>
                <div className="bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                  {filteredTrackers.length} Sesi Ditemukan
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Terlambat</p>
                  <p className="text-xl font-black text-rose-500">{attendanceSummary.delayed}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tepat Waktu</p>
                  <p className="text-xl font-black text-emerald-500">{attendanceSummary.onTime}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadCsv}
              className="flex w-full items-center justify-center gap-3 bg-emerald-600 py-3 font-black text-white hover:bg-emerald-700"
            >
              <FileText size={20} />
              Download Rekap CSV
            </button>
          </div>
        </motion.div>
      </div>
    );
  };


