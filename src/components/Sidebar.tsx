import {
  Users, UserCheck, LayoutDashboard, Database, X, CalendarDays, LogOut, Moon, Sun, BarChart2, PlayCircle, UsersRound
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
  const isSensei = permissions.role === 'Sensei';
  const sectionClass = 'px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-70';
  const baseItemClass = 'w-full flex items-center gap-2 border px-3 py-1.5 text-sm font-medium';
  const activeItemClass = 'border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
  const idleItemClass = 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200';

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
            className={`${baseItemClass} ${activeTab === 'dashboard' ? activeItemClass : idleItemClass}`}
          >
            <LayoutDashboard size={16} />
            <span>{isSensei ? 'Beranda' : 'Dasbor'}</span>
          </button>

          <button
            onClick={() => { setActiveTab('teaching'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'teaching' ? activeItemClass : idleItemClass}`}
          >
            <PlayCircle size={16} />
            <span>{isSensei ? 'Sesi Mengajar' : 'Operasional'}</span>
          </button>

          {isSensei && (
            <button
              onClick={() => { setActiveTab('sensei-students'); closeSidebar(); }}
              className={`${baseItemClass} ${activeTab === 'sensei-students' ? activeItemClass : idleItemClass}`}
            >
              <UserCheck size={16} />
              <span>Murid Saya</span>
            </button>
          )}

          {!isSensei && (
            <button
              onClick={() => { setActiveTab('calendar'); closeSidebar(); }}
              className={`${baseItemClass} ${activeTab === 'calendar' ? activeItemClass : idleItemClass}`}
            >
              <CalendarDays size={16} />
              <span>Kalender Jadwal</span>
            </button>
          )}

          {isSensei && (
            <button
              onClick={() => { setActiveTab('sensei-schedule'); closeSidebar(); }}
              className={`${baseItemClass} ${activeTab === 'sensei-schedule' ? activeItemClass : idleItemClass}`}
            >
              <CalendarDays size={16} />
              <span>Jadwal Saya</span>
            </button>
          )}

          {permissions.canManageMasterData && (
            <div className="pt-2 space-y-0.5">
              <p className={`${sectionClass} mb-1`}>Data</p>
              <button
                onClick={() => { setActiveTab('sensei'); setMasterSubTab('sensei'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'sensei' ? activeItemClass : idleItemClass}`}
              >
                <Users size={16} />
                <span>Data Sensei</span>
              </button>
              <button
                onClick={() => { setActiveTab('students'); setMasterSubTab('student'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'students' && masterSubTab === 'student' ? activeItemClass : idleItemClass}`}
              >
                <UserCheck size={16} />
                <span>Data Siswa</span>
              </button>
              <button
                onClick={() => { setActiveTab('students'); setMasterSubTab('group'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'students' && masterSubTab === 'group' ? activeItemClass : idleItemClass}`}
              >
                <UsersRound size={16} />
                <span>Data Grup/SP</span>
              </button>
              <button
                onClick={() => { setActiveTab('offday'); setMasterSubTab('offday'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'offday' ? activeItemClass : idleItemClass}`}
              >
                <CalendarDays size={16} />
                <span>Permintaan</span>
              </button>
              <button
                onClick={() => { setActiveTab('reporting'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'reporting' ? activeItemClass : idleItemClass}`}
              >
                <BarChart2 size={16} />
                <span>Laporan</span>
              </button>
            </div>
          )}

          {!isSensei && (
          <div className="pt-2 space-y-0.5">
            <p className={`${sectionClass} mb-1`}>Alat</p>
            {permissions.canManageUsers && (
              <button
                onClick={() => { setActiveTab('users'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'users' ? activeItemClass : idleItemClass}`}
              >
                <UsersRound size={16} />
                <span className="whitespace-nowrap">Kelola User</span>
              </button>
            )}
          </div>
          )}
        </nav>

        <div className="px-3 py-3 mt-auto space-y-0.5 shrink-0">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className={`${baseItemClass} ${idleItemClass}`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
            <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
          </button>
          <button
            onClick={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e: any) {
                // ignore
              }
            }}
            className="w-full flex items-center gap-2 border border-transparent px-3 py-1.5 text-sm font-medium text-rose-500 hover:border-rose-100 hover:bg-rose-50 dark:hover:border-rose-800 dark:hover:bg-rose-900/30"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
          {permissions.canManageSettings && (
            <button
              onClick={() => { setShowSettings(true); closeSidebar(); }}
              className="w-full flex items-center gap-2 border border-transparent px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-indigo-500 dark:hover:border-slate-700 dark:hover:bg-slate-800"
            >
              <Database size={13} />
              Pengaturan Sinkronisasi
            </button>
          )}
          {!isSensei && (
          <div className="bg-slate-900 border border-slate-800 p-3 text-white">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] opacity-60 uppercase tracking-wider font-bold">Sinkronisasi Cloud</p>
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
              <span className="text-xs font-medium">{dbStatus === 'connected' ? 'Terhubung' : dbStatus === 'error' ? 'Error Sinkronisasi' : 'Offline'}</span>
            </div>
            <p className="text-[10px] opacity-40 mt-1 truncate">Sinkron terakhir: {lastSync}</p>
          </div>
          )}
        </div>
      </div>
    </>
  );
};
