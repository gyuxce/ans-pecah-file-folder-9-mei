import { Check, Clock3, Loader2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useAppContext } from '../context/AppContext';
import type { LeaveRequest } from '../types';

const mapLeaveRequest = (row: any): LeaveRequest => ({
  id: String(row.id),
  senseiId: String(row.sensei_id),
  startDate: String(row.start_date),
  endDate: String(row.end_date),
  leaveType: row.leave_type,
  note: row.note || '',
  status: row.status,
  submittedAt: String(row.submitted_at),
  reviewedAt: row.reviewed_at || null,
  reviewedBy: row.reviewed_by || null,
  source: 'leave_request'
});

export const LeaveRequestReviewPanel = () => {
  const { leaveRequests, senseiList, offDays, supabase, setLeaveRequests } = useAppContext(state => ({
    leaveRequests: state.leaveRequests,
    senseiList: state.senseiList,
    offDays: state.offDays,
    supabase: state.supabase,
    setLeaveRequests: state.setLeaveRequests
  }));
  const [processingId, setProcessingId] = useState<string | null>(null);

  const senseiById = useMemo(
    () => new Map(senseiList.map(sensei => [sensei.id, sensei])),
    [senseiList]
  );
  const pendingRequests = useMemo(
    () => leaveRequests
      .filter(request => request.status === 'pending')
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)),
    [leaveRequests]
  );

  const reviewRequest = async (request: LeaveRequest, status: 'approved' | 'rejected') => {
    if (!supabase || processingId) return;
    setProcessingId(request.id);
    try {
      const { data, error } = await supabase.rpc('review_leave_request', {
        p_request_id: request.id,
        p_status: status
      });
      if (error) throw error;
      const updated = mapLeaveRequest(Array.isArray(data) ? data[0] : data);
      setLeaveRequests(previous => previous.map(item => item.id === updated.id ? updated : item));
      toast.success(status === 'approved'
        ? 'Pengajuan disetujui dan masuk ke Hari Libur.'
        : 'Pengajuan ditolak.');
    } catch (error: any) {
      toast.error(error?.message || 'Gagal memproses pengajuan.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mb-4 border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-indigo-600">Pengajuan Sensei</p>
          <h3 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">Menunggu Persetujuan</h3>
        </div>
        <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-black text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          {pendingRequests.length}
        </span>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-5 text-sm font-semibold text-slate-400">
          <Clock3 size={16} /> Tidak ada pengajuan yang perlu diproses.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {pendingRequests.map(request => {
            const sensei = senseiById.get(request.senseiId);
            const usedQuota = offDays.filter(day => day.senseiId === request.senseiId).length;
            const quota = Number(sensei?.senseiLeaveQuota) || 4;
            return (
              <div key={request.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_auto] md:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{sensei?.name || 'Sensei tidak ditemukan'}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">Kuota terpakai {usedQuota}/{quota}</p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {request.startDate}{request.endDate !== request.startDate ? ` s/d ${request.endDate}` : ''} · {request.leaveType}
                  </p>
                  {request.note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{request.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={processingId === request.id}
                    onClick={() => reviewRequest(request, 'rejected')}
                    className="inline-flex h-9 items-center gap-1.5 border border-rose-200 px-3 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300"
                  >
                    {processingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Tolak
                  </button>
                  <button
                    disabled={processingId === request.id}
                    onClick={() => reviewRequest(request, 'approved')}
                    className="inline-flex h-9 items-center gap-1.5 bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processingId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Setujui
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
