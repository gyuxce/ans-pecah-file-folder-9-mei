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
  Users,
  X
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

import { useAppContext } from '../context/AppContext';
import { LessonTracker, OffDay, Schedule, Sensei, SenseiTimeBlock, SenseiTimeBlockStatus, Student } from '../types';

type ScheduleView = Schedule & {
  displayName: string;
  tooltip: string;
  hasNoShow: boolean;
  senseiName: string;
};

type SlotSelection = {
  dateStr: string;
  hour: number;
  schedules: ScheduleView[];
  blocks: TimeBlockView[];
} | null;

type TimeBlockView = {
  id: string;
  senseiId: string;
  senseiName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SenseiTimeBlockStatus;
  label: string;
  note?: string;
  source: 'Jadwal Sensei' | 'Hari Libur';
};

export const CalendarView = () => {
  const {
    senseiList,
    studentList,
    groupList,
    schedules,
    senseiTimeBlocks,
    offDays,
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
    schedules: state.permissions.role === 'Sensei' ? state.scopedSchedules : state.schedules,
    senseiTimeBlocks: state.permissions.role === 'Sensei' ? state.scopedSenseiTimeBlocks : state.senseiTimeBlocks,
    offDays: state.offDays,
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
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection>(null);

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
      const displayName = group ? group.name : (students.length ? students.map(student => student.name).join(', ') : 'Siswa tidak ditemukan');
      const tooltip = group
        ? `${group.name} (${students.map(student => student.name).join(', ')}) - ${schedule.level} (${schedule.type})`
        : `${displayName} - ${schedule.level} (${schedule.type})`;

      return {
        ...schedule,
        displayName,
        tooltip,
        hasNoShow: noShowScheduleIds.has(schedule.id),
        senseiName: senseiById.get(schedule.senseiId)?.name || 'Sensei tidak ditemukan'
      };
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.senseiName !== b.senseiName) return a.senseiName.localeCompare(b.senseiName);
      return (a.startTime || '').localeCompare(b.startTime || '');
    });
  }, [filteredSchedules, groupById, noShowScheduleIds, senseiById, studentById]);

  const timeBlockViews = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const blockLabels: Record<SenseiTimeBlockStatus, string> = {
      available_ans: 'Tersedia ANS',
      busy_cakap: 'Busy Cakap',
      busy_personal: 'Busy Pribadi',
      off: 'Off'
    };

    const manualBlocks = (senseiTimeBlocks as SenseiTimeBlock[])
      .filter(block => {
        if (block.status === 'available_ans') return false;
        if (!block.date || !visibleDateSet.has(block.date)) return false;
        if (!visibleSenseiIds.has(block.senseiId)) return false;
        const parsedDate = parseISO(block.date);
        if (Number.isNaN(parsedDate.getTime())) return false;
        return isWithinInterval(parsedDate, { start, end });
      })
      .map((block): TimeBlockView => ({
        id: block.id,
        senseiId: block.senseiId,
        senseiName: senseiById.get(block.senseiId)?.name || 'Sensei tidak ditemukan',
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        status: block.status,
        label: blockLabels[block.status] || block.status,
        note: block.note,
        source: 'Jadwal Sensei'
      }));

    const holidayBlocks = (offDays as OffDay[])
      .filter(offDay => {
        if (!offDay.date || !visibleDateSet.has(offDay.date)) return false;
        if (!visibleSenseiIds.has(offDay.senseiId)) return false;
        const parsedDate = parseISO(offDay.date);
        if (Number.isNaN(parsedDate.getTime())) return false;
        return isWithinInterval(parsedDate, { start, end });
      })
      .map((offDay): TimeBlockView => ({
        id: `offday-${offDay.id}`,
        senseiId: offDay.senseiId,
        senseiName: senseiById.get(offDay.senseiId)?.name || 'Sensei tidak ditemukan',
        date: offDay.date,
        startTime: '00:00',
        endTime: '23:59',
        status: 'off',
        label: 'Off',
        note: offDay.reason,
        source: 'Hari Libur'
      }));

    return [...manualBlocks, ...holidayBlocks].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
      return a.senseiName.localeCompare(b.senseiName);
    });
  }, [dateRange, offDays, senseiById, senseiTimeBlocks, visibleDateSet, visibleSenseiIds]);

  const schedulesByDate = useMemo(() => {
    const index = new Map<string, ScheduleView[]>();
    scheduleViews.forEach(schedule => {
      const existing = index.get(schedule.date);
      if (existing) existing.push(schedule);
      else index.set(schedule.date, [schedule]);
    });
    return index;
  }, [scheduleViews]);

  const visibleHours = useMemo(() => {
    const hours = new Set<number>();
    scheduleViews.forEach(schedule => {
      const parsedHour = Number((schedule.startTime || '').split(':')[0]);
      if (!Number.isNaN(parsedHour)) hours.add(parsedHour);
    });
    timeBlockViews.forEach(block => {
      if (block.startTime === '00:00' && block.endTime === '23:59') return;
      const startHour = Number((block.startTime || '').split(':')[0]);
      const endHour = Number((block.endTime || '').split(':')[0]);
      if (Number.isNaN(startHour)) return;
      const safeEndHour = Number.isNaN(endHour) ? startHour : Math.max(startHour, endHour);
      for (let hour = startHour; hour <= safeEndHour; hour += 1) hours.add(hour);
    });

    if (hours.size === 0) {
      for (let hour = 8; hour <= 17; hour += 1) hours.add(hour);
    }

    return Array.from(hours).sort((a, b) => a - b);
  }, [scheduleViews, timeBlockViews]);

  const schedulesByDateHour = useMemo(() => {
    const index = new Map<string, ScheduleView[]>();
    scheduleViews.forEach(schedule => {
      const hour = Number((schedule.startTime || '').split(':')[0]);
      if (Number.isNaN(hour)) return;
      const key = `${schedule.date}|${hour}`;
      const existing = index.get(key);
      if (existing) existing.push(schedule);
      else index.set(key, [schedule]);
    });
    return index;
  }, [scheduleViews]);

  const timeBlocksByDateHour = useMemo(() => {
    const index = new Map<string, TimeBlockView[]>();
    timeBlockViews.forEach(block => {
      visibleHours.forEach(hour => {
        const hourStart = `${String(hour).padStart(2, '0')}:00`;
        const hourEnd = `${String(hour + 1).padStart(2, '0')}:00`;
        if (block.startTime < hourEnd && block.endTime > hourStart) {
          const key = `${block.date}|${hour}`;
          const existing = index.get(key);
          if (existing) existing.push(block);
          else index.set(key, [block]);
        }
      });
    });
    return index;
  }, [timeBlockViews, visibleHours]);

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
    setSelectedSlot(null);
    setShowScheduleModal(true);
  };

  const openSlotDrawer = (dateStr: string, hour: number, schedulesForSlot: ScheduleView[], blocksForSlot: TimeBlockView[]) => {
    setSelectedSlot({ dateStr, hour, schedules: schedulesForSlot, blocks: blocksForSlot });
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
                <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 p-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-r border-slate-200 dark:border-slate-800 min-w-[88px]">
                  GMT +7
                </th>
                {dateMeta.map(date => (
                  <th key={date.key} className={`p-3 min-w-[150px] border-b border-slate-200 dark:border-slate-800 text-center ${date.isToday ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{date.weekdayLabel}</p>
                    <p className={`text-sm font-black ${date.isToday ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {date.monthLabel}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHours.map(hour => (
                <tr key={hour} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-3 align-top font-black text-slate-600 dark:text-slate-300 border-b border-r border-slate-100 dark:border-slate-800">
                    {String(hour).padStart(2, '0')}:00
                  </td>
                  {dateMeta.map(date => {
                    const slotSchedules = schedulesByDateHour.get(`${date.dateStr}|${hour}`) || [];
                    const slotBlocks = timeBlocksByDateHour.get(`${date.dateStr}|${hour}`) || [];
                    const senseiCount = new Set(slotSchedules.map(schedule => schedule.senseiId)).size;
                    const classCount = slotSchedules.length;
                    const hasNoShow = slotSchedules.some(schedule => schedule.hasNoShow);
                    const densityClass = getDensityClass(classCount, hasNoShow, slotBlocks);

                    return (
                      <td
                        key={date.key}
                        className={`p-1.5 align-top border-b border-slate-100 dark:border-slate-800 ${date.isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}
                      >
                        <button
                          onClick={() => openSlotDrawer(date.dateStr, hour, slotSchedules, slotBlocks)}
                          className={`w-full min-h-[74px] border px-2 py-2 text-center text-xs font-black transition-colors ${densityClass}`}
                          title={`${date.monthLabel} ${String(hour).padStart(2, '0')}:00`}
                        >
                          {classCount > 0 ? (
                            <span className="flex h-full flex-col items-center justify-center leading-tight">
                              <span>{senseiCount} Sensei</span>
                              <span>{classCount} Kelas</span>
                              {hasNoShow && <span className="mt-1 bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">No Show</span>}
                              {slotBlocks.length > 0 && <span className="mt-1 text-[9px] opacity-90">{getBlockCountSummary(slotBlocks)}</span>}
                            </span>
                          ) : slotBlocks.length > 0 ? (
                            <span className="flex h-full flex-col items-center justify-center leading-tight">
                              <span>{new Set(slotBlocks.map(block => block.senseiId)).size} Sensei</span>
                              <span>{getBlockCountSummary(slotBlocks)}</span>
                            </span>
                          ) : (
                            <span className="flex h-full items-center justify-center text-slate-400 dark:text-slate-500">Tersedia</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSlot && (
        <SlotDrawer
          selectedSlot={selectedSlot}
          dateMeta={dateMeta}
          onClose={() => setSelectedSlot(null)}
          onAdd={() => openNewSchedule()}
          onEdit={openEditSchedule}
          onTracker={openTracker}
        />
      )}
    </div>
  );
};

const getDensityClass = (classCount: number, hasNoShow: boolean, blocks: TimeBlockView[] = []) => {
  if (hasNoShow) return 'bg-rose-950 text-rose-50 border-rose-900 hover:bg-rose-900';
  if (classCount >= 4) return 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600';
  if (classCount >= 2) return 'bg-red-700 text-white border-red-800 hover:bg-red-800';
  if (classCount === 1) return 'bg-lime-200 text-slate-800 border-lime-300 hover:bg-lime-300';
  if (blocks.some(block => block.status === 'off')) return 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200';
  if (blocks.some(block => block.status === 'busy_cakap')) return 'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200 dark:bg-violet-950/40 dark:border-violet-900 dark:text-violet-200';
  if (blocks.some(block => block.status === 'busy_personal')) return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200';
  return 'bg-sky-100 text-slate-500 border-sky-200 hover:bg-sky-200 dark:bg-sky-950/30 dark:border-sky-900 dark:text-sky-200';
};

const getBlockCountSummary = (blocks: TimeBlockView[]) => {
  const cakapCount = blocks.filter(block => block.status === 'busy_cakap').length;
  const personalCount = blocks.filter(block => block.status === 'busy_personal').length;
  const offCount = blocks.filter(block => block.status === 'off').length;
  const parts = [
    cakapCount > 0 ? `${cakapCount} Cakap` : '',
    personalCount > 0 ? `${personalCount} Pribadi` : '',
    offCount > 0 ? `${offCount} Off` : ''
  ].filter(Boolean);

  return parts.join(', ') || `${blocks.length} Block`;
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

const SlotDrawer = ({
  selectedSlot,
  dateMeta,
  onClose,
  onAdd,
  onEdit,
  onTracker
}: {
  selectedSlot: NonNullable<SlotSelection>;
  dateMeta: Array<{ dateStr: string; monthLabel: string; weekdayLabel: string }>;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (schedule: Schedule) => void;
  onTracker: (schedule: Schedule) => void;
}) => {
  const dateLabel = dateMeta.find(date => date.dateStr === selectedSlot.dateStr);
  const senseiCount = new Set(selectedSlot.schedules.map(schedule => schedule.senseiId)).size;
  const blockSenseiCount = new Set(selectedSlot.blocks.map(block => block.senseiId)).size;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close slot detail" />
      <aside className="relative h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {dateLabel?.weekdayLabel} - {dateLabel?.monthLabel}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-800 dark:text-white">
              {String(selectedSlot.hour).padStart(2, '0')}:00
            </h3>
            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
              {senseiCount} sensei, {selectedSlot.schedules.length} kelas, {blockSenseiCount} block
            </p>
          </div>
          <button onClick={onClose} className="p-2 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300">
            <X size={16} />
          </button>
        </div>

        <div className="h-[calc(100%-88px)] overflow-y-auto p-4">
          {selectedSlot.schedules.length === 0 && selectedSlot.blocks.length === 0 ? (
            <div className="border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Belum ada jadwal di slot ini.</p>
              <button onClick={onAdd} className="mt-4 inline-flex items-center gap-2 bg-indigo-600 px-4 py-2 text-xs font-black text-white">
                <Plus size={14} />
                Tambah Jadwal
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedSlot.schedules.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jadwal ANS</p>
                  {selectedSlot.schedules.map(schedule => (
                    <ScheduleRow
                      key={schedule.id}
                      schedule={schedule}
                      onEdit={onEdit}
                      onTracker={onTracker}
                    />
                  ))}
                </div>
              )}
              {selectedSlot.blocks.length > 0 && (
                <div className="space-y-2 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Block Sensei</p>
                  {selectedSlot.blocks.map(block => (
                    <div key={block.id} className={`border px-3 py-2 ${getBlockRowClass(block.status)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black">{block.senseiName}</p>
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest">{block.label}</span>
                      </div>
                      <p className="mt-1 text-xs font-bold opacity-80">
                        {block.startTime}-{block.endTime} - {block.source}
                      </p>
                      {block.note && <p className="mt-1 text-xs font-semibold opacity-80">{block.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const getBlockRowClass = (status: SenseiTimeBlockStatus) => {
  if (status === 'busy_cakap') return 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200';
  if (status === 'busy_personal') return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  if (status === 'off') return 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200';
  return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200';
};
