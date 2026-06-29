import { CalendarOff, Check, Clock3, Loader2, RefreshCw, UserCheck, UserRoundCog, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import type { AppRole, UserProfile } from '../types';
import type { RequestSubTab } from '../store/useAppStore';
import { LeaveRequestReviewPanel } from './LeaveRequestReviewPanel';
import { SubstitutionRequestPanel } from './SubstitutionRequestPanel';

type RequestTab = {
  id: RequestSubTab;
  label: string;
  count: number;
  icon: typeof CalendarOff;
};

export const AdminRequestsView = () => {
  const {
    requestSubTab,
    setRequestSubTab,
    setPendingUserRequestCount,
    leaveRequests,
    schedules,
    permissions,
    supabase,
    mapProfileFromDb,
    user
  } = useAppContext(state => ({
    requestSubTab: state.requestSubTab,
    setRequestSubTab: state.setRequestSubTab,
    setPendingUserRequestCount: state.setPendingUserRequestCount,
    leaveRequests: state.leaveRequests,
    schedules: state.schedules,
    permissions: state.permissions,
    supabase: state.supabase,
    mapProfileFromDb: state.mapProfileFromDb,
    user: state.user
  }));
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, AppRole>>({});

  const fetchProfiles = async () => {
    if (!permissions.canManageUsers || !supabase) return;
    setLoadingProfiles(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('last_login', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapProfileFromDb).filter((profile): profile is UserProfile => Boolean(profile));
      setProfiles(mapped);
      setPendingUserRequestCount(mapped.filter(profile => profile.status === 'Pending').length);
      setSelectedRoles(Object.fromEntries(mapped.map(profile => [profile.id, profile.role])));
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memuat permintaan user.');
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    void fetchProfiles();
  }, [permissions.canManageUsers, supabase]);

  const pendingUsers = useMemo(
    () => profiles.filter(profile => profile.status === 'Pending'),
    [profiles]
  );
  const pendingLeaveCount = leaveRequests.filter(request => request.status === 'pending').length;
  const pendingSubstitutionCount = schedules.filter(schedule => schedule.substitutionStatus === 'requested' && schedule.status !== 'cancelled').length;
  const activeRequestTab = requestSubTab === 'users' && !permissions.canManageUsers ? 'leave' : requestSubTab;
  const tabs: RequestTab[] = [
    { id: 'leave', label: 'Libur / Cuti', count: pendingLeaveCount, icon: CalendarOff },
    { id: 'substitution', label: 'Pengganti Sensei', count: pendingSubstitutionCount, icon: UserRoundCog },
    ...(permissions.canManageUsers
      ? [{ id: 'users' as const, label: 'Akses User', count: pendingUsers.length, icon: UserCheck }]
      : [])
  ];

  const reviewUser = async (profile: UserProfile, status: 'Approved' | 'Suspended') => {
    if (!supabase || processingUserId) return;
    const role = selectedRoles[profile.id] || profile.role || 'Staff';
    setProcessingUserId(profile.id);
    try {
      const { error } = await supabase.from('profiles').update({ status, role }).eq('id', profile.id);
      if (error) throw error;
      setProfiles(previous => previous.map(item => item.id === profile.id ? { ...item, status, role } : item));
      setPendingUserRequestCount(previous => Math.max(0, previous - 1));
      toast.success(status === 'Approved' ? `${profile.email} berhasil disetujui.` : `${profile.email} ditolak.`);

      void supabase.from('audit_logs').insert({
        actor_id: user?.id || null,
        actor_email: user?.email || 'System',
        action: status === 'Approved' ? 'approve_user' : 'reject_user',
        collection_name: 'profiles',
        record_id: profile.id,
        payload: { email: profile.email, role, status }
      }).then(({ error: auditError }) => {
        if (auditError) console.warn('Audit user gagal disimpan:', auditError.message);
      });
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memproses user.');
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-300">Inbox Operasional</p>
            <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Permintaan</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Proses permintaan yang membutuhkan keputusan admin dari satu tempat.</p>
          </div>
          <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
            <Clock3 size={16} className="text-amber-600" />
            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
              {pendingLeaveCount + pendingSubstitutionCount + pendingUsers.length} menunggu
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = activeRequestTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRequestSubTab(tab.id)}
              className={`flex min-h-14 items-center justify-between border px-4 py-3 text-left ${active
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/30'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide"><Icon size={17} /> {tab.label}</span>
              <span className={`min-w-7 border px-2 py-1 text-center text-xs font-black ${active ? 'border-white/40 bg-white/15' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950'}`}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {activeRequestTab === 'leave' && <LeaveRequestReviewPanel />}
      {activeRequestTab === 'substitution' && <SubstitutionRequestPanel />}
      {activeRequestTab === 'users' && permissions.canManageUsers && (
        <section className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Pendaftaran Dashboard</p>
              <h3 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">User Menunggu Persetujuan</h3>
            </div>
            <button type="button" onClick={fetchProfiles} disabled={loadingProfiles} className="border border-slate-200 bg-white p-2 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              <RefreshCw size={15} className={loadingProfiles ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingProfiles && profiles.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-400"><Loader2 size={17} className="mr-2 animate-spin" /> Memuat user...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex min-h-40 items-center justify-center text-sm font-semibold text-slate-400"><Check size={18} className="mr-2" /> Tidak ada user yang menunggu persetujuan.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingUsers.map(profile => (
                <div key={profile.id} className="grid gap-3 p-4 md:grid-cols-[minmax(220px,1fr)_180px_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">{profile.email}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">Belum memiliki akses dashboard.</p>
                  </div>
                  <select
                    value={selectedRoles[profile.id] || profile.role || 'Staff'}
                    onChange={event => setSelectedRoles(previous => ({ ...previous, [profile.id]: event.target.value as AppRole }))}
                    className="ui-input"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Sensei">Sensei</option>
                  </select>
                  <div className="flex gap-2 md:justify-end">
                    <button
                      type="button"
                      disabled={processingUserId === profile.id}
                      onClick={() => reviewUser(profile, 'Suspended')}
                      className="ui-btn-secondary inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <X size={14} /> Tolak
                    </button>
                    <button
                      type="button"
                      disabled={processingUserId === profile.id}
                      onClick={() => reviewUser(profile, 'Approved')}
                      className="ui-btn-primary inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {processingUserId === profile.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Setujui
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
