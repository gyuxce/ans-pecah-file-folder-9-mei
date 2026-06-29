import { 
  Database, BookOpen, MessageSquare, FileText, ExternalLink, X} from 'lucide-react';

import { useAppContext } from '../context/AppContext';
export const ResourceHubModal = () => {
const { setShowResourceHub, selectedResourceStudent } = useAppContext(state => ({
  setShowResourceHub: state.setShowResourceHub,
  selectedResourceStudent: state.selectedResourceStudent
}));
    if (!selectedResourceStudent) return null;

    const links = [
      { label: 'Google Classroom', url: selectedResourceStudent.classroom_link, color: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300', icon: <BookOpen size={20} /> },
      { label: 'Google Chat Space', url: selectedResourceStudent.chat_link, color: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300', icon: <MessageSquare size={20} /> },
      { label: 'Progress Siswa', url: selectedResourceStudent.progress_link, color: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300', icon: <Database size={20} /> },
      { label: 'Kurikulum & Materi', url: selectedResourceStudent.curriculum_link, color: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300', icon: <FileText size={20} /> },
    ];

    return (
      <div className="ui-modal-overlay z-[100]">
        <div className="ui-modal-panel max-w-md">
          <div className="ui-modal-header bg-white dark:bg-slate-900">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Database size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="ui-modal-title">Link Pembelajaran</h3>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{selectedResourceStudent.name}</p>
              </div>
            </div>
            <button onClick={() => setShowResourceHub(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
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
                  className={`group flex w-full items-center justify-between rounded-xl border p-4 transition-colors duration-150 hover:bg-white dark:hover:bg-slate-900 ${link.color}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/70 p-2 dark:bg-slate-900/70">
                      {link.icon}
                    </div>
                    <span className="font-bold text-sm">{link.label}</span>
                  </div>
                  <ExternalLink size={16} className="opacity-60 transition-opacity group-hover:opacity-100" />
                </a>
              ) : (
                <div
                  key={idx}
                  className="flex w-full cursor-not-allowed items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-400 opacity-70 dark:border-slate-700 dark:bg-slate-900"
                  aria-disabled="true"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-800">
                      {link.icon}
                    </div>
                    <span className="font-bold text-sm">{link.label}</span>
                  </div>
                  <span className="text-[10px] font-bold">BELUM DIISI</span>
                </div>
              )
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40" />
        </div>
      </div>
    );
  };


