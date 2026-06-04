import { create } from 'zustand';
import { format, startOfYear, endOfYear, addYears } from 'date-fns';
import { Sensei, Student, LessonTracker, OffDay, Schedule, UserProfile } from '../types';
import { safeGetItem, safeParseStorage } from '../utils/safeStorage';

const defaultSyncConfig = {
  type: 'supabase',
  supabase: { url: import.meta.env.VITE_SUPABASE_URL || '', key: import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
};
const initialSyncConfig = safeParseStorage('syncConfig', defaultSyncConfig);

const defaultPermissions = {
  role: 'Staff',
  isApproved: false,
  canManageMasterData: false,
  canManageSchedules: false,
  canManageUsers: false,
  canManageSettings: false,
  canViewReporting: false
};

const unavailableDbOps = {
  save: async () => { throw new Error('Database is not ready yet'); },
  bulkSave: async () => { throw new Error('Database is not ready yet'); },
  delete: async () => { throw new Error('Database is not ready yet'); }
};

const defaultAnalytics = {
  total: 0,
  privateClasses: 0,
  n5Classes: 0,
  unpaidStudents: 0,
  completedThisMonth: 0,
  totalStudents: 0,
  newStudents30Days: 0,
  typeBreakdown: {},
  levelBreakdown: {},
  weeklyActivityData: [],
  pieData: [],
  workloadData: [],
  paymentData: [],
  upcomingSessions: [],
  recentTrackers: [],
  recentStudents: []
};

export const useAppStore = create<any>((set) => {
  const s = (key: string) => (val: any) => set((state: any) => ({ [key]: typeof val === 'function' ? val(state[key]) : val }));

  return {
    activeTab: 'dashboard', setActiveTab: s('activeTab'),
    masterSubTab: 'sensei', setMasterSubTab: s('masterSubTab'),
    syncConfig: initialSyncConfig, setSyncConfig: s('syncConfig'),
    dbStatus: 'connected', setDbStatus: s('dbStatus'),
    isDataLoading: false, setIsDataLoading: s('isDataLoading'),
    gasUrl: safeGetItem('gasUrl'), setGasUrl: s('gasUrl'),
    isSyncing: false, setIsSyncing: s('isSyncing'),
    lastSync: safeGetItem('lastSync', 'Never'), setLastSync: s('lastSync'),
    showSettings: false, setShowSettings: s('showSettings'),
    senseiList: [], setSenseiList: s('senseiList'),
    studentList: [], setStudentList: s('studentList'),
    groupList: [], setGroupList: s('groupList'),
    offDays: [], setOffDays: s('offDays'),
    schedules: [], setSchedules: s('schedules'),
    lessonTrackers: [], setLessonTrackers: s('lessonTrackers'),
    viewMode: 'week', setViewMode: s('viewMode'),
    currentDate: new Date(), setCurrentDate: s('currentDate'),
    studentStatusFilter: 'Active', setStudentStatusFilter: s('studentStatusFilter'),
    globalSearchTerm: '', setGlobalSearchTerm: s('globalSearchTerm'),
    dateRange: { start: format(startOfYear(new Date()), 'yyyy-MM-dd'), end: format(endOfYear(addYears(new Date(), 1)), 'yyyy-MM-dd') }, setDateRange: s('dateRange'),
    showScheduleModal: false, setShowScheduleModal: s('showScheduleModal'),
    showTrackerModal: false, setShowTrackerModal: s('showTrackerModal'),
    showRekapModal: false, setShowRekapModal: s('showRekapModal'),
    showProfileModal: false, setShowProfileModal: s('showProfileModal'),
    selectedProfileData: null, setSelectedProfileData: s('selectedProfileData'),
    selectedTrackerSchedule: null, setSelectedTrackerSchedule: s('selectedTrackerSchedule'),
    selectedTrackerStudent: null, setSelectedTrackerStudent: s('selectedTrackerStudent'),
    showResourceHub: false, setShowResourceHub: s('showResourceHub'),
    selectedResourceStudent: null, setSelectedResourceStudent: s('selectedResourceStudent'),
    editingSchedule: null, setEditingSchedule: s('editingSchedule'),
    selectedCell: null, setSelectedCell: s('selectedCell'),
    isSidebarOpen: false, setIsSidebarOpen: s('isSidebarOpen'),
    user: null, setUser: s('user'),
    authLoading: true, setAuthLoading: s('authLoading'),
    userProfile: null, setUserProfile: s('userProfile'),
    theme: safeGetItem('theme', 'light'), setTheme: s('theme'),
    indonesianDayName: '',
    analytics: defaultAnalytics,
    supabase: null,
    handleFullSync: async () => {},
    handlePullData: async () => {},
    sanitizeData: (_collectionName: string, data: any) => data,
    dbOps: unavailableDbOps,
    isSuperAdmin: false,
    ADMIN_EMAILS: [],
    currentSensei: null,
    permissions: defaultPermissions,
    mapProfileFromDb: (profile: any) => profile,
    scopedSenseiList: [],
    scopedStudentList: [],
    scopedSchedules: [],
    scopedLessonTrackers: [],
  };
});
