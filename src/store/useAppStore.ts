import { create } from 'zustand';
import { format, startOfYear, endOfYear, addYears } from 'date-fns';
import { Sensei, Student, LessonTracker, OffDay, Schedule, UserProfile } from '../types';

const savedSyncConfig = localStorage.getItem('syncConfig');
const initialSyncConfig = savedSyncConfig ? JSON.parse(savedSyncConfig) : {
  type: 'supabase',
  supabase: { url: import.meta.env.VITE_SUPABASE_URL || '', key: import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
};

export const useAppStore = create<any>((set) => {
  const s = (key: string) => (val: any) => set((state: any) => ({ [key]: typeof val === 'function' ? val(state[key]) : val }));

  return {
    activeTab: 'dashboard', setActiveTab: s('activeTab'),
    masterSubTab: 'sensei', setMasterSubTab: s('masterSubTab'),
    syncConfig: initialSyncConfig, setSyncConfig: s('syncConfig'),
    dbStatus: 'connected', setDbStatus: s('dbStatus'),
    gasUrl: localStorage.getItem('gasUrl') || '', setGasUrl: s('gasUrl'),
    isSyncing: false, setIsSyncing: s('isSyncing'),
    lastSync: localStorage.getItem('lastSync') || 'Never', setLastSync: s('lastSync'),
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
    theme: localStorage.getItem('theme') || 'light', setTheme: s('theme'),
  };
});
