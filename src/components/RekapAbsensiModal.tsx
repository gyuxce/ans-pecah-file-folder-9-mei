import { useState, useMemo } from 'react';
import { 
  X, FileText} from 'lucide-react';
import { 
  parseISO} from 'date-fns';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import { exportToCsv, formatTimestampInTimezone, getTimezoneAbbreviation, getValidAcademicScore } from '../utils/helpers';
import { Sensei, Student } from '../types';
export const RekapAbsensiModal = () => {
const { senseiList, studentList, lessonTrackers, sessionLogs, setShowRekapModal } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  lessonTrackers: state.lessonTrackers,
  sessionLogs: state.sessionLogs,
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

    const sessionLogByScheduleId = useMemo(() => (
      new Map(sessionLogs.map(log => [log.scheduleId, log]))
    ), [sessionLogs]);

    const getReportStatus = (scheduleId: string, hasMaterial: boolean) => {
      const status = sessionLogByScheduleId.get(scheduleId)?.status;
      if (status === 'completed') return 'Selesai';
      if (status === 'report_pending') return 'Menunggu Laporan';
      if (status === 'in_progress') return 'Sedang Berjalan';
      if (status === 'not_started') return 'Belum Dimulai';
      return hasMaterial ? 'Selesai (Data Lama)' : 'Belum Lengkap';
    };

    const reportSummary = useMemo(() => {
      return filteredTrackers.reduce((summary, tracker) => {
        const status = getReportStatus(tracker.scheduleId, Boolean(tracker.material));
        if (status.startsWith('Selesai')) summary.completed += 1;
        else summary.incomplete += 1;
        return summary;
      }, { completed: 0, incomplete: 0 });
    }, [filteredTrackers, sessionLogByScheduleId]);

    // --- HELPERS ---

  const handleDownloadCsv = () => {
      if (filteredTrackers.length === 0) {
        toast.error('Tidak ada data untuk bulan/tahun ini');
        return;
      }

      const data = filteredTrackers.map(lt => {
        const student = studentById.get(lt.studentId);
        const sensei = senseiById.get(lt.senseiId);
        const sessionLog = sessionLogByScheduleId.get(lt.scheduleId);
        const timezone = sessionLog?.timezone || sensei?.timezone || 'Asia/Jakarta';
        const timezoneLabel = getTimezoneAbbreviation(timezone);
        const clockIn = formatTimestampInTimezone(sessionLog?.checkInAt, timezone)
          || lt.actualStartTime
          || '';
        const clockOut = formatTimestampInTimezone(sessionLog?.checkOutAt, timezone)
          || lt.actualEndTime
          || '';
        const academicScore = getValidAcademicScore(lt);
        return {
          'Nama Siswa': student?.name || 'Tidak diketahui',
          'Nama Sensei': sensei?.name || 'Tidak diketahui',
          'Tanggal': lt.date,
          'Clock-in': clockIn ? `${clockIn} ${timezoneLabel}` : '',
          'Clock-out': clockOut ? `${clockOut} ${timezoneLabel}` : '',
          'Kehadiran': lt.attendance,
          'Unit Kurikulum': lt.curriculumUnit || '',
          'Materi Belajar': lt.material || '',
          'Nilai': academicScore ?? '',
          'Ringkasan Pembelajaran': lt.notes || '',
          'Catatan Internal': lt.caseNotes || '',
          'Feedback Siswa': lt.studentFeedback || '',
          'Status Laporan': getReportStatus(lt.scheduleId, Boolean(lt.material))
        };
      });

      const fileName = exportToCsv(data, `Rekap_Laporan_${months[selectedMonth]}_${selectedYear}`);
      toast.success(`CSV berhasil diunduh: ${fileName}`);
    };

    return (
      <div className="ui-modal-overlay z-[100]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="ui-modal-panel"
        >
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-indigo-600 text-white">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="ui-modal-title">Rekap Laporan Bulanan</h3>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">Kehadiran dan hasil belajar siswa</p>
              </div>
            </div>
            <button onClick={() => setShowRekapModal(false)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body">
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="ui-label">Bulan</label>
                <select 
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(parseInt(e.target.value))}
                  className="ui-input"
                >
                  {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="ui-label">Tahun</label>
                <select 
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="ui-input"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-4 border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ringkasan Data</h4>
                <div className="bg-indigo-100 dark:bg-indigo-900/40 px-3 py-1 rounded-full text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                  {filteredTrackers.length} Laporan Siswa
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Selesai</p>
                  <p className="text-xl font-black text-emerald-500">{reportSummary.completed}</p>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-none shadow-sm border border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Perlu Dilengkapi</p>
                  <p className="text-xl font-black text-amber-500">{reportSummary.incomplete}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={handleDownloadCsv}
              className="flex w-full items-center justify-center gap-3 border border-emerald-600 bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              <FileText size={20} />
              Download Rekap CSV
            </button>
          </div>
        </motion.div>
      </div>
    );
  };


