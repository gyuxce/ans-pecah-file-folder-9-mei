import { 
  X, Eye, BookOpen, MessageSquare, ExternalLink, BarChart2} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import { useAppContext } from '../context/AppContext';
export const ProfileViewModal = () => {
const { lessonTrackers, setShowProfileModal, selectedProfileData, isSuperAdmin } = useAppContext(state => ({
  lessonTrackers: state.lessonTrackers,
  setShowProfileModal: state.setShowProfileModal,
  selectedProfileData: state.selectedProfileData,
  isSuperAdmin: state.isSuperAdmin
}));
    const studentAverageScore = useMemo(() => {
      if (!selectedProfileData || selectedProfileData.type !== 'student') return null;
      const studentId = selectedProfileData.data.id;
      let sum = 0;
      let count = 0;
      lessonTrackers.forEach((tracker: any) => {
        if (tracker.studentId !== studentId || !tracker.material) return;
        sum += Number(tracker.score) || 0;
        count += 1;
      });
      return count > 0 ? (sum / count).toFixed(1) : null;
    }, [selectedProfileData, lessonTrackers]);

    const studentAttendanceCount = useMemo(() => {
      if (!selectedProfileData || selectedProfileData.type !== 'student') return 0;
      const studentId = selectedProfileData.data.id;
      return lessonTrackers.filter((tracker: any) => (
        tracker.studentId === studentId && tracker.attendance === 'Hadir' && tracker.material
      )).length;
    }, [selectedProfileData, lessonTrackers]);

    if (!selectedProfileData) return null;
    const { type, data } = selectedProfileData;

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-white/20"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-emerald-50 dark:from-indigo-950/30 dark:to-emerald-950/30">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500 p-2 rounded-xl text-white shadow-lg">
                <Eye size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Profile Detail</h3>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black leading-tight">
                  {type === 'sensei' ? 'Informasi Sensei / Pengajar' : 'Informasi Siswa / Pelajar'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all">
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg">
                {data.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{data.name}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                    {type === 'sensei' ? 'Sensei' : 'Student'}
                  </span>
                  {type === 'student' && (
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      data.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {data.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Info Blocks */}
              {type === 'sensei' ? (
                <>
                  <div className="md:col-span-1">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      {data.no_wa || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      {data.email || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Level Mengajar</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      {data.level_mengajar || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kelas Tersedia</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      {data.kelas_tersedia || '-'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-sm">
                      {isSuperAdmin ? data.phone : (data.phone ? String(data.phone).trim().slice(0, 4) + '*****' : '-')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Level</label>
                    <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm">
                      {data.level_sekarang || data.level || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipe & Durasi</label>
                      <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                        {data.type || '-'} | {data.durasi_kelas ? data.durasi_kelas + ' mnt' : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Score</label>
                      {studentAverageScore === null ? (
                        <p className="text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px] font-bold">N/A</p>
                      ) : (
                        <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-[10px]">
                          {studentAverageScore}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kehadiran / Kuota</label>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                          {studentAttendanceCount}/{Number(data.sessionQuota) || 10}
                        </span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          Sisa {Math.max((Number(data.sessionQuota) || 10) - studentAttendanceCount, 0)} sesi
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${Math.min((studentAttendanceCount / (Number(data.sessionQuota) || 10)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Curriculum Level</label>
                      <p className="text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800 text-[10px]">
                        {data.curriculumLevel || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Unit</label>
                      <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                        {data.curriculumUnit || data.curriculumProgress || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Graduate Target</label>
                      <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-[10px]">
                        {data.graduateLevel || '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Full Width Section */}
              <div className="md:col-span-3">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {type === 'sensei' ? 'Catatan / Deskripsi' : 'Sensei Pengajar & Info Pelajaran'}
                </label>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {type === 'sensei' ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{data.note || 'Tidak ada catatan tambahan.'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-[8px] font-bold text-slate-400 uppercase mr-2">Sensei Pendamping</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 text-right truncate">{data.sensei_name || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="text-[8px] font-bold text-slate-400 uppercase mr-2">Payment Status</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                          String(data.payment_status || '').toUpperCase() === 'PAID' || data.payment_status === 'Lunas' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                        }`}>{data.payment_status || 'UNPAID'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-2">
              {type === 'student' && data.chat_link && (
                <a 
                  href={data.chat_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-100 dark:shadow-none"
                >
                  <MessageSquare size={14} />
                  Chat Siswa
                </a>
              )}
              {type === 'student' && data.classroom_link && (
                <a 
                  href={data.classroom_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <ExternalLink size={14} />
                  Classroom
                </a>
              )}
              {type === 'student' && data.progress_link && (
                <a 
                  href={data.progress_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-50"
                >
                  <BarChart2 size={14} />
                  Progress
                </a>
              )}
              {type === 'student' && data.curriculum_link && (
                <a 
                  href={data.curriculum_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-50"
                >
                  <BookOpen size={14} />
                  Kurikulum
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

