import { Fragment, lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Search, ChevronLeft, ChevronRight, ChevronDown, Database, Bell, X, Loader2, Eye, BookOpen, ClipboardList, Download, MoreHorizontal, Archive, CalendarPlus, FileUp} from 'lucide-react';
import { 
  format, parseISO, differenceInDays, startOfDay} from 'date-fns';
import { toast } from 'sonner';

import { CLASS_TYPES, CLASS_LEVELS, OFFDAY_REASON_OPTIONS, splitOffdayReason, composeOffdayReason } from '../constants';
import { exportToCsv, getValidAcademicScore, getScheduleStudentIds } from '../utils/helpers';
import { useAppContext } from '../context/AppContext';
import { Sensei, Schedule } from '../types';
import { LeaveRequestReviewPanel } from './LeaveRequestReviewPanel';

const BulkImportModal = lazy(() => import('./BulkImportModal').then(module => ({ default: module.BulkImportModal })));

export const MasterData = () => {
const { masterSubTab, senseiList, studentList, groupList, offDays, schedules, lessonTrackers, studentStatusFilter, setStudentStatusFilter, globalSearchTerm, setGlobalSearchTerm, setShowTrackerModal, setShowProfileModal, setSelectedProfileData, setSelectedTrackerStudent, setShowResourceHub, setSelectedResourceStudent, setShowScheduleModal, setEditingSchedule, setSelectedCell, dbOps, isSuperAdmin, isDataLoading } = useAppContext(state => ({
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
  setShowScheduleModal: state.setShowScheduleModal,
  setEditingSchedule: state.setEditingSchedule,
  setSelectedCell: state.setSelectedCell,
  dbOps: state.dbOps,
  isSuperAdmin: state.isSuperAdmin,
  isDataLoading: state.isDataLoading
}));
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, name: string, mode?: 'delete' | 'archive' } | null>(null);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [isOffdayReasonOpen, setIsOffdayReasonOpen] = useState(false);
    const [showBulkImport, setShowBulkImport] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    const senseiById = useMemo(() => {
      return new Map((senseiList as Sensei[]).map(sensei => [sensei.id, sensei]));
    }, [senseiList]);

    const studentScoreStats = useMemo(() => {
      const stats = new Map<string, { sum: number; count: number; average: number | null }>();
      lessonTrackers.forEach((tracker: any) => {
        if (!tracker.studentId) return;
        const score = getValidAcademicScore(tracker);
        if (score === null) return;
        const current = stats.get(tracker.studentId) || { sum: 0, count: 0, average: null };
        current.sum += score;
        current.count += 1;
        current.average = Number((current.sum / current.count).toFixed(1));
        stats.set(tracker.studentId, current);
      });
      return stats;
    }, [lessonTrackers]);

    const latestScheduleDateByStudentId = useMemo(() => {
      const latest = new Map<string, number>();
      (schedules as Schedule[]).forEach(schedule => {
        if (schedule.status === 'cancelled' || !schedule.date) return;
        const time = parseISO(schedule.date).getTime();
        if (Number.isNaN(time)) return;
        const studentIds = getScheduleStudentIds(schedule);
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

    const createScheduleForStudent = (student: any) => {
      const assignedSensei = senseiList.find(sensei => sensei.name === student.sensei_name);
      if (!assignedSensei) {
        toast.error('Sensei utama siswa belum terhubung. Pilih sensei pada data siswa terlebih dahulu.');
        return;
      }
      setEditingSchedule(null);
      setSelectedCell({
        senseiId: assignedSensei.id,
        date: new Date(),
        studentIds: [student.id],
        type: student.type || 'Private',
        level: student.level_sekarang || student.level_awal || student.level || 'Intensif N5'
      });
      setShowScheduleModal(true);
      setOpenActionMenuId(null);
    };

    const handleSave = async () => {
      // FIX #10: Validasi nama wajib diisi sebelum kirim ke DB
      const nameField = masterSubTab === 'offday' ? null : (formData.name || '').trim();
      if (nameField !== null && !nameField) {
        const label = masterSubTab === 'sensei' ? 'Nama Sensei' : masterSubTab === 'student' ? 'Nama Siswa' : 'Nama Grup/SP';
        toast.error(`${label} tidak boleh kosong.`);
        return;
      }
      if (masterSubTab === 'offday' && !formData.senseiId) {
        toast.error('Pilih Sensei terlebih dahulu.');
        return;
      }
      if (masterSubTab === 'offday' && !formData.date) {
        toast.error('Tanggal libur wajib diisi.');
        return;
      }

      setIsSaving(true);
      const collectionName = masterSubTab === 'sensei' ? 'sensei' : masterSubTab === 'student' ? 'students' : masterSubTab === 'group' ? 'groups' : 'offdays';
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup/SP' : 'Hari Libur';
      const dataToSave = masterSubTab === 'student'
        ? {
            ...formData,
            level_sekarang: formData.level_sekarang || formData.level_awal || 'blank',
            level: formData.level || formData.level_sekarang || formData.level_awal || 'blank'
          }
        : masterSubTab === 'sensei'
          ? { ...formData, timezone: formData.timezone || 'Asia/Jakarta' }
          : formData;
      
      try {
        await dbOps.save(collectionName, dataToSave);
        toast.success(`${label} berhasil disimpan!`);
        setShowForm(false);
        setIsOffdayReasonOpen(false);
        setFormData({});
      } catch (err: any) {
        console.error('Save failed:', err);
        toast.error(`Gagal menyimpan ${label}: ${err?.message || 'Terjadi kesalahan.'}`);
      } finally {
        setIsSaving(false);
      }
    };

    const handleDelete = async () => {
      if (!deleteConfirm) return;
      
      const collectionName = masterSubTab === 'sensei' ? 'sensei' : masterSubTab === 'student' ? 'students' : masterSubTab === 'group' ? 'groups' : 'offdays';
      const label = masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup/SP' : 'Hari Libur';
      
      try {
        if (deleteConfirm.mode === 'archive' && masterSubTab === 'student') {
          const student = studentList.find((item: any) => item.id === deleteConfirm.id);
          if (!student) throw new Error('Siswa tidak ditemukan.');
          await dbOps.save('students', {
            ...student,
            is_active: false,
            inactive_reason: student.inactive_reason || 'Diarsipkan'
          });
          toast.success('Siswa berhasil diarsipkan.');
        } else {
          await dbOps.delete(collectionName, deleteConfirm.id);
          toast.success(`${label} berhasil dihapus!`);
        }
        setDeleteConfirm(null);
      } catch (err: any) {
        // FIX #10: Tampilkan toast error agar user tahu jika delete/archive gagal
        console.error('Delete failed:', err);
        toast.error(`Gagal menghapus ${label}: ${err?.message || 'Terjadi kesalahan.'}`);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex items-center gap-3 border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-950">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total {masterSubTab === 'sensei' ? 'Sensei' : masterSubTab === 'student' ? 'Siswa' : masterSubTab === 'group' ? 'Grup' : 'Hari Libur'}:</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{filteredData.length}</span>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            {masterSubTab === 'student' && (
              <div className="col-span-2 flex border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 sm:col-span-1">
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
            {(masterSubTab === 'sensei' || masterSubTab === 'student') && (
              <button
                onClick={() => setShowBulkImport(true)}
                className="flex h-10 items-center justify-center gap-2 border border-cyan-600 bg-cyan-600 px-3 text-sm font-black text-white hover:bg-cyan-700 sm:h-11 sm:px-4"
              >
                <FileUp size={18} />
                Impor CSV
              </button>
            )}
            {masterSubTab !== 'offday' && <button
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
              className="flex h-10 items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-700 sm:h-11 sm:px-4"
            >
              <Download size={18} />
              Ekspor
            </button>}
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari data..." 
                value={globalSearchTerm}
                onChange={e => setGlobalSearchTerm(e.target.value)}
                className="ui-input w-full pl-10 sm:w-64"
              />
            </div>
            {masterSubTab !== 'offday' && <button
              onClick={() => { 
                const defaultData = masterSubTab === 'student'
                  ? { is_active: true, payment_status: 'Unpaid', level_awal: 'blank', type: 'Private' }
                  : masterSubTab === 'sensei'
                    ? { timezone: 'Asia/Jakarta' }
                    : {};
                setFormData(defaultData); 
                setShowForm(true);
                setIsOffdayReasonOpen(false);
              }}
              className="flex h-10 items-center justify-center gap-2 border border-indigo-600 bg-indigo-600 px-3 text-sm font-black text-white hover:bg-indigo-700 sm:h-11 sm:px-5"
            >
              <Plus size={20} />
              Tambah
            </button>}
          </div>
        </div>

        {masterSubTab === 'offday' && <LeaveRequestReviewPanel />}

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
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Zona Waktu</th>
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
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Kelas & Durasi">Kelas</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Rata-rata Nilai">Nilai</th>
                    <th className="whitespace-nowrap px-3 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]" title="Pembayaran">Bayar</th>
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
                <Fragment key={item.id}>
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
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
                      <td className="px-3 py-3 text-xs font-black text-slate-500 dark:text-slate-400">{item.timezone === 'Asia/Makassar' ? 'WITA' : item.timezone === 'Asia/Jayapura' ? 'WIT' : 'WIB'}</td>
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
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.type}</div>
                        <div className="text-xs text-slate-400">{item.durasi_kelas ? item.durasi_kelas + ' mnt' : '-'}</div>
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
                        <button
                          onClick={() => setOpenActionMenuId(openActionMenuId === item.id ? null : item.id)}
                          className={`flex h-8 w-8 items-center justify-center border text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${
                            openActionMenuId === item.id
                              ? 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300'
                              : 'border-slate-200 dark:border-slate-700'
                          }`}
                          title={openActionMenuId === item.id ? 'Tutup aksi' : 'Aksi lainnya'}
                        >
                          <MoreHorizontal size={15} />
                        </button>
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
                {masterSubTab === 'student' && openActionMenuId === item.id && (
                  <tr className="bg-slate-50/70 dark:bg-slate-900/70">
                    <td colSpan={14} className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => createScheduleForStudent(item)}
                          className="flex h-8 items-center gap-2 border border-cyan-100 bg-white px-3 text-xs font-bold text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800 dark:bg-slate-950 dark:text-cyan-300"
                        >
                          <CalendarPlus size={14} /> Buat Jadwal
                        </button>
                        <button
                          onClick={() => { setSelectedResourceStudent(item); setShowResourceHub(true); setOpenActionMenuId(null); }}
                          className="flex h-8 items-center gap-2 border border-emerald-100 bg-white px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-950 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                        >
                          <BookOpen size={14} /> Resource
                        </button>
                        <button
                          onClick={() => { setSelectedTrackerStudent(item); setShowTrackerModal(true); setOpenActionMenuId(null); }}
                          className="flex h-8 items-center gap-2 border border-indigo-100 bg-white px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-300 dark:hover:bg-indigo-950/30"
                        >
                          <ClipboardList size={14} /> Tracker
                        </button>
                        <button
                              onClick={() => { setDeleteConfirm({ id: item.id, name: item.name, mode: 'archive' }); setOpenActionMenuId(null); }}
                              className="flex h-8 items-center gap-2 border border-amber-100 bg-white px-3 text-xs font-bold text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:bg-slate-950 dark:text-amber-300 dark:hover:bg-amber-950/30"
                            >
                              <Archive size={14} /> Arsipkan
                            </button>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
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
                  <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center border ${
                    deleteConfirm.mode === 'archive'
                      ? 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                  }`}>
                    {deleteConfirm.mode === 'archive' ? <Archive size={30} /> : <Trash2 size={32} />}
                  </div>
                  <h3 className="ui-modal-title mb-2">{deleteConfirm.mode === 'archive' ? 'Konfirmasi Arsipkan' : 'Konfirmasi Hapus'}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    {deleteConfirm.mode === 'archive' ? (
                      <>Siswa <strong>{deleteConfirm.name}</strong> akan dipindah ke Nonaktif. Jadwal, tracker, nilai, dan link resource tetap aman.</>
                    ) : (
                      <>Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong>? Tindakan ini tidak dapat dibatalkan.</>
                    )}
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
                    className={`flex-1 border px-5 py-3 text-sm font-black text-white ${
                      deleteConfirm.mode === 'archive'
                        ? 'border-amber-600 bg-amber-500 hover:bg-amber-600'
                        : 'border-rose-600 bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {deleteConfirm.mode === 'archive' ? 'Arsipkan' : 'Hapus'}
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
                  <button onClick={() => { setShowForm(false); setIsOffdayReasonOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 dark:text-slate-400">
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
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="relative">
                          <label className="ui-label">Jenis</label>
                          <button
                            type="button"
                            onClick={() => setIsOffdayReasonOpen(prev => !prev)}
                            className="ui-input flex items-center justify-between text-left"
                          >
                            <span>{splitOffdayReason(formData.reason).type}</span>
                            <ChevronDown size={16} className="text-slate-400" />
                          </button>
                          {isOffdayReasonOpen && (
                            <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 z-[80] max-h-64 overflow-y-auto border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                              {OFFDAY_REASON_OPTIONS.map(reason => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => {
                                    const current = splitOffdayReason(formData.reason);
                                    setFormData({ ...formData, reason: composeOffdayReason(reason, current.note) });
                                    setIsOffdayReasonOpen(false);
                                  }}
                                  className={`block w-full px-3 py-2 text-left text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ${
                                    splitOffdayReason(formData.reason).type === reason
                                      ? 'bg-indigo-600 text-white hover:bg-indigo-600'
                                      : 'text-slate-700 dark:text-slate-200'
                                  }`}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="ui-label">Catatan</label>
                          <input
                            type="text"
                            value={splitOffdayReason(formData.reason).note}
                            onChange={e => {
                              const current = splitOffdayReason(formData.reason);
                              setFormData({ ...formData, reason: composeOffdayReason(current.type, e.target.value) });
                            }}
                            className="ui-input"
                            placeholder="Opsional"
                          />
                        </div>
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
                          <div>
                            <label className="ui-label">Zona Waktu</label>
                            <select value={formData.timezone || 'Asia/Jakarta'} onChange={e => setFormData({ ...formData, timezone: e.target.value })} className="ui-input">
                              <option value="Asia/Jakarta">WIB</option>
                              <option value="Asia/Makassar">WITA</option>
                              <option value="Asia/Jayapura">WIT</option>
                            </select>
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
                            <label className="ui-label">Tipe Kelas</label>
                            <select
                              value={formData.type || 'Private'}
                              onChange={e => setFormData({ ...formData, type: e.target.value })}
                              className="ui-input"
                            >
                              {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
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

                        </>
                      )}
                    </>
                  )}
                </div>
                <div className="ui-modal-footer">
                  <button 
                    onClick={() => { setShowForm(false); setIsOffdayReasonOpen(false); }}
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
        {showBulkImport && (masterSubTab === 'sensei' || masterSubTab === 'student') && (
          <Suspense fallback={null}>
            <BulkImportModal
              type={masterSubTab}
              senseiList={senseiList}
              studentList={studentList}
              dbOps={dbOps}
              onClose={() => setShowBulkImport(false)}
            />
          </Suspense>
        )}
      </div>
    );
  };
