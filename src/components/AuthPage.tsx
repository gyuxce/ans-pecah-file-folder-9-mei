import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Mail, Key, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthPageProps {
  supabase: SupabaseClient;
  theme: 'light' | 'dark';
  onAuthSuccess?: (user: any) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ supabase, theme, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
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
      if (isLogin) {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (data.user && onAuthSuccess) {
          onAuthSuccess(data.user);
        }
      } else {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        toast.success('Pendaftaran berhasil! Silakan cek email untuk konfirmasi.');
        setIsLogin(true);
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
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={false}
            animate={{ 
              rotate: isLogin ? 0 : 180,
              scale: isLogin ? 1 : 1.1
            }}
            className={`w-16 h-16 ${isLogin ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'} rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg transition-colors duration-500`}
          >
            <Lock size={32} />
          </motion.div>
          
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Join the Team'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {isLogin ? 'Silakan login untuk mengakses dashboard.' : 'Buat akun admin baru untuk mulai mengelola.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex relative mb-8">
          <motion.div 
            layoutId="auth-pill"
            className="absolute inset-y-1.5 bg-white dark:bg-slate-700 rounded-xl shadow-sm z-0"
            style={{ width: 'calc(50% - 6px)' }}
            animate={{ x: isLogin ? 0 : '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <button 
            type="button"
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-black transition-all relative z-10 ${isLogin ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}
          >
            LOGIN
          </button>
          <button 
            type="button"
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-black transition-all relative z-10 ${!isLogin ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
          >
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLogin ? 'text-slate-400' : 'text-emerald-500/50'}`} size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                placeholder="example@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <div className="relative">
              <Key className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isLogin ? 'text-slate-400' : 'text-emerald-500/50'}`} size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 dark:text-white transition-all"
                placeholder="••••••••"
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
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-100 dark:border-rose-800 flex items-center gap-2 overflow-hidden"
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="leading-tight">{error}</span>
            </motion.div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 ${isLogin ? 'bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-200/50' : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200/50'} text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl dark:shadow-none hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50 mt-4`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Processing...</span>
              </div>
            ) : isLogin ? 'Login Now' : 'Join as Admin'}
          </button>
        </form>

        {!isLogin && (
          <p className="mt-8 text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            * Pastikan email Anda valid untuk verifikasi pendaftaran.
          </p>
        )}
      </motion.div>
    </div>
  );
};
