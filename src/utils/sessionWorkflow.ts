import type { LessonTracker, SessionLog } from '../types';

export type SessionWorkflowState = 'ready' | 'in_progress' | 'report_pending' | 'completed';

export const getSessionWorkflowState = (
  log: SessionLog | undefined,
  trackers: LessonTracker[],
  expectedTrackerCount: number
): SessionWorkflowState => {
  if (log?.status === 'completed') return 'completed';
  if (log?.status === 'report_pending') return 'report_pending';
  if (log?.status === 'in_progress') return 'in_progress';

  const completedTrackers = trackers.filter(tracker => Boolean(tracker.material)).length;
  if (completedTrackers >= Math.max(1, expectedTrackerCount)) return 'completed';
  if (trackers.length > 0) return 'report_pending';
  return 'ready';
};

export const getSessionWorkflowLabel = (state: SessionWorkflowState): string => ({
  ready: 'Belum mulai',
  in_progress: 'Sedang berjalan',
  report_pending: 'Laporan belum diisi',
  completed: 'Selesai'
}[state]);
