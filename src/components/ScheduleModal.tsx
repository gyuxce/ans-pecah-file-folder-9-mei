import { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, Search, AlertCircle, X, Loader2} from 'lucide-react';
import { 
  format, addDays, parseISO, getDay} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

import { CLASS_TYPES, CLASS_LEVELS, DAYS_OF_WEEK } from '../constants';
import { Schedule } from '../types';
import { useAppContext } from '../context/AppContext';
export const ScheduleModal = () => {
const { senseiList, studentList, groupList, offDays, schedules, setShowScheduleModal, editingSchedule, setEditingSchedule, selectedCell, setSelectedCell, user, dbOps } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  groupList: state.groupList,
  offDays: state.offDays,
  schedules: state.schedules,
  setShowScheduleModal: state.setShowScheduleModal,
  editingSchedule: state.editingSchedule,
  setEditingSchedule: state.setEditingSchedule,
  selectedCell: state.selectedCell,
  setSelectedCell: state.setSelectedCell,
  user: state.user,
  dbOps: state.dbOps
}));
    const [formData, setFormData] = useState<any>(() => {
      if (editingSchedule) {
        const start = parseISO(`2000-01-01T${editingSchedule.startTime}`);
        const end = parseISO(`2000-01-01T${editingSchedule.endTime}`);
        const diffMs = end.getTime() - start.getTime();
        const duration = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        return { 
          ...editingSchedule, 
          duration,
          studentIds: editingSchedule.studentIds || (editingSchedule.studentId ? [editingSchedule.studentId] : []),
          isGroupClass: !!editingSchedule.groupId
        };
      }
      if (selectedCell) return { 
        senseiId: selectedCell.senseiId, 
        date: format(selectedCell.date, 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        type: 'Private',
        level: 'Intensif N5',
        status: 'active',
        targetSessions: 1,
        daysOfWeek: [],
        studentIds: [],
        isGroupClass: false,
        groupId: null
      };
      return {
        senseiId: senseiList[0]?.id || '',
        studentIds: [],
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:30',
        duration: 90,
        type: 'Private',
        level: 'Intensif N5',
        status: 'active',
        targetSessions: 1,
        daysOfWeek: [],
        isGroupClass: false,
        groupId: null
      };
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const isSenseiBusy = useMemo(() => {
      if (!formData.senseiId || !formData.date || !formData.startTime || !formData.endTime) return false;
      return schedules.some(s => {
        if (s.id === editingSchedule?.id) return false;
        if (s.senseiId !== formData.senseiId || s.date !== formData.date || s.status === 'cancelled') return false;
        return (formData.startTime < s.endTime && formData.endTime > s.startTime);
      });
    }, [formData.senseiId, formData.date, formData.startTime, formData.endTime, schedules, editingSchedule]);

    const isSenseiOff = useMemo(() => {
      if (!formData.senseiId || !formData.date) return false;
      return offDays.some(o => o.senseiId === formData.senseiId && o.date === formData.date);
    }, [formData.senseiId, formData.date, offDays]);

    const estimatedFinishDate = useMemo(() => {
      if (!formData.date || formData.targetSessions <= 1) return formData.date;
      try {
        let sessionsCreated = 0;
        let currentDateObj = parseISO(formData.date);
        const selectedDays = formData.daysOfWeek && formData.daysOfWeek.length > 0 ? formData.daysOfWeek : [getDay(currentDateObj)];
        let lastDate = currentDateObj;
        let safetyCounter = 0;
        while (sessionsCreated < formData.targetSessions && safetyCounter < 1000) {
          if (selectedDays.includes(getDay(currentDateObj))) {
            lastDate = currentDateObj;
            sessionsCreated++;
          }
          if (sessionsCreated < formData.targetSessions) {
            currentDateObj = addDays(currentDateObj, 1);
          }
          safetyCounter++;
        }
        return format(lastDate, 'yyyy-MM-dd');
      } catch (e) { return formData.date; }
    }, [formData.date, formData.targetSessions, formData.daysOfWeek]);

    useEffect(() => {
      if (formData.startTime && formData.duration) {
        try {
          const [hours, minutes] = formData.startTime.split(':').map(Number);
          const date = new Date(2000, 0, 1, hours, minutes);
          const endDate = new Date(date.getTime() + formData.duration * 60000);
          const calculatedEndTime = format(endDate, 'HH:mm');
          if (calculatedEndTime !== formData.endTime) {
            setFormData((prev: any) => ({ ...prev, endTime: calculatedEndTime }));
          }
        } catch (e) { console.error('Error calculating end time:', e); }
      }
    }, [formData.startTime, formData.duration]);

    const [senseiSearch, setSenseiSearch] = useState('');
    const [isSenseiDropdownOpen, setIsSenseiDropdownOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
    const [groupSearch, setGroupSearch] = useState('');
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const filteredSensei = senseiList.filter(s => (s.name || '').toLowerCase().includes((senseiSearch || '').toLowerCase()));
    const filteredStudents = studentList
      .filter(s => (s.name || '').toLowerCase().includes((studentSearch || '').toLowerCase()))
      .filter(s => !formData.studentIds?.includes(s.id));
    const filteredGroups = groupList.filter((g: any) => (g.name || '').toLowerCase().includes((groupSearch || '').toLowerCase()));

    const handleSaveSchedule = async () => {
      if (!formData.senseiId) return toast.error('Silahkan pilih Sensei');
      if (!formData.studentIds || formData.studentIds.length === 0) return toast.error('Silahkan pilih minimal satu Siswa');
      setIsSubmitting(true);
      try {
        const newSchedules: Schedule[] = [];
        let sessionsCreated = 0;
        let currentDateObj = parseISO(formData.date);
        if (Number.isNaN(currentDateObj.getTime())) throw new Error('Tanggal mulai tidak valid');
        
        if (formData.targetSessions > 1 && !editingSchedule) {
          const selectedDays = formData.daysOfWeek && formData.daysOfWeek.length > 0 ? formData.daysOfWeek : [getDay(currentDateObj)];
          let safetyCounter = 0;
          while (sessionsCreated < formData.targetSessions && safetyCounter < 1000) {
            if (selectedDays.includes(getDay(currentDateObj))) {
              newSchedules.push({
                id: crypto.randomUUID(),
                senseiId: formData.senseiId,
                groupId: formData.isGroupClass ? formData.groupId : null,
                studentIds: formData.studentIds,
                type: formData.isGroupClass ? 'Group' : formData.type,
                level: formData.level,
                date: format(currentDateObj, 'yyyy-MM-dd'),
                startTime: formData.startTime,
                endTime: formData.endTime,
                status: 'active',
                updatedAt: new Date().toISOString(),
                updatedBy: user?.email || 'System'
              });
              sessionsCreated++;
            }
            currentDateObj = addDays(currentDateObj, 1);
            safetyCounter++;
          }
        } else {
          newSchedules.push({
            id: editingSchedule?.id || crypto.randomUUID(),
            senseiId: formData.senseiId,
            groupId: formData.isGroupClass ? formData.groupId : null,
            studentIds: formData.studentIds,
            type: formData.isGroupClass ? 'Group' : formData.type,
            level: formData.level,
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            status: formData.status,
            updatedAt: new Date().toISOString(),
            updatedBy: user?.email || 'System'
          });
        }
        await dbOps.bulkSave('schedules', newSchedules);
        toast.success(editingSchedule ? 'Jadwal berhasil diperbarui!' : `Berhasil membuat ${newSchedules.length} jadwal!`);
        setShowScheduleModal(false);
        setEditingSchedule(null);
        setSelectedCell(null);
      } catch (error: any) {
        toast.error(`Gagal menyimpan jadwal: ${error.message}`);
      } finally { setIsSubmitting(false); }
    };

    const handleDelete = async () => {
      if (!editingSchedule) return;
      setIsDeleting(true);
      try {
        await dbOps.delete('schedules', editingSchedule.id);
        toast.success('Jadwal berhasil dihapus!');
        setShowScheduleModal(false);
        setEditingSchedule(null);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20"
        >
          <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">{editingSchedule ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Lengkapi detail sesi belajar di bawah ini.</p>
            </div>
            <button onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); }} className="p-2 md:p-3 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm dark:text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8 overflow-y-auto space-y-6">
            {(isSenseiBusy || isSenseiOff) && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className={`p-4 rounded-2xl border flex items-center gap-3 ${isSenseiOff ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                <AlertCircle size={20} className={isSenseiOff ? 'text-rose-500' : 'text-amber-500'} />
                <div className="text-sm font-bold">{isSenseiOff ? 'Sensei sedang OFF di tanggal ini!' : 'Sensei sudah memiliki jadwal lain di jam yang sama!'}</div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                  Sensei
                  {formData.senseiId && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSenseiBusy || isSenseiOff ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isSenseiOff ? 'OFF' : isSenseiBusy ? 'Busy' : 'Available'}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cari Sensei..."
                    value={senseiSearch || (senseiList.find(s => s.id === formData.senseiId)?.name || '')}
                    onFocus={() => setIsSenseiDropdownOpen(true)}
                    onClick={() => setIsSenseiDropdownOpen(true)}
                    onBlur={() => setIsSenseiDropdownOpen(false)}
                    onChange={e => {
                      setSenseiSearch(e.target.value);
                      setIsSenseiDropdownOpen(true);
                      setFormData((prev: any) => ({ ...prev, senseiId: '' }));
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                  />
                </div>
                {isSenseiDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl max-h-40 overflow-y-auto text-slate-700 dark:text-slate-300">
                    {filteredSensei.map(s => {
                      const busy = schedules.some(sc => sc.senseiId === s.id && sc.date === formData.date && sc.status === 'active' && formData.startTime < sc.endTime && formData.endTime > sc.startTime);
                      const off = offDays.some(o => o.senseiId === s.id && o.date === formData.date);
                      return (
                        <div key={s.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setFormData((prev: any) => ({ ...prev, senseiId: s.id })); setSenseiSearch(''); setIsSenseiDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm font-medium flex justify-between items-center">
                          <span>{s.name}</span>
                          <span className={`text-[9px] font-black uppercase ${off ? 'text-rose-500' : busy ? 'text-amber-500' : 'text-emerald-500'}`}>{off ? 'OFF' : busy ? 'Busy' : 'Available'}</span>
                        </div>
                      );
                    })}
                    {filteredSensei.length === 0 && (
                      <div className="p-3 text-sm font-medium text-slate-400">Sensei tidak ditemukan</div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipe Kelas</label>
                <select value={formData.type || 'Private'} onChange={e => {
                  const newType = e.target.value;
                  const studentIds = formData.studentIds || [];
                  const adjustedStudentIds = (newType === 'Private' || newType === 'Kids Private') && studentIds.length > 1 ? [studentIds[0]] : studentIds;
                  setFormData((prev: any) => ({ ...prev, type: newType, studentIds: adjustedStudentIds }));
                }} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white">
                  {CLASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tipe Peserta</label>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-sm w-fit mb-4">
                  <button onClick={() => setFormData((prev: any) => ({ ...prev, isGroupClass: false, groupId: null }))} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex-[1] text-center ${!formData.isGroupClass ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Peserta Individu</button>
                  <button onClick={() => setFormData((prev: any) => ({ ...prev, isGroupClass: true, studentIds: [] }))} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all flex-[1] text-center ${formData.isGroupClass ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Kelas Grup (SP)</button>
                </div>

                {formData.isGroupClass ? (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Pilih Grup / SP</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Cari Grup/SP..."
                        value={groupSearch || (groupList.find((g: any) => g.id === formData.groupId)?.name || '')}
                        onFocus={() => setIsGroupDropdownOpen(true)}
                        onClick={() => setIsGroupDropdownOpen(true)}
                        onBlur={() => setIsGroupDropdownOpen(false)}
                        onChange={e => {
                          setGroupSearch(e.target.value);
                          setIsGroupDropdownOpen(true);
                          setFormData((prev: any) => ({ ...prev, groupId: '', studentIds: [] }));
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                      />
                      {isGroupDropdownOpen && (
                        <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl max-h-40 overflow-y-auto text-slate-700 dark:text-slate-300">
                          {filteredGroups.map((g: any) => (
                            <div
                              key={g.id}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormData((prev: any) => ({ ...prev, groupId: g.id, studentIds: g.studentIds || [] }));
                                setGroupSearch('');
                                setIsGroupDropdownOpen(false);
                              }}
                              className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm font-medium flex justify-between items-center"
                            >
                              <span>{g.name}</span>
                              <span className="text-[9px] font-black uppercase text-indigo-500">{g.studentIds?.length || 0} Siswa</span>
                            </div>
                          ))}
                          {filteredGroups.length === 0 && (
                            <div className="p-3 text-sm font-medium text-slate-400">Grup/SP tidak ditemukan</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Anggota Grup:</label>
                      <div className="flex flex-wrap gap-2">
                        {formData.studentIds?.map((sid: string) => (
                          <div key={sid} className="bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold">
                            {studentList.find(s => s.id === sid)?.name || 'Unknown'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Student(s) {(formData.type === 'Group' || formData.type === 'Semi-Private') && <span className="ml-2 text-indigo-500 normal-case">(Bisa pilih multi)</span>}</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.studentIds?.map((sid: string) => (
                        <div key={sid} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-xs font-bold shadow-sm">
                          {studentList.find(st => st.id === sid)?.name || 'Unknown'}
                          <button onClick={() => setFormData((prev: any) => ({ ...prev, studentIds: prev.studentIds.filter((id: string) => id !== sid) }))} className="hover:text-rose-500"><X size={14} /></button>
                        </div>
                      ))}
                      {(!formData.studentIds || formData.studentIds.length === 0) && <span className="text-xs text-slate-400 italic">Belum ada siswa terpilih</span>}
                    </div>
                    {((formData.type !== 'Private' && formData.type !== 'Kids Private') || (formData.studentIds?.length || 0) < 1) && (
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          placeholder="Cari & Tambah Siswa..."
                          value={studentSearch}
                          onFocus={() => setIsStudentDropdownOpen(true)}
                          onClick={() => setIsStudentDropdownOpen(true)}
                          onBlur={() => setIsStudentDropdownOpen(false)}
                          onChange={e => {
                            setStudentSearch(e.target.value);
                            setIsStudentDropdownOpen(true);
                          }}
                          className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white"
                        />
                        {isStudentDropdownOpen && (
                          <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl max-h-40 overflow-y-auto text-slate-700 dark:text-slate-300">
                            {filteredStudents.map(s => (
                              <div
                                key={s.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFormData((prev: any) => ({ ...prev, studentIds: [...(prev.studentIds || []), s.id], level: s.level_sekarang || s.level }));
                                  setStudentSearch('');
                                  setIsStudentDropdownOpen(false);
                                }}
                                className="p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer text-sm font-medium"
                              >
                                {s.name} <span className="text-[10px] text-slate-400 ml-2">({s.level})</span>
                              </div>
                            ))}
                            {filteredStudents.length === 0 && (
                              <div className="p-3 text-sm font-medium text-slate-400">Siswa tidak ditemukan</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 md:col-span-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level Materi</label>
                  <select value={formData.level || 'Intensif N5'} onChange={e => setFormData((prev: any) => ({ ...prev, level: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white">
                    {CLASS_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal</label>
                  <input type="date" value={formData.date || ''} onChange={e => setFormData((prev: any) => ({ ...prev, date: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Jam Mulai</label>
                  <input type="time" value={formData.startTime || ''} onChange={e => setFormData((prev: any) => ({ ...prev, startTime: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between">Durasi (Menit) <span className="text-indigo-500 font-mono text-[10px]">{formData.endTime && `Selesai: ${formData.endTime}`}</span></label>
                  <input type="number" value={formData.duration || ''} onChange={e => setFormData((prev: any) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white" />
                </div>
              </div>

              {!editingSchedule && (
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Repeat Sesi</label>
                      <input type="number" min="1" max="100" value={formData.targetSessions || 1} onChange={e => setFormData((prev: any) => ({ ...prev, targetSessions: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white" />
                    </div>
                    {formData.targetSessions > 1 && (
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Estimasi Selesai</label>
                        <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl border border-indigo-100 dark:border-indigo-800 text-sm">{format(parseISO(estimatedFinishDate), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                  </div>
                  {formData.targetSessions > 1 && (
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map(day => (
                        <button key={day.value} onClick={() => {
                          const current = formData.daysOfWeek || [];
                          const updated = current.includes(day.value) ? current.filter((d: number) => d !== day.value) : [...current, day.value];
                          setFormData((prev: any) => ({ ...prev, daysOfWeek: updated }));
                        }} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.daysOfWeek?.includes(day.value) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>{day.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-4">
            {editingSchedule && <button onClick={() => setShowDeleteConfirm(true)} className="px-6 py-3 rounded-2xl font-black text-rose-600 hover:bg-rose-50 transition-all uppercase tracking-widest text-[10px]"><Trash2 size={16} />Hapus</button>}
            <div className="flex gap-3 ml-auto">
              <button onClick={() => { setShowScheduleModal(false); setEditingSchedule(null); }} className="px-8 py-3 rounded-2xl font-black text-slate-500 hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]">Batal</button>
              <button disabled={isSubmitting || !formData.senseiId || !formData.studentIds || formData.studentIds.length === 0} onClick={handleSaveSchedule} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-3 rounded-2xl font-black hover:scale-105 active:scale-95 transition-all shadow-xl uppercase tracking-widest text-[10px] disabled:opacity-50">{isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingSchedule ? 'Update Jadwal' : 'Simpan Jadwal'}</button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 shadow-2xl w-full max-w-sm border border-rose-100 text-center">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={32} /></div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Hapus Jadwal?</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sesi belajar ini akan dihapus secara permanen.</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">Batal</button>
                  <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200">{isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Hapus'}</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

