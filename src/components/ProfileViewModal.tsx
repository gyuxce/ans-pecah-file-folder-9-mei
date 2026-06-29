import { 
  X, Eye, BookOpen, MessageSquare, ExternalLink, BarChart2} from 'lucide-react';
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
        <div className="ui-modal-panel">
          <div className="ui-modal-header bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Eye size={18} />
              </div>
              <div>
                <h3 className="ui-modal-title leading-tight">Detail Profil</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {type === 'sensei' ? 'Informasi Sensei / Pengajar' : 'Informasi Siswa / Pelajar'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowProfileModal(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body">
            <div className="mb-5 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-indigo-100 bg-white text-2xl font-black text-indigo-600 shadow-sm dark:border-indigo-900 dark:bg-slate-900 dark:text-indigo-300">
                {data.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-bold leading-tight text-slate-950 dark:text-white sm:text-2xl">{data.name}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="ui-status border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {type === 'sensei' ? 'Sensei' : 'Siswa'}
                  </span>
                  {type === 'student' && (
                    <span className={`ui-status ${
                      data.is_active !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {data.is_active !== false ? 'Aktif' : 'Nonaktif'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              {/* Info Blocks */}
              {type === 'sensei' ? (
                <>
                  <div className="md:col-span-4">
                    <label className="ui-label">WhatsApp</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {data.no_wa || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-8">
                    <label className="ui-label">Email</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {data.email || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-4">
                    <label className="ui-label">Level Mengajar</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {data.level_mengajar || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-8">
                    <label className="ui-label">Kelas Tersedia</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {data.kelas_tersedia || '-'}
                    </p>
                  </div>
                  <div className="md:col-span-12">
                    <label className="ui-label">Izin Sensei</label>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {senseiLeaveCount} kali
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Tercatat dari Hari Libur
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="md:col-span-4">
                    <label className="ui-label">WhatsApp</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      {isSuperAdmin ? data.phone : (data.phone ? String(data.phone).trim().slice(0, 4) + '*****' : '-')}
                    </p>
                  </div>
                  <div className="md:col-span-4">
                    <label className="ui-label">Level</label>
                    <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                      {data.level_sekarang || data.level || '-'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:col-span-4">
                    <div>
                      <label className="ui-label">Tipe & Durasi</label>
                      <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {data.type || '-'} | {data.durasi_kelas ? data.durasi_kelas + ' mnt' : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Rata-rata Nilai</label>
                      {studentAverageScore === null ? (
                        <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold italic text-slate-400 dark:border-slate-700 dark:bg-slate-900">N/A</p>
                      ) : (
                        <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300">
                          {studentAverageScore}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-8">
                    <label className="ui-label">Kehadiran / Kuota</label>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xl font-black text-slate-800 dark:text-white">
                          {studentAttendanceCount}/{Number(data.sessionQuota) || 10}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          Sisa {Math.max((Number(data.sessionQuota) || 10) - studentAttendanceCount, 0)} sesi
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: `${Math.min((studentAttendanceCount / (Number(data.sessionQuota) || 10)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <label className="ui-label">Izin Siswa</label>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex h-full min-h-[58px] items-center justify-between gap-3">
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          {studentLeaveCount} kali
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          Izin/Sakit
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:col-span-12 md:grid-cols-3">
                    <div>
                      <label className="ui-label">Level Kurikulum</label>
                      <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        {data.curriculumLevel || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Unit Saat Ini</label>
                      <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        {data.curriculumUnit || data.curriculumProgress || '-'}
                      </p>
                    </div>
                    <div>
                      <label className="ui-label">Target Graduate</label>
                      <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        {data.graduateLevel || '-'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Full Width Section */}
              <div className="md:col-span-12">
                <label className="ui-label">
                  {type === 'sensei' ? 'Catatan / Deskripsi' : 'Sensei Pengajar & Info Pelajaran'}
                </label>
                <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  {type === 'sensei' ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm whitespace-pre-wrap">{data.note || 'Tidak ada catatan tambahan.'}</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-500">Sensei Pendamping</span>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{data.sensei_name || '-'}</p>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-500">Status Pembayaran</span>
                        <p className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-bold ${
                          String(data.payment_status || '').toUpperCase() === 'PAID' || data.payment_status === 'Lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>{data.payment_status || 'UNPAID'}</p>
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
                  className="ui-btn-primary border-emerald-600 bg-emerald-600 text-xs hover:border-emerald-700 hover:bg-emerald-700"
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
                  className="ui-btn-secondary border-indigo-200 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
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
                  className="ui-btn-secondary border-indigo-200 text-xs text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
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
                  className="ui-btn-secondary border-emerald-200 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                >
                  <BookOpen size={14} />
                  Kurikulum
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };


