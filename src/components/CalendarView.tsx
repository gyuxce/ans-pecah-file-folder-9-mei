import { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Plus,
  Search,
  Users
} from 'lucide-react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks
} from 'date-fns';

import { TYPE_COLORS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { LessonTracker, OffDay, Schedule, Sensei, Student } from '../types';

type ScheduleView = Schedule & {
  displayName: string;
  tooltip: string;
  hasNoShow: boolean;
  senseiName: string;
};

export const CalendarView = () => {
  const {
    senseiList,
    studentList,
    groupList,
    offDays,
    schedules,
    lessonTrackers,
    viewMode,
    setViewMode,
    currentDate,
    setCurrentDate,
    dateRange,
    setDateRange,
    setShowScheduleModal,
    setShowTrackerModal,
    setSelectedTrackerSchedule,
    setEditingSchedule,
    setSelectedCell,
    isDataLoading
  } = useAppContext(state => ({
    senseiList: state.permissions.role === 'Sensei' ? state.scopedSenseiList : state.senseiList,
    studentList: state.permissions.role === 'Sensei' ? state.scopedStudentList : state.studentList,
    groupList: state.groupList,
    offDays: state.offDays,
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    lessonTrackers: state.permissions.role === 'Sensei' ? state.scopedLessonTrackers : state.lessonTrackers,
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
    setSelectedCell: state.setSelectedCell,
    isDataLoading: state.isDataLoading
  }));

  const [senseiSearch, setSenseiSearch] = useState('');

  const dates = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }, [currentDate, viewMode]);

  const today = useMemo(() => new Date(), []);

  const dateMeta = useMemo(() => {
    return dates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date,
        dateStr,
        key: dateStr,
        weekdayLabel: format(date, 'EEE'),
        dayLabel: format(date, 'd'),
        monthLabel: format(date, 'dd MMM'),
        isToday: isSameDay(date, today)
      };
    });
  }, [dates, today]);

  const visibleDateSet = useMemo(() => {
    return new Set(dateMeta.map(date => date.dateStr));
  }, [dateMeta]);

  const senseiById = useMemo(() => {
    return new Map((senseiList as Sensei[]).map(sensei => [sensei.id, sensei]));
  }, [senseiList]);

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
      if (tracker.scheduleId && tracker.attendance === 'No Show') ids.add(tracker.scheduleId);
    });
    return ids;
  }, [lessonTrackers]);

  const visibleSensei = useMemo(() => {
    const search = senseiSearch.trim().toLowerCase();
    if (!search) return senseiList as Sensei[];
    return (senseiList as Sensei[]).filter(sensei => (sensei.name || '').toLowerCase().includes(search));
  }, [senseiList, senseiSearch]);

  const visibleSenseiIds = useMemo(() => {
    return new Set(visibleSensei.map(sensei => sensei.id));
  }, [visibleSensei]);

  const filteredSchedules = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    return (schedules as Schedule[]).filter(schedule => {
      if (!schedule.date || !visibleDateSet.has(schedule.date)) return false;
      if (!visibleSenseiIds.has(schedule.senseiId)) return false;
      const parsedDate = parseISO(schedule.date);
      if (Number.isNaN(parsedDate.getTime())) return false;
      return isWithinInterval(parsedDate, { start, end });
    });
  }, [schedules, dateRange, visibleDateSet, visibleSenseiIds]);

  const scheduleViews = useMemo(() => {
    return filteredSchedules.map((schedule): ScheduleView => {
      const studentIds = schedule.studentIds?.length ? schedule.studentIds : (schedule.studentId ? [schedule.studentId] : []);
      const students = studentIds.map(id => studentById.get(id)).filter((student): student is Student => Boolean(student));
      const group = groupById.get(schedule.groupId);
      const displayName = group ? group.name : (students.length ? students.map(student => student.name).join(', ') : 'Unknown Student');
      const tooltip = group
        ? `${group.name} (${students.map(student => student.name).join(', ')}) - ${schedule.level} (${schedule.type})`
        : `${displayName} - ${schedule.level} (${schedule.type})`;

      return {
        ...schedule,
        displayName,
        tooltip,
        hasNoShow: noShowScheduleIds.has(schedule.id),
        senseiName: senseiById.get(schedule.senseiId)?.name || 'Unknown Sensei'
      };
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.senseiName !== b.senseiName) return a.senseiName.localeCompare(b.senseiName);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [filteredSchedules, groupById, noShowScheduleIds, senseiById, studentById]);

  const schedulesBySenseiDate = useMemo(() => {
    const index = new Map<string, ScheduleView[]>();
    scheduleViews.forEach(schedule => {
      const key = `${schedule.senseiId}|${schedule.date}`;
      const existing = index.get(key);
      if (existing) existing.push(schedule);
      else index.set(key, [schedule]);
    });
    return index;
  }, [scheduleViews]);

  const schedulesByDate = useMemo(() => {
    const index = new Map<string, ScheduleView[]>();
    scheduleViews.forEach(schedule => {
      const existing = index.get(schedule.date);
      if (existing) existing.push(schedule);
      else index.set(schedule.date, [schedule]);
    });
    return index;
  }, [scheduleViews]);

  const openEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setShowScheduleModal(true);
  };

  const openTracker = (schedule: Schedule) => {
    setSelectedTrackerSchedule(schedule);
    setShowTrackerModal(true);
  };

  const openNewSchedule = (senseiId?: string, date?: Date) => {
    if (senseiId && date) setSelectedCell({ senseiId, date });
    else setSelectedCell(null);
    setShowScheduleModal(true);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-indigo-600" />
          <h2 className="text-lg font-black text-slate-800 dark:text-white">Kalender Jadwal</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <CalendarDays size={14} />
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400'}`}
            >
              <CalendarRange size={14} />
              Month
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(prev => viewMode === 'week' ? subWeeks(prev, 1) : subMonths(prev, 1))}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Previous period"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-[132px] text-center text-sm font-black text-slate-700 dark:text-slate-200">
            {format(currentDate, 'MMMM yyyy')}
          </div>
          <button
            onClick={() => setCurrentDate(prev => viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1))}
            className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Next period"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={senseiSearch}
              onChange={event => setSenseiSearch(event.target.value)}
              placeholder="Cari sensei..."
              className="w-40 pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold outline-none dark:text-white"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 border border-slate-200 dark:border-slate-700">
            <Filter size={14} className="text-slate-400" />
            <input
              type="date"
              value={dateRange.start}
              onChange={event => setDateRange(prev => ({ ...prev, start: event.target.value }))}
              className="bg-transparent text-xs font-semibold outline-none text-slate-600 dark:text-slate-200"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={event => setDateRange(prev => ({ ...prev, end: event.target.value }))}
              className="bg-transparent text-xs font-semibold outline-none text-slate-600 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {isDataLoading ? (
        <div className="p-10 text-center text-sm font-bold text-slate-400 dark:text-slate-500">Memuat kalender jadwal...</div>
      ) : visibleSensei.length === 0 ? (
        <div className="p-10 text-center text-slate-400 dark:text-slate-500">
          <Users size={36} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-bold">Sensei tidak ditemukan.</p>
        </div>
      ) : viewMode === 'month' ? (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              {scheduleViews.length} jadwal pada bulan ini
            </p>
            <button
              onClick={() => openNewSchedule()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700"
            >
              <Plus size={14} />
              Tambah
            </button>
          </div>

          {dateMeta.map(date => {
            const daySchedules = schedulesByDate.get(date.dateStr) || [];
            if (daySchedules.length === 0) return null;

            return (
              <div key={date.key} className="grid grid-cols-[96px_1fr] md:grid-cols-[120px_1fr]">
                <div className={`p-3 border-r border-slate-100 dark:border-slate-800 ${date.isToday ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}>
                  <p className="text-xs font-black text-slate-400 uppercase">{date.weekdayLabel}</p>
                  <p className={`text-sm font-black ${date.isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {date.monthLabel}
                  </p>
                </div>
                <div className="p-2 space-y-1.5">
                  {daySchedules.map(schedule => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={openEditSchedule}
                      onTracker={openTracker}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {scheduleViews.length === 0 && (
            <div className="p-10 text-center text-sm font-bold text-slate-400 dark:text-slate-500">
              Tidak ada jadwal pada filter ini.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40">
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 p-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-r border-slate-200 dark:border-slate-800 min-w-[150px]">
                  Sensei
                </th>
                {dateMeta.map(date => (
                  <th key={date.key} className={`p-3 min-w-[132px] border-b border-slate-200 dark:border-slate-800 text-center ${date.isToday ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{date.weekdayLabel}</p>
                    <p className={`text-lg font-black ${date.isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {date.dayLabel}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSensei.map(sensei => (
                <tr key={sensei.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-3 font-black text-slate-700 dark:text-slate-200 border-b border-r border-slate-100 dark:border-slate-800">
                    <span className="line-clamp-2">{sensei.name}</span>
                  </td>
                  {dateMeta.map(date => {
                    const cellKey = `${sensei.id}|${date.dateStr}`;
                    const isOff = offDayKeys.has(cellKey);
                    const daySchedules = schedulesBySenseiDate.get(cellKey) || [];

                    return (
                      <td
                        key={date.key}
                        className={`p-1.5 align-top border-b border-slate-100 dark:border-slate-800 ${date.isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                      >
                        {isOff ? (
                          <div className="px-2 py-2 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 text-[10px] font-black text-center border border-rose-100 dark:border-rose-900">
                            OFF
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {daySchedules.map(schedule => (
                              <ScheduleChip
                                key={schedule.id}
                                schedule={schedule}
                                onEdit={openEditSchedule}
                                onTracker={openTracker}
                              />
                            ))}
                            <button
                              onClick={() => openNewSchedule(sensei.id, date.date)}
                              className="w-full h-7 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 text-slate-300 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700"
                              aria-label={`Tambah jadwal ${sensei.name} ${date.dateStr}`}
                            >
                              <Plus size={14} />
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
      )}
    </div>
  );
};

const ScheduleChip = ({
  schedule,
  onEdit,
  onTracker
}: {
  schedule: ScheduleView;
  onEdit: (schedule: Schedule) => void;
  onTracker: (schedule: Schedule) => void;
}) => {
  const chipColor = schedule.hasNoShow ? 'bg-rose-950 text-rose-100 border-rose-900' : (TYPE_COLORS[schedule.type] || TYPE_COLORS.blank);

  return (
    <div
      className={`p-2 border text-[11px] font-semibold cursor-pointer ${chipColor}`}
      title={schedule.tooltip}
      onClick={() => onEdit(schedule)}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-black">{schedule.startTime}</span>
        <button
          onClick={event => {
            event.stopPropagation();
            onTracker(schedule);
          }}
          className="p-1 bg-white/25 hover:bg-white/40"
          title="Lesson Tracker"
        >
          <ClipboardList size={12} />
        </button>
      </div>
      <p className="truncate">{schedule.displayName}</p>
      <p className="truncate text-[9px] opacity-75">{schedule.level}</p>
    </div>
  );
};

const ScheduleRow = ({
  schedule,
  onEdit,
  onTracker
}: {
  schedule: ScheduleView;
  onEdit: (schedule: Schedule) => void;
  onTracker: (schedule: Schedule) => void;
}) => {
  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2 border border-slate-200 dark:border-slate-800 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <button
        onClick={() => onEdit(schedule)}
        className="text-left text-xs font-black text-indigo-600 dark:text-indigo-300"
        title={schedule.tooltip}
      >
        {schedule.startTime}
      </button>
      <button onClick={() => onEdit(schedule)} className="min-w-0 text-left" title={schedule.tooltip}>
        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{schedule.displayName}</p>
        <p className="truncate text-[11px] font-semibold text-slate-400">
          {schedule.senseiName} - {schedule.level} - {schedule.type}
        </p>
      </button>
      <button
        onClick={() => onTracker(schedule)}
        className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300"
        title="Lesson Tracker"
      >
        <ClipboardList size={14} />
      </button>
    </div>
  );
};
