import { 
  Database, BookOpen, MessageSquare, FileText, ExternalLink, X} from 'lucide-react';
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
      <div className="ui-modal-overlay z-[100]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex h-[100dvh] w-full max-w-sm flex-col overflow-hidden border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 sm:h-auto sm:max-h-[90vh]"
        >
          <div className="ui-modal-header bg-slate-50 dark:bg-slate-950">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-indigo-600 text-white">
                <Database size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="ui-modal-title">Link Pembelajaran</h3>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{selectedResourceStudent.name}</p>
              </div>
            </div>
            <button onClick={() => setShowResourceHub(false)} className="border border-slate-200 p-2 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
              <X size={18} />
            </button>
          </div>

          <div className="ui-modal-body space-y-2">
            {links.map((link, idx) =>
              // FIX #9: Render anchor hanya jika url ada, gunakan div non-interaktif jika kosong
              // agar klik pada link "disabled" tidak memicu scroll-to-top (default anchor href="#" behavior)
              link.url ? (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full flex items-center justify-between p-4 rounded-none transition-all group ${link.color} text-white shadow-sm`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-none">
                      {link.icon}
                    </div>
                    <span className="font-bold text-sm">{link.label}</span>
                  </div>
                  <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <div
                  key={idx}
                  className="w-full flex items-center justify-between p-4 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-none">
                      {link.icon}
                    </div>
                    <span className="font-bold text-sm">{link.label}</span>
                  </div>
                  <span className="text-[10px] font-bold">BELUM DIISI</span>
                </div>
              )
            )}
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50" />
        </motion.div>
      </div>
    );
  };


