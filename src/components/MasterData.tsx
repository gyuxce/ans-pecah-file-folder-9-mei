import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Search, ChevronLeft, ChevronRight, Database, Bell, X, Loader2, Eye, BookOpen, ClipboardList, Download} from 'lucide-react';
import { 
  format, parseISO, differenceInDays, startOfDay} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { CLASS_TYPES, CLASS_LEVELS } from '../constants';
import { exportToExcel, scheduleHasStudent } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
export const MasterData = () => {
const { masterSubTab, senseiList, studentList, groupList, offDays, schedules, lessonTrackers, studentStatusFilter, setStudentStatusFilter, globalSearchTerm, setGlobalSearchTerm, setShowTrackerModal, setShowProfileModal, setSelectedProfileData, setSelectedTrackerStudent, setShowResourceHub, setSelectedResourceStudent, dbOps } = useAppContext();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string } | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

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
          const sensei = senseiList.find(s => s.id === o.senseiId);
          return (sensei?.name || '').toLowerCase().includes(search) || (o.reason || '').toLowerCase().includes(search);
        });
      }
      return results;
    }, [masterSubTab, senseiList, studentList, groupList, offDays, globalSearchTerm, studentStatusFilter]);

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
            <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup' : 'Off Day'}:</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{filteredData.length}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {masterSubTab === 'student' && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => setStudentStatusFilter('Active')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${studentStatusFilter === 'Active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                >
                  Aktif
                </button>
                <button 
                  onClick={() => setStudentStatusFilter('Inactive')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${studentStatusFilter === 'Inactive' ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500'}`}
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
                     const lt = lessonTrackers.filter((l: any) => l.studentId === st.id && l.material);
                     let avg: string | number = 'N/A';
                     if (lt.length > 0) {
                        const sum = lt.reduce((acc: number, item: any) => acc + (Number(item.score) || 0), 0);
                        avg = Number((sum / lt.length).toFixed(1));
                     }
                     return { ...st, 'Avg Score': avg };
                   });
                }
                exportToExcel(dataToExport, `${masterSubTab}_data`);
              }}
              className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
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
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all w-64 dark:text-white"
              />
            </div>
            <button 
              onClick={() => { 
                const defaultData = masterSubTab === 'student' ? { is_active: true, payment_status: 'Unpaid' } : {};
                setFormData(defaultData); 
                setShowForm(true); 
              }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Plus size={20} />
              Tambah
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden overflow-x-auto">
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
                    <th className="p-4 text-left text-sm font-black text-slate-400 uppercase tracking-widest">Kelas & Durasi</th>
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
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                    <Database size={48} className="mx-auto mb-4 opacity-20" />
                    Belum ada data yang ditemukan.
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
                        <div className="text-xs text-slate-400">{item.phone}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{item.sensei_name || '-'}</td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-tighter">Awal: {item.level_awal || '-'}</div>
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">Skrg: {item.level_sekarang || item.level || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.type}</div>
                        <div className="text-xs text-slate-400">{item.durasi_kelas ? item.durasi_kelas + ' mnt' : '-'}</div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const studentTrackers = lessonTrackers.filter((lt: any) => lt.studentId === item.id && lt.material);
                          if (studentTrackers.length === 0) return <span className="text-slate-400 text-xs italic">N/A</span>;
                          const sum = studentTrackers.reduce((acc: number, lt: any) => acc + (Number(lt.score) || 0), 0);
                          const avg = (sum / studentTrackers.length).toFixed(1);
                          return (
                             <div className="inline-flex py-1.5 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl items-center justify-center min-w-[3rem]">
                                <span className="text-sm font-black">{avg}</span>
                             </div>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                          item.payment_status === 'Lunas' || item.payment_status === 'Paid' 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                            : item.payment_status === 'Cicilan'
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                        }`}>
                          {item.payment_status || 'Unpaid'}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold">
                        {(() => {
                          const studentSchedules = schedules.filter(s => scheduleHasStudent(s, item.id) && s.status !== 'cancelled');
                          if (studentSchedules.length === 0) return <span className="text-slate-400">-</span>;
                          const dates = studentSchedules.map(s => parseISO(s.date).getTime()).filter(t => !Number.isNaN(t));
                          if (dates.length === 0) return <span className="text-slate-400">-</span>;
                          const maxDate = new Date(Math.max(...dates));
                          const today = startOfDay(new Date());
                          const diff = differenceInDays(startOfDay(maxDate), today);
                          
                          const isUrgent = diff >= 0 && diff <= 1;
                          const isOverdue = diff < 0;
 
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${isUrgent ? 'text-rose-600' : isOverdue ? 'text-slate-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                {format(maxDate, 'dd MMM yyyy')}
                              </span>
                              {isUrgent && (
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ repeat: Infinity, duration: 1.5 }}
                                  className="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-1 rounded-lg"
                                  title="H-1 atau Hari Ini Selesai!"
                                >
                                  <Bell size={12} />
                                </motion.div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
                          item.is_active !== false 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
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
                          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                          title="View Profile"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      {masterSubTab === 'student' && (
                        <>
                          <button 
                            onClick={() => { setSelectedResourceStudent(item); setShowResourceHub(true); }}
                            className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-800"
                            title="Resource Hub"
                          >
                            <BookOpen size={18} />
                          </button>
                          <button 
                            onClick={() => { setSelectedTrackerStudent(item); setShowTrackerModal(true); }}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800"
                            title="Lesson Tracker"
                          >
                            <ClipboardList size={18} />
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => { setFormData(item); setShowForm(true); }}
                        className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ id: item.id, name: masterSubTab === 'offday' ? senseiList.find(s => s.id === item.senseiId)?.name || 'Off Day' : item.name })}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
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
                  className="p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button 
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-400 hover:bg-white dark:hover:bg-slate-800'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
              >
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    className="flex-1 px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Form Modal */}
        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {formData.id ? 'Edit' : 'Tambah'} {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Student' : masterSubTab === 'group' ? 'Grup / SP' : 'Off Day'}
                  </h3>
                  <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors dark:text-slate-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {masterSubTab === 'offday' ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sensei</label>
                        <select 
                          value={formData.senseiId || ''}
                          onChange={e => setFormData({ ...formData, senseiId: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Alasan</label>
                        <textarea 
                          value={formData.reason || ''}
                          onChange={e => setFormData({ ...formData, reason: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                          placeholder="Masukkan nama..."
                        />
                      </div>
                      {masterSubTab === 'sensei' ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={formData.no_wa || ''}
                                onChange={e => setFormData({ ...formData, no_wa: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="08..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email</label>
                              <input 
                                type="email" 
                                value={formData.email || ''}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="email@ext.com"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Mengajar</label>
                              <select 
                                value={formData.level_mengajar || 'blank'}
                                onChange={e => setFormData({ ...formData, level_mengajar: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kelas Tersedia</label>
                              <select 
                                value={formData.kelas_tersedia || 'blank'}
                                onChange={e => setFormData({ ...formData, kelas_tersedia: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              placeholder="Deskripsi grup..."
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Siswa (Anggota Grup)</label>
                            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 max-h-48 overflow-y-auto w-full">
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
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">No. WhatsApp</label>
                              <input 
                                type="text" 
                                value={formData.phone || ''}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="Contoh: 08123456789"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Sensei</label>
                              <select 
                                value={formData.sensei_name || ''}
                                onChange={e => setFormData({ ...formData, sensei_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                <option value="">Pilih Sensei...</option>
                                {senseiList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Awal</label>
                              <select 
                                value={formData.level_awal || 'blank'}
                                onChange={e => setFormData({ ...formData, level_awal: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Sekarang</label>
                              <select 
                                value={formData.level_sekarang || formData.level || 'blank'}
                                onChange={e => setFormData({ ...formData, level_sekarang: e.target.value, level: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                              >
                                {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipe Kelas</label>
                              <select 
                                value={formData.type || 'blank'}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="30, 60, 90..."
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status Pembayaran</label>
                              <select 
                                value={formData.payment_status || 'Unpaid'}
                                onChange={e => setFormData({ ...formData, payment_status: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
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
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                                placeholder="Contoh: Pindah rumah, Lulus, Biaya, dll."
                              />
                            </div>
                          )}

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Resource Hub Links (Optional)</h4>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Google Classroom URL</label>
                                <input 
                                  type="url"
                                  value={formData.classroom_link || ''}
                                  onChange={e => setFormData({ ...formData, classroom_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                  placeholder="https://classroom.google.com/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Google Chat Space URL</label>
                                <input 
                                  type="url"
                                  value={formData.chat_link || ''}
                                  onChange={e => setFormData({ ...formData, chat_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                  placeholder="https://mail.google.com/chat/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Progress Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.progress_link || ''}
                                  onChange={e => setFormData({ ...formData, progress_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                                  placeholder="https://docs.google.com/spreadsheets/..."
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Curriculum Google Sheets URL</label>
                                <input 
                                  type="url"
                                  value={formData.curriculum_link || ''}
                                  onChange={e => setFormData({ ...formData, curriculum_link: e.target.value })}
                                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
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
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex gap-3">
                  <button 
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          <Loader2 size={20} />
                        </motion.div>
                        Menyimpan...
                      </>
                    ) : 'Simpan'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

