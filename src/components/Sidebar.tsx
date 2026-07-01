import {
  Users, UserCheck, LayoutDashboard, Database, X, CalendarDays, LogOut, Moon, Sun, BarChart2, PlayCircle, UsersRound, ClipboardList, Search, BookOpen
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAppContext } from '../context/AppContext';

export const Sidebar = () => {
  const { activeTab, setActiveTab, masterSubTab, setMasterSubTab, setRequestSubTab, pendingUserRequestCount, setPendingUserRequestCount, leaveRequests, schedules, dbStatus, isSyncing, lastSync, setShowSettings, isSidebarOpen, setIsSidebarOpen, theme, setTheme, supabase, handleFullSync, permissions } = useAppContext(state => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    masterSubTab: state.masterSubTab,
    setMasterSubTab: state.setMasterSubTab,
    setRequestSubTab: state.setRequestSubTab,
    pendingUserRequestCount: state.pendingUserRequestCount,
    setPendingUserRequestCount: state.setPendingUserRequestCount,
    leaveRequests: state.leaveRequests,
    schedules: state.schedules,
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
  const isStudent = permissions.role === 'Student';
  const [pendingBookingCount, setPendingBookingCount] = useState(0);
  const pendingRequestCount = leaveRequests.filter(request => request.status === 'pending').length
    + schedules.filter(schedule => schedule.substitutionStatus === 'requested' && schedule.status !== 'cancelled').length
    + pendingUserRequestCount
    + pendingBookingCount;

  useEffect(() => {
    if (!permissions.canManageUsers || !supabase) return;
    void supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending')
      .then(({ count, error }) => {
        if (!error) setPendingUserRequestCount(count || 0);
      });
  }, [permissions.canManageUsers, setPendingUserRequestCount, supabase]);
  useEffect(() => {
    if (!permissions.canManageMasterData || !supabase) return;
    void supabase.from('booking_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      .then(({ count, error }) => { if (!error) setPendingBookingCount(count || 0); });
  }, [permissions.canManageMasterData, supabase]);
  const sectionClass = 'px-3 text-[10px] font-semibold text-slate-400 uppercase';
  const baseItemClass = 'flex h-9 w-full items-center gap-2.5 rounded-md border-l-2 px-3 text-sm font-medium transition-colors duration-150';
  const activeItemClass = 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-200';
  const idleItemClass = 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';

  return (
    <>
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
        />
      )}

      <aside className={`fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-150 dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-950 dark:text-white">ANS Schedule</h1>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">Workspace operasional</p>
          </div>
          <button onClick={closeSidebar} className="rounded-md p-2 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 lg:hidden dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X size={18} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <p className={`${sectionClass} mb-2`}>Utama</p>
          <button
            onClick={() => { setActiveTab('dashboard'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'dashboard' ? activeItemClass : idleItemClass}`}
          >
            <LayoutDashboard size={16} />
            <span>{isSensei || isStudent ? 'Beranda' : 'Dasbor'}</span>
          </button>

          {!isStudent && <button
            onClick={() => { setActiveTab('teaching'); closeSidebar(); }}
            className={`${baseItemClass} ${activeTab === 'teaching' ? activeItemClass : idleItemClass}`}
          >
            <PlayCircle size={16} />
            <span>{isSensei ? 'Sesi Mengajar' : 'Operasional'}</span>
          </button>}

          {isStudent && (
            <>
              <button
                onClick={() => { setActiveTab('student-booking'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'student-booking' ? activeItemClass : idleItemClass}`}
              >
                <Search size={16} />
                <span>Cari Jadwal</span>
              </button>
              <button
                onClick={() => { setActiveTab('student-classes'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'student-classes' ? activeItemClass : idleItemClass}`}
              >
                <BookOpen size={16} />
                <span>Kelas Saya</span>
              </button>
            </>
          )}

          {isSensei && (
            <button
              onClick={() => { setActiveTab('sensei-students'); closeSidebar(); }}
              className={`${baseItemClass} ${activeTab === 'sensei-students' ? activeItemClass : idleItemClass}`}
            >
              <UserCheck size={16} />
              <span>Murid Saya</span>
            </button>
          )}

          {!isSensei && !isStudent && (
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
            <div className="space-y-1 pt-4">
              <p className={`${sectionClass} mb-2`}>Data</p>
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
                onClick={() => { setRequestSubTab('leave'); setActiveTab('offday'); closeSidebar(); }}
                className={`${baseItemClass} ${activeTab === 'offday' ? activeItemClass : idleItemClass}`}
              >
                <ClipboardList size={16} />
                <span>Permintaan</span>
                {pendingRequestCount > 0 && (
                  <span className="ml-auto min-w-5 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-center text-[10px] font-black text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    {pendingRequestCount}
                  </span>
                )}
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

          {!isSensei && !isStudent && (
          <div className="space-y-1 pt-4">
            <p className={`${sectionClass} mb-2`}>Alat</p>
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

        <div className="mt-auto shrink-0 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="flex h-9 items-center justify-center gap-2 rounded-md text-xs font-semibold text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
              title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} className="text-amber-400" />}
              <span>{theme === 'light' ? 'Gelap' : 'Terang'}</span>
            </button>
            <button
              onClick={async () => {
                try {
                  await supabase.auth.signOut();
                } catch (e: any) {
                  // ignore
                }
              }}
              className="flex h-9 items-center justify-center gap-2 rounded-md text-xs font-semibold text-rose-500 transition-colors duration-150 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              title="Keluar"
            >
              <LogOut size={15} />
              <span>Keluar</span>
            </button>
          </div>

          {!isSensei && !isStudent && (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] text-slate-400">
              <div className="flex min-w-0 items-center gap-2">
                <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                <span className="truncate">{dbStatus === 'connected' ? 'Sinkron' : dbStatus === 'error' ? 'Cek koneksi' : 'Offline'}</span>
              </div>
              <div className="flex items-center gap-1">
                {permissions.canManageSettings && (
                  <button
                    onClick={() => { setShowSettings(true); closeSidebar(); }}
                    className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                    title="Pengaturan sinkronisasi"
                  >
                    <Database size={13} />
                  </button>
                )}
                <button
                  onClick={handleFullSync}
                  disabled={isSyncing}
                  className={`rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-60 dark:hover:bg-slate-800 dark:hover:text-indigo-300 ${isSyncing ? 'animate-spin' : ''}`}
                  title={`Sinkronkan sekarang. Terakhir: ${lastSync}`}
                >
                  <LayoutDashboard size={13} className="rotate-180" />
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
