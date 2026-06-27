/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react';
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
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { AuthPage } from './components/AuthPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getSupabaseClient } from './utils/supabaseClient';

import { AppRole, UserProfile, Permissions } from './types';
import { fetchFromGAS, pushToGAS, getScheduleStudentIds } from './utils/helpers';
import { safeParseStorage } from './utils/safeStorage';
import { mergeLeaveRequestsWithLegacy } from './utils/senseiOperations';
import { Sidebar } from './components/Sidebar';
import { useAppStore } from './store/useAppStore';

const AnalyticsCards = lazy(() => import('./components/AnalyticsCards').then(module => ({ default: module.AnalyticsCards })));
const CalendarView = lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const LessonTrackerModal = lazy(() => import('./components/LessonTrackerModal').then(module => ({ default: module.LessonTrackerModal })));
const MasterData = lazy(() => import('./components/MasterData').then(module => ({ default: module.MasterData })));
const ProfileViewModal = lazy(() => import('./components/ProfileViewModal').then(module => ({ default: module.ProfileViewModal })));
const RekapAbsensiModal = lazy(() => import('./components/RekapAbsensiModal').then(module => ({ default: module.RekapAbsensiModal })));
const ReportingDashboard = lazy(() => import('./components/ReportingDashboard').then(module => ({ default: module.ReportingDashboard })));
const ResourceHubModal = lazy(() => import('./components/ResourceHubModal').then(module => ({ default: module.ResourceHubModal })));
const ScheduleModal = lazy(() => import('./components/ScheduleModal').then(module => ({ default: module.ScheduleModal })));
const SenseiDashboard = lazy(() => import('./components/SenseiDashboard').then(module => ({ default: module.SenseiDashboard })));
const SenseiScheduleView = lazy(() => import('./components/SenseiScheduleView').then(module => ({ default: module.SenseiScheduleView })));
const SenseiStudentsView = lazy(() => import('./components/SenseiStudentsView').then(module => ({ default: module.SenseiStudentsView })));
const SmartChecker = lazy(() => import('./components/SmartChecker').then(module => ({ default: module.SmartChecker })));
const TeachingSessionsView = lazy(() => import('./components/TeachingSessionsView').then(module => ({ default: module.TeachingSessionsView })));
const UserManagement = lazy(() => import('./components/UserManagement').then(module => ({ default: module.UserManagement })));


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
  'actualEndTime': 'actual_end_time',
  'timeAdjustmentNote': 'time_adjustment_note',
  'timeAdjustmentStatus': 'time_adjustment_status',
  'caseNotes': 'case_notes',
  'studentFeedback': 'student_feedback',
  'senseiLeaveQuota': 'sensei_leave_quota',
  'studentLeaveQuota': 'student_leave_quota',
  'specialNote': 'special_note',
  'examNote': 'exam_note',
  'adminNote': 'admin_note',
  'curriculumLevel': 'curriculum_level',
  'curriculumUnit': 'curriculum_unit',
  'curriculumProgress': 'curriculum_progress',
  'graduateLevel': 'graduate_level',
  'sessionQuota': 'session_quota',
  'isDelayed': 'is_delayed',
  'lastLogin': 'last_login',
  'actorId': 'actor_id',
  'actorEmail': 'actor_email',
  'collectionName': 'collection_name',
  'recordId': 'record_id',
  'offdayId': 'offday_id',
  'lessonId': 'lesson_id',
  'checkInAt': 'check_in_at',
  'checkOutAt': 'check_out_at',
  'adjustmentStatus': 'adjustment_status',
  'adjustmentNote': 'adjustment_note',
  'startDate': 'start_date',
  'endDate': 'end_date',
  'leaveType': 'leave_type',
  'submittedAt': 'submitted_at',
  'reviewedAt': 'reviewed_at',
  'reviewedBy': 'reviewed_by'
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
    groupList, setGroupList, offDays, setOffDays, schedules, setSchedules, senseiTimeBlocks, setSenseiTimeBlocks, lessonTrackers, setLessonTrackers,
    sessionLogs, setSessionLogs, leaveRequests, setLeaveRequests,
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
    senseiTimeBlocks: state.senseiTimeBlocks,
    setSenseiTimeBlocks: state.setSenseiTimeBlocks,
    lessonTrackers: state.lessonTrackers,
    setLessonTrackers: state.setLessonTrackers,
    sessionLogs: state.sessionLogs,
    setSessionLogs: state.setSessionLogs,
    leaveRequests: state.leaveRequests,
    setLeaveRequests: state.setLeaveRequests,
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
    

  // --- SUPABASE CLIENT ---
  const supabase = useMemo(
    () => getSupabaseClient(syncConfig.supabase.url, syncConfig.supabase.key),
    [syncConfig.supabase.url, syncConfig.supabase.key]
  );

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

  const scopedSenseiTimeBlocks = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return senseiTimeBlocks;
    return senseiTimeBlocks.filter(block => block.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, senseiTimeBlocks]);

  const scopedStudentList = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return studentList;
    const studentIds = new Set<string>();
    scopedSchedules.forEach(s => {
      const ids = getScheduleStudentIds(s);
      ids.forEach(id => studentIds.add(id));
    });
    return studentList.filter(s => studentIds.has(s.id));
  }, [currentRole, currentSensei, scopedSchedules, studentList]);

  const scopedLessonTrackers = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return lessonTrackers;
    return lessonTrackers.filter(lt => lt.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, lessonTrackers]);

  const scopedSessionLogs = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return sessionLogs;
    return sessionLogs.filter(log => log.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, sessionLogs]);

  const effectiveLeaveRequests = useMemo(
    () => mergeLeaveRequestsWithLegacy(leaveRequests, offDays),
    [leaveRequests, offDays]
  );

  const scopedLeaveRequests = useMemo(() => {
    if (currentRole !== 'Sensei' || !currentSensei) return effectiveLeaveRequests;
    return effectiveLeaveRequests.filter(request => request.senseiId === currentSensei.id);
  }, [currentRole, currentSensei, effectiveLeaveRequests]);

  useEffect(() => {
    if (permissions.role !== 'Sensei') return;
    if (!['dashboard', 'teaching', 'sensei-students', 'sensei-schedule'].includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, permissions.role, setActiveTab]);

  // --- AUTHENTICATION ---
  useEffect(() => {
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
        if (prev) return false;
        return prev;
      });
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
            sensei_time_blocks: setSenseiTimeBlocks,
            lesson_trackers: setLessonTrackers,
            session_logs: setSessionLogs,
            leave_requests: setLeaveRequests
          };

          const optionalPhaseOneTables = new Set(['session_logs', 'leave_requests']);

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
            if (error) {
              const isMissingOptionalTable = optionalPhaseOneTables.has(tableName)
                && (error.code === '42P01' || error.code === 'PGRST205');
              if (isMissingOptionalTable) {
                const setter = tableSetters[tableName];
                if (setter && isMounted) setter([]);
                return;
              }
              throw error;
            }
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
          setSenseiTimeBlocks(safeParseStorage('senseiTimeBlocks', []));
          setLessonTrackers(safeParseStorage('lessonTrackers', []));
          setSessionLogs(safeParseStorage('sessionLogs', []));
          setLeaveRequests(safeParseStorage('leaveRequests', []));
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
  useDebouncedStorage('senseiTimeBlocks', senseiTimeBlocks);
  useDebouncedStorage('lessonTrackers', lessonTrackers);
  useDebouncedStorage('sessionLogs', sessionLogs);
  useDebouncedStorage('leaveRequests', leaveRequests);
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
      await pushToGAS(gasUrl, 'SenseiTimeBlocks', senseiTimeBlocks);
      await pushToGAS(gasUrl, 'LessonTrackers', lessonTrackers);
      await pushToGAS(gasUrl, 'SessionLogs', sessionLogs);
      await pushToGAS(gasUrl, 'LeaveRequests', leaveRequests);
      const now = format(new Date(), 'HH:mm:ss');
      setLastSync(now);
      toast.success('Sinkronisasi ke Google Sheets berhasil!');
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast.error(`Gagal sinkronisasi: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [gasUrl, groupList, leaveRequests, lessonTrackers, offDays, schedules, senseiList, senseiTimeBlocks, sessionLogs, setIsSyncing, setLastSync, setShowSettings, studentList]);

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
        if (data.SenseiTimeBlocks) setSenseiTimeBlocks(data.SenseiTimeBlocks);
        if (data.LessonTrackers) setLessonTrackers(data.LessonTrackers);
        if (data.SessionLogs) setSessionLogs(data.SessionLogs);
        if (data.LeaveRequests) setLeaveRequests(data.LeaveRequests);
        setLastSync(format(new Date(), 'HH:mm:ss'));
        toast.success('Data berhasil ditarik dari Google Sheets!');
      }
    } catch (error: any) {
      console.error('Pull failed:', error);
      toast.error(`Gagal menarik data: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [gasUrl, setGroupList, setIsSyncing, setLastSync, setLeaveRequests, setLessonTrackers, setOffDays, setSchedules, setSenseiList, setSenseiTimeBlocks, setSessionLogs, setStudentList]);

  // --- CRUD HELPERS ---
  const sanitizeData = useCallback((collectionName: string, data: any) => {
    const allowedFields: any = {
      'sensei': ['id', 'name', 'note', 'no_wa', 'email', 'level_mengajar', 'kelas_tersedia', 'senseiLeaveQuota', 'timezone'],
      'students': ['id', 'name', 'phone', 'level', 'type', 'sensei_name', 'level_awal', 'level_sekarang', 'durasi_kelas', 'sessionQuota', 'studentLeaveQuota', 'payment_status', 'is_active', 'inactive_reason', 'specialNote', 'examNote', 'adminNote', 'curriculumLevel', 'curriculumUnit', 'curriculumProgress', 'graduateLevel', 'classroom_link', 'chat_link', 'progress_link', 'curriculum_link'],
      'groups': ['id', 'name', 'description', 'studentIds', 'createdAt', 'updatedAt', 'updatedBy'],
      'offdays': ['id', 'senseiId', 'date', 'reason'],
      'lesson_trackers': ['id', 'scheduleId', 'studentId', 'senseiId', 'date', 'attendance', 'curriculumUnit', 'material', 'score', 'notes', 'caseNotes', 'studentFeedback', 'actualStartTime', 'actualEndTime', 'timeAdjustmentNote', 'timeAdjustmentStatus', 'isDelayed', 'createdAt'],
      'schedules': ['id', 'senseiId', 'studentId', 'studentIds', 'groupId', 'type', 'level', 'date', 'startTime', 'endTime', 'status', 'updatedAt', 'updatedBy'],
      'sensei_time_blocks': ['id', 'senseiId', 'date', 'startTime', 'endTime', 'status', 'note', 'updatedAt', 'updatedBy'],
      'profiles': ['id', 'email', 'role', 'status', 'lastLogin'],
      'audit_logs': ['id', 'actorId', 'actorEmail', 'action', 'collectionName', 'recordId', 'payload', 'createdAt'],
      'session_logs': ['id', 'scheduleId', 'senseiId', 'checkInAt', 'checkOutAt', 'status', 'timezone', 'adjustmentStatus', 'adjustmentNote', 'createdAt', 'updatedAt'],
      'leave_requests': ['id', 'senseiId', 'startDate', 'endDate', 'leaveType', 'note', 'status', 'submittedAt', 'reviewedAt', 'reviewedBy']
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
      const { error } = await supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        actor_email: user?.email || 'System',
        action,
        collection_name: collectionName,
        record_id: recordId || null,
        payload: payload || null
      });
      if (error) console.warn('Audit log failed:', error.message);
    } catch (err) {
      console.warn('Audit log failed:', err);
    }
  }, [supabase, syncConfig.type, user?.email, user?.id]);

  const canWriteCollection = useCallback((collectionName: string) => {
    if (collectionName === 'audit_logs') return permissions.canManageUsers;
    if (collectionName === 'lesson_trackers') return permissions.isApproved;
    if (collectionName === 'session_logs') return permissions.canManageSchedules;
    if (collectionName === 'leave_requests') return permissions.isApproved;
    if (collectionName === 'sensei_time_blocks') return permissions.isApproved;
    if (collectionName === 'offdays') return permissions.isApproved;
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
        'sensei_time_blocks': setSenseiTimeBlocks,
        'lesson_trackers': setLessonTrackers,
        'session_logs': setSessionLogs,
        'leave_requests': setLeaveRequests
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
        'sensei_time_blocks': setSenseiTimeBlocks,
        'lesson_trackers': setLessonTrackers,
        'session_logs': setSessionLogs,
        'leave_requests': setLeaveRequests
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
        'sensei_time_blocks': setSenseiTimeBlocks,
        'lesson_trackers': setLessonTrackers,
        'session_logs': setSessionLogs,
        'leave_requests': setLeaveRequests
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
    setLeaveRequests,
    setLessonTrackers,
    setOffDays,
    setSchedules,
    setSenseiTimeBlocks,
    setSenseiList,
    setSessionLogs,
    setStudentList,
    supabase,
    syncConfig.type
  ]);

  useEffect(() => {
    useAppStore.setState({
      indonesianDayName,
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
      scopedSenseiTimeBlocks,
      scopedLessonTrackers,
      scopedSessionLogs,
      scopedLeaveRequests
    });
  }, [
    indonesianDayName,
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
    scopedSenseiTimeBlocks,
    scopedLessonTrackers,
    scopedSessionLogs,
    scopedLeaveRequests,
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
        <div className="bg-white dark:bg-slate-900 rounded-none border border-amber-100 dark:border-amber-900/30 shadow-sm p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-none bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">Akun Menunggu Approval</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Email <span className="font-bold text-slate-700 dark:text-slate-200">{user.email}</span> sudah masuk, tetapi perlu disetujui Super Admin sebelum mengakses dashboard.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-5 py-3 rounded-none bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs uppercase tracking-widest"
          >
            Keluar
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
              className="lg:hidden p-2 bg-white dark:bg-slate-900 rounded-none shadow-sm border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                {activeTab === 'dashboard' ? (permissions.role === 'Sensei' ? 'Beranda Sensei' : 'Dasbor Jadwal') : 
                 activeTab === 'calendar' ? 'Kalender Jadwal' :
                 activeTab === 'teaching' ? 'Sesi Mengajar' :
                 activeTab === 'sensei-students' ? 'Murid Saya' :
                 activeTab === 'sensei-schedule' ? 'Jadwal Sensei' :
                 activeTab === 'sensei' ? 'Data Sensei' : 
                 activeTab === 'students' ? (masterSubTab === 'group' ? 'Data Grup/SP' : 'Data Siswa') : 
                 activeTab === 'offday' ? 'Hari Libur' : 
                 activeTab === 'reporting' ? 'Dasbor Laporan' : 
                 activeTab === 'checker' ? 'Cek Jadwal' :
                 activeTab === 'users' ? 'Kelola User' : 'Dasbor'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-1">Halo, <span className="text-indigo-600 font-bold">{(user?.email || '').split('@')[0]}</span></p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {activeTab === 'dashboard' && permissions.role !== 'Sensei' && (
              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Cari siswa..."
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  className="ui-input h-10 w-40 pl-9 text-xs md:w-48"
                />
              </div>
            )}
            
            {permissions.canManageSchedules && (activeTab === 'dashboard' || activeTab === 'calendar') && (
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowRekapModal(true)}
                  className="flex h-10 items-center gap-2 border border-slate-200 bg-white px-4 text-xs font-black text-indigo-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800"
                >
                  <FileText size={16} />
                  <span className="hidden sm:inline">Rekap</span>
                </button>
                <button 
                  onClick={() => { setEditingSchedule(null); setShowScheduleModal(true); }}
                  className="flex h-10 items-center gap-2 border border-indigo-600 bg-indigo-600 px-4 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Tambah Baru</span>
                </button>
              </div>
            )}
            
            <div className="bg-white dark:bg-slate-900 px-3 md:px-4 py-2 rounded-none shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2 md:gap-3">
              <div className="flex h-8 w-8 items-center justify-center border border-indigo-500 bg-indigo-600 text-xs font-black text-white md:text-sm">
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
          <div className="mb-6 flex items-center gap-3 rounded-none border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
            <Repeat size={16} className="animate-spin" />
            <span>Memuat data dashboard dari database...</span>
          </div>
        )}

        {/* Dashboard Content */}
        <Suspense fallback={(
          <div className="flex min-h-48 items-center justify-center border border-slate-200 bg-white text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
            <Repeat size={16} className="mr-2 animate-spin" />
            Memuat tampilan...
          </div>
        )}>
        {activeTab === 'dashboard' && (
          <ErrorBoundary fallbackMessage="Error loading Dashboard tab.">
            {permissions.role === 'Sensei' ? <SenseiDashboard /> : <AnalyticsCards />}
          </ErrorBoundary>
        )}

        {activeTab === 'calendar' && (
          <div>
            <ErrorBoundary fallbackMessage="Error loading Calendar tab.">
              <CalendarView />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'teaching' && (
          <div>
            <ErrorBoundary fallbackMessage="Error loading Teaching Sessions tab.">
              <TeachingSessionsView />
            </ErrorBoundary>
          </div>
        )}

        {permissions.role === 'Sensei' && activeTab === 'sensei-students' && (
          <ErrorBoundary fallbackMessage="Gagal memuat tab Murid Saya.">
            <SenseiStudentsView />
          </ErrorBoundary>
        )}

        {activeTab === 'sensei-schedule' && (
          <ErrorBoundary fallbackMessage="Error loading Jadwal Sensei tab.">
            <SenseiScheduleView />
          </ErrorBoundary>
        )}

        {permissions.canManageMasterData && (activeTab === 'sensei' || activeTab === 'students' || activeTab === 'offday') && (
          <div>
            <ErrorBoundary fallbackMessage="Gagal memuat tab Data Master.">
              <MasterData />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'checker' && (
          <div>
            <ErrorBoundary fallbackMessage="Gagal memuat tab Cek Jadwal.">
              <SmartChecker />
            </ErrorBoundary>
          </div>
        )}

        {permissions.canViewReporting && activeTab === 'reporting' && (
          <ErrorBoundary fallbackMessage="Gagal memuat tab Laporan.">
            <ReportingDashboard />
          </ErrorBoundary>
        )}

        {activeTab === 'users' && permissions.canManageUsers && (
          <ErrorBoundary fallbackMessage="Gagal memuat tab Kelola User.">
            <UserManagement />
          </ErrorBoundary>
        )}
        </Suspense>
      </main>

      {/* Global Modals */}
      <Suspense fallback={null}>
        {showScheduleModal && <ScheduleModal />}
        {showTrackerModal && (selectedTrackerSchedule || selectedTrackerStudent) && <LessonTrackerModal />}
        {showRekapModal && <RekapAbsensiModal />}
        {showProfileModal && <ProfileViewModal />}
        {showResourceHub && selectedResourceStudent && <ResourceHubModal />}
      </Suspense>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 "
            />
            <div
              className="relative w-full max-w-lg overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="ui-modal-header">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-none text-indigo-600 dark:text-indigo-400">
                    <Database size={20} />
                  </div>
                  <h3 className="ui-modal-title">Pengaturan Sinkronisasi</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="ui-modal-body max-h-[70vh]">
                <div className={`p-4 rounded-none border flex items-center gap-4 ${
                  dbStatus === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 
                  dbStatus === 'error' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800' :
                  'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                }`}>
                  <div className={`${
                    dbStatus === 'connected' ? 'bg-emerald-500' : 
                    dbStatus === 'error' ? 'bg-rose-500' :
                    'bg-slate-400'
                  } p-2 rounded-none text-white`}>
                    {dbStatus === 'connected' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                  </div>
                  <div>
                    <h4 className={`font-bold ${
                      dbStatus === 'connected' ? 'text-emerald-800 dark:text-emerald-400' : 
                      dbStatus === 'error' ? 'text-rose-800 dark:text-rose-400' :
                      'text-slate-700 dark:text-slate-300'
                    }`}>
                      {dbStatus === 'connected' ? 'Supabase Terhubung' : 
                       dbStatus === 'error' ? 'Koneksi Database Bermasalah' :
                       'Mode Lokal (Offline)'}
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
                    className="flex w-full items-center justify-center gap-2 border border-rose-600 bg-rose-600 px-5 py-3 text-sm font-black text-white hover:bg-rose-700"
                  >
                    <Trash2 size={16} />
                    Reset & Gunakan Local Mode
                  </button>
                )}

                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-none border border-indigo-100 dark:border-indigo-800">
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
                    <strong>Note:</strong> Sinkronisasi data dilakukan secara real-time. Perubahan yang dibuat oleh anggota tim lain akan langsung muncul di dashboard Anda.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <label className="ui-label">Google Sheets Sync (Optional)</label>
                  <input 
                    type="text" 
                    value={gasUrl}
                    onChange={e => setGasUrl(e.target.value)}
                    className="ui-input"
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={handlePullData}
                      disabled={isSyncing || !gasUrl}
                      className="ui-btn-secondary py-2 text-xs"
                    >
                      Pull from Sheets
                    </button>
                    <button 
                      onClick={handleFullSync}
                      disabled={isSyncing || !gasUrl}
                      className="ui-btn-secondary py-2 text-xs"
                    >
                      Push to Sheets
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="ui-btn-primary w-full"
                >
                  Close Settings
                </button>
              </div>
            </div>
        </div>
      )}
    </div>
    
  );
}



