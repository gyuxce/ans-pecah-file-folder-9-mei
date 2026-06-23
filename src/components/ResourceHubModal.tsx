import { 
  Database, BookOpen, MessageSquare, FileText, ExternalLink} from 'lucide-react';
import { motion } from 'motion/react';

import { useAppContext } from '../context/AppContext';
export const ResourceHubModal = () => {
const { setShowResourceHub, selectedResourceStudent } = useAppContext(state => ({
  setShowResourceHub: state.setShowResourceHub,
  selectedResourceStudent: state.selectedResourceStudent
}));
    if (!selectedResourceStudent) return null;

    const links = [
      { label: 'Google Classroom', url: selectedResourceStudent.classroom_link, color: 'bg-emerald-500', icon: <BookOpen size={20} /> },
      { label: 'Google Chat Space', url: selectedResourceStudent.chat_link, color: 'bg-indigo-500', icon: <MessageSquare size={20} /> },
      { label: 'Progress Siswa', url: selectedResourceStudent.progress_link, color: 'bg-blue-500', icon: <Database size={20} /> },
      { label: 'Kurikulum & Materi', url: selectedResourceStudent.curriculum_link, color: 'bg-amber-500', icon: <FileText size={20} /> },
    ];

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 ">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-none shadow-sm w-full max-w-sm overflow-hidden flex flex-col border border-white/20"
        >
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 text-center">
            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-none flex items-center justify-center mx-auto mb-4 shadow-sm shadow-indigo-100 dark:shadow-none">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Resource Hub</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70">{selectedResourceStudent.name}</p>
          </div>

          <div className="p-8 space-y-3">
            {links.map((link, idx) => (
              <a 
                key={idx}
                href={link.url || '#'}
                target={link.url ? "_blank" : undefined}
                rel="noreferrer"
                className={`w-full flex items-center justify-between p-4 rounded-none transition-all group ${
                  link.url 
                    ? `${link.color} text-white shadow-sm hover:translate-x-2 active:scale-95` 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-none">
                    {link.icon}
                  </div>
                  <span className="font-bold text-sm">{link.label}</span>
                </div>
                {link.url ? (
                  <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-[10px] font-bold">MISSING</span>
                )}
              </a>
            ))}
          </div>

          <button 
            onClick={() => setShowResourceHub(false)}
            className="m-8 mt-0 py-4 rounded-none font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
          >
            Tutup
          </button>
        </motion.div>
      </div>
    );
  };


