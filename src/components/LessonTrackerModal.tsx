import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, CheckCircle2, X, Loader2, BookOpen, ClipboardList} from 'lucide-react';
import { 
  format, parseISO, parse, differenceInMinutes} from 'date-fns';
import { toast } from 'sonner';

import { LessonTracker, Sensei, Student } from '../types';
import { useAppContext } from '../context/AppContext';
import { formatTimestampInTimezone, getScheduleStudentIds, getCurrentWIBTime, getTimezoneAbbreviation } from '../utils/helpers';
import { isScheduleDelayedAt } from '../utils/lessonTracker';
import { useSessionClock } from '../hooks/useSessionClock';
export const LessonTrackerModal = () => {
const { senseiList, studentList, groupList, lessonTrackers, sessionLogs, permissions, setShowTrackerModal, selectedTrackerSchedule, setSelectedTrackerSchedule, selectedTrackerStudent, setSelectedTrackerStudent, dbOps } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  groupList: state.groupList,
  lessonTrackers: state.lessonTrackers,
  sessionLogs: state.sessionLogs,
  permissions: state.permissions,
  setShowTrackerModal: state.setShowTrackerModal,
  selectedTrackerSchedule: state.selectedTrackerSchedule,
  setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
  selectedTrackerStudent: state.selectedTrackerStudent,
  setSelectedTrackerStudent: state.setSelectedTrackerStudent,
  dbOps: state.dbOps
}));
    const { completeReport } = useSessionClock();
    const studentById = useMemo(() => {
      return new Map<string, Student>(studentList.map((student: Student) => [student.id, student]));
    }, [studentList]);

    const groupById = useMemo(() => {
      return new Map<string, any>((groupList || []).map((group: any) => [group.id, group]));
    }, [groupList]);

    const senseiById = useMemo(() => {
      return new Map<string, Sensei>(senseiList.map((sensei: Sensei) => [sensei.id, sensei]));
    }, [senseiList]);

    // Group Class handling
    const isGroupClass = !!selectedTrackerSchedule?.groupId;
    const sGroup = isGroupClass ? groupById.get(selectedTrackerSchedule.groupId) : null;
    
    const scheduleStudentIds = useMemo(() => {
      return getScheduleStudentIds(selectedTrackerSchedule);
    }, [selectedTrackerSchedule]);

    const studentsInClass = useMemo(() => {
      const scheduledStudents = scheduleStudentIds
        .map((studentId: string) => studentById.get(studentId))
        .filter((student): student is Student => Boolean(student));

      if (scheduledStudents.length > 0) return scheduledStudents;
      return selectedTrackerStudent ? [selectedTrackerStudent] : [];
    }, [scheduleStudentIds, selectedTrackerStudent, studentById]);

    const singleStudent = selectedTrackerStudent || studentsInClass[0];

    const student = isGroupClass ? null : singleStudent;
    const displayName = isGroupClass ? sGroup?.name : student?.name;
    const sensei = selectedTrackerSchedule ? senseiById.get(selectedTrackerSchedule.senseiId) : null;
    const sessionLog = selectedTrackerSchedule
      ? sessionLogs.find(log => log.scheduleId === selectedTrackerSchedule.id)
      : undefined;
    const sessionTimezone = sessionLog?.timezone || sensei?.timezone || 'Asia/Jakarta';
    const clockInTime = formatTimestampInTimezone(sessionLog?.checkInAt, sessionTimezone);
    const clockOutTime = formatTimestampInTimezone(sessionLog?.checkOutAt, sessionTimezone);
    const timezoneLabel = getTimezoneAbbreviation(sessionTimezone);
    const defaultDate = selectedTrackerSchedule?.date || format(new Date(), 'yyyy-MM-dd');

    const [commonData, setCommonData] = useState({
      date: defaultDate,
      actualStartTime: clockInTime || selectedTrackerSchedule?.startTime || getCurrentWIBTime(),
      actualEndTime: clockOutTime,
      timeAdjustmentNote: '',
      timeAdjustmentStatus: 'None',
      curriculumUnit: singleStudent?.curriculumUnit || '',
      material: '',
      notes: ''
    });

    const [studentsData, setStudentsData] = useState<Record<string, { attendance: string, score: number, caseNotes: string, studentFeedback: string }>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null); // For individual class edit mode
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [showEntryForm, setShowEntryForm] = useState(Boolean(selectedTrackerSchedule));
    // FIX #11: Batasi jumlah history yang dirender sekaligus, load more on demand
    const HISTORY_PAGE_SIZE = 10;
    const [visibleHistoryCount, setVisibleHistoryCount] = useState(HISTORY_PAGE_SIZE);

    const trackersForSelectedSchedule = useMemo(() => {
      if (!selectedTrackerSchedule) return [];
      return lessonTrackers.filter(lt => lt.scheduleId === selectedTrackerSchedule.id && lt.date === selectedTrackerSchedule.date);
    }, [lessonTrackers, selectedTrackerSchedule]);

    useEffect(() => {
      if (!selectedTrackerSchedule || !sessionLog) return;
      setCommonData(previous => ({
        ...previous,
        date: selectedTrackerSchedule.date,
        actualStartTime: clockInTime || previous.actualStartTime,
        actualEndTime: clockOutTime || previous.actualEndTime
      }));
    }, [clockInTime, clockOutTime, selectedTrackerSchedule, sessionLog]);

    useEffect(() => {
      if (selectedTrackerSchedule || !selectedTrackerStudent) return;
      setStudentsData(previous => previous[selectedTrackerStudent.id]
        ? previous
        : {
            ...previous,
            [selectedTrackerStudent.id]: {
              attendance: 'Hadir',
              score: 0,
              caseNotes: '',
              studentFeedback: ''
            }
          });
    }, [selectedTrackerSchedule, selectedTrackerStudent]);

    // Load the existing report for review/edit, including completed sessions.
    useEffect(() => {
      if (selectedTrackerSchedule) {
        const inProgress = trackersForSelectedSchedule.filter(lt => !lt.material);
        const sourceTrackers = inProgress.length > 0 ? inProgress : trackersForSelectedSchedule;
        
        let initialStudentsData: any = {};
        
        if (sourceTrackers.length > 0) {
          setCommonData({
            date: sourceTrackers[0].date,
            actualStartTime: clockInTime || sourceTrackers[0].actualStartTime || '',
            actualEndTime: clockOutTime || sourceTrackers[0].actualEndTime || '',
            timeAdjustmentNote: sourceTrackers[0].timeAdjustmentNote || '',
            timeAdjustmentStatus: sourceTrackers[0].timeAdjustmentStatus || 'None',
            curriculumUnit: sourceTrackers[0].curriculumUnit || singleStudent?.curriculumUnit || '',
            material: sourceTrackers[0].material,
            notes: sourceTrackers[0].notes
          });
          
          if (!isGroupClass) setEditingId(sourceTrackers[0].id);

          sourceTrackers.forEach(lt => {
            initialStudentsData[lt.studentId] = {
              attendance: lt.attendance,
              score: lt.score,
              caseNotes: lt.caseNotes || '',
              studentFeedback: lt.studentFeedback || ''
            };
          });
        }
        
        studentsInClass.forEach(st => {
           if (!initialStudentsData[st.id]) {
               initialStudentsData[st.id] = { attendance: 'Hadir', score: 0, caseNotes: '', studentFeedback: '' };
           }
        });
        
        setStudentsData(initialStudentsData);
      }
    }, [clockInTime, clockOutTime, isGroupClass, selectedTrackerSchedule, singleStudent?.curriculumUnit, studentsInClass, trackersForSelectedSchedule]);

    const history = useMemo(() => {
      if (isGroupClass || !student) return [];
      return lessonTrackers
        .filter(lt => lt.studentId === student.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student, lessonTrackers, isGroupClass]);

    // FIX #11: Reset visible count tiap ganti siswa/schedule agar tidak stuck di posisi lama
    const visibleHistory = useMemo(() => history.slice(0, visibleHistoryCount), [history, visibleHistoryCount]);
    const hasMoreHistory = history.length > visibleHistoryCount;

    const leaveCountByStudentId = useMemo(() => {
      const counts = new Map<string, number>();
      lessonTrackers.forEach((tracker: any) => {
        if (!tracker.studentId || !['Izin', 'Sakit'].includes(tracker.attendance)) return;
        counts.set(tracker.studentId, (counts.get(tracker.studentId) || 0) + 1);
      });
      return counts;
    }, [lessonTrackers]);

    const handleSave = async () => {
      if (studentsInClass.length === 0) return;
      if (sessionLog?.status === 'report_pending' && !commonData.material.trim()) {
        toast.error('Isi materi belajar sebelum menyelesaikan laporan.');
        return;
      }
      setIsSaving(true);
      let progressSaved = false;
      try {
        const now = new Date();
        let isDelayed = false;
        let actualStartTimeStr = commonData.actualStartTime || format(now, 'HH:mm');
        const adjustmentStatus = commonData.timeAdjustmentNote
          ? (commonData.timeAdjustmentStatus === 'None' ? 'Pending' : commonData.timeAdjustmentStatus)
          : 'None';

        if (selectedTrackerSchedule) {
          const actualTimeForDelay = parse(actualStartTimeStr, 'HH:mm', new Date());
          isDelayed = isScheduleDelayedAt(selectedTrackerSchedule, actualTimeForDelay);
        }

        const trackersToSave = [];
        const existingTrackers = trackersForSelectedSchedule;

        for (const st of studentsInClass) {
           const stData = studentsData[st.id] || { attendance: 'Hadir', score: 0, caseNotes: '', studentFeedback: '' };
           
           // If we are replacing an existing schedule record, find it
           // BUT if it's editing an individual history item (editingId), we use editingId
           let originalId = editingId;
           if (isGroupClass || !originalId) {
               const foundOriginal = existingTrackers.find((lt: any) => lt.studentId === st.id);
               if (foundOriginal) originalId = foundOriginal.id;
           }
           
           if (originalId) {
              const prev = lessonTrackers.find(lt => lt.id === originalId);
              trackersToSave.push({
                 ...prev,
                 date: commonData.date || format(new Date(), 'yyyy-MM-dd'),
                 curriculumUnit: commonData.curriculumUnit || '',
                 material: commonData.material || '',
                 notes: commonData.notes || '',
                 actualStartTime: actualStartTimeStr,
                 actualEndTime: commonData.actualEndTime || '',
                 timeAdjustmentNote: commonData.timeAdjustmentNote || '',
                 timeAdjustmentStatus: adjustmentStatus,
                 attendance: stData.attendance,
                 score: Number(stData.score) || 0,
                 caseNotes: stData.caseNotes || '',
                 studentFeedback: stData.studentFeedback || '',
                 isDelayed // FIX #2: tambahkan isDelayed saat update
              });
           } else {
              trackersToSave.push({
                 id: crypto.randomUUID(),
                 scheduleId: selectedTrackerSchedule?.id || '',
                 studentId: st.id,
                 senseiId: sensei?.id || '',
                 date: commonData.date || format(new Date(), 'yyyy-MM-dd'),
                 curriculumUnit: commonData.curriculumUnit || '',
                 material: commonData.material || '',
                 notes: commonData.notes || '',
                 actualStartTime: actualStartTimeStr,
                 actualEndTime: commonData.actualEndTime || '',
                 timeAdjustmentNote: commonData.timeAdjustmentNote || '',
                 timeAdjustmentStatus: adjustmentStatus,
                 isDelayed,
                 createdAt: now.toISOString(),
                 attendance: stData.attendance,
                 score: Number(stData.score) || 0,
                 caseNotes: stData.caseNotes || '',
                 studentFeedback: stData.studentFeedback || ''
              });
           }
        }

        if (trackersToSave.length > 0) {
           if (trackersToSave.length === 1) await dbOps.save('lesson_trackers', trackersToSave[0]);
           else await dbOps.bulkSave('lesson_trackers', trackersToSave);
           progressSaved = true;
        }

        if (permissions.role === 'Sensei' && selectedTrackerSchedule && sessionLog?.status === 'report_pending') {
          await completeReport(selectedTrackerSchedule.id);
        }

        toast.success(sessionLog?.status === 'report_pending' ? 'Laporan sesi selesai.' : 'Progress berhasil disimpan!');
        
        setCommonData(prev => ({ ...prev, material: '', notes: '' }));
        const adjustmentReviewed = permissions.role !== 'Sensei'
          && ['Approved', 'Rejected'].includes(adjustmentStatus);
        if (isGroupClass || adjustmentReviewed || (permissions.role === 'Sensei' && Boolean(selectedTrackerSchedule))) {
           setShowTrackerModal(false);
           setSelectedTrackerSchedule(null);
           setSelectedTrackerStudent(null);
        } else {
           setEditingId(null);
           setShowEntryForm(false);
        }
      } catch (error) {
        console.error('Save tracker failed:', error);
        toast.error(progressSaved
          ? 'Progress tersimpan, tetapi status sesi belum berhasil diselesaikan.'
          : 'Gagal menyimpan progress');
      } finally {
        setIsSaving(false);
      }
    };

    const handleEdit = (item: LessonTracker) => {
      setCommonData({
        date: item.date,
        actualStartTime: item.actualStartTime || '',
        actualEndTime: item.actualEndTime || '',
        timeAdjustmentNote: item.timeAdjustmentNote || '',
        timeAdjustmentStatus: item.timeAdjustmentStatus || 'None',
        curriculumUnit: item.curriculumUnit || singleStudent?.curriculumUnit || '',
        material: item.material,
        notes: item.notes
      });
      setStudentsData({
        [item.studentId]: {
           attendance: item.attendance,
           score: item.score,
           caseNotes: item.caseNotes || '',
           studentFeedback: item.studentFeedback || ''
        }
      });
      setEditingId(item.id);
      setShowEntryForm(true);
      requestAnimationFrame(() => {
        document.getElementById('tracker-form')?.scrollIntoView({ behavior: 'smooth' });
      });
    };

    const handleStartProgress = () => {
      setEditingId(null);
      setShowEntryForm(true);
      setCommonData(previous => ({
        ...previous,
        date: defaultDate,
        curriculumUnit: singleStudent?.curriculumUnit || '',
        material: '',
        notes: ''
      }));
    };

    const handleDelete = async (id: string) => {
      try {
        await dbOps.delete('lesson_trackers', id);
        toast.success('Riwayat sesi berhasil dihapus');
        setConfirmDeleteId(null);
        if (editingId === id) {
          setEditingId(null);
        }
      } catch (error) {
        console.error('Delete tracker failed:', error);
        toast.error('Gagal menghapus riwayat sesi');
      }
    };

    const handleStudentDataChange = (studentId: string, field: string, value: any) => {
       setStudentsData(prev => ({
          ...prev,
          [studentId]: {
             ...(prev[studentId] || { attendance: 'Hadir', score: 0, caseNotes: '', studentFeedback: '' }),
             [field]: value
          }
       }));
    };

    return (
      <div className="ui-modal-overlay">
        <div className={showEntryForm || isGroupClass ? 'ui-modal-panel-xl' : 'ui-modal-panel-wide'}>
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-600 text-white">
                <ClipboardList size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="ui-modal-title">{permissions.role === 'Sensei' && selectedTrackerSchedule ? 'Laporan Sesi' : 'Lesson Tracker'}</h3>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Progress Belajar: <span className="font-bold text-indigo-600 dark:text-indigo-400">{displayName}</span> {sensei && (
                    <> oleh <span className="font-bold text-emerald-600 dark:text-emerald-400">{sensei.name}</span></>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!showEntryForm && !isGroupClass && (
                <button
                  type="button"
                  onClick={handleStartProgress}
                  className="inline-flex h-9 items-center gap-2 border border-emerald-600 bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700"
                >
                  <Plus size={15} />
                  Isi Progress
                </button>
              )}
              <button
                onClick={() => { setShowTrackerModal(false); setSelectedTrackerSchedule(null); setSelectedTrackerStudent(null); }}
                className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className={`flex-1 overflow-hidden flex flex-col ${showEntryForm && !isGroupClass ? 'md:flex-row' : ''}`}>
            {/* Form Section */}
            {showEntryForm && (
            <div id="tracker-form" className={`w-full ${isGroupClass ? 'md:w-full' : 'md:w-1/2'} overflow-y-auto border-r border-slate-100 p-4 dark:border-slate-800`}>
              <div className="mb-4 flex items-center justify-between">
                <h4 className="ui-section-title mb-0">{editingId ? 'Edit Riwayat Sesi' : 'Isi Hasil Belajar'}</h4>
              </div>
              {studentsInClass.some(st => st.specialNote || st.examNote || st.adminNote) && (
                <div className="mb-4 space-y-2">
                  {studentsInClass.map(st => (
                    (st.specialNote || st.examNote || st.adminNote) && (
                      <div key={st.id} className="border border-amber-100 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">{st.name} - Catatan Khusus</p>
                        {st.examNote && <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200"><span className="font-black">Exam:</span> {st.examNote}</p>}
                        {st.specialNote && <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200"><span className="font-black">Special:</span> {st.specialNote}</p>}
                        {st.adminNote && <p className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200"><span className="font-black">Admin:</span> {st.adminNote}</p>}
                      </div>
                    )
                  ))}
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ui-label">Tanggal</label>
                    <input 
                      type="date" 
                      value={commonData.date}
                      disabled={permissions.role === 'Sensei' && Boolean(selectedTrackerSchedule)}
                      onChange={e => setCommonData({ ...commonData, date: e.target.value })}
                      className="ui-input"
                    />
                  </div>
                  <div>
                    <label className="ui-label">Clock-in ({timezoneLabel})</label>
                    <input 
                      type="time" 
                      value={commonData.actualStartTime || ''}
                      onChange={e => setCommonData({ ...commonData, actualStartTime: e.target.value })}
                      disabled={permissions.role === 'Sensei' && Boolean(sessionLog)}
                      className="ui-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70 dark:disabled:bg-slate-900"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">Tercatat otomatis dari server.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="ui-label">Clock-out ({timezoneLabel})</label>
                    <input
                      type="time"
                      value={commonData.actualEndTime || ''}
                      disabled
                      className="ui-input bg-slate-50 opacity-70 cursor-not-allowed dark:bg-slate-900"
                    />
                  </div>
                  {permissions.role !== 'Sensei' && <div>
                    <label className="ui-label">Status Koreksi Waktu</label>
                    <select
                      value={commonData.timeAdjustmentStatus || 'None'}
                      onChange={e => setCommonData({ ...commonData, timeAdjustmentStatus: e.target.value })}
                      className="ui-input"
                    >
                      <option value="None">Tidak Ada</option>
                      <option value="Pending">Menunggu</option>
                      <option value="Approved">Disetujui</option>
                      <option value="Rejected">Ditolak</option>
                    </select>
                  </div>}
                </div>

                <div>
                  <label className="ui-label">Catatan Koreksi Waktu</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: kelas mundur karena siswa terlambat join..."
                    value={commonData.timeAdjustmentNote || ''}
                    onChange={e => setCommonData({ ...commonData, timeAdjustmentNote: e.target.value })}
                    className="ui-textarea resize-none"
                  />
                </div>

                <div>
                  <label className="ui-label">Unit Kurikulum</label>
                  <input
                    type="text"
                    placeholder="Contoh: Bab 3 - Kata Kerja / JLPT N5 Kanji 20"
                    value={commonData.curriculumUnit}
                    onChange={e => setCommonData({ ...commonData, curriculumUnit: e.target.value })}
                    className="ui-input"
                  />
                  {singleStudent?.curriculumLevel && (
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">
                      Kurikulum: {singleStudent.curriculumLevel} {singleStudent.graduateLevel ? `-> Target Graduate ${singleStudent.graduateLevel}` : ''}
                    </p>
                  )}
                </div>

                <div>
                  <label className="ui-label">Materi Belajar</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Hiragana Ba-Pa, Partikel wa/ga..."
                    value={commonData.material}
                    onChange={e => setCommonData({ ...commonData, material: e.target.value })}
                    className="ui-input"
                  />
                </div>

                <div>
                  <label className="ui-label">Catatan Ke Sensei / Admin (Log Materi)</label>
                  <textarea 
                    rows={2}
                    placeholder="Siswa sudah lancar di bab 1, perlu pengulangan di kata kerja..."
                    value={commonData.notes}
                    onChange={e => setCommonData({ ...commonData, notes: e.target.value })}
                    className="ui-textarea resize-none"
                  />
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <h4 className="mb-3 text-sm font-black text-slate-800 dark:text-white">Penilaian Siswa</h4>
                  <div className="space-y-4">
                    {studentsInClass.map((st: any) => {
                      const stData = studentsData[st.id] || { attendance: 'Hadir', score: 0, caseNotes: '', studentFeedback: '' };
                      return (
                        <div key={st.id} className="border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                          {isGroupClass && (
                            <h5 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs">{st.name?.charAt(0) || '?'}</div>
                               {st.name}
                            </h5>
                          )}
                          <div className="mb-4 inline-flex border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Izin {leaveCountByStudentId.get(st.id) || 0}/{Number(st.studentLeaveQuota) || 3}
                          </div>
                          <div className="mb-4 grid grid-cols-2 gap-3">
                            <div>
                               <label className="ui-label">Kehadiran</label>
                               <select 
                                 value={stData.attendance}
                                 onChange={e => handleStudentDataChange(st.id, 'attendance', e.target.value)}
                                 className="ui-input"
                               >
                                 {['Hadir', 'Izin', 'Sakit', 'Alpa', 'No Show'].map(a => <option key={a} value={a}>{a}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="ui-label">Nilai (0-100)</label>
                               <input 
                                 type="number" 
                                 min="0"
                                 max="100"
                                 value={stData.score || ''}
                                 onChange={e => handleStudentDataChange(st.id, 'score', parseInt(e.target.value) || 0)}
                                 className="ui-input"
                               />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="ui-label">Catatan Siswa / Internal</label>
                              <textarea 
                                rows={3}
                                value={stData.caseNotes || ''}
                                onChange={e => handleStudentDataChange(st.id, 'caseNotes', e.target.value)}
                                className="ui-textarea resize-y"
                              />
                            </div>
                            <div>
                              <label className="ui-label">Feedback Siswa</label>
                              <textarea 
                                rows={3}
                                value={stData.studentFeedback || ''}
                                onChange={e => handleStudentDataChange(st.id, 'studentFeedback', e.target.value)}
                                className="ui-textarea resize-y"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex w-full items-center justify-center gap-2 border px-5 py-3 text-sm font-black text-white transition-all disabled:opacity-50 ${
                      editingId
                        ? 'border-indigo-600 bg-indigo-600 hover:bg-indigo-700'
                        : 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : (editingId ? <CheckCircle2 size={20} /> : <Plus size={20} />)}
                    {editingId ? 'Perbarui Sesi' : sessionLog?.status === 'report_pending' ? 'Simpan & Selesaikan' : 'Simpan Progress'}
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* History Section - Only visible for individual classes */}
            {!isGroupClass && (
              <div className={`w-full overflow-y-auto bg-slate-50/50 p-4 dark:bg-slate-950/20 ${showEntryForm ? 'md:w-1/2' : 'md:w-full'}`}>
                <h4 className="ui-section-title flex items-center justify-between">
                  Riwayat Sesi
                  <span className="bg-white dark:bg-slate-800 px-2 py-1 rounded-lg text-[10px] lowercase">{history.length} sesi total</span>
                </h4>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <BookOpen size={40} className="mx-auto text-slate-200 mb-4 opacity-50" />
                      <p className="text-sm text-slate-400 font-medium italic">Belum ada riwayat progress untuk siswa ini.</p>
                    </div>
                  ) : (
                    // FIX #11: Render hanya visibleHistory, bukan semua history sekaligus
                    <>
                      {visibleHistory.map(item => (
                        <div
                          key={item.id} 
                          className="border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{format(parseISO(item.date), 'dd MMMM yyyy')}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                                  item.attendance === 'Hadir' ? 'bg-emerald-100 text-emerald-600' : 
                                  item.attendance === 'No Show' ? 'bg-rose-950 text-rose-100' :
                                  'bg-rose-100 text-rose-600'
                                }`}>
                                  {item.attendance}
                                </span>
                                {item.actualStartTime && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Mulai: {item.actualStartTime}
                                  </span>
                                )}
                                {item.actualEndTime && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Selesai: {item.actualEndTime}
                                  </span>
                                )}
                                {item.timeAdjustmentStatus && item.timeAdjustmentStatus !== 'None' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                                    Adjust: {item.timeAdjustmentStatus}
                                  </span>
                                )}
                                {item.isDelayed && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-rose-600 text-white border border-rose-700 shadow-sm">
                                    TERLAMBAT
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {confirmDeleteId === item.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-900/30 p-1 rounded-lg border border-rose-100 dark:border-rose-800">
                                  <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="px-2 py-1 text-[9px] font-bold text-white bg-rose-600 rounded-md shadow-sm"
                                  >
                                    Ya, Hapus
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 text-[9px] font-bold text-slate-500 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                                    title="Edit Sesi"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDeleteId(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                                    title="Hapus Sesi"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                          <h5 className="font-bold text-slate-800 dark:text-white mb-2">{item.material}</h5>
                          {item.curriculumUnit && (
                            <div className="mb-3 inline-flex px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800 text-[10px] font-black uppercase">
                              Kurikulum: {item.curriculumUnit}
                            </div>
                          )}
                          <div className="grid grid-cols-1 gap-4">
                            {item.notes && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan ke admin</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{item.notes}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nilai</p>
                              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{item.score || 0}</p>
                            </div>
                            {item.timeAdjustmentNote && (
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penyesuaian Waktu</p>
                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{item.timeAdjustmentNote}</p>
                              </div>
                            )}
                          </div>
                          {(item.caseNotes || item.studentFeedback) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 gap-4">
                              {item.caseNotes && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Catatan Kasus</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{item.caseNotes}</p>
                                </div>
                              )}
                              {item.studentFeedback && (
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Feedback Siswa</p>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words">{item.studentFeedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* FIX #11: Tombol Load More agar tidak render semua sekaligus */}
                      {hasMoreHistory && (
                        <button
                          onClick={() => setVisibleHistoryCount(prev => prev + HISTORY_PAGE_SIZE)}
                          className="w-full border border-slate-200 bg-white py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors"
                        >
                          Tampilkan Lebih Banyak ({history.length - visibleHistoryCount} sesi tersembunyi)
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };



