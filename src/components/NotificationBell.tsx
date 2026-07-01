import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';

import type { AppNotification } from '../types';
import { useAppContext } from '../context/AppContext';

const toNotification = (row: any): AppNotification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  bookingRequestId: row.booking_request_id,
  scheduleId: row.schedule_id,
  isRead: row.is_read === true,
  createdAt: row.created_at
});

const formatNotificationTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);
};

export const NotificationBell = () => {
  const { supabase, user, permissions, setActiveTab, setRequestSubTab } = useAppContext(state => ({
    supabase: state.supabase,
    user: state.user,
    permissions: state.permissions,
    setActiveTab: state.setActiveTab,
    setRequestSubTab: state.setRequestSubTab
  }));
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setItems((data || []).map(toNotification));
  }, [supabase, user?.id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, supabase, user?.id]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter(item => !item.isRead).length;

  const markOne = async (item: AppNotification) => {
    if (!item.isRead) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.id);
      setItems(previous => previous.map(value => value.id === item.id ? { ...value, isRead: true } : value));
    }
    if (item.type === 'booking_request' && permissions.role !== 'Student') {
      setRequestSubTab('booking');
      setActiveTab('offday');
    } else if (permissions.role === 'Student') {
      setActiveTab('student-classes');
    } else if (permissions.role === 'Sensei' && item.scheduleId) {
      setActiveTab('teaching');
    }
    setOpen(false);
  };

  const markAll = async () => {
    await supabase.rpc('mark_all_notifications_read');
    setItems(previous => previous.map(item => ({ ...item, isRead: true })));
  };

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen(value => !value)} className="relative flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300" aria-label="Notifikasi">
        <Bell size={17} />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-16 z-[80] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div><p className="text-sm font-bold text-slate-900 dark:text-white">Notifikasi</p><p className="text-[11px] text-slate-400">{unread} belum dibaca</p></div>
            {unread > 0 && <button type="button" onClick={markAll} className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600"><CheckCheck size={14} /> Tandai semua</button>}
          </div>
          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {items.length === 0 ? <p className="p-8 text-center text-sm text-slate-400">Belum ada notifikasi.</p> : items.map(item => (
              <button key={item.id} type="button" onClick={() => markOne(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.isRead ? '' : 'bg-indigo-50/60 dark:bg-indigo-950/20'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.isRead ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-500'}`} />
                  <span className="min-w-0"><span className="block text-sm font-semibold text-slate-900 dark:text-white">{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.message}</span>{item.createdAt && <span className="mt-1.5 block text-[10px] text-slate-400">{formatNotificationTime(item.createdAt)}</span>}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
