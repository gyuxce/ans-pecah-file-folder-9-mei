import { useMemo } from 'react';
import { 
  Plus, Users, Calendar, Filter, ChevronLeft, ChevronRight, CalendarDays, CalendarRange, ClipboardList, UsersRound
} from 'lucide-react';
import { 
  format, addDays, startOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval, addWeeks, subWeeks} from 'date-fns';
import { motion } from 'motion/react';

import { TYPE_COLORS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { Student, Schedule, OffDay, LessonTracker } from '../types';
export const CalendarView = () => {
const { senseiList, studentList, groupList, offDays, schedules, lessonTrackers, viewMode, setViewMode, currentDate, setCurrentDate, dateRange, setDateRange, setShowScheduleModal, setShowTrackerModal, setSelectedTrackerSchedule, setEditingSchedule, setSelectedCell } = useAppContext(state => ({
  senseiList: state.senseiList,
  studentList: state.studentList,
  groupList: state.groupList,
  offDays: state.offDays,
  schedules: state.schedules,
  lessonTrackers: state.lessonTrackers,
  viewMode: state.viewMode,
  setViewMode: state.setViewMode,
  currentDate: state.currentDate,
  setCurrentDate: state.setCurrentDate,
  dateRange: state.dateRange,
  setDateRange: state.setDateRange,
  setShowScheduleModal: state.setShowScheduleModal,
  setShowTrackerModal: state.setShowTrackerModal,
  setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
  setEditingSchedule: state.setEditingSchedule,
  setSelectedCell: state.setSelectedCell
}));
    const dates = useMemo(() => {
      if (viewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
      } else {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
      }
    }, [currentDate, viewMode]);

    const filteredSchedules = useMemo(() => {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
      return schedules.filter(s => {
        if (!s.date) return false;
        const d = parseISO(s.date);
        if (Number.isNaN(d.getTime())) return false;
        return isWithinInterval(d, { start, end });
      });
    }, [schedules, dateRange]);

    const studentById = useMemo(() => {
      return new Map((studentList as Student[]).map(student => [student.id, student]));
    }, [studentList]);

    const groupById = useMemo(() => {
      return new Map((groupList as any[]).map((group: any) => [group.id, group]));
    }, [groupList]);

    const offDayKeys = useMemo(() => {
      return new Set((offDays as OffDay[]).map(offDay => `${offDay.senseiId}|${offDay.date}`));
    }, [offDays]);

    const noShowScheduleIds = useMemo(() => {
      const ids = new Set<string>();
      (lessonTrackers as LessonTracker[]).forEach(tracker => {
        if (tracker.scheduleId && tracker.attendance === 'No Show') {
          ids.add(tracker.scheduleId);
        }
      });
      return ids;
    }, [lessonTrackers]);

    const schedulesBySenseiDate = useMemo(() => {
      const index = new Map<string, Schedule[]>();
      (filteredSchedules as Schedule[]).forEach(schedule => {
        const key = `${schedule.senseiId}|${schedule.date}`;
        const existing = index.get(key);
        if (existing) {
          existing.push(schedule);
        } else {
          index.set(key, [schedule]);
        }
      });
      index.forEach(items => {
        items.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      });
      return index;
    }, [filteredSchedules]);

    const getScheduleStudents = (schedule: Schedule): Student[] => {
      const ids = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
      return ids.reduce<Student[]>((items, id: string) => {
        const student = studentById.get(id);
        if (student) items.push(student);
        return items;
      }, []);
    };

    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
              <Calendar size={24} className="text-indigo-600" />
              Kalender Jadwal
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="h-8 w-[1px] bg-slate-100 dark:bg-slate-800 hidden md:block"></div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <CalendarDays size={16} />
                Week
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <CalendarRange size={16} />
                Month
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentDate(prev => viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 min-w-[150px] text-center">
                {format(currentDate, viewMode === 'week' ? 'MMMM yyyy' : 'MMMM yyyy')}
              </h2>
              <button 
                onClick={() => setCurrentDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1))}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
              <Filter size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={dateRange.start}
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                min="2026-03-01"
                max="2027-03-31"
                className="bg-transparent text-sm font-medium outline-none text-slate-600"
              />
              <span className="text-slate-300">to</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                min="2026-03-01"
                max="2027-03-31"
                className="bg-transparent text-sm font-medium outline-none text-slate-600"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-r border-slate-100 dark:border-slate-800 min-w-[180px]">
                  Sensei
                </th>
                {dates.map(date => (
                  <th key={date.toISOString()} className={`p-4 text-center border-b border-slate-100 dark:border-slate-800 min-w-[140px] ${isSameDay(date, new Date()) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(date, 'EEE')}</p>
                    <p className={`text-xl font-bold mt-1 ${isSameDay(date, new Date()) ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>{format(date, 'd')}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {senseiList.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={48} className="opacity-20" />
                      <p>Belum ada data Sensei. Silakan tambah di Master Data.</p>
                    </div>
                  </td>
                </tr>
              ) : senseiList.map(sensei => (
                <tr key={sensei.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800 p-4 font-semibold text-slate-700 dark:text-slate-200 border-b border-r border-slate-100 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    {sensei.name}
                  </td>
                  {dates.map(date => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const cellKey = `${sensei.id}|${dateStr}`;
                    const isOff = offDayKeys.has(cellKey);
                    const daySchedules = schedulesBySenseiDate.get(cellKey) || [];
                    
                    return (
                      <td 
                        key={date.toISOString()} 
                        className={`p-2 border-b border-slate-100 dark:border-slate-800 align-top min-h-[100px] relative ${isSameDay(date, new Date()) ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`}
                        onClick={() => {
                          if (!isOff) {
                            setSelectedCell({ senseiId: sensei.id, date });
                            setShowScheduleModal(true);
                          }
                        }}
                      >
                        {isOff ? (
                          <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 text-[10px] font-bold p-2 rounded-xl border border-rose-100 dark:border-rose-800 flex items-center justify-center h-full min-h-[60px] cursor-not-allowed">
                            OFF
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {daySchedules.map(s => {
                              const sStudents = getScheduleStudents(s);
                              const sGroup = groupById.get(s.groupId);
                              const displayName = sGroup ? sGroup.name : (sStudents.length > 0 ? sStudents.map(st => st.name).join(', ') : 'Unknown Student');
                              const displayTooltipTitle = sGroup 
                                ? `${sGroup.name} (${sStudents.map(st => st.name).join(', ')}) - ${s.level} (${s.type})` 
                                : `${displayName} - ${s.level} (${s.type})`;
                              const hasNoShow = noShowScheduleIds.has(s.id);
                              
                              return (
                                <motion.div 
                                  layoutId={s.id}
                                  key={s.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSchedule(s);
                                    setShowScheduleModal(true);
                                  }}
                                  className={`p-2 rounded-xl border text-[11px] font-medium cursor-pointer shadow-sm hover:shadow-md transition-all ${
                                    hasNoShow 
                                      ? 'bg-rose-950 text-rose-100 border-rose-900 shadow-rose-900/20' 
                                      : (TYPE_COLORS[s.type] || TYPE_COLORS['blank'])
                                  }`}
                                  title={displayTooltipTitle}
                                >
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold">{s.startTime} - {s.endTime}</span>
                                    {hasNoShow && <span className="bg-rose-500 text-[8px] px-1 rounded uppercase animate-pulse">No Show</span>}
                                    {!hasNoShow && <span className="opacity-60 text-[9px] uppercase">{s.type}</span>}
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <div className="flex-1 min-w-0">
                                      <p className="truncate font-bold">
                                        {displayName}
                                      </p>
                                      <p className="text-[9px] opacity-70">{s.level}</p>
                                    </div>
                                    <div className="flex gap-1 ml-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSchedule(s);
                                          setShowScheduleModal(true);
                                          // Note: In the modal, focus on Sensei could be improved but for now just opening Edit is standard
                                        }}
                                        className="p-1 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-lg border border-white/20 transition-all text-slate-700 dark:text-white"
                                        title="Swap Sensei / Edit"
                                      >
                                        <UsersRound size={12} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTrackerSchedule(s);
                                          setShowTrackerModal(true);
                                        }}
                                        className="p-1 bg-white/30 hover:bg-white/50 backdrop-blur-sm rounded-lg border border-white/20 transition-all text-slate-700 dark:text-white"
                                        title="Lesson Tracker"
                                      >
                                        <ClipboardList size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              );
                            })}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCell({ senseiId: sensei.id, date });
                                setShowScheduleModal(true);
                              }}
                              className="w-full h-10 flex items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-400 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all mt-1"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

