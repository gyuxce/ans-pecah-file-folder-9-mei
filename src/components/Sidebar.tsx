import { 
  Users, UserCheck, LayoutDashboard, Database, AlertCircle, X, CalendarDays, LogOut, Moon, Sun, BarChart2, PlayCircle, UsersRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
return (
      <>
        {/* Mobile Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        <div className={`w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                ANS Schedule
              </h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Dashboard v1.0</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">Utama</p>
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('teaching'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'teaching' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <PlayCircle size={20} />
              <span className="font-medium">Sesi Mengajar</span>
            </button>
            
            <button 
              onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'calendar' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <CalendarDays size={20} />
              <span className="font-medium">Kalender Jadwal</span>
            </button>
            
            {permissions.canManageMasterData && (
            <div className="pt-4">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">Master Data</p>
              <button 
                onClick={() => { setActiveTab('sensei'); setMasterSubTab('sensei'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'sensei' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Users size={20} />
                <span className="font-medium">Data Sensei</span>
              </button>
              <button 
                onClick={() => { setActiveTab('students'); setMasterSubTab('student'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'students' && masterSubTab === 'student' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <UserCheck size={20} />
                <span className="font-medium">Data Students</span>
              </button>
              <button 
                onClick={() => { setActiveTab('students'); setMasterSubTab('group'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'students' && masterSubTab === 'group' ? 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <UsersRound size={20} />
                <span className="font-medium">Data Grup/SP</span>
              </button>
              <button 
                onClick={() => { setActiveTab('offday'); setMasterSubTab('offday'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'offday' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <CalendarDays size={20} />
                <span className="font-medium">Off Days</span>
              </button>
              <button 
                onClick={() => { setActiveTab('reporting'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${activeTab === 'reporting' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <BarChart2 size={20} />
                <span className="font-medium">Reporting</span>
              </button>
            </div>
            )}

            <div className="pt-4">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 opacity-60">Tools</p>
              {permissions.canManageUsers && (
                <button 
                  onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'users' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <UsersRound size={20} />
                  <span className="font-medium">User Management</span>
                </button>
              )}
              <button 
                onClick={() => { setActiveTab('checker'); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'checker' ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <AlertCircle size={20} />
                <span className="font-medium">Smart Checker</span>
              </button>
            </div>
          </nav>

          <div className="p-4 mt-auto space-y-2">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 font-medium"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className="text-amber-400" />}
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
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all duration-200 font-medium"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
            {permissions.canManageSettings && (
              <button 
                onClick={() => { setShowSettings(true); setIsSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-indigo-500 transition-colors"
              >
                <Database size={14} />
                Sync Settings
              </button>
            )}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] opacity-60 uppercase tracking-wider font-bold">Cloud Sync</p>
                <button 
                  onClick={handleFullSync}
                  disabled={isSyncing}
                  className={`p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}
                >
                  <LayoutDashboard size={14} className="rotate-180" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : dbStatus === 'error' ? 'bg-rose-500' : 'bg-slate-400'}`}></div>
                <span className="text-xs font-medium">{dbStatus === 'connected' ? 'Connected' : dbStatus === 'error' ? 'Sync Error' : 'Offline'}</span>
              </div>
              <p className="text-[10px] opacity-40 mt-2">Last sync: {lastSync}</p>
            </div>
          </div>
        </div>
      </>
    );
};

