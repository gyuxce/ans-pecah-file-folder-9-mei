import { useCallback } from 'react';

import { useAppContext } from '../context/AppContext';
import type { SessionLog } from '../types';
import { clockInSession, clockOutSession, completeSessionReport } from '../utils/sessionClock';

export const useSessionClock = () => {
  const { supabase, setSessionLogs } = useAppContext(state => ({
    supabase: state.supabase,
    setSessionLogs: state.setSessionLogs
  }));

  const upsertLog = useCallback((log: SessionLog) => {
    setSessionLogs(previous => {
      const exists = previous.some(item => item.id === log.id || item.scheduleId === log.scheduleId);
      if (!exists) return [...previous, log];
      return previous.map(item => (
        item.id === log.id || item.scheduleId === log.scheduleId ? log : item
      ));
    });
    return log;
  }, [setSessionLogs]);

  const clockIn = useCallback(async (scheduleId: string) => {
    if (!supabase) throw new Error('Database belum siap.');
    return upsertLog(await clockInSession(supabase, scheduleId));
  }, [supabase, upsertLog]);

  const clockOut = useCallback(async (scheduleId: string) => {
    if (!supabase) throw new Error('Database belum siap.');
    return upsertLog(await clockOutSession(supabase, scheduleId));
  }, [supabase, upsertLog]);

  const completeReport = useCallback(async (scheduleId: string) => {
    if (!supabase) throw new Error('Database belum siap.');
    return upsertLog(await completeSessionReport(supabase, scheduleId));
  }, [supabase, upsertLog]);

  return { clockIn, clockOut, completeReport };
};
