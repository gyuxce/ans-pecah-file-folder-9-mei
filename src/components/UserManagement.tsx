import { useState, useEffect } from 'react';
import { 
  Repeat} from 'lucide-react';
import { 
  format, parseISO} from 'date-fns';
import { toast } from 'sonner';

import { AppRole, UserProfile } from '../types';
import { useAppContext } from '../context/AppContext';
export const UserManagement = () => {
const { user, supabase, mapProfileFromDb } = useAppContext(state => ({
  user: state.user,
  supabase: state.supabase,
  mapProfileFromDb: state.mapProfileFromDb
}));
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').order('last_login', { ascending: false });
        if (error) throw error;
        setUsers((data || []).map(mapProfileFromDb).filter(Boolean));
      } catch (err: any) {
        console.error('Error fetching users:', err);
        if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
          supabase.auth.signOut().catch(() => {});
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        } else {
          toast.error(`Gagal mengambil data user: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchUsers();
    }, []);

    const handleToggleStatus = async (user: any) => {
      const newStatus = user.status === 'Approved' ? 'Pending' : 'Approved';
      try {
        const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', user.id);
        if (error) throw error;
        toast.success(`User ${newStatus === 'Approved' ? 'disetujui' : 'ditangguhkan'}`);
        fetchUsers();
      } catch (err: any) {
        if (err.message?.includes('Refresh Token') || err.message?.includes('refresh token')) {
          supabase.auth.signOut().catch(() => {});
          toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
        } else {
          toast.error('Gagal update status: ' + err.message);
        }
      }
    };

    const handleRoleChange = async (profile: UserProfile, role: AppRole) => {
      try {
        const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.id);
        if (error) throw error;
        void (async () => {
          const { error: auditError } = await supabase.from('audit_logs').insert({
            actor_id: user?.id || null,
            actor_email: user?.email || 'System',
            action: 'change_role',
            collection_name: 'profiles',
            record_id: profile.id,
            payload: { email: profile.email, role }
          });
          if (auditError) console.warn('Audit log gagal disimpan:', auditError.message);
        })();
        toast.success(`Role ${profile.email} diubah menjadi ${role}`);
        fetchUsers();
      } catch (err: any) {
        toast.error('Gagal update role: ' + err.message);
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Akses Dashboard</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Kelola User</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700"
              title="Muat ulang user"
            >
              <Repeat size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-600 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Mode Super Admin
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Email</th>
                <th className="p-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Akses</th>
                <th className="p-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Status</th>
                <th className="p-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Login Terakhir</th>
                <th className="p-4 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.16em]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Memuat data user...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Belum ada user.</td></tr>
              ) : users.map((u: UserProfile) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{u.email}</td>
                  <td className="p-4">
                    {u.role === 'Super Admin' ? (
                      <span className="px-3 py-1 border border-indigo-100 dark:border-indigo-800 text-[10px] font-bold uppercase bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        Super Admin
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as AppRole)}
                        className="border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black uppercase text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        <option value="Staff">Staff</option>
                        <option value="Sensei">Sensei</option>
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 border text-[10px] font-bold uppercase ${u.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border-amber-100 dark:border-amber-800'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{u.lastLogin && !Number.isNaN(parseISO(u.lastLogin).getTime()) ? format(parseISO(u.lastLogin), 'dd MMM yyyy HH:mm') : 'Belum pernah'}</td>
                  <td className="p-4 text-right">
                    {u.role !== 'Super Admin' && (
                      <button 
                        onClick={() => handleToggleStatus(u)}
                        className="border border-indigo-100 px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
                      >
                        {u.status === 'Approved' ? 'Tangguhkan' : 'Setujui'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

