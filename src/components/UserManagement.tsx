import { useState, useEffect } from 'react';
import { 
  Repeat} from 'lucide-react';
import { 
  format, parseISO} from 'date-fns';
import { toast } from 'sonner';

import { AppRole, UserProfile } from '../types';
import { useAppContext } from '../context/AppContext';
export const UserManagement = () => {
const { user, supabase, dbOps, mapProfileFromDb } = useAppContext(state => ({
  user: state.user,
  supabase: state.supabase,
  dbOps: state.dbOps,
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
        await dbOps.save('audit_logs', {
          actorId: user?.id,
          actorEmail: user?.email,
          action: 'change_role',
          collectionName: 'profiles',
          recordId: profile.id,
          payload: { email: profile.email, role }
        });
        toast.success(`Role ${profile.email} diubah menjadi ${role}`);
        fetchUsers();
      } catch (err: any) {
        toast.error('Gagal update role: ' + err.message);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">User Management</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-2 bg-white dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
              title="Refresh Users"
            >
              <Repeat size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
              Super Admin Mode
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Email</th>
                <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Last Login</th>
                <th className="p-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">No users found.</td></tr>
              ) : users.map((u: UserProfile) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="p-4 font-medium text-slate-700 dark:text-slate-200">{u.email}</td>
                  <td className="p-4">
                    {u.role === 'Super Admin' ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                        Super Admin
                      </span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value as AppRole)}
                        className="px-3 py-1 rounded-xl text-[10px] font-bold uppercase bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200 outline-none"
                      >
                        <option value="Staff">Staff</option>
                        <option value="Sensei">Sensei</option>
                      </select>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${u.status === 'Approved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{u.lastLogin && !Number.isNaN(parseISO(u.lastLogin).getTime()) ? format(parseISO(u.lastLogin), 'dd MMM yyyy HH:mm') : 'Never'}</td>
                  <td className="p-4 text-right">
                    {u.role !== 'Super Admin' && (
                      <button 
                        onClick={() => handleToggleStatus(u)}
                        className="text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:underline"
                      >
                        {u.status === 'Approved' ? 'Revoke' : 'Approve'}
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

