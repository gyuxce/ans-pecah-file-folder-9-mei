import { AlertTriangle } from 'lucide-react';

export function ConfigMissing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md border border-rose-100 bg-white p-6 text-center dark:border-rose-900/30 dark:bg-slate-900">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900 dark:bg-rose-900/30 dark:text-rose-400">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-xl font-black text-slate-800 dark:text-white mb-2">Konfigurasi Supabase Belum Ada</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-6">
          Isi environment variable berikut agar dashboard tracking guru dan murid dapat login ke database.
        </p>
        <div className="border border-slate-200 bg-slate-100 p-4 text-left dark:border-slate-700 dark:bg-slate-800">
          <code className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all font-medium">
            VITE_SUPABASE_URL<br />
            VITE_SUPABASE_ANON_KEY
          </code>
        </div>
        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          Copy <code className="font-bold">.env.example</code> ke <code className="font-bold">.env.local</code>, lalu isi value dari Supabase dashboard.
        </p>
      </div>
    </div>
  );
}

