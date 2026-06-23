import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Search, ChevronLeft, ChevronRight, Database, Bell, X, Loader2, Eye, BookOpen, ClipboardList, Download} from 'lucide-react';
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
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup/SP' : 'Off Day';
      
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
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup/SP' : 'Off Day';
      
      try {
        await dbOps.delete(collectionName, deleteConfirm.id);
        toast.success(`${label} berhasil dihapus!`);
        setDeleteConfirm(null);
      } catch (err) {
        console.error('Delete failed:', err);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-800 px-4 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup' : 'Off Day'}:</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{filteredData.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
                  Inactive
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
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 font-bold hover:bg-emerald-600"
            >
              <Download size={18} />
              Export
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={globalSearchTerm}
                onChange={e => setGlobalSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 dark:text-white"
              />
            </div>
            <button 
              onClick={() => { 
                const defaultData = masterSubTab === 'student' ? { is_active: true, payment_status: 'Unpaid' } : {};
                setFormData(defaultData); 
                setShowForm(true); 
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 font-bold hover:bg-indigo-700"
            >
              <Plus size={20} />
              Tambah
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">No</th>
                {masterSubTab === 'offday' ? (
                  <>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Sensei</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Alasan</th>
                  </>
                ) : masterSubTab === 'sensei' ? (
                  <>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Nama</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">No. WA</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Email</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Level</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Kelas</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Catatan</th>
                  </>
                ) : masterSubTab === 'group' ? (
                  <>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Nama Grup/SP</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Total Grup</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Deskripsi</th>
                  </>
                ) : (
                  <>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Nama Siswa</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Sensei</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Level (Awal/Skrg)</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Kurikulum</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Kelas & Durasi</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Hadir</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Avg Score</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Payment</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Selesai Kapan</th>
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </>
                )}
                <th className="p-4 text-right text-sm font-black text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {isDataLoading ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <Loader2 size={40} className="mx-auto mb-4 animate-spin text-indigo-500" />
                    Memuat data master...
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <Database size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Belum ada data yang ditemukan.</p>
                    <p className="mt-1 text-xs font-normal">Coba ubah filter/pencarian atau tambah data baru.</p>
                  </td>
                </tr>
              ) : paginatedData.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 text-sm text-slate-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  {masterSubTab === 'offday' ? (
                    <>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{senseiList.find(s => s.id === item.senseiId)?.name}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.date && !Number.isNaN(parseISO(item.date).getTime()) ? format(parseISO(item.date), 'dd MMMM yyyy') : '-'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.reason}</td>
                    </>
                  ) : masterSubTab === 'sensei' ? (
                    <>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.no_wa || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.email || '-'}</td>
                      <td className="p-4 text-xs font-medium text-slate-500 dark:text-slate-400">{item.level_mengajar || '-'}</td>
                      <td className="p-4 text-xs font-medium text-slate-500 dark:text-slate-400">{item.kelas_tersedia || '-'}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.note}</td>
                    </>
                  ) : masterSubTab === 'group' ? (
                    <>
                      <td className="p-4 font-semibold text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="p-4 text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {item.studentIds?.length ? `${item.studentIds.length} Siswa` : '-'}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.description || '-'}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</div>
                        <div className="text-xs text-slate-400">
                          {isSuperAdmin ? item.phone : (item.phone ? String(item.phone).trim().slice(0, 4) + '*****' : '-')}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.sensei_name || '-'}</td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Awal: {item.level_awal || '-'}</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Skrg: {item.level_sekarang || item.level || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{item.curriculumLevel || '-'}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[10rem]">{item.curriculumUnit || item.curriculumProgress || '-'}</div>
                        {item.graduateLevel && (
                          <div className="mt-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase">Graduate: {item.graduateLevel}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.type}</div>
                        <div className="text-xs text-slate-400">{item.durasi_kelas ? item.durasi_kelas + ' mnt' : '-'}</div>
                      </td>
                      <td className="p-4">
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
                      <td className="p-4">
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
                      <td className="p-4">
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
                      <td className="p-4 text-sm font-bold">
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
                      <td className="p-4">
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
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {(masterSubTab === 'student' || masterSubTab === 'sensei') && (
                        <button 
                          onClick={() => { 
                            setSelectedProfileData({ type: masterSubTab === 'sensei' ? 'sensei' : 'student', data: item }); 
                            setShowProfileModal(true); 
                          }}
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          title="View Profile"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {masterSubTab === 'student' && (
                        <>
                          <button 
                            onClick={() => { setSelectedResourceStudent(item); setShowResourceHub(true); }}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800"
                            title="Resource Hub"
                          >
                            <BookOpen size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedTrackerStudent(item); setShowTrackerModal(true); }}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800"
                            title="Lesson Tracker"
                          >
                            <ClipboardList size={18} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => { setFormData(item); setShowForm(true); }}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ id: item.id, name: masterSubTab === 'offday' ? senseiList.find(s => s.id === item.senseiId)?.name || 'Off Day' : item.name })}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-rose-100 dark:border-rose-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                  <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Konfirmasi Hapus</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-600"
                  >
                    Hapus
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[92vh] overflow-hidden flex flex-col">
                <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {formData.id ? 'Edit' : 'Tambah'} {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup / SP' : 'Off Day'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 dark:text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-5 sm:p-6 pb-28 sm:pb-6 space-y-4 flex-1 overflow-y-auto">
                  {masterSubTab === 'offday' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sensei</label>
                        <select 
                          value={formData.senseiId || ''}
                          onChange={e => setFormData({ ...formData, senseiId: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                        >
                          <option value="">Pilih Sensei</option>
                          {senseiList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal</label>
                        <input 
                          type="date" 
                          value={formData.date || ''}
                          onChange={e => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Alasan</label>
                        <textarea 
                          value={formData.reason || ''}
                          onChange={e => setFormData({ ...formData, reason: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{masterSubTab === 'group' ? 'Nama Grup / SP' : 'Nama Lengkap'}</label>
                        <input 
                          type="text" 
                          value={formData.name || ''}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          placeholder="Masukkan nama..."
                        />
                      </div>
                      {masterSubTab === 'sensei' ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={formData.no_wa || ''}
                                onChange={e => setFormData({ ...formData, no_wa: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="08..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                              <input 
                                type="email" 
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="email@ext.com"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Mengajar</label>
                              <select 
                                value={formData.level_mengajar || 'blank'}
                                onChange={e => setFormData({ ...formData, level_mengajar: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kelas Tersedia</label>
                              <select 
                                value={formData.kelas_tersedia || 'blank'}
                                onChange={e => setFormData({ ...formData, kelas_tersedia: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Catatan</label>
                            <textarea 
                              value={formData.note || ''}
                              onChange={e => setFormData({ ...formData, note: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              placeholder="Masukkan catatan..."
                              rows={2}
                            />
                          </div>
                        </>
                      ) : masterSubTab === 'group' ? (
                        <>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Deskripsi Grup / SP</label>
                            <textarea 
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              placeholder="Deskripsi grup..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Siswa (Anggota Grup)</label>
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
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={isSuperAdmin ? (formData.phone || '') : (formData.phone ? String(formData.phone).trim().slice(0, 4) + '*****' : '')}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                disabled={!isSuperAdmin}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white disabled:opacity-75 disabled:cursor-not-allowed"
                                placeholder="Contoh: 08123456789"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Sensei</label>
                              <select 
                                value={formData.sensei_name || ''}
                                onChange={e => setFormData({ ...formData, sensei_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                <option value="">Pilih Sensei...</option>
                                {senseiList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Awal</label>
                              <select 
                                value={formData.level_awal || 'blank'}
                                onChange={e => setFormData({ ...formData, level_awal: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Sekarang</label>
                              <select 
                                value={formData.level_sekarang || formData.level || 'blank'}
                                onChange={e => setFormData({ ...formData, level_sekarang: e.target.value, level: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipe Kelas</label>
                              <select 
                                value={formData.type || 'blank'}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Durasi (Menit)</label>
                              <input 
                                type="text" 
                                value={formData.durasi_kelas || ''}
                                onChange={e => setFormData({ ...formData, durasi_kelas: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="30, 60, 90..."
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kuota Sesi</label>
                            <input
                              type="number"
                              min="1"
                              value={formData.sessionQuota || 10}
                              onChange={e => setFormData({ ...formData, sessionQuota: parseInt(e.target.value) || 10 })}
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              placeholder="Contoh: 10"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status Pembayaran</label>
                              <select 
                                value={formData.payment_status || 'Unpaid'}
                                onChange={e => setFormData({ ...formData, payment_status: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                <option value="Unpaid">Unpaid</option>
                                <option value="Paid">Paid</option>
                                <option value="Lunas">Lunas</option>
                                <option value="Cicilan">Cicilan</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status Siswa</label>
                              <select 
                                value={formData.is_active === false ? 'Inactive' : 'Active'}
                                onChange={e => setFormData({ ...formData, is_active: e.target.value === 'Active' })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                              </select>
                            </div>
                          </div>

                          {formData.is_active === false && (
                            <div className="mt-4">
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Alasan Berhenti</label>
                              <input 
                                type="text"
                                value={formData.inactive_reason || ''}
                                onChange={e => setFormData({ ...formData, inactive_reason: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="Contoh: Pindah rumah, Lulus, Biaya, dll."
                              />
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Curriculum & Graduate Progress</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Curriculum Level</label>
                                <select
                                  value={formData.curriculumLevel || formData.level_sekarang || formData.level || 'blank'}
                                  onChange={e => setFormData({ ...formData, curriculumLevel: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                >
                                  {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Graduate Level</label>
                                <select
                                  value={formData.graduateLevel || 'blank'}
                                  onChange={e => setFormData({ ...formData, graduateLevel: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                >
                                  {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Current Unit / Bab</label>
                                <input
                                  type="text"
                                  value={formData.curriculumUnit || ''}
                                  onChange={e => setFormData({ ...formData, curriculumUnit: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                  placeholder="Contoh: Bab 3 - Minna no Nihongo"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Progress Note</label>
                                <input
                                  type="text"
                                  value={formData.curriculumProgress || ''}
                                  onChange={e => setFormData({ ...formData, curriculumProgress: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                  placeholder="Contoh: 7/12 unit, review kanji"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resource Hub Links (Optional)</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Google Classroom URL</label>
                                <input 
                                  type="url"
                                  value={formData.classroom_link || ''}
                                  onChange={e => setFormData({ ...formData, classroom_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                  placeholder="https://classroom.google.com/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Google Chat Space URL</label>
                                <input 
                                  type="url"
                                  value={formData.chat_link || ''}
                                  onChange={e => setFormData({ ...formData, chat_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                  placeholder="https://mail.google.com/chat/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Progress Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.progress_link || ''}
                                  onChange={e => setFormData({ ...formData, progress_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                                  placeholder="https://docs.google.com/spreadsheets/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Curriculum Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.curriculum_link || ''}
                                  onChange={e => setFormData({ ...formData, curriculum_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
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
                <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex flex-col-reverse sm:flex-row gap-3 shrink-0">
                  <button 
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

