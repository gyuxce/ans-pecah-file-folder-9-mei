import type { SupabaseClient } from '@supabase/supabase-js';
import type { SessionLog } from '../types';

const mapSessionLog = (row: Record<string, unknown>): SessionLog => ({
  id: String(row.id),
  scheduleId: String(row.schedule_id),
  senseiId: String(row.sensei_id),
  checkInAt: row.check_in_at ? String(row.check_in_at) : null,
  checkOutAt: row.check_out_at ? String(row.check_out_at) : null,
  status: row.status as SessionLog['status'],
  timezone: row.timezone as SessionLog['timezone'],
  adjustmentStatus: row.adjustment_status as SessionLog['adjustmentStatus'],
  adjustmentNote: row.adjustment_note ? String(row.adjustment_note) : undefined,
  createdAt: String(row.created_at),
  updatedAt: row.updated_at ? String(row.updated_at) : undefined
});

const runClockRpc = async (
  supabase: SupabaseClient,
  functionName: 'clock_in_session' | 'clock_out_session' | 'complete_session_report',
  scheduleId: string
): Promise<SessionLog> => {
  const { data, error } = await supabase.rpc(functionName, { p_schedule_id: scheduleId });
  if (error) throw error;
  if (!data) throw new Error('Session log tidak ditemukan.');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Session log tidak ditemukan.');
  return mapSessionLog(row as Record<string, unknown>);
};

export const clockInSession = (supabase: SupabaseClient, scheduleId: string) => (
  runClockRpc(supabase, 'clock_in_session', scheduleId)
);

export const clockOutSession = (supabase: SupabaseClient, scheduleId: string) => (
  runClockRpc(supabase, 'clock_out_session', scheduleId)
);

export const completeSessionReport = (supabase: SupabaseClient, scheduleId: string) => (
  runClockRpc(supabase, 'complete_session_report', scheduleId)
);
