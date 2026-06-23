/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  X,
  Menu,
  Repeat,
  Lock,
  FileText} from 'lucide-react';
import { 
  format, 
  subDays,
  eachDayOfInterval, 
  isSameMonth,
  parseISO, 
  differenceInDays,
  isAfter,
  startOfYear,
  endOfYear,
  addYears
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { createClient } from '@supabase/supabase-js';

import { AuthPage } from './components/AuthPage';
import { ErrorBoundary } from './components/ErrorBoundary';

// --- CONSTANTS ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

import { Sensei, Student, LessonTracker, OffDay, Schedule, AppRole, UserProfile, Permissions } from './types';
import { fetchFromGAS, pushToGAS } from './utils/helpers';
import { safeParseStorage } from './utils/safeStorage';
import { Sidebar } from './components/Sidebar';
import { TeachingSessionsView } from './components/TeachingSessionsView';
import { AnalyticsCards } from './components/AnalyticsCards';

import { ReportingDashboard } from './components/ReportingDashboard';
import { CalendarView } from './components/CalendarView';
import { MasterData } from './components/MasterData';
import { UserManagement } from './components/UserManagement';
import { SmartChecker } from './components/SmartChecker';

import { LessonTrackerModal } from './components/LessonTrackerModal';
import { RekapAbsensiModal } from './components/RekapAbsensiModal';
import { ProfileViewModal } from './components/ProfileViewModal';
import { ResourceHubModal } from './components/ResourceHubModal';
import { ScheduleModal } from './components/ScheduleModal';
import { useAppStore } from './store/useAppStore';


const ADMIN_EMAILS = ['contact.ilusa@gmail.com'];

const UI_TO_DB_MAP: Record<string, string> = {
  'createdAt': 'created_at',
  'senseiId': 'sensei_id',
  'studentId': 'student_id',
  'studentIds': 'student_ids',
  'groupId': 'group_id',
  'startTime': 'start_time',
  'endTime': 'end_time',
  'updatedAt': 'updated_at',
  'updatedBy': 'updated_by',
  'scheduleId': 'schedule_id',
  'actualStartTime': 'actual_start_time',
  'caseNotes': 'case_notes',
  'studentFeedback': 'student_feedback',
  'isDelayed': 'is_delayed',
  'lastLogin': 'last_login',
  'actorId': 'actor_id',
  'actorEmail': 'actor_email',
  'collectionName': 'collection_name',
  'recordId': 'record_id',
  'offdayId': 'offday_id',
  'lessonId': 'lesson_id'
};

const DB_TO_UI_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(UI_TO_DB_MAP).map(([k, v]) => [v, k])
);

const useDebouncedStorage = (key: string, value: unknown, delay = 300) => {
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      } catch (error) {
        console.warn(`Failed to persist localStorage key "${key}":`, error);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [key, value, delay]);
};

export default function App() {
    // --- STATE ---
  const {
    activeTab, setActiveTab, masterSubTab, setMasterSubTab, syncConfig, setSyncConfig,
    dbStatus, setDbStatus, isDataLoading, setIsDataLoading, gasUrl, setGasUrl, isSyncing, setIsSyncing, lastSync, setLastSync,
    showSettings, setShowSettings, senseiList, setSenseiList, studentList, setStudentList,
    groupList, setGroupList, offDays, setOffDays, schedules, setSchedules, lessonTrackers, setLessonTrackers,
    viewMode, setViewMode, currentDate, setCurrentDate, studentStatusFilter, setStudentStatusFilter,
    globalSearchTerm, setGlobalSearchTerm, dateRange, setDateRange, showScheduleModal, setShowScheduleModal,
    showTrackerModal, setShowTrackerModal, showRekapModal, setShowRekapModal, showProfileModal, setShowProfileModal,
    selectedProfileData, setSelectedProfileData, selectedTrackerSchedule, setSelectedTrackerSchedule,
    selectedTrackerStudent, setSelectedTrackerStudent, showResourceHub, setShowResourceHub,
    selectedResourceStudent, setSelectedResourceStudent, editingSchedule, setEditingSchedule,
    selectedCell, setSelectedCell, isSidebarOpen, setIsSidebarOpen, user, setUser,
    authLoading, setAuthLoading, userProfile, setUserProfile, theme, setTheme
  } = useAppStore(useShallow(state => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    masterSubTab: state.masterSubTab,
    setMasterSubTab: state.setMasterSubTab,
    syncConfig: state.syncConfig,
    setSyncConfig: state.setSyncConfig,
    dbStatus: state.dbStatus,
    setDbStatus: state.setDbStatus,
    isDataLoading: state.isDataLoading,
    setIsDataLoading: state.setIsDataLoading,
    gasUrl: state.gasUrl,
    setGasUrl: state.setGasUrl,
    isSyncing: state.isSyncing,
    setIsSyncing: state.setIsSyncing,
    lastSync: state.lastSync,
    setLastSync: state.setLastSync,
    showSettings: state.showSettings,
    setShowSettings: state.setShowSettings,
    senseiList: state.senseiList,
    setSenseiList: state.setSenseiList,
    studentList: state.studentList,
    setStudentList: state.setStudentList,
    groupList: state.groupList,
    setGroupList: state.setGroupList,
    offDays: state.offDays,
    setOffDays: state.setOffDays,
    schedules: state.schedules,
    setSchedules: state.setSchedules,
    lessonTrackers: state.lessonTrackers,
    setLessonTrackers: state.setLessonTrackers,
    viewMode: state.viewMode,
    setViewMode: state.setViewMode,
    currentDate: state.currentDate,
    setCurrentDate: state.setCurrentDate,
    studentStatusFilter: state.studentStatusFilter,
    setStudentStatusFilter: state.setStudentStatusFilter,
    globalSearchTerm: state.globalSearchTerm,
    setGlobalSearchTerm: state.setGlobalSearchTerm,
    dateRange: state.dateRange,
    setDateRange: state.setDateRange,
    showScheduleModal: state.showScheduleModal,
    setShowScheduleModal: state.setShowScheduleModal,
    showTrackerModal: state.showTrackerModal,
    setShowTrackerModal: state.setShowTrackerModal,
    showRekapModal: state.showRekapModal,
    setShowRekapModal: state.setShowRekapModal,
    showProfileModal: state.showProfileModal,
    setShowProfileModal: state.setShowProfileModal,
    selectedProfileData: state.selectedProfileData,
    setSelectedProfileData: state.setSelectedProfileData,
    selectedTrackerSchedule: state.selectedTrackerSchedule,
    setSelectedTrackerSchedule: state.setSelectedTrackerSchedule,
    selectedTrackerStudent: state.selectedTrackerStudent,
    setSelectedTrackerStudent: state.setSelectedTrackerStudent,
    showResourceHub: state.showResourceHub,
    setShowResourceHub: state.setShowResourceHub,
    selectedResourceStudent: state.selectedResourceStudent,
    setSelectedResourceStudent: state.setSelectedResourceStudent,
    editingSchedule: state.editingSchedule,
    setEditingSchedule: state.setEditingSchedule,
    selectedCell: state.selectedCell,
    setSelectedCell: state.setSelectedCell,
    isSidebarOpen: state.isSidebarOpen,
    setIsSidebarOpen: state.setIsSidebarOpen,
    user: state.user,
    setUser: state.setUser,
    authLoading: state.authLoading,
    setAuthLoading: state.setAuthLoading,
    userProfile: state.userProfile,
    setUserProfile: state.setUserProfile,
    theme: state.theme,
    setTheme: state.setTheme
  })));

  // Today's Day Name
  const indonesianDayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  }, []);

  // --- THEME ---
  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    const body = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [theme]);

  // --- DYNAMIC ANALYTICS ---
  const analytics = useMemo(() => {
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
      const senseiName = senseiNameById.get(s.senseiId) || 'Unknown';
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
        
        const senseiName = senseiNameById.get(s.senseiId) || 'Unknown';
        const sIds = s.studentIds && s.studentIds.length > 0 ? s.studentIds : (s.studentId ? [s.studentId] : []);
        const studentName = sIds.map(id => studentNameById.get(id) || 'Unknown').join(', ');

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
        const senseiName = senseiNameById.get(lt.senseiId) || 'Unknown';
        return { ...lt, senseiName };
      });

    const recentStudents = [...studentList]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 2);

    const newStudents30Days = studentList.filter(s => {
      try {
        const joinDate = parseISO((s.id || '').split('-')[0] || ''); // Assuming ID starts with date or fallback
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

  // --- SUPABASE CLIENT ---
  const supabase = useMemo(() => createClient(syncConfig.supabase.url, syncConfig.supabase.key), [syncConfig.supabase.url, syncConfig.supabase.key]);

  const isSuperAdminEmail = (email?: string) => ADMIN_EMAILS.includes((email || '').toLowerCase());

  const mapProfileFromDb = (profile: any): UserProfile | null => {
    if (!profile) return null;
    return {
      id: profile.id,
      email: profile.email,
      role: (profile.role || 'Staff') as AppRole,
      status: (profile.status || 'Pending') as UserProfile['status'],
      lastLogin: profile.lastLogin || profile.last_login
    };
  };

  const currentSensei = useMemo(() => {
    const email = (user?.email || '').toLowerCase();
    return senseiList.find(s => (s.email || '').toLowerCase() === email) || null;
  }, [senseiList, user?.email]);

  const currentRole: AppRole = isSuperAdminEmail(user?.email) ? 'Super Admin' : (userProfile?.role || 'Staff');
  const isApprovedUser = currentRole === 'Super Admin' || userProfile?.status === 'Approved';
  const isSuperAdmin = currentRole === 'Super Admin';
  const permissions: Permissions = useMemo(() => ({
    role: currentRole,
    isApproved: isApprovedUser,
    canManageMasterData: isApprovedUser && (currentRole === 'Super Admin' || currentRole === 'Staff'),
    canManageSchedules: isApprovedUser && (currentRole === 'Super Admin' || currentRole === 'Staff'),
    canManageUsers: isApprovedUser && currentRole === 'Super Admin',
    canManageSettings: isApprovedUser && currentRole === 'Super Admin',
    canViewReporting: isApprovedUser && (currentRole === 'Super Admin' || currentRole === 'Staff')
  }), [currentRole, isApprovedUser]);

  const scopedSchedules = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return schedules;
    return schedules.filter(s => s.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, schedules]);

  const scopedStudentList = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return studentList;
    const studentIds = new Set<string>();
    scopedSchedules.forEach(s => {
      const ids = s.studentIds?.length ? s.studentIds : (s.studentId ? [s.studentId] : []);
      ids.forEach(id => studentIds.add(id));
    });
    return studentList.filter(s => studentIds.has(s.id) || s.sensei_name === currentSensei.name);
  }, [currentRole, currentSensei, scopedSchedules, studentList]);

  const scopedLessonTrackers = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return lessonTrackers;
    return lessonTrackers.filter(lt => lt.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, lessonTrackers]);

  // --- AUTHENTICATION ---
  useEffect(() => {
    console.log('Auth check started');
    // Check current session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Auth Session Error:', error);
        // Sometimes the refresh token is just missing/stale on reload, force clear it
        if (error.message?.includes('Refresh Token') || error.message?.includes('refresh token')) {
          supabase.auth.signOut().catch(() => {});
        }
      }
      const session = data?.session;
      const u = session?.user ?? null;
      console.log('Session fetched:', u ? u.email : 'No user');
      setUser(u);
      setAuthLoading(false);
    }).catch(err => {
      console.error('Session fetch failed:', err);
      // fallback catch for unhandled refresh token rejects
      if (err?.message?.includes('Refresh Token') || err?.message?.includes('refresh token')) {
        supabase.auth.signOut().catch(() => {});
      }
      setAuthLoading(false);
    });

    // Fallback if getSession is taking too long
    const timeout = setTimeout(() => {
      setAuthLoading(prev => {
        if (prev) {
          console.log('Auth loading timeout reached');
          return false;
        }
        return prev;
      });
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth Event:', _event);
      const newUser = session?.user ?? null;
      setUser((prev: any) => {
        if (prev?.id === newUser?.id) return prev;
        return newUser;
      });
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [supabase]);

  useEffect(() => {
    if (!user?.id || syncConfig.type !== 'supabase') {
      setUserProfile(null);
      return;
    }

    let isMounted = true;
    const syncProfile = async () => {
      const email = (user.email || '').toLowerCase();
      const defaultProfile = {
        id: user.id,
        email,
        role: isSuperAdminEmail(email) ? 'Super Admin' : 'Staff',
        status: isSuperAdminEmail(email) ? 'Approved' : 'Pending',
        last_login: new Date().toISOString()
      };

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert(defaultProfile)
            .select()
            .single();
          if (insertError) throw insertError;
          if (isMounted) setUserProfile(mapProfileFromDb(inserted));
          return;
        }

        const nextProfile = isSuperAdminEmail(email)
          ? { role: 'Super Admin', status: 'Approved', last_login: new Date().toISOString() }
          : { last_login: new Date().toISOString() };

        await supabase.from('profiles').update(nextProfile).eq('id', user.id);
        if (isMounted) setUserProfile(mapProfileFromDb({ ...data, ...nextProfile }));
      } catch (err: any) {
        console.error('Profile sync failed:', err);
        if (isMounted) {
          setUserProfile({
            id: user.id,
            email,
            role: isSuperAdminEmail(email) ? 'Super Admin' : 'Staff',
            status: isSuperAdminEmail(email) ? 'Approved' : 'Pending',
            lastLogin: new Date().toISOString()
          });
        }
      }
    };

    syncProfile();
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.email, syncConfig.type, supabase]);

  // --- DATABASE INITIALIZATION & REAL-TIME LISTENERS ---
  useEffect(() => {
    if (!user) return;
    
    localStorage.setItem('syncConfig', JSON.stringify(syncConfig));
    
    let supabaseChannel: any = null;
    let isMounted = true;

    const initDB = async () => {
      if (!user || !isMounted) return;
      setIsDataLoading(true);
      
      if (syncConfig.type === 'supabase' && syncConfig.supabase.url && syncConfig.supabase.key) {
        try {
          // Test connection
          const { error: connError } = await supabase.from('sensei').select('id').limit(1);
          if (connError) throw connError;
          
          if (!isMounted) return;
          setDbStatus('connected');

          const tableSetters: Record<string, (value: any) => void> = {
            sensei: setSenseiList,
            students: setStudentList,
            groups: setGroupList,
            offdays: setOffDays,
            schedules: setSchedules,
            lesson_trackers: setLessonTrackers
          };

          const mapRecordFromDb = (record: any) => {
            if (!record) return record;
            const obj: any = {};
            Object.keys(record).forEach(k => {
              const uiKey = DB_TO_UI_MAP[k] || k;
              obj[uiKey] = record[k];
            });
            return obj;
          };

          const mapRowsFromDb = (data: any[] = []) => data.map(mapRecordFromDb);

          const fetchTable = async (tableName: string) => {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) throw error;
            const setter = tableSetters[tableName];
            if (setter && isMounted) setter(mapRowsFromDb(data || []));
          };

          const upsertRealtimeRecord = (tableName: string, record: any) => {
            const setter = tableSetters[tableName];
            if (!setter || !record?.id) return;
            const mappedRecord = mapRecordFromDb(record);
            setter((prev: any[]) => {
              if (prev.some(item => item.id === mappedRecord.id)) {
                return prev.map(item => item.id === mappedRecord.id ? mappedRecord : item);
              }
              return [...prev, mappedRecord];
            });
          };

          const deleteRealtimeRecord = (tableName: string, record: any) => {
            const setter = tableSetters[tableName];
            if (!setter || !record?.id) return;
            setter((prev: any[]) => prev.filter(item => item.id !== record.id));
          };

          const applyRealtimePayload = (payload: any) => {
            if (!isMounted) return;
            const tableName = payload.table;
            if (payload.eventType === 'DELETE') {
              deleteRealtimeRecord(tableName, payload.old);
              return;
            }
            upsertRealtimeRecord(tableName, payload.new);
          };

          // Initial load still fetches all dashboard tables once.
          const fetchAll = async () => {
            try {
              await Promise.all(Object.keys(tableSetters).map(fetchTable));
            } catch (err: any) {
              console.error(`Supabase Fetch Error: ${err.message}`);
              if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
                supabase.auth.signOut().catch(() => {});
              }
            } finally {
              if (isMounted) setIsDataLoading(false);
            }
          };
          fetchAll();

          // Real-time subscriptions update only the changed table/record.
          supabaseChannel = Object.keys(tableSetters).reduce((channel: any, tableName) => {
            return channel.on(
              'postgres_changes',
              { event: '*', schema: 'public', table: tableName },
              applyRealtimePayload
            );
          }, supabase.channel('dashboard-db-changes')).subscribe();

        } catch (error: any) {
          console.error('Supabase Init Error:', error);
          if (isMounted) {
            setDbStatus('error');
            setIsDataLoading(false);
            if (error.message === 'Failed to fetch') {
              toast.error('Gagal terhubung ke database. Silakan cek koneksi internet Anda atau status project Supabase.');
            } else if (error.message?.includes('Refresh Token') || error.message?.includes('refresh token')) {
              supabase.auth.signOut().catch(() => {});
              toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
            } else {
              toast.error(`Error Database: ${error.message}`);
            }
          }
        }
      } else {
        // Fallback to localStorage if no cloud DB
        if (isMounted) {
          setDbStatus('disconnected');
          setSenseiList(safeParseStorage('senseiList', []));
          setStudentList(safeParseStorage('studentList', []));
          setOffDays(safeParseStorage('offDays', []));
          setGroupList(safeParseStorage('groupList', []));
          setSchedules(safeParseStorage('schedules', []));
          setLessonTrackers(safeParseStorage('lessonTrackers', []));
          setIsDataLoading(false);
        }
      }
    };

    initDB();

    return () => {
      isMounted = false;
      if (supabaseChannel) supabase.removeChannel(supabaseChannel);
    };
  }, [syncConfig, user?.id, supabase]);

  // Persist to localStorage as a debounced backup to avoid blocking large realtime updates.
  useDebouncedStorage('senseiList', senseiList);
  useDebouncedStorage('studentList', studentList);
  useDebouncedStorage('groupList', groupList);
  useDebouncedStorage('offDays', offDays);
  useDebouncedStorage('schedules', schedules);
  useDebouncedStorage('lessonTrackers', lessonTrackers);
  useDebouncedStorage('lastSync', lastSync);
  useDebouncedStorage('gasUrl', gasUrl);

  const handleFullSync = useCallback(async () => {
    if (!gasUrl) {
      setShowSettings(true);
      return;
    }
    setIsSyncing(true);
    try {
      await pushToGAS(gasUrl, 'Sensei', senseiList);
      await pushToGAS(gasUrl, 'Students', studentList);
      await pushToGAS(gasUrl, 'Groups', groupList);
      await pushToGAS(gasUrl, 'OffDays', offDays);
      await pushToGAS(gasUrl, 'Schedules', schedules);
      await pushToGAS(gasUrl, 'LessonTrackers', lessonTrackers);
      const now = format(new Date(), 'HH:mm:ss');
      setLastSync(now);
      toast.success('Sinkronisasi ke Google Sheets berhasil!');
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(`Gagal sinkronisasi: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [gasUrl, groupList, lessonTrackers, offDays, schedules, senseiList, setIsSyncing, setLastSync, setShowSettings, studentList]);

  const handlePullData = useCallback(async () => {
    if (!gasUrl) return;
    setIsSyncing(true);
    try {
      const data = await fetchFromGAS(gasUrl);
      if (data) {
        if (data.Sensei) setSenseiList(data.Sensei);
        if (data.Students) setStudentList(data.Students);
        if (data.Groups) setGroupList(data.Groups);
        if (data.OffDays) setOffDays(data.OffDays);
        if (data.Schedules) setSchedules(data.Schedules);
        if (data.LessonTrackers) setLessonTrackers(data.LessonTrackers);
        setLastSync(format(new Date(), 'HH:mm:ss'));
        toast.success('Data berhasil ditarik dari Google Sheets!');
      }
    } catch (error: any) {
      console.error('Pull failed:', error);
      toast.error(`Gagal menarik data: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [gasUrl, setGasUrl, setGroupList, setIsSyncing, setLastSync, setLessonTrackers, setOffDays, setSchedules, setSenseiList, setStudentList]);

  // --- CRUD HELPERS ---
  const sanitizeData = useCallback((collectionName: string, data: any) => {
    const allowedFields: any = {
      'sensei': ['id', 'name', 'note', 'no_wa', 'email', 'level_mengajar', 'kelas_tersedia'],
      'students': ['id', 'name', 'phone', 'level', 'type', 'sensei_name', 'level_awal', 'level_sekarang', 'durasi_kelas', 'payment_status', 'is_active', 'inactive_reason', 'classroom_link', 'chat_link', 'progress_link', 'curriculum_link'],
      'groups': ['id', 'name', 'description', 'studentIds', 'createdAt', 'updatedAt', 'updatedBy'],
      'offdays': ['id', 'senseiId', 'date', 'reason'],
      'lesson_trackers': ['id', 'scheduleId', 'studentId', 'senseiId', 'date', 'attendance', 'material', 'score', 'notes', 'caseNotes', 'studentFeedback', 'actualStartTime', 'isDelayed', 'createdAt'],
      'schedules': ['id', 'senseiId', 'studentId', 'studentIds', 'groupId', 'type', 'level', 'date', 'startTime', 'endTime', 'status', 'updatedAt', 'updatedBy'],
      'profiles': ['id', 'email', 'role', 'status', 'lastLogin'],
      'audit_logs': ['id', 'actorId', 'actorEmail', 'action', 'collectionName', 'recordId', 'payload', 'createdAt']
    };
    const fields = allowedFields[collectionName];
    if (!fields) return data;
    
    const sanitized: any = {};
    fields.forEach((f: string) => {
      let value = data[f];
      
      // Khusus untuk studentIds, pastikan dia array jika masuk ke DB
      if (f === 'studentIds' && value && !Array.isArray(value)) {
        value = [value];
      }

      if (value !== undefined) {
        // Map state keys to db keys explicitly for Supabase
        if (syncConfig.type === 'supabase') {
          const dbKey = UI_TO_DB_MAP[f] || f;
          sanitized[dbKey] = value;
        } else {
          sanitized[f] = value;
        }
      }
    });
    return sanitized;
  }, [syncConfig.type]);

  const logAudit = useCallback(async (action: string, collectionName: string, recordId?: string, payload?: any) => {
    if (syncConfig.type !== 'supabase' || collectionName === 'audit_logs') return;
    try {
      await supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        actor_email: user?.email || 'System',
        action,
        collection_name: collectionName,
        record_id: recordId || null,
        payload: payload || null
      });
    } catch (err) {
      console.warn('Audit log failed:', err);
    }
  }, [supabase, syncConfig.type, user?.email, user?.id]);

  const canWriteCollection = useCallback((collectionName: string) => {
    if (collectionName === 'audit_logs') return permissions.canManageUsers;
    if (collectionName === 'lesson_trackers') return permissions.isApproved;
    if (collectionName === 'schedules') return permissions.canManageSchedules;
    if (collectionName === 'profiles') return permissions.canManageUsers;
    return permissions.canManageMasterData;
  }, [permissions]);

  const dbOps = useMemo(() => ({
    save: async (collectionName: string, data: any) => {
      if (!canWriteCollection(collectionName)) {
        toast.error('Akses Anda tidak cukup untuk mengubah data ini.');
        throw new Error('Permission denied');
      }
      const sanitized = sanitizeData(collectionName, data);
      let finalDataForDb = sanitized;
      let finalDataForState = data;
      
      if (syncConfig.type === 'supabase') {
        try {
          const id = sanitized.id || crypto.randomUUID();
          finalDataForDb = { ...sanitized, id };
          
          // Original data mapping for state
          const { error } = await supabase.from(collectionName).upsert(finalDataForDb);
          if (error) throw error;
          
          finalDataForState = { ...data, id };
        } catch (err: any) {
          if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
            supabase.auth.signOut().catch(() => {});
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          } else {
            toast.error(`Supabase Save Error (${collectionName}): ${err.message}`);
          }
          throw err;
        }
      } else {
        const id = data.id || crypto.randomUUID();
        finalDataForState = { ...data, id };
      }

      const setterMap: any = {
        'sensei': setSenseiList,
        'students': setStudentList,
        'groups': setGroupList,
        'offdays': setOffDays,
        'schedules': setSchedules,
        'lesson_trackers': setLessonTrackers
      };
      const setter = setterMap[collectionName];
      if (setter) {
        setter((prev: any[]) => {
          if (finalDataForState.id && prev.some(item => item.id === finalDataForState.id)) {
            return prev.map(item => item.id === finalDataForState.id ? finalDataForState : item);
          }
          return [...prev, finalDataForState];
        });
      }
      await logAudit(data.id ? 'update' : 'create', collectionName, finalDataForState.id, finalDataForState);
      return finalDataForState;
    },
    bulkSave: async (collectionName: string, dataArray: any[]) => {
      if (dataArray.length === 0) return;
      if (!canWriteCollection(collectionName)) {
        toast.error('Akses Anda tidak cukup untuk mengubah data ini.');
        throw new Error('Permission denied');
      }
      
      const sanitizedArray = dataArray.map(d => sanitizeData(collectionName, d));
      let finalDataArrayForState = dataArray;
      
      if (syncConfig.type === 'supabase') {
        try {
          const finalDataArrayForDb = sanitizedArray.map((d) => d.id ? d : { ...d, id: crypto.randomUUID() });
          const { error } = await supabase.from(collectionName).upsert(finalDataArrayForDb);
          if (error) throw error;
          
          finalDataArrayForState = dataArray.map((d, idx) => {
            const dbItem = finalDataArrayForDb[idx];
            return { ...d, id: dbItem.id };
          });
        } catch (err: any) {
          if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
            supabase.auth.signOut().catch(() => {});
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          } else {
            toast.error(`Supabase Bulk Save Error (${collectionName}): ${err.message}`);
          }
          throw err;
        }
      } else {
        finalDataArrayForState = dataArray.map((d) => d.id ? d : { ...d, id: crypto.randomUUID() });
      }

      const setterMap: any = {
        'sensei': setSenseiList,
        'students': setStudentList,
        'groups': setGroupList,
        'offdays': setOffDays,
        'schedules': setSchedules,
        'lesson_trackers': setLessonTrackers
      };
      const setter = setterMap[collectionName];
      if (setter) {
        setter((prev: any[]) => {
          const newItems = finalDataArrayForState.filter(d => !prev.some(p => p.id === d.id));
          const updatedItems = prev.map(p => {
            const updated = finalDataArrayForState.find(d => d.id === p.id);
            return updated ? updated : p;
          });
          return [...updatedItems, ...newItems];
        });
      }
      await logAudit('bulk_upsert', collectionName, undefined, { count: finalDataArrayForState.length });
      return finalDataArrayForState;
    },
    delete: async (collectionName: string, id: string) => {
      if (!canWriteCollection(collectionName)) {
        toast.error('Akses Anda tidak cukup untuk menghapus data ini.');
        throw new Error('Permission denied');
      }
      if (syncConfig.type === 'supabase') {
        try {
          /* using global supabase */
          const { error } = await supabase.from(collectionName).delete().eq('id', id);
          if (error) throw error;
        } catch (err: any) {
          if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
            supabase.auth.signOut().catch(() => {});
            toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
          } else {
            toast.error(`Supabase Delete Error: ${err.message}`);
          }
          throw err;
        }
      }
      
      const setterMap: any = {
        'sensei': setSenseiList,
        'students': setStudentList,
        'groups': setGroupList,
        'offdays': setOffDays,
        'schedules': setSchedules,
        'lesson_trackers': setLessonTrackers
      };
      const setter = setterMap[collectionName];
      if (setter) {
        setter((prev: any[]) => prev.filter((item: any) => item.id !== id));
      }
      await logAudit('delete', collectionName, id);
    }
  }), [
    canWriteCollection,
    logAudit,
    sanitizeData,
    setGroupList,
    setLessonTrackers,
    setOffDays,
    setSchedules,
    setSenseiList,
    setStudentList,
    supabase,
    syncConfig.type
  ]);

  useEffect(() => {
    useAppStore.setState({
      indonesianDayName,
      analytics,
      supabase,
      handleFullSync,
      handlePullData,
      sanitizeData,
      dbOps,
      isSuperAdmin,
      ADMIN_EMAILS,
      userProfile,
      currentSensei,
      permissions,
      mapProfileFromDb,
      scopedSenseiList: currentRole === 'Sensei' && currentSensei ? [currentSensei] : senseiList,
      scopedStudentList,
      scopedSchedules,
      scopedLessonTrackers
    });
  }, [
    indonesianDayName,
    analytics,
    supabase,
    handleFullSync,
    handlePullData,
    sanitizeData,
    dbOps,
    isSuperAdmin,
    userProfile,
    currentSensei,
    permissions,
    scopedStudentList,
    scopedSchedules,
    scopedLessonTrackers,
    currentRole,
    senseiList
  ]);

  // --- COMPONENTS ---
  if (authLoading || (user && !userProfile && syncConfig.type === 'supabase')) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin text-indigo-600 dark:text-indigo-400">
          <Repeat size={40} />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage supabase={supabase} theme={theme} onAuthSuccess={(u) => setUser(u)} />;
  }

  if (!permissions.isApproved) {
    return (
    
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4`}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-100 dark:border-amber-900/30 shadow-xl p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">Akun Menunggu Approval</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Email <span className="font-bold text-slate-700 dark:text-slate-200">{user.email}</span> sudah masuk, tetapi perlu disetujui Super Admin sebelum mengakses dashboard.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-5 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest"
          >
            Logout
          </button>
        </div>
      </div>
    
  );
}


  return (
    
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300`}>
      <Toaster position="top-right" richColors closeButton />
      <Sidebar />
      
      <main className="lg:ml-64 p-4 md:p-8 min-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Dashboard Jadwal' : 
                 activeTab === 'calendar' ? 'Kalender Jadwal' :
                 activeTab === 'teaching' ? 'Sesi Mengajar' :
                 activeTab === 'sensei' ? 'Data Sensei' : 
                 activeTab === 'students' ? (masterSubTab === 'group' ? 'Data Grup/SP' : 'Data Students') : 
                 activeTab === 'offday' ? 'Off Days' : 
                 activeTab === 'reporting' ? 'Reporting Dashboard' : 
                 activeTab === 'checker' ? 'Smart Checker' :
                 activeTab === 'users' ? 'User Management' : 'Dashboard'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1">Hello, <span className="text-indigo-600 font-bold">{(user?.email || '').split('@')[0]}</span></p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {activeTab === 'dashboard' && (
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Cari siswa..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-40 md:w-48 shadow-sm"
                />
              </div>
            )}
            
            {permissions.canManageSchedules && (activeTab === 'dashboard' || activeTab === 'calendar') && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowRekapModal(true)}
                  className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Rekap</span>
                </button>
                <button 
                  onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 uppercase tracking-wider"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Tambah Baru</span>
                </button>
              </div>
            )}
            
            <div className="bg-white dark:bg-slate-900 px-3 md:px-4 py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xs md:text-sm shadow-md">
                {(user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-right">
                <p className="font-black text-slate-700 dark:text-slate-200 text-[9px] uppercase tracking-widest leading-none mb-1">
                  {permissions.role}
                </p>
                <span className="font-bold text-slate-400 text-[10px]">{user.email}</span>
              </div>
            </div>
          </div>
        </header>

        {isDataLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Repeat size={16} className="animate-spin" />
            <span>Memuat data dashboard dari database...</span>
          </div>
        )}

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <ErrorBoundary fallbackMessage="Error loading Dashboard tab.">
            <AnalyticsCards />
          </ErrorBoundary>
        )}

        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading Calendar tab.">
              <CalendarView />
            </ErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'teaching' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading Teaching Sessions tab.">
              <TeachingSessionsView />
            </ErrorBoundary>
          </motion.div>
        )}

        {permissions.canManageMasterData && (activeTab === 'sensei' || activeTab === 'students' || activeTab === 'offday') && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading Master Data tab.">
              <MasterData />
            </ErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'checker' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading Smart Checker tab.">
              <SmartChecker />
            </ErrorBoundary>
          </motion.div>
        )}

        {permissions.canViewReporting && activeTab === 'reporting' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading Reporting tab.">
              <ReportingDashboard />
            </ErrorBoundary>
          </motion.div>
        )}

        {activeTab === 'users' && permissions.canManageUsers && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <ErrorBoundary fallbackMessage="Error loading User Management tab.">
              <UserManagement />
            </ErrorBoundary>
          </motion.div>
        )}
      </main>

      {/* Global Modals */}
      <AnimatePresence>
        {showScheduleModal && <ScheduleModal />}
      </AnimatePresence>

      <AnimatePresence>
        {showTrackerModal && (selectedTrackerSchedule || selectedTrackerStudent) && <LessonTrackerModal />}
      </AnimatePresence>

      <AnimatePresence>
        {showRekapModal && <RekapAbsensiModal />}
      </AnimatePresence>

      <AnimatePresence>
        {showProfileModal && <ProfileViewModal />}
      </AnimatePresence>
      
      <AnimatePresence>
        {showResourceHub && selectedResourceStudent && <ResourceHubModal />}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Database size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Sync Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${
                  dbStatus === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 
                  dbStatus === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' :
                  'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                }`}>
                  <div className={`${
                    dbStatus === 'connected' ? 'bg-emerald-500' : 
                    dbStatus === 'error' ? 'bg-rose-500' :
                    'bg-slate-400'
                  } p-2 rounded-xl text-white`}>
                    {dbStatus === 'connected' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      dbStatus === 'connected' ? 'text-emerald-800 dark:text-emerald-400' : 
                      dbStatus === 'error' ? 'text-rose-800 dark:text-rose-400' :
                      'text-slate-700 dark:text-slate-300'
                    }`}>
                      {dbStatus === 'connected' ? 'Supabase Connected' : 
                       dbStatus === 'error' ? 'Database Connection Error' :
                       'Local Mode (Offline)'}
                    </h4>
                    <p className={`text-xs ${
                      dbStatus === 'connected' ? 'text-emerald-600 dark:text-emerald-500' : 
                      dbStatus === 'error' ? 'text-rose-600 dark:text-rose-500' :
                      'text-slate-500 dark:text-slate-400'
                    }`}>
                      {dbStatus === 'connected' ? 'Aplikasi terhubung otomatis ke database tim.' : 
                       dbStatus === 'error' ? 'Terjadi kesalahan saat menghubungkan ke cloud. Cek koneksi Anda.' :
                       'Menggunakan penyimpanan lokal browser Anda.'}
                    </p>
                  </div>
                </div>

                {dbStatus === 'error' && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem('syncConfig');
                      window.location.reload();
                    }}
                    className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Reset & Gunakan Local Mode
                  </button>
                )}

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
                    <strong>Note:</strong> Sinkronisasi data dilakukan secara real-time. Perubahan yang dibuat oleh anggota tim lain akan langsung muncul di dashboard Anda.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Google Sheets Sync (Optional)</label>
                  <input 
                    type="text" 
                    value={gasUrl}
                    onChange={e => setGasUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm dark:text-white"
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={handlePullData}
                      disabled={isSyncing || !gasUrl}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      Pull from Sheets
                    </button>
                    <button 
                      onClick={handleFullSync}
                      disabled={isSyncing || !gasUrl}
                      className="flex-1 py-2 rounded-xl text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      Push to Sheets
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    
  );
}


