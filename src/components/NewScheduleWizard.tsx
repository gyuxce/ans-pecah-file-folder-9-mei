import { useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { addDays, format, getDay, parseISO } from 'date-fns';
import { toast } from 'sonner';

import { CLASS_LEVELS, CLASS_TYPES, DAYS_OF_WEEK } from '../constants';
import { useAppContext } from '../context/AppContext';
import type { Schedule } from '../types';
import { timesOverlap } from '../utils/scheduleUtils';
import { createId } from '../utils/id';

type WizardStep = 1 | 2 | 3;

type WizardForm = {
  senseiId: string;
  studentIds: string[];
  groupId: string | null;
  isGroupClass: boolean;
  type: string;
  level: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  targetSessions: number;
  daysOfWeek: number[];
};

export const NewScheduleWizard = () => {
  const {
    senseiList,
    studentList,
    groupList,
    offDays,
    schedules,
    senseiTimeBlocks,
    selectedCell,
    setSelectedCell,
    setShowScheduleModal,
    user,
    dbOps
  } = useAppContext(state => ({
    senseiList: state.senseiList,
    studentList: state.studentList,
    groupList: state.groupList,
    offDays: state.offDays,
    schedules: state.schedules,
    senseiTimeBlocks: state.senseiTimeBlocks,
    selectedCell: state.selectedCell,
    setSelectedCell: state.setSelectedCell,
    setShowScheduleModal: state.setShowScheduleModal,
    user: state.user,
    dbOps: state.dbOps
  }));

  const initialDate = selectedCell?.date || new Date();
  const [step, setStep] = useState<WizardStep>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [form, setForm] = useState<WizardForm>({
    senseiId: selectedCell?.senseiId || '',
    studentIds: selectedCell?.studentIds || [],
    groupId: null,
    isGroupClass: false,
    type: selectedCell?.type || 'Private',
    level: selectedCell?.level || 'Intensif N5',
    date: format(initialDate, 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:30',
    duration: 90,
    targetSessions: 1,
    daysOfWeek: [getDay(initialDate)]
  });

  const close = () => {
    setShowScheduleModal(false);
    setSelectedCell(null);
  };

  const updateDuration = (duration: number) => {
    const safeDuration = Math.max(15, duration || 0);
    const [hours, minutes] = form.startTime.split(':').map(Number);
    const start = new Date(2000, 0, 1, hours, minutes);
    const end = new Date(start.getTime() + safeDuration * 60_000);
    setForm(previous => ({ ...previous, duration: safeDuration, endTime: format(end, 'HH:mm') }));
  };

  const updateStartTime = (startTime: string) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const start = new Date(2000, 0, 1, hours, minutes);
    const end = new Date(start.getTime() + form.duration * 60_000);
    setForm(previous => ({ ...previous, startTime, endTime: format(end, 'HH:mm') }));
  };

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return studentList
      .filter(student => student.is_active !== false)
      .filter(student => !query || student.name.toLowerCase().includes(query))
      .slice(0, 60);
  }, [studentList, studentSearch]);

  const selectedGroup = groupList.find(group => group.id === form.groupId);

  const draftSchedules = useMemo(() => {
    if (!form.date || !form.senseiId || form.studentIds.length === 0) return [];
    const drafts: Schedule[] = [];
    let dateCursor = parseISO(form.date);
    if (Number.isNaN(dateCursor.getTime())) return [];

    const selectedDays = form.targetSessions > 1 && form.daysOfWeek.length > 0
      ? form.daysOfWeek
      : [getDay(dateCursor)];
    let attempts = 0;

    while (drafts.length < form.targetSessions && attempts < 1000) {
      if (selectedDays.includes(getDay(dateCursor))) {
        drafts.push({
          id: createId(),
          senseiId: form.senseiId,
          groupId: form.isGroupClass ? form.groupId : null,
          studentIds: form.studentIds,
          type: form.isGroupClass ? 'Group' : form.type,
          level: form.level,
          date: format(dateCursor, 'yyyy-MM-dd'),
          startTime: form.startTime,
          endTime: form.endTime,
          status: 'active',
          updatedAt: new Date().toISOString(),
          updatedBy: user?.email || 'System'
        });
      }
      dateCursor = addDays(dateCursor, 1);
      attempts += 1;
    }

    return drafts;
  }, [form, user?.email]);

  const findBlocker = (candidate: Schedule) => {
    const offDay = offDays.find(item => item.senseiId === candidate.senseiId && item.date === candidate.date);
    if (offDay) return `Sensei libur${offDay.reason ? `: ${offDay.reason}` : ''}`;

    const scheduleConflict = schedules.find(item => (
      item.id !== candidate.id
      && item.status !== 'cancelled'
      && item.senseiId === candidate.senseiId
      && item.date === candidate.date
      && timesOverlap(candidate.startTime, candidate.endTime, item.startTime, item.endTime)
    ));
    if (scheduleConflict) return `Bentrok jadwal ${scheduleConflict.startTime}-${scheduleConflict.endTime}`;

    const busyBlock = senseiTimeBlocks.find(item => (
      item.senseiId === candidate.senseiId
      && item.date === candidate.date
      && item.status !== 'available_ans'
      && timesOverlap(candidate.startTime, candidate.endTime, item.startTime, item.endTime)
    ));
    if (busyBlock) return `Bentrok ${busyBlock.status === 'busy_cakap' ? 'kelas Cakap' : busyBlock.status === 'busy_personal' ? 'keperluan pribadi' : 'off'}`;

    return null;
  };

  const previewRows = useMemo(() => draftSchedules.map(schedule => ({ schedule, blocker: findBlocker(schedule) })), [draftSchedules, offDays, schedules, senseiTimeBlocks]);
  const conflictCount = previewRows.filter(item => item.blocker).length;

  const goNext = () => {
    if (step === 1) {
      if (!form.senseiId) return toast.error('Pilih sensei terlebih dahulu.');
      if (form.studentIds.length === 0) return toast.error('Pilih siswa atau grup terlebih dahulu.');
      setStep(2);
      return;
    }
    if (!form.date || !form.startTime || form.duration < 15 || form.targetSessions < 1) {
      return toast.error('Lengkapi pola jadwal terlebih dahulu.');
    }
    if (form.targetSessions > 1 && form.daysOfWeek.length === 0) {
      return toast.error('Pilih minimal satu hari untuk jadwal berulang.');
    }
    setStep(3);
  };

  const save = async () => {
    if (draftSchedules.length === 0) return toast.error('Belum ada jadwal yang dapat disimpan.');
    if (conflictCount > 0) return toast.error('Perbaiki jadwal yang bentrok sebelum menyimpan.');
    setIsSaving(true);
    try {
      await dbOps.bulkSave('schedules', draftSchedules);
      toast.success(`${draftSchedules.length} jadwal berhasil dibuat.`);
      close();
    } catch (error: any) {
      toast.error(error?.message || 'Gagal menyimpan jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-panel-wide">
        <div className="ui-modal-header">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Wizard Jadwal</p>
            <h3 className="ui-modal-title">Buat Jadwal Baru</h3>
          </div>
          <button onClick={close} className="border border-slate-200 p-2 text-slate-500"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50">
          <StepLabel number={1} label="Peserta" active={step === 1} done={step > 1} />
          <StepLabel number={2} label="Pola Jadwal" active={step === 2} done={step > 2} />
          <StepLabel number={3} label="Review" active={step === 3} done={false} />
        </div>

        <div className="ui-modal-body">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="ui-label">Sensei</label>
                <select value={form.senseiId} onChange={event => setForm(previous => ({ ...previous, senseiId: event.target.value }))} className="ui-input">
                  <option value="">Pilih sensei...</option>
                  {senseiList.map(sensei => <option key={sensei.id} value={sensei.id}>{sensei.name}</option>)}
                </select>
              </div>

              <div>
                <label className="ui-label">Peserta</label>
                <div className="grid grid-cols-2 border border-slate-200 bg-slate-50 p-1">
                  <button onClick={() => setForm(previous => ({ ...previous, isGroupClass: false, groupId: null, studentIds: [] }))} className={`px-3 py-2 text-xs font-black ${!form.isGroupClass ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Siswa</button>
                  <button onClick={() => setForm(previous => ({ ...previous, isGroupClass: true, groupId: null, studentIds: [] }))} className={`px-3 py-2 text-xs font-black ${form.isGroupClass ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Grup / SP</button>
                </div>
              </div>

              {form.isGroupClass ? (
                <div>
                  <label className="ui-label">Pilih Grup / SP</label>
                  <select value={form.groupId || ''} onChange={event => {
                    const group = groupList.find(item => item.id === event.target.value);
                    setForm(previous => ({ ...previous, groupId: event.target.value, studentIds: group?.studentIds || [], type: 'Group' }));
                  }} className="ui-input">
                    <option value="">Pilih grup...</option>
                    {groupList.map(group => <option key={group.id} value={group.id}>{group.name} ({group.studentIds?.length || 0} siswa)</option>)}
                  </select>
                  {selectedGroup && <p className="mt-2 text-xs font-semibold text-slate-500">{selectedGroup.studentIds?.length || 0} siswa akan dimasukkan.</p>}
                </div>
              ) : (
                <>
                  <div>
                    <label className="ui-label">Tipe Kelas</label>
                    <select value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value, studentIds: ['Private', 'Kids Private'].includes(event.target.value) ? previous.studentIds.slice(0, 1) : previous.studentIds }))} className="ui-input">
                      {CLASS_TYPES.filter(type => type !== 'Group').map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="ui-label">Pilih Siswa</label>
                    <input value={studentSearch} onChange={event => setStudentSearch(event.target.value)} placeholder="Cari nama siswa..." className="ui-input mb-2" />
                    <div className="max-h-52 overflow-y-auto border border-slate-200 p-2">
                      {filteredStudents.map(student => {
                        const checked = form.studentIds.includes(student.id);
                        const singleOnly = ['Private', 'Kids Private'].includes(form.type);
                        return (
                          <label key={student.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-2 py-2 last:border-0">
                            <input type="checkbox" checked={checked} onChange={() => setForm(previous => ({
                              ...previous,
                              studentIds: checked
                                ? previous.studentIds.filter(id => id !== student.id)
                                : singleOnly ? [student.id] : [...previous.studentIds, student.id],
                              level: student.level_sekarang || student.level_awal || student.level || previous.level
                            }))} />
                            <span className="text-sm font-bold text-slate-700">{student.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="ui-label">Level Materi</label>
                  <select value={form.level} onChange={event => setForm(previous => ({ ...previous, level: event.target.value }))} className="ui-input">
                    {CLASS_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ui-label">Tanggal Mulai</label>
                  <input type="date" value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value, daysOfWeek: [getDay(parseISO(event.target.value))] }))} className="ui-input" />
                </div>
                <div>
                  <label className="ui-label">Jam Mulai</label>
                  <input type="time" value={form.startTime} onChange={event => updateStartTime(event.target.value)} className="ui-input" />
                </div>
                <div>
                  <label className="ui-label">Durasi (menit)</label>
                  <input type="number" min="15" step="15" value={form.duration} onChange={event => updateDuration(Number(event.target.value))} className="ui-input" />
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">Selesai pukul {form.endTime}</p>
                </div>
                <div>
                  <label className="ui-label">Jumlah Pertemuan</label>
                  <input type="number" min="1" max="100" value={form.targetSessions} onChange={event => setForm(previous => ({ ...previous, targetSessions: Math.max(1, Number(event.target.value)) }))} className="ui-input" />
                </div>
              </div>

              {form.targetSessions > 1 && (
                <div>
                  <label className="ui-label">Hari Mengajar</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => {
                      const selected = form.daysOfWeek.includes(day.value);
                      return <button key={day.value} onClick={() => setForm(previous => ({ ...previous, daysOfWeek: selected ? previous.daysOfWeek.filter(value => value !== day.value) : [...previous.daysOfWeek, day.value] }))} className={`border px-3 py-2 text-xs font-black ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-500'}`}>{day.label}</button>;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Summary label="Sensei" value={senseiList.find(item => item.id === form.senseiId)?.name || '-'} />
                <Summary label="Peserta" value={form.isGroupClass ? selectedGroup?.name || '-' : `${form.studentIds.length} siswa`} />
                <Summary label="Total Jadwal" value={`${draftSchedules.length} sesi`} />
              </div>

              {conflictCount > 0 && (
                <div className="flex gap-2 border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">
                  <AlertTriangle size={18} className="shrink-0" /> {conflictCount} jadwal bentrok. Kembali ke Pola Jadwal untuk memperbaiki.
                </div>
              )}

              <div className="max-h-72 overflow-y-auto border border-slate-200">
                {previewRows.map(({ schedule, blocker }, index) => (
                  <div key={schedule.id} className="flex items-center justify-between gap-4 border-b border-slate-100 px-3 py-2 last:border-0">
                    <div>
                      <p className="text-sm font-black text-slate-800">{index + 1}. {schedule.date}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500">{schedule.startTime}-{schedule.endTime}</p>
                    </div>
                    {blocker ? (
                      <span className="max-w-xs text-right text-xs font-black text-rose-600">{blocker}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600"><Check size={14} /> Tersedia</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ui-modal-footer justify-between">
          <button onClick={step === 1 ? close : () => setStep(previous => (previous - 1) as WizardStep)} className="ui-btn-secondary inline-flex items-center gap-2">
            {step > 1 && <ChevronLeft size={16} />} {step === 1 ? 'Batal' : 'Kembali'}
          </button>
          {step < 3 ? (
            <button onClick={goNext} className="ui-btn-primary inline-flex items-center gap-2">Lanjut <ChevronRight size={16} /></button>
          ) : (
            <button disabled={isSaving || conflictCount > 0} onClick={save} className="ui-btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Simpan {draftSchedules.length} Jadwal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const StepLabel = ({ number, label, active, done }: { number: number; label: string; active: boolean; done: boolean }) => (
  <div className={`flex items-center justify-center gap-2 border-r border-slate-200 px-2 py-3 text-xs font-black last:border-r-0 ${active ? 'bg-white text-indigo-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
    <span className={`flex h-6 w-6 items-center justify-center border ${active ? 'border-indigo-600 bg-indigo-600 text-white' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{done ? <Check size={13} /> : number}</span>
    <span>{label}</span>
  </div>
);

const Summary = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-slate-200 bg-slate-50 p-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-800" title={value}>{value}</p>
  </div>
);
