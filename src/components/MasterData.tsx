import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Search, ChevronLeft, ChevronRight, Database, Bell, X, Loader2, Eye, BookOpen, ClipboardList, Download, MoreHorizontal} from 'lucide-react';
import { 
  format, parseISO, differenceInDays, startOfDay} from 'date-fns';
import { toast } from 'sonner';

import { CLASS_TYPES, CLASS_LEVELS } from '../constants';
import { exportToCsv } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
import { Sensei, Schedule } from '../types';
export const MasterData = () => {
const { masterSubTab, senseiList, studentList, groupList, offDays, schedules, lessonTrackers, studentStatusFilter, setStudentStatusFilter, globalSearchTerm, setGlobalSearchTerm, setShowTrackerModal, setShowProfileModal, setSelectedProfileData, setSelectedTrackerStudent, setShowResourceHub, setSelectedResourceStudent, dbOps, isSuperAdmin, isDataLoading } = useAppContext(state => ({
  masterSubTab: state.masterSubTab,
  senseiList: state.senseiList,
  studentList: state.studentList,
  groupList: state.groupList,
  offDays: state.offDays,
  schedules: state.schedules,
  lessonTrackers: state.lessonTrackers,
  studentStatusFilter: state.studentStatusFilter,
  setStudentStatusFilter: state.setStudentStatusFilter,
  globalSearchTerm: state.globalSearchTerm,
  setGlobalSearchTerm: state.setGlobalSearchTerm,
  setShowTrackerModal: state.setShowTrackerModal,
  setShowProfileModal: state.setShowProfileModal,
  setSelectedProfileData: state.setSelectedProfileData,
  setSelectedTrackerStudent: state.setSelectedTrackerStudent,
  setShowResourceHub: state.setShowResourceHub,
  setSelectedResourceStudent: state.setSelectedResourceStudent,
  dbOps: state.dbOps,
  isSuperAdmin: state.isSuperAdmin,
  isDataLoading: state.isDataLoading
}));
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const senseiById = useMemo(() => {
      return new Map((senseiList as Sensei[]).map(sensei => [sensei.id, sensei]));
    }, [senseiList]);

    const studentScoreStats = useMemo(() => {
      const stats = new Map<string, { sum: number; count: number; average: number | null }>();
      lessonTrackers.forEach((tracker: any) => {
        if (!tracker.studentId || !tracker.material) return;
        const score = Number(tracker.score) || 0;
        const current = stats.get(tracker.studentId) || { sum: 0, count: 0, average: null };
        current.sum += score;
        current.count += 1;
        current.average = Number((current.sum / current.count).toFixed(1));
        stats.set(tracker.studentId, current);
      });
      return stats;
    }, [lessonTrackers]);

    const attendanceCountByStudentId = useMemo(() => {
      const counts = new Map<string, number>();
      lessonTrackers.forEach((tracker: any) => {
        if (!tracker.studentId || tracker.attendance !== 'Hadir' || !tracker.material) return;
        counts.set(tracker.studentId, (counts.get(tracker.studentId) || 0) + 1);
      });
      return counts;
    }, [lessonTrackers]);

    const leaveCountByStudentId = useMemo(() => {
      const counts = new Map<string, number>();
      lessonTrackers.forEach((tracker: any) => {
        if (!tracker.studentId || !['Izin', 'Sakit'].includes(tracker.attendance)) return;
        counts.set(tracker.studentId, (counts.get(tracker.studentId) || 0) + 1);
      });
      return counts;
    }, [lessonTrackers]);

    const leaveCountBySenseiId = useMemo(() => {
      const counts = new Map<string, number>();
      offDays.forEach((offDay: any) => {
        if (!offDay.senseiId) return;
        counts.set(offDay.senseiId, (counts.get(offDay.senseiId) || 0) + 1);
      });
      return counts;
    }, [offDays]);

    const latestScheduleDateByStudentId = useMemo(() => {
      const latest = new Map<string, number>();
      (schedules as Schedule[]).forEach(schedule => {
        if (schedule.status === 'cancelled' || !schedule.date) return;
        const time = parseISO(schedule.date).getTime();
        if (Number.isNaN(time)) return;
        const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
        studentIds.forEach((studentId: string) => {
          const current = latest.get(studentId);
          if (!current || time > current) latest.set(studentId, time);
        });
      });
      return latest;
    }, [schedules]);

    const todayStart = useMemo(() => startOfDay(new Date()), []);

    const filteredData = useMemo(() => {
      let results: any[] = [];
      const search = (globalSearchTerm || '').toLowerCase();
      if (masterSubTab === 'sensei') {
        results = senseiList.filter(s => (s.name || '').toLowerCase().includes(search));
      } else if (masterSubTab === 'student') {
        results = studentList.filter(s => {
          const matchesSearch = (s.name || '').toLowerCase().includes(search);
          const isActive = s.is_active !== false;
          const matchesStatus = (studentStatusFilter === 'Active' && isActive) || (studentStatusFilter === 'Inactive' && !isActive);
          return matchesSearch && matchesStatus;
        });
      } else if (masterSubTab === 'group') {
        results = groupList.filter(g => (g.name || '').toLowerCase().includes(search));
      } else {
        results = offDays.filter(o => {
          const sensei = senseiById.get(o.senseiId);
          return (sensei?.name || '').toLowerCase().includes(search) || (o.reason || '').toLowerCase().includes(search);
        });
      }
      return results;
    }, [masterSubTab, senseiList, studentList, groupList, offDays, senseiById, globalSearchTerm, studentStatusFilter]);

    useEffect(() => {
      setCurrentPage(1);
    }, [masterSubTab, globalSearchTerm, studentStatusFilter]);

    const paginatedData = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage]);

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const handleSave = async () => {
      setIsSaving(true);
      const collectionName = masterSubTab === 'sensei' ? 'sensei' : masterSubTab === 'student' ? 'students' : masterSubTab === 'group' ? 'groups' : 'offdays';
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup/SP' : 'Hari Libur';
      
      try {
        await dbOps.save(collectionName, formData);
        toast.success(`${label} berhasil disimpan!`);
        setShowForm(false);
        setFormData({});
      } catch (err) {
        console.error('Save failed:', err);
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!deleteConfirm) return;
      
      const collectionName = masterSubTab === 'sensei' ? 'sensei' : masterSubTab === 'student' ? 'students' : masterSubTab === 'group' ? 'groups' : 'offdays';
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup/SP' : 'Hari Libur';
      
      try {
        await dbOps.delete(collectionName, deleteConfirm.id);
        toast.success(`${label} berhasil dihapus!`);
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup' : 'Hari Libur'}:</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{filteredData.length}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {masterSubTab === 'student' && (
              <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setStudentStatusFilter('Active')}
                  className={`px-4 py-1.5 text-xs font-bold ${studentStatusFilter === 'Active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
                >
                  Aktif
                </button>
                <button 
                  onClick={() => setStudentStatusFilter('Inactive')}
                  className={`px-4 py-1.5 text-xs font-bold border-l border-slate-200 dark:border-slate-700 ${studentStatusFilter === 'Inactive' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}
                >
                  Nonaktif
                </button>
              </div>
            )}
            <button 
              onClick={() => {
                let dataToExport = masterSubTab === 'sensei' ? senseiList : studentList;
                if (masterSubTab === 'student') {
                   dataToExport = studentList.map((st: any) => {
                     const avg = studentScoreStats.get(st.id)?.average ?? 'N/A';
                     return { 
                       ...st, 
                       phone: isSuperAdmin ? st.phone : (st.phone ? String(st.phone).trim().slice(0, 4) + '*****' : '-'),
                       'Avg Score': avg 
                     };
                   });
                }
                const fileName = exportToCsv(dataToExport, `${masterSubTab}_data`);
                toast.success(`CSV berhasil diunduh: ${fileName}`);
              }}
              className="flex h-11 items-center gap-2 border border-emerald-600 bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"
            >
              <Download size={18} />
              Ekspor
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={globalSearchTerm}
                onChange={e => setGlobalSearchTerm(e.target.value)}
                className="ui-input w-64 pl-10"
              />
            </div>
            <button 
              onClick={() => { 
                const defaultData = masterSubTab === 'student' ? { is_active: true, payment_status: 'Unpaid' } : {};
                setFormData(defaultData); 
                setShowForm(true); 
              }}
              className="flex h-11 items-center gap-2 border border-indigo-600 bg-indigo-600 px-5 text-sm font-black text-white hover:bg-indigo-700"
            >
              <Plus size={20} />
              Tambah
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">No</th>
                {masterSubTab === 'offday' ? (
                  <>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Sensei</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Tanggal</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Alasan</th>
                  </>
                ) : masterSubTab === 'sensei' ? (
                  <>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Nama</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">WA</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Email</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Level</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Kelas</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Izin</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Note</th>
                  </>
                ) : masterSubTab === 'group' ? (
                  <>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Grup/SP</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Total</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Deskripsi</th>
                  </>
                ) : (
                  <>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Siswa</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Sensei</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Level Awal / Sekarang">Level</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Kurikulum</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Kelas & Durasi">Kelas</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Hadir</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Izin</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Rata-rata Nilai">Nilai</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Pembayaran">Bayar</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Note</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Selesai Kapan">Selesai</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Status</th>
                  </>
                )}
                <th className="whitespace-nowrap px-3 py-3 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {isDataLoading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <Loader2 size={40} className="mx-auto mb-4 animate-spin text-indigo-500" />
                    Memuat data master...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <Database size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Belum ada data yang ditemukan.</p>
                    <p className="mt-1 text-xs font-normal">Coba ubah filter/pencarian atau tambah data baru.</p>
                  </td>
                </tr>
              ) : paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-3 py-3 text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  {masterSubTab === 'offday' ? (
                    <>
                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{senseiList.find(s => s.id === item.senseiId)?.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.date && !Number.isNaN(parseISO(item.date).getTime()) ? format(parseISO(item.date), 'dd MMMM yyyy') : '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.reason}</td>
                    </>
                  ) : masterSubTab === 'sensei' ? (
                    <>
                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.no_wa || '-'}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.email || '-'}</td>
                      <td className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{item.level_mengajar || '-'}</td>
                      <td className="px-3 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{item.kelas_tersedia || '-'}</td>
                      <td className="px-3 py-3">
                        {(() => {
                          const used = leaveCountBySenseiId.get(item.id) || 0;
                          const quota = Number(item.senseiLeaveQuota) || 4;
                          return (
                            <span className="inline-flex px-2 py-1 border border-amber-100 bg-amber-50 text-[10px] font-black uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              {used}/{quota}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.note}</td>
                    </>
                  ) : masterSubTab === 'group' ? (
                    <>
                      <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="px-3 py-3 text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {item.studentIds?.length ? `${item.studentIds.length} Siswa` : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.description || '-'}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</div>
                        <div className="text-xs text-slate-400">
                          {isSuperAdmin ? item.phone : (item.phone ? String(item.phone).trim().slice(0, 4) + '*****' : '-')}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-400">{item.sensei_name || '-'}</td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Awal: {item.level_awal || '-'}</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Skrg: {item.level_sekarang || item.level || '-'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{item.curriculumLevel || '-'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[10rem]">{item.curriculumUnit || item.curriculumProgress || '-'}</div>
                        {item.graduateLevel && (
                          <div className="mt-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Graduate: {item.graduateLevel}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.type}</div>
                        <div className="text-xs text-slate-400">{item.durasi_kelas ? item.durasi_kelas + ' mnt' : '-'}</div>
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const attended = attendanceCountByStudentId.get(item.id) || 0;
                          const quota = Number(item.sessionQuota) || 10;
                          return (
                            <div className="inline-flex px-2 py-1 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-black">
                              {attended}/{quota}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const used = leaveCountByStudentId.get(item.id) || 0;
                          const quota = Number(item.studentLeaveQuota) || 3;
                          return (
                            <span className="inline-flex px-2 py-1 border border-amber-100 bg-amber-50 text-[10px] font-black uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              {used}/{quota}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        {(() => {
                          const avg = studentScoreStats.get(item.id)?.average;
                          if (avg === null || avg === undefined) return <span className="text-slate-400 text-xs italic">N/A</span>;
                          return (
                             <div className="inline-flex py-1.5 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 items-center justify-center min-w-[3rem]">
                                <span className="text-sm font-black">{avg}</span>
                             </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 border text-xs font-bold uppercase ${
                          item.payment_status === 'Lunas' || item.payment_status === 'Paid' 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                            : item.payment_status === 'Cicilan'
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
                        }`}>
                          {item.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.specialNote && <span className="px-2 py-1 border border-indigo-100 bg-indigo-50 text-[10px] font-black uppercase text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">Special</span>}
                          {item.examNote && <span className="px-2 py-1 border border-amber-100 bg-amber-50 text-[10px] font-black uppercase text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Exam</span>}
                          {item.adminNote && <span className="px-2 py-1 border border-slate-200 bg-slate-50 text-[10px] font-black uppercase text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">Admin</span>}
                          {!item.specialNote && !item.examNote && !item.adminNote && <span className="text-xs text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-bold">
                        {(() => {
                          const latestTime = latestScheduleDateByStudentId.get(item.id);
                          if (!latestTime) return <span className="text-slate-400">-</span>;
                          const maxDate = new Date(latestTime);
                          const diff = differenceInDays(startOfDay(maxDate), todayStart);
                          
                          const isUrgent = diff >= 0 && diff <= 1;
                          const isOverdue = diff < 0;
 
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${isUrgent ? 'text-rose-600' : isOverdue ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {format(maxDate, 'dd MMM yyyy')}
                              </span>
                              {isUrgent && (
                                <span
                                  className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-1 border border-rose-100 dark:border-rose-800"
                                  title="H-1 atau Hari Ini Selesai!"
                                >
                                  <Bell size={12} />
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-1 border text-xs font-bold uppercase ${
                          item.is_active !== false 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800'
                        }`}>
                          {item.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {(masterSubTab === 'student' || masterSubTab === 'sensei') && (
                        <button 
                          onClick={() => { 
                            setSelectedProfileData({ type: masterSubTab === 'sensei' ? 'sensei' : 'student', data: item }); 
                            setShowProfileModal(true); 
                          }}
                          className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          title="Profil"
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      {masterSubTab === 'student' && (
                        <button
                          onClick={() => { setFormData(item); setShowForm(true); setOpenActionMenuId(null); }}
                          className="flex h-8 w-8 items-center justify-center border border-indigo-100 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      {masterSubTab === 'student' ? (
                        <div className="relative">
                          <button
                            onClick={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                            className="flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            title="Aksi lainnya"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {openActionMenuId === item.id && (
                            <div className="absolute right-0 top-9 z-30 w-40 border border-slate-200 bg-white text-left shadow-sm dark:border-slate-700 dark:bg-slate-900">
                              <button
                                onClick={() => { setSelectedResourceStudent(item); setShowResourceHub(true); setOpenActionMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                              >
                                <BookOpen size={14} /> Resource
                              </button>
                              <button
                                onClick={() => { setSelectedTrackerStudent(item); setShowTrackerModal(true); setOpenActionMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                              >
                                <ClipboardList size={14} /> Tracker
                              </button>
                              <button
                                onClick={() => { setDeleteConfirm({ id: item.id, name: item.name }); setOpenActionMenuId(null); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 size={14} /> Hapus
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setFormData(item); setShowForm(true); }}
                            className="flex h-8 w-8 items-center justify-center border border-indigo-100 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                            title="Edit"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ id: item.id, name: masterSubTab === 'offday' ? senseiList.find(s => s.id === item.senseiId)?.name || 'Off Day' : item.name })}
                            className="flex h-8 w-8 items-center justify-center border border-rose-100 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
                            title="Hapus"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-3 py-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 text-xs font-bold border ${currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-400 border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="ui-modal-overlay z-[60]">
            <div className="w-full max-w-sm overflow-hidden border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <div className="p-6 text-center">
                  <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="ui-modal-title mb-2">Konfirmasi Hapus</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                <div className="ui-modal-footer">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="ui-btn-secondary"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 border border-rose-600 bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700"
                  >
                    Hapus
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="ui-modal-overlay">
            <div className="ui-modal-panel">
                <div className="ui-modal-header">
                  <h3 className="ui-modal-title">
                    {formData.id ? 'Ubah' : 'Tambah'} {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup / SP' : 'Hari Libur'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 dark:text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="ui-modal-body">
                  {masterSubTab === 'offday' ? (
                    <>
                      <div>
                        <label className="ui-label">Sensei</label>
                        <select 
                          value={formData.senseiId || ''}
                          onChange={e => setFormData({ ...formData, senseiId: e.target.value })}
                          className="ui-input"
                        >
                          <option value="">Pilih Sensei</option>
                          {senseiList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="ui-label">Tanggal</label>
                        <input 
                          type="date" 
                          value={formData.date || ''}
                          onChange={e => setFormData({ ...formData, date: e.target.value })}
                          className="ui-input"
                        />
                      </div>
                      <div>
                        <label className="ui-label">Alasan</label>
                        <textarea 
                          value={formData.reason || ''}
                          onChange={e => setFormData({ ...formData, reason: e.target.value })}
                          className="ui-textarea"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="ui-label">{masterSubTab === 'group' ? 'Nama Grup / SP' : 'Nama Lengkap'}</label>
                        <input 
                          type="text" 
                          value={formData.name || ''}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="ui-input"
                          placeholder="Masukkan nama..."
                        />
                      </div>
                      {masterSubTab === 'sensei' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={formData.no_wa || ''}
                                onChange={e => setFormData({ ...formData, no_wa: e.target.value })}
                                className="ui-input"
                                placeholder="08..."
                              />
                            </div>
                            <div>
                              <label className="ui-label">Email</label>
                              <input 
                                type="email" 
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="ui-input"
                                placeholder="email@ext.com"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">Level Mengajar</label>
                              <select 
                                value={formData.level_mengajar || 'blank'}
                                onChange={e => setFormData({ ...formData, level_mengajar: e.target.value })}
                                className="ui-input"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="ui-label">Kelas Tersedia</label>
                              <select 
                                value={formData.kelas_tersedia || 'blank'}
                                onChange={e => setFormData({ ...formData, kelas_tersedia: e.target.value })}
                                className="ui-input"
                              >
                                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="ui-label">Catatan</label>
                            <textarea 
                              value={formData.note || ''}
                              onChange={e => setFormData({ ...formData, note: e.target.value })}
                              className="ui-textarea"
                              placeholder="Masukkan catatan..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="ui-label">Kuota Izin Sensei</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.senseiLeaveQuota || 4}
                              onChange={e => setFormData({ ...formData, senseiLeaveQuota: parseInt(e.target.value) || 0 })}
                              className="ui-input"
                              placeholder="Contoh: 4"
                            />
                          </div>
                        </>
                      ) : masterSubTab === 'group' ? (
                        <>
                          <div>
                            <label className="ui-label">Deskripsi Grup / SP</label>
                            <textarea 
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                              className="ui-textarea"
                              placeholder="Deskripsi grup..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="ui-label">Siswa (Anggota Grup)</label>
                              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 max-h-48 overflow-y-auto w-full">
                              {studentList.map(s => (
                                <label key={s.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={(formData.studentIds || []).includes(s.id)}
                                    onChange={e => {
                                      const checked = e.target.checked;
                                      const currentIds = Array.isArray(formData.studentIds) ? formData.studentIds : [];
                                      const newIds = checked 
                                        ? [...currentIds, s.id] 
                                        : currentIds.filter((id: string) => id !== s.id);
                                      setFormData({ ...formData, studentIds: newIds });
                                    }}
                                    className="w-4 h-4 text-indigo-600 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 outline-none"
                                  />
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{s.name} <span className="text-xs text-slate-400 font-normal">({s.level || 'NR'})</span></span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={isSuperAdmin ? (formData.phone || '') : (formData.phone ? String(formData.phone).trim().slice(0, 4) + '*****' : '')}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                disabled={!isSuperAdmin}
                                className="ui-input disabled:opacity-75 disabled:cursor-not-allowed"
                                placeholder="Contoh: 08123456789"
                              />
                            </div>
                            <div>
                              <label className="ui-label">Nama Sensei</label>
                              <select 
                                value={formData.sensei_name || ''}
                                onChange={e => setFormData({ ...formData, sensei_name: e.target.value })}
                                className="ui-input"
                              >
                                <option value="">Pilih Sensei...</option>
                                {senseiList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">Level Awal</label>
                              <select 
                                value={formData.level_awal || 'blank'}
                                onChange={e => setFormData({ ...formData, level_awal: e.target.value })}
                                className="ui-input"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="ui-label">Level Sekarang</label>
                              <select 
                                value={formData.level_sekarang || formData.level || 'blank'}
                                onChange={e => setFormData({ ...formData, level_sekarang: e.target.value, level: e.target.value })}
                                className="ui-input"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">Tipe Kelas</label>
                              <select 
                                value={formData.type || 'blank'}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="ui-input"
                              >
                                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="ui-label">Durasi (Menit)</label>
                              <input 
                                type="text" 
                                value={formData.durasi_kelas || ''}
                                onChange={e => setFormData({ ...formData, durasi_kelas: e.target.value })}
                                className="ui-input"
                                placeholder="30, 60, 90..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="ui-label">Kuota Sesi</label>
                            <input
                              type="number"
                              min="1"
                              value={formData.sessionQuota || 10}
                              onChange={e => setFormData({ ...formData, sessionQuota: parseInt(e.target.value) || 10 })}
                              className="ui-input"
                              placeholder="Contoh: 10"
                            />
                          </div>
                          <div>
                            <label className="ui-label">Kuota Izin Siswa</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.studentLeaveQuota || 3}
                              onChange={e => setFormData({ ...formData, studentLeaveQuota: parseInt(e.target.value) || 0 })}
                              className="ui-input"
                              placeholder="Contoh: 3"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="ui-label">Status Pembayaran</label>
                              <select 
                                value={formData.payment_status || 'Unpaid'}
                                onChange={e => setFormData({ ...formData, payment_status: e.target.value })}
                                className="ui-input"
                              >
                                <option value="Unpaid">Belum Bayar</option>
                                <option value="Paid">Sudah Bayar</option>
                                <option value="Lunas">Lunas</option>
                                <option value="Cicilan">Cicilan</option>
                              </select>
                            </div>
                            <div>
                              <label className="ui-label">Status Siswa</label>
                              <select 
                                value={formData.is_active === false ? 'Inactive' : 'Active'}
                                onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })}
                                className="ui-input"
                              >
                                <option value="Active">Aktif</option>
                                <option value="Inactive">Nonaktif</option>
                              </select>
                            </div>
                          </div>

                          {formData.is_active === false && (
                            <div className="mt-4">
                              <label className="ui-label">Alasan Berhenti</label>
                              <input 
                                type="text"
                                value={formData.inactive_reason || ''}
                                onChange={e => setFormData({ ...formData, inactive_reason: e.target.value })}
                                className="ui-input"
                                placeholder="Contoh: Pindah rumah, Lulus, Biaya, dll."
                              />
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="ui-section-title">Catatan Khusus</h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="ui-label">Catatan Khusus</label>
                                <textarea
                                  rows={2}
                                  value={formData.specialNote || ''}
                                  onChange={e => setFormData({ ...formData, specialNote: e.target.value })}
                                  className="ui-textarea"
                                  placeholder="Catatan umum kebutuhan belajar siswa..."
                                />
                              </div>
                              <div>
                                <label className="ui-label">Catatan Ujian</label>
                                <textarea
                                  rows={2}
                                  value={formData.examNote || ''}
                                  onChange={e => setFormData({ ...formData, examNote: e.target.value })}
                                  className="ui-textarea"
                                  placeholder="Catatan khusus ujian, mock test, target kelulusan..."
                                />
                              </div>
                              <div>
                                <label className="ui-label">Catatan Admin</label>
                                <textarea
                                  rows={2}
                                  value={formData.adminNote || ''}
                                  onChange={e => setFormData({ ...formData, adminNote: e.target.value })}
                                  className="ui-textarea"
                                  placeholder="Catatan internal admin..."
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="ui-section-title">Kurikulum & Target Graduate</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="ui-label">Level Kurikulum</label>
                                <select
                                  value={formData.curriculumLevel || formData.level_sekarang || formData.level || 'blank'}
                                  onChange={e => setFormData({ ...formData, curriculumLevel: e.target.value })}
                                  className="ui-input"
                                >
                                  {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="ui-label">Target Graduate</label>
                                <select
                                  value={formData.graduateLevel || 'blank'}
                                  onChange={e => setFormData({ ...formData, graduateLevel: e.target.value })}
                                  className="ui-input"
                                >
                                  {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="ui-label">Unit Saat Ini / Bab</label>
                                <input
                                  type="text"
                                  value={formData.curriculumUnit || ''}
                                  onChange={e => setFormData({ ...formData, curriculumUnit: e.target.value })}
                                  className="ui-input"
                                  placeholder="Contoh: Bab 3 - Minna no Nihongo"
                                />
                              </div>
                              <div>
                                <label className="ui-label">Catatan Progres</label>
                                <input
                                  type="text"
                                  value={formData.curriculumProgress || ''}
                                  onChange={e => setFormData({ ...formData, curriculumProgress: e.target.value })}
                                  className="ui-input"
                                  placeholder="Contoh: 7/12 unit, review kanji"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="ui-section-title">Resource Hub Links (Optional)</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="ui-label">Google Classroom URL</label>
                                <input 
                                  type="url"
                                  value={formData.classroom_link || ''}
                                  onChange={e => setFormData({ ...formData, classroom_link: e.target.value })}
                                  className="ui-input"
                                  placeholder="https://classroom.google.com/..."
                                />
                              </div>
                              <div>
                                <label className="ui-label">Google Chat Space URL</label>
                                <input 
                                  type="url"
                                  value={formData.chat_link || ''}
                                  onChange={e => setFormData({ ...formData, chat_link: e.target.value })}
                                  className="ui-input"
                                  placeholder="https://mail.google.com/chat/..."
                                />
                              </div>
                              <div>
                                <label className="ui-label">Progress Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.progress_link || ''}
                                  onChange={e => setFormData({ ...formData, progress_link: e.target.value })}
                                  className="ui-input"
                                  placeholder="https://docs.google.com/spreadsheets/..."
                                />
                              </div>
                              <div>
                                <label className="ui-label">Curriculum Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.curriculum_link || ''}
                                  onChange={e => setFormData({ ...formData, curriculum_link: e.target.value })}
                                  className="ui-input"
                                  placeholder="https://docs.google.com/spreadsheets/..."
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="ui-modal-footer">
                  <button 
                    onClick={() => setShowForm(false)}
                    className="ui-btn-secondary"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="ui-btn-primary flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Menyimpan...
                      </>
                    ) : 'Simpan'}
                  </button>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  };
