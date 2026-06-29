import { create } from 'zustand';
import { format, startOfYear, endOfYear, addYears } from 'date-fns';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { Sensei, Student, LessonTracker, OffDay, Schedule, SenseiTimeBlock, UserProfile, Permissions, SessionLog, LeaveRequest } from '../types';
import { safeGetItem, safeParseStorage } from '../utils/safeStorage';

export interface Group {
  id: string;
  name: string;
  description?: string;
  studentIds?: string[];
}

type SetValue<T> = T | ((prev: T) => T);
type Setter<T> = (value: SetValue<T>) => void;
type ActiveTab = 'dashboard' | 'teaching' | 'sensei-students' | 'calendar' | 'sensei-schedule' | 'sensei' | 'students' | 'offday' | 'reporting' | 'users' | 'checker';
type MasterSubTab = 'sensei' | 'student' | 'group' | 'offday';
export type RequestSubTab = 'leave' | 'substitution' | 'users';
type ViewMode = 'week' | 'month';
type StudentStatusFilter = 'Active' | 'Inactive';
type Theme = 'light' | 'dark';
type DbStatus = 'connected' | 'disconnected' | 'syncing' | 'error';
type SyncConfig = {
  type: 'supabase' | 'gas';
  supabase: {
    url: string;
    key: string;
  };
};

type DateRange = {
  start: string;
  end: string;
};

type SelectedProfileData =
  | { type: 'sensei'; data: Sensei }
  | { type: 'student'; data: Student }
  | null;

type SelectedCell = {
  senseiId: string;
  date: Date;
  studentIds?: string[];
  type?: string;
  level?: string;
} | null;

type CollectionRecord = { id?: string } & object;

export type DbOps = {
  save: <T extends object>(collectionName: string, data: T) => Promise<T & { id?: string }>;
  bulkSave: <T extends object>(collectionName: string, dataArray: T[]) => Promise<Array<T & { id?: string }> | void>;
  delete: (collectionName: string, id: string) => Promise<void>;
};


export interface AppStore {
  activeTab: ActiveTab;
  setActiveTab: Setter<ActiveTab>;
  masterSubTab: MasterSubTab;
  setMasterSubTab: Setter<MasterSubTab>;
  requestSubTab: RequestSubTab;
  setRequestSubTab: Setter<RequestSubTab>;
  pendingUserRequestCount: number;
  setPendingUserRequestCount: Setter<number>;
  syncConfig: SyncConfig;
  setSyncConfig: Setter<SyncConfig>;
  dbStatus: DbStatus;
  setDbStatus: Setter<DbStatus>;
  isDataLoading: boolean;
  setIsDataLoading: Setter<boolean>;
  gasUrl: string;
  setGasUrl: Setter<string>;
  isSyncing: boolean;
  setIsSyncing: Setter<boolean>;
  lastSync: string;
  setLastSync: Setter<string>;
  showSettings: boolean;
  setShowSettings: Setter<boolean>;
  senseiList: Sensei[];
  setSenseiList: Setter<Sensei[]>;
  studentList: Student[];
  setStudentList: Setter<Student[]>;
  groupList: Group[];
  setGroupList: Setter<Group[]>;
  offDays: OffDay[];
  setOffDays: Setter<OffDay[]>;
  schedules: Schedule[];
  setSchedules: Setter<Schedule[]>;
  senseiTimeBlocks: SenseiTimeBlock[];
  setSenseiTimeBlocks: Setter<SenseiTimeBlock[]>;
  lessonTrackers: LessonTracker[];
  setLessonTrackers: Setter<LessonTracker[]>;
  sessionLogs: SessionLog[];
  setSessionLogs: Setter<SessionLog[]>;
  leaveRequests: LeaveRequest[];
  setLeaveRequests: Setter<LeaveRequest[]>;
  viewMode: ViewMode;
  setViewMode: Setter<ViewMode>;
  currentDate: Date;
  setCurrentDate: Setter<Date>;
  studentStatusFilter: StudentStatusFilter;
  setStudentStatusFilter: Setter<StudentStatusFilter>;
  globalSearchTerm: string;
  setGlobalSearchTerm: Setter<string>;
  dateRange: DateRange;
  setDateRange: Setter<DateRange>;
  showScheduleModal: boolean;
  setShowScheduleModal: Setter<boolean>;
  showTrackerModal: boolean;
  setShowTrackerModal: Setter<boolean>;
  showRekapModal: boolean;
  setShowRekapModal: Setter<boolean>;
  showProfileModal: boolean;
  setShowProfileModal: Setter<boolean>;
  selectedProfileData: SelectedProfileData;
  setSelectedProfileData: Setter<SelectedProfileData>;
  selectedTrackerSchedule: Schedule | null;
  setSelectedTrackerSchedule: Setter<Schedule | null>;
  selectedTrackerStudent: Student | null;
  setSelectedTrackerStudent: Setter<Student | null>;
  showResourceHub: boolean;
  setShowResourceHub: Setter<boolean>;
  selectedResourceStudent: Student | null;
  setSelectedResourceStudent: Setter<Student | null>;
  editingSchedule: Schedule | null;
  setEditingSchedule: Setter<Schedule | null>;
  selectedCell: SelectedCell;
  setSelectedCell: Setter<SelectedCell>;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Setter<boolean>;
  user: User | null;
  setUser: Setter<User | null>;
  authLoading: boolean;
  setAuthLoading: Setter<boolean>;
  userProfile: UserProfile | null;
  setUserProfile: Setter<UserProfile | null>;
  theme: Theme;
  setTheme: Setter<Theme>;
  indonesianDayName: string;
  supabase: SupabaseClient | null;
  handleFullSync: () => Promise<void>;
  handlePullData: () => Promise<void>;
  sanitizeData: (collectionName: string, data: CollectionRecord) => CollectionRecord;
  dbOps: DbOps;
  isSuperAdmin: boolean;
  ADMIN_EMAILS: string[];
  currentSensei: Sensei | null;
  permissions: Permissions;
  mapProfileFromDb: (profile: unknown) => UserProfile | null;
  scopedSenseiList: Sensei[];
  scopedStudentList: Student[];
  scopedSchedules: Schedule[];
  scopedSenseiTimeBlocks: SenseiTimeBlock[];
  scopedLessonTrackers: LessonTracker[];
  scopedSessionLogs: SessionLog[];
  scopedLeaveRequests: LeaveRequest[];
}

const defaultSyncConfig: SyncConfig = {
  type: 'supabase',
  supabase: { url: import.meta.env.VITE_SUPABASE_URL || '', key: import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
};

const normalizeSyncConfig = (config: SyncConfig): SyncConfig => {
  if (config?.type === 'gas') return config;
  const url = config?.supabase?.url || defaultSyncConfig.supabase.url;
  const key = config?.supabase?.key || defaultSyncConfig.supabase.key;
  return {
    type: 'supabase',
    supabase: { url, key }
  };
};

const initialSyncConfig = normalizeSyncConfig(safeParseStorage<SyncConfig>('syncConfig', defaultSyncConfig));

const defaultPermissions: Permissions = {
  role: 'Staff',
  isApproved: false,
  canManageMasterData: false,
  canManageSchedules: false,
  canManageUsers: false,
  canManageSettings: false,
  canViewReporting: false
};

const unavailableDbOps: DbOps = {
  save: async () => { throw new Error('Database is not ready yet'); },
  bulkSave: async () => { throw new Error('Database is not ready yet'); },
  delete: async () => { throw new Error('Database is not ready yet'); }
};

const initialTheme = safeGetItem('theme', 'light') === 'dark' ? 'dark' : 'light';

export const useAppStore = create<AppStore>((set) => {
  const s = <K extends keyof AppStore>(key: K): Setter<AppStore[K]> => {
    return (value) => set((state) => ({
      [key]: typeof value === 'function'
        ? (value as (prev: AppStore[K]) => AppStore[K])(state[key])
        : value
    } as Pick<AppStore, K>));
  };

  return {
    activeTab: 'dashboard', setActiveTab: s('activeTab'),
    masterSubTab: 'sensei', setMasterSubTab: s('masterSubTab'),
    requestSubTab: 'leave', setRequestSubTab: s('requestSubTab'),
    pendingUserRequestCount: 0, setPendingUserRequestCount: s('pendingUserRequestCount'),
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
    senseiTimeBlocks: [], setSenseiTimeBlocks: s('senseiTimeBlocks'),
    lessonTrackers: [], setLessonTrackers: s('lessonTrackers'),
    sessionLogs: [], setSessionLogs: s('sessionLogs'),
    leaveRequests: [], setLeaveRequests: s('leaveRequests'),
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
    theme: initialTheme, setTheme: s('theme'),
    indonesianDayName: '',
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
    scopedSenseiTimeBlocks: [],
    scopedLessonTrackers: [],
    scopedSessionLogs: [],
    scopedLeaveRequests: [],
  };
});
