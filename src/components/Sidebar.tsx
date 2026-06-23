import {
  Users, UserCheck, LayoutDashboard, Database, AlertCircle, X, CalendarDays, LogOut, Moon, Sun, BarChart2, PlayCircle, UsersRound
} from 'lucide-react';

import { useAppContext } from '../context/AppContext';

export const Sidebar = () => {
  const { activeTab, setActiveTab, masterSubTab, setMasterSubTab, dbStatus, isSyncing, lastSync, setShowSettings, isSidebarOpen, setIsSidebarOpen, theme, setTheme, supabase, handleFullSync, permissions } = useAppContext(state => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    masterSubTab: state.masterSubTab,
    setMasterSubTab: state.setMasterSubTab,
    dbStatus: state.dbStatus,
    isSyncing: state.isSyncing,
    lastSync: state.lastSync,
    setShowSettings: state.setShowSettings,
    isSidebarOpen: state.isSidebarOpen,
    setIsSidebarOpen: state.setIsSidebarOpen,
    theme: state.theme,
    setTheme: state.setTheme,
    supabase: state.supabase,
    handleFullSync: state.handleFullSync,
    permissions: state.permissions
  }));

  const closeSidebar = () => setIsSidebarOpen(false);
  const sectionClass = 'px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70';
  const baseItemClass = 'w-full flex items-center gap-2 px-3 py-1.5 text-sm border font-medium';
  const idleItemClass = 'text-slate-500 border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700';

  return (
    <>
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
        />
      )}

      <div className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 z-50 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-3 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-tight">ANS Schedule</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Dashboard v1.0</p>
          </div>
          <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 border border-transparent hover:border-slate-200">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-hidden">
          <p className={`${sectionClass} mb-1`}>Utama</p>
          <button
            onClick={() => { setActiveTab('dashboard'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : idleItemClass}`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => { setActiveTab('teaching'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'teaching' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-800' : idleItemClass}`}
          >
            <PlayCircle size={16} />
            <span>Sesi Mengajar</span>
          </button>

          <button
            onClick={() => { setActiveTab('calendar'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'calendar' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : idleItemClass}`}
          >
            <CalendarDays size={16} />
            <span>Kalender Jadwal</span>
          </button>

          {permissions.canManageMasterData && (
            <div className="pt-2 space-y-0.5">
              <p className={`${sectionClass} mb-1`}>Master Data</p>
              <button
                onClick={() => { setActiveTab('sensei'); setMasterSubTab('sensei'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'sensei' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800' : idleItemClass}`}
              >
                <Users size={16} />
                <span>Data Sensei</span>
              </button>
              <button
                onClick={() => { setActiveTab('students'); setMasterSubTab('student'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'students' && masterSubTab === 'student' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : idleItemClass}`}
              >
                <UserCheck size={16} />
                <span>Data Students</span>
              </button>
              <button
                onClick={() => { setActiveTab('students'); setMasterSubTab('group'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'students' && masterSubTab === 'group' ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-800' : idleItemClass}`}
              >
                <UsersRound size={16} />
                <span>Data Grup/SP</span>
              </button>
              <button
                onClick={() => { setActiveTab('offday'); setMasterSubTab('offday'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'offday' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800' : idleItemClass}`}
              >
                <CalendarDays size={16} />
                <span>Off Days</span>
              </button>
              <button
                onClick={() => { setActiveTab('reporting'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'reporting' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800' : idleItemClass}`}
              >
                <BarChart2 size={16} />
                <span>Reporting</span>
              </button>
            </div>
          )}

          <div className="pt-2 space-y-0.5">
            <p className={`${sectionClass} mb-1`}>Tools</p>
            {permissions.canManageUsers && (
              <button
                onClick={() => { setActiveTab('users'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'users' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : idleItemClass}`}
              >
                <UsersRound size={16} />
                <span className="whitespace-nowrap">User Management</span>
              </button>
            )}
            <button
              onClick={() => { setActiveTab('checker'); closeSidebar(); }}
              className={`${baseItemClass} ${activeTab === 'checker' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-800' : idleItemClass}`}
            >
              <AlertCircle size={16} />
              <span>Smart Checker</span>
            </button>
          </div>
        </nav>

        <div className="px-3 py-3 mt-auto space-y-0.5 shrink-0">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 font-medium"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e: any) {
                // ignore
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-transparent hover:border-rose-100 dark:hover:border-rose-800 font-medium"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
          {permissions.canManageSettings && (
            <button
              onClick={() => { setShowSettings(true); closeSidebar(); }}
              className="w-full flex items-center gap-2 px-3 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-500"
            >
              <Database size={13} />
              Sync Settings
            </button>
          )}
          <div className="bg-slate-900 border border-slate-800 p-3 text-white">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] opacity-60 uppercase tracking-wider font-bold">Cloud Sync</p>
              <button
                onClick={handleFullSync}
                disabled={isSyncing}
                className={`p-1 bg-white/10 hover:bg-white/20 ${isSyncing ? 'animate-spin' : ''}`}
              >
                <LayoutDashboard size={14} className="rotate-180" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 ${dbStatus === 'connected' ? 'bg-emerald-400' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`} />
              <span className="text-xs font-medium">{dbStatus === 'connected' ? 'Connected' : dbStatus === 'error' ? 'Sync Error' : 'Offline'}</span>
            </div>
            <p className="text-[10px] opacity-40 mt-1 truncate">Last sync: {lastSync}</p>
          </div>
        </div>
      </div>
    </>
  );
};
