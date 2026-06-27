import React, { useState } from 'react';
import { Lock, Mail, Key, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthPageProps {
  supabase: SupabaseClient;
  theme: 'light' | 'dark';
  onAuthSuccess?: (user: any) => void;
}

// Catatan: Penambahan user baru dilakukan manual oleh Super Admin
// melalui Supabase Dashboard (Authentication > Users > Invite User),
// bukan melalui form signup di sini. Setelah user dibuat, Super Admin
// bisa approve di menu User Management dashboard ini.
export const AuthPage: React.FC<AuthPageProps> = ({ supabase, theme, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      if (data.user && onAuthSuccess) {
        onAuthSuccess(data.user);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      setError(err.message || 'Terjadi kesalahan sistem. Cek koneksi Anda.');
      toast.error(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300`}>
      <div className="w-full max-w-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-6 flex h-14 w-14 items-center justify-center border border-indigo-100 bg-indigo-600 text-white dark:border-indigo-900"
          >
            <Lock size={28} />
          </div>
          
          <h2 className="mb-2 text-2xl font-black text-slate-800 dark:text-white">
            Selamat Datang
          </h2>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Silakan login untuk mengakses dashboard.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="ui-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="ui-input pl-11"
                placeholder="example@email.com"
              />
            </div>
          </div>
          <div>
            <label className="ui-label">Kata Sandi</label>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400" size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="ui-input pl-11 pr-11"
                placeholder="Masukkan kata sandi"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 overflow-hidden border border-rose-100 bg-rose-50 p-3 text-xs font-bold text-rose-500 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="leading-tight">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="mt-4 w-full border border-indigo-600 bg-indigo-600 px-5 py-3 text-sm font-black uppercase tracking-widest text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </div>
            ) : 'Masuk'}
          </button>
        </form>

        <p className="mt-8 text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
          * Belum punya akun? Hubungi Super Admin untuk didaftarkan.
        </p>
      </div>
    </div>
  );
};
