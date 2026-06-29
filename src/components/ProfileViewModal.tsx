import { 
  X, Eye, BookOpen, MessageSquare, ExternalLink, BarChart2} from 'lucide-react';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import { useAppContext } from '../context/AppContext';
import { getValidAcademicScore } from '../utils/helpers';
export const ProfileViewModal = () => {
const { lessonTrackers, offDays, setShowProfileModal, selectedProfileData, isSuperAdmin } = useAppContext(state => ({
  lessonTrackers: state.lessonTrackers,
  offDays: state.offDays,
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
        if (tracker.studentId !== studentId) return;
        const score = getValidAcademicScore(tracker);
        if (score === null) return;
        sum += score;
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

    const studentLeaveCount = useMemo(() => {
      if (!selectedProfileData || selectedProfileData.type !== 'student') return 0;
      const studentId = selectedProfileData.data.id;
      return lessonTrackers.filter((tracker: any) => (
        tracker.studentId === studentId && ['Izin', 'Sakit'].includes(tracker.attendance)
      )).length;
    }, [selectedProfileData, lessonTrackers]);

    const senseiLeaveCount = useMemo(() => {
      if (!selectedProfileData || selectedProfileData.type !== 'sensei') return 0;
      const senseiId = selectedProfileData.data.id;
      return offDays.filter((offDay: any) => offDay.senseiId === senseiId).length;
    }, [selectedProfileData, offDays]);

    if (!selectedProfileData) return null;
    const { type, data } = selectedProfileData;

    return (
      <div className="ui-modal-overlay z-[110]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="ui-modal-panel"
        >
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-indigo-600 text-white">
                <Eye size={18} />
              </div>
              <div>
                <h3 className="ui-modal-title leading-tight">Detail Profil</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.16em] font-black leading-tight">
                  {type === 'sensei' ? 'Informasi Sensei / Pengajar' : 'Informasi Siswa / Pelajar'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowProfileModal(false)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center border border-indigo-500 bg-indigo-600 text-2xl font-black text-white">
                {data.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{data.name}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {type === 'sensei' ? 'Sensei' : 'Siswa'}
                  </span>
                  {type === 'student' && (
                    <span className={`border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      data.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {data.is_active !== false ? 'Aktif' : 'Nonaktif'}
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
                    <label className="ui-label">WhatsApp</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-sm">
                      {data.no_wa || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="ui-label">Email</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-sm">
                      {data.email || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="ui-label">Level Mengajar</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-sm">
                      {data.level_mengajar || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="ui-label">Kelas Tersedia</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-sm">
                      {data.kelas_tersedia || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-3">
                    <label className="ui-label">Kuota Izin Sensei</label>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-none border border-amber-100 dark:border-amber-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                          {senseiLeaveCount}/{Number(data.senseiLeaveQuota) || 4}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                          Sisa {Math.max((Number(data.senseiLeaveQuota) || 4) - senseiLeaveCount, 0)} izin
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="ui-label">WhatsApp</label>
                    <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-sm">
                      {isSuperAdmin ? data.phone : (data.phone ? String(data.phone).trim().slice(0, 4) + '*****' : '-')}
                    </p>
                  </div>
                  <div>
                    <label className="ui-label">Level</label>
                    <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-none border border-indigo-100 dark:border-indigo-800 text-sm">
                      {data.level_sekarang || data.level || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="ui-label">Tipe & Durasi</label>
                      <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-[10px]">
                        {data.type || '-'} | {data.durasi_kelas ? data.durasi_kelas + ' mnt' : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Rata-rata Nilai</label>
                      {studentAverageScore === null ? (
                        <p className="text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-[10px] font-bold">N/A</p>
                      ) : (
                        <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-none border border-indigo-100 dark:border-indigo-800 text-[10px]">
                          {studentAverageScore}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="ui-label">Kehadiran / Kuota</label>
                    <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                          {studentAttendanceCount}/{Number(data.sessionQuota) || 10}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
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
                  <div className="md:col-span-3">
                    <label className="ui-label">Kuota Izin Siswa</label>
                    <div className="bg-amber-50 dark:bg-amber-900/30 p-2.5 rounded-none border border-amber-100 dark:border-amber-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-amber-700 dark:text-amber-300">
                          {studentLeaveCount}/{Number(data.studentLeaveQuota) || 3}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                          Sisa {Math.max((Number(data.studentLeaveQuota) || 3) - studentLeaveCount, 0)} izin
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label className="ui-label">Level Kurikulum</label>
                      <p className="text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-900/30 p-2.5 rounded-none border border-emerald-100 dark:border-emerald-800 text-[10px]">
                        {data.curriculumLevel || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Unit Saat Ini</label>
                      <p className="text-slate-700 dark:text-slate-200 font-bold bg-slate-50 dark:bg-slate-800 p-2.5 rounded-none border border-slate-100 dark:border-slate-800 text-[10px]">
                        {data.curriculumUnit || data.curriculumProgress || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Target Graduate</label>
                      <p className="text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-900/30 p-2.5 rounded-none border border-indigo-100 dark:border-indigo-800 text-[10px]">
                        {data.graduateLevel || '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Full Width Section */}
              <div className="md:col-span-3">
                <label className="ui-label">
                  {type === 'sensei' ? 'Catatan / Deskripsi' : 'Sensei Pengajar & Info Pelajaran'}
                </label>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-none border border-slate-100 dark:border-slate-800">
                  {type === 'sensei' ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{data.note || 'Tidak ada catatan tambahan.'}</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="mr-2 text-[10px] font-bold uppercase text-slate-400">Sensei Pendamping</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 text-right truncate">{data.sensei_name || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
                        <span className="mr-2 text-[10px] font-bold uppercase text-slate-400">Status Pembayaran</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-black ${
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
                  className="flex items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
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
                  className="flex items-center justify-center gap-2 border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
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
                  className="flex items-center justify-center gap-2 rounded-md border border-indigo-100 bg-white px-4 py-2.5 text-xs font-bold text-indigo-600 transition-colors duration-150 hover:bg-slate-50 dark:border-indigo-800 dark:bg-slate-800 dark:text-indigo-400"
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
                  className="flex items-center justify-center gap-2 rounded-md border border-emerald-100 bg-white px-4 py-2.5 text-xs font-bold text-emerald-600 transition-colors duration-150 hover:bg-slate-50 dark:border-emerald-800 dark:bg-slate-800 dark:text-emerald-400"
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


