import { useState, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, ClipboardList, PlayCircle, Loader2} from 'lucide-react';
import { 
  format, addDays, parseISO, parse, differenceInMinutes} from 'date-fns';
import { toast } from 'sonner';

import { LessonTracker, Schedule, Sensei, Student } from '../types';
import { useAppContext } from '../context/AppContext';
export const TeachingSessionsView = () => {
const { senseiList, studentList, groupList, schedules, lessonTrackers, setShowTrackerModal, setSelectedTrackerSchedule, dbOps, isDataLoading } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  groupList: state.groupList,
  schedules: state.schedules,
  lessonTrackers: state.lessonTrackers,
  setShowTrackerModal: state.setShowTrackerModal,
  setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
  dbOps: state.dbOps,
  isDataLoading: state.isDataLoading
}));
    const [subTab, setSubTab] = useState<'today' | 'tomorrow' | 'upcoming'>('today');
    
    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => format(today, 'yyyy-MM-dd'), [today]);
    const tomorrowStr = useMemo(() => format(addDays(today, 1), 'yyyy-MM-dd'), [today]);

    const studentById = useMemo(() => {
      return new Map<string, Student>(studentList.map(student => [student.id, student]));
    }, [studentList]);

    const groupById = useMemo(() => {
      return new Map<string, any>((groupList || []).map((group: any) => [group.id, group]));
    }, [groupList]);

    const senseiById = useMemo(() => {
      return new Map<string, Sensei>(senseiList.map(sensei => [sensei.id, sensei]));
    }, [senseiList]);

    const trackerByScheduleDate = useMemo(() => {
      const index = new Map<string, LessonTracker[]>();
      lessonTrackers.forEach(tracker => {
        if (tracker.scheduleId && tracker.date) {
          const key = `${tracker.scheduleId}|${tracker.date}`;
          const existing = index.get(key);
          if (existing) {
            existing.push(tracker);
          } else {
            index.set(key, [tracker]);
          }
        }
      });
      return index;
    }, [lessonTrackers]);
    
    const filteredSchedules = useMemo(() => {
      return schedules
        .filter(s => {
          if (subTab === 'today') return s.date === todayStr;
          if (subTab === 'tomorrow') return s.date === tomorrowStr;
          if (subTab === 'upcoming') return s.date > tomorrowStr;
          return false;
        })
        .filter(s => s.status !== 'cancelled')
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.startTime.localeCompare(b.startTime);
        });
    }, [schedules, todayStr, tomorrowStr, subTab]);

    const handleStartLesson = async (schedule: Schedule) => {
      try {
        const now = new Date();
        const actualStartTime = format(now, 'HH:mm');
        
        const scheduledTime = parse(schedule.startTime, 'HH:mm', now);
        const diff = differenceInMinutes(now, scheduledTime);
        const isDelayed = diff > 10;

        const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
        
        const newTrackers = studentIds.map(sid => ({
          id: crypto.randomUUID(),
          scheduleId: schedule.id,
          studentId: sid,
          senseiId: schedule.senseiId,
          date: schedule.date,
          attendance: 'Hadir',
          material: '', 
          score: 0,
          notes: '',
          actualStartTime,
          isDelayed,
          createdAt: now.toISOString()
        }));

        if (newTrackers.length === 1) {
          await dbOps.save('lesson_trackers', newTrackers[0]);
        } else if (newTrackers.length > 1) {
          await dbOps.bulkSave('lesson_trackers', newTrackers);
        } else {
           toast.error("Tidak ada student di jadwal ini");
           return;
        }

        toast.success(isDelayed ? 'Sesi dimulai! (Terlambat)' : 'Sesi dimulai tepat waktu!');
      } catch (error) {
        toast.error('Gagal memulai sesi');
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">Operasional Mengajar</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Kelola mulai dan selesaikan sesi belajar hari ini dan mendatang.</p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button 
              onClick={() => setSubTab('today')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'today' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Hari Ini
            </button>
            <button 
              onClick={() => setSubTab('tomorrow')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'tomorrow' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Besok
            </button>
            <button 
              onClick={() => setSubTab('upcoming')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${subTab === 'upcoming' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              Mendatang
            </button>
          </div>
        </div>

        {isDataLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-indigo-100 dark:border-indigo-900/30">
            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Memuat Sesi Mengajar</h3>
            <p className="text-slate-500 mt-2">Mengambil jadwal terbaru dari database.</p>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tidak Ada Jadwal</h3>
            <p className="text-slate-500 mt-2">Tidak ada jadwal mengajar untuk filter periode ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSchedules.map(s => {
              const studentIds = s.studentIds?.length > 0 ? s.studentIds : (s.studentId ? [s.studentId] : []);
              const studentsForSchedule = studentIds.map(id => studentById.get(id)).filter((student): student is Student => Boolean(student));
              const sGroup = groupById.get(s.groupId || '');
              const displayName = sGroup ? sGroup.name : (studentsForSchedule.map(st => st.name).join(', ') || 'Unknown Student');
              const tooltipTitle = sGroup ? `${sGroup.name} (${studentsForSchedule.map(st => st.name).join(', ')})` : displayName;
              const studentInitial = sGroup ? sGroup.name.charAt(0) : (studentsForSchedule[0]?.name?.charAt(0) || '?');
              const sensei = senseiById.get(s.senseiId);
              
              const trackers = trackerByScheduleDate.get(`${s.id}|${s.date}`) || [];
              const expectedTrackerCount = Math.max(1, studentIds.length);
              const completedTrackers = trackers.filter(tracker => tracker.material);
              const inProgress = trackers.length > 0 && completedTrackers.length < expectedTrackerCount;
              const completed = trackers.length >= expectedTrackerCount && completedTrackers.length >= expectedTrackerCount;
              const delayed = trackers.some(tracker => tracker.isDelayed);

              return (
                <div key={s.id} className={`bg-white dark:bg-slate-900 border-2 rounded-[2rem] p-5 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
                  completed ? 'border-emerald-100 dark:border-emerald-900/30' : 
                  inProgress ? 'border-amber-100 dark:border-amber-900/30 ring-2 ring-amber-500/5' : 
                  'border-slate-100 dark:border-slate-800'
                }`}>
                  {/* Header/Sensei Badge */}
                  <div className="flex items-center mb-4">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black tracking-widest uppercase rounded-lg border border-indigo-100 dark:border-indigo-800">
                      Sensei {sensei?.name || 'Unknown'}
                    </span>
                  </div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-md shrink-0">
                        {studentInitial}
                      </div>
                      <div className="max-w-[140px]">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2" title={tooltipTitle}>{displayName}</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black truncate mt-1">{s.level}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 mt-1">
                      <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{s.startTime}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{format(parseISO(s.date), 'dd MMM')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {delayed && (
                      <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black uppercase rounded shadow-sm animate-pulse">
                        LATE
                      </span>
                    )}
                    {completed ? (
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase rounded border border-emerald-100 dark:border-emerald-800">
                        Done
                      </span>
                    ) : inProgress ? (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black uppercase rounded border border-amber-100 dark:border-amber-800">
                        Live
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] font-black uppercase rounded border border-slate-200 dark:border-slate-700">
                        Ready
                      </span>
                    )}
                  </div>

                  {completed ? (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-xl border border-emerald-100/50 dark:border-emerald-800/20">
                      <CheckCircle2 size={12} />
                      <span className="text-[9px] font-bold">Session Logged</span>
                    </div>
                  ) : inProgress ? (
                    <button 
                      onClick={() => {
                          setSelectedTrackerSchedule(s);
                          setShowTrackerModal(true);
                      }}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-100 dark:shadow-none text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group"
                    >
                      <ClipboardList size={14} />
                      Finish Session
                    </button>
                  ) : (
                    <button 
                      disabled={subTab !== 'today'}
                      onClick={() => handleStartLesson(s)}
                      className={`w-full py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group ${
                        subTab === 'today' 
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 dark:shadow-none text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <PlayCircle size={14} />
                      {subTab === 'today' ? 'Start Session' : 'Locked'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

