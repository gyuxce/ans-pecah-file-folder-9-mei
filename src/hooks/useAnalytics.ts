import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { format, subDays, eachDayOfInterval, isSameMonth, parseISO, differenceInDays, isAfter } from 'date-fns';
import { useAppStore } from '../store/useAppStore';

export const useAnalytics = () => {
  const { schedules, senseiList, studentList, lessonTrackers } = useAppStore(useShallow(state => ({
    schedules: state.schedules,
    senseiList: state.senseiList,
    studentList: state.studentList,
    lessonTrackers: state.lessonTrackers
  })));

  return useMemo(() => {
    const senseiNameById = new Map<string, string>(senseiList.map(sensei => [sensei.id, sensei.name]));
    const studentNameById = new Map<string, string>(studentList.map(student => [student.id, student.name]));
    const activeSchedules = schedules.filter(s => s.status === 'active');
    const privateClasses = activeSchedules.filter(s => s.type === 'Private').length;
    const n5Classes = activeSchedules.filter(s => (s.level || '').includes('N5')).length;
    
    const activeStudents = studentList.filter(s => s.is_active !== false);
    const paidStatuses = ['Paid', 'Lunas'];
    const partialStatuses = ['Cicilan'];
    const unpaidStudents = activeStudents.filter(s => !paidStatuses.includes(s.payment_status)).length;
    
    const now = new Date();
    const last7Days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now
    });

    const weeklyCountByDate = new Map(last7Days.map(day => [format(day, 'yyyy-MM-dd'), 0]));
    let completedThisMonth = 0;
    lessonTrackers.forEach(lt => {
      if (!lt.date) return;
      if (weeklyCountByDate.has(lt.date)) {
        weeklyCountByDate.set(lt.date, (weeklyCountByDate.get(lt.date) || 0) + 1);
      }
      if (!lt.material) return;
      try {
        const d = parseISO(lt.date);
        if (isSameMonth(d, now)) completedThisMonth += 1;
      } catch (e) {
        // Skip invalid tracker dates.
      }
    });

    // Weekly Activity Chart Data
    const weeklyActivityData = last7Days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        name: format(day, 'EEE'),
        fullDate: format(day, 'dd MMM'),
        count: weeklyCountByDate.get(dateKey) || 0
      };
    });
    
    const typeBreakdown: Record<string, number> = {};
    activeSchedules.forEach(s => {
      typeBreakdown[s.type] = (typeBreakdown[s.type] || 0) + 1;
    });

    const consolidatedLevelBreakdown: Record<string, number> = {};
    activeStudents.forEach(s => {
      const levels = (s.level || '').split(',').map(l => l.trim());
      levels.forEach(l => {
        if (!l) return;
        let category = l;
        // Grouping logic for cleaner chart
        if (l.toLowerCase().includes('guntai')) category = 'Guntai';
        else if (l.toLowerCase().includes('intensif')) category = 'Intensif';
        else if (l.toLowerCase().includes('kids')) category = 'Kids';
        else if (l.toLowerCase().includes('kaiwa')) category = 'Kaiwa';
        else if (['N1', 'N2', 'N3', 'N4', 'N5'].includes(l)) category = 'JLPT ' + l;
        
        consolidatedLevelBreakdown[category] = (consolidatedLevelBreakdown[category] || 0) + 1;
      });
    });

    const pieData = Object.entries(consolidatedLevelBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Sensei Workload (Beban Kerja)
    const senseiWorkload: Record<string, number> = {};
    activeSchedules.forEach(s => {
      const senseiName = senseiNameById.get(s.senseiId) || 'Tidak diketahui';
      senseiWorkload[senseiName] = (senseiWorkload[senseiName] || 0) + 1;
    });

    const workloadData = Object.entries(senseiWorkload)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 busiest sensei

    // Payment Summary for Chart
    const paymentData = [
      { name: 'Lunas', value: activeStudents.filter(s => paidStatuses.includes(s.payment_status)).length },
      { name: 'Cicilan', value: activeStudents.filter(s => partialStatuses.includes(s.payment_status)).length },
      { name: 'Belum Bayar', value: activeStudents.filter(s => s.payment_status === 'Unpaid').length }
    ];

    // Upcoming Sessions
    const todayStr = format(now, 'yyyy-MM-dd');
    const upcomingSessions = schedules
      .filter(s => s.date === todayStr && s.status === 'active')
      .map(s => {
        let sessionTime = now;
        try {
          const [hour, minute] = (s.startTime || '').split(':');
          if (hour && minute) {
            sessionTime = new Date(now);
            sessionTime.setHours(parseInt(hour), parseInt(minute), 0, 0);
          }
        } catch (e) {
          // ignore
        }
        
        const senseiName = senseiNameById.get(s.senseiId) || 'Tidak diketahui';
        const sIds = s.studentIds && s.studentIds.length > 0 ? s.studentIds : (s.studentId ? [s.studentId] : []);
        const studentName = sIds.map(id => studentNameById.get(id) || 'Tidak diketahui').join(', ');

        return { ...s, sessionTime, senseiName, studentName, time: s.startTime };
      })
      .filter(s => isAfter(s.sessionTime, now))
      .sort((a, b) => a.sessionTime.getTime() - b.sessionTime.getTime())
      .slice(0, 6);

    // Recent Activity
    const recentTrackers = [...lessonTrackers]
      .filter(lt => lt.material) // Only count completed
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 4)
      .map(lt => {
        const senseiName = senseiNameById.get(lt.senseiId) || 'Tidak diketahui';
        return { ...lt, senseiName };
      });

    const recentStudents = [...studentList]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 2);

    // Hitung siswa baru 30 hari terakhir berdasarkan created_at,
    // bukan UUID karena UUID bukan tanggal (fix: selalu 0 sebelumnya).
    const newStudents30Days = studentList.filter(s => {
      try {
        const rawDate = (s as any).created_at || (s as any).createdAt;
        if (!rawDate) return false;
        const joinDate = parseISO(rawDate);
        if (Number.isNaN(joinDate.getTime())) return false;
        return differenceInDays(now, joinDate) <= 30;
      } catch (e) { return false; }
    }).length;

    return {
      total: activeSchedules.length,
      privateClasses,
      n5Classes,
      unpaidStudents,
      completedThisMonth,
      totalStudents: activeStudents.length,
      newStudents30Days: newStudents30Days || 0,
      typeBreakdown,
      levelBreakdown: consolidatedLevelBreakdown,
      weeklyActivityData,
      pieData,
      workloadData,
      paymentData,
      upcomingSessions,
      recentTrackers,
      recentStudents
    };
  }, [schedules, senseiList, studentList, lessonTrackers]);
};
