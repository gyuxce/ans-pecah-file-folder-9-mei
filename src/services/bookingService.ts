import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingRequest } from '../types';

export interface BookingRpcResult {
  success: boolean;
  message: string;
  code?: string;
  status?: BookingRequest['status'];
  booking_request_id?: string;
  schedule_id?: string;
}

export interface SubmitBookingInput {
  studentId: string;
  senseiId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  classType?: string;
  level?: string;
  note?: string;
}

const unwrapRpc = (data: unknown, error: { message: string } | null): BookingRpcResult => {
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') {
    throw new Error('Respons booking dari server tidak valid.');
  }
  return data as BookingRpcResult;
};

export async function submitBookingRequest(
  supabase: SupabaseClient,
  input: SubmitBookingInput
): Promise<BookingRpcResult> {
  const { data, error } = await supabase.rpc('submit_booking_request', {
    p_student_id: input.studentId,
    p_sensei_id: input.senseiId,
    p_availability_id: input.availabilityId,
    p_date: input.date,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_class_type: input.classType || null,
    p_level: input.level || null,
    p_note: input.note || null
  });
  return unwrapRpc(data, error);
}

export async function reviewBookingRequest(
  supabase: SupabaseClient,
  bookingRequestId: string,
  decision: 'approve' | 'reject',
  reviewNote?: string
): Promise<BookingRpcResult> {
  const { data, error } = await supabase.rpc('review_booking_request', {
    p_booking_request_id: bookingRequestId,
    p_decision: decision,
    p_review_note: reviewNote || null
  });
  return unwrapRpc(data, error);
}

export async function findBookingConflicts(
  supabase: SupabaseClient,
  input: Omit<SubmitBookingInput, 'availabilityId' | 'classType' | 'level' | 'note'>,
  excludeBookingRequestId?: string
): Promise<Array<{ conflict_type: string; conflict_message: string }>> {
  const { data, error } = await supabase.rpc('find_booking_conflicts', {
    p_sensei_id: input.senseiId,
    p_student_id: input.studentId,
    p_date: input.date,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
    p_exclude_booking_request_id: excludeBookingRequestId || null
  });
  if (error) throw new Error(error.message);
  return Array.isArray(data) ? data : [];
}
