export interface Sensei {
  id: string;
  name: string;
  note: string;
  no_wa: string;
  email: string;
  level_mengajar: string;
  kelas_tersedia: string;
  senseiLeaveQuota?: number | string;
  timezone?: SenseiTimezone;
}

export type SenseiTimezone = 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura';

export interface Student {
  id: string;
  name: string;
  phone: string;
  level: string;
  type: string;
  sensei_name: string;
  level_awal: string;
  level_sekarang: string;
  durasi_kelas: string;
  sessionQuota?: number | string;
  studentLeaveQuota?: number | string;
  payment_status: 'Lunas' | 'Cicilan' | 'Paid' | 'Unpaid';
  is_active: boolean;
  inactive_reason?: string;
  specialNote?: string;
  examNote?: string;
  adminNote?: string;
  curriculumLevel?: string;
  curriculumUnit?: string;
  curriculumProgress?: string;
  graduateLevel?: string;
  classroom_link?: string;
  chat_link?: string;
  progress_link?: string;
  curriculum_link?: string;
}

export interface LessonTracker {
  id: string;
  scheduleId: string;
  studentId: string;
  senseiId?: string;
  date: string;
  attendance: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'No Show';
  curriculumUnit?: string;
  material: string;
  score: number;
  notes: string;
  caseNotes?: string;
  studentFeedback?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  timeAdjustmentNote?: string;
  timeAdjustmentStatus?: 'None' | 'Pending' | 'Approved' | 'Rejected';
  isDelayed?: boolean;
  createdAt: string;
}

export type SessionLogStatus = 'not_started' | 'in_progress' | 'report_pending' | 'completed';
export type SessionAdjustmentStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface SessionLog {
  id: string;
  scheduleId: string;
  senseiId: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: SessionLogStatus;
  timezone: SenseiTimezone;
  adjustmentStatus: SessionAdjustmentStatus;
  adjustmentNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LeaveRequestType = 'Izin/Cuti' | 'Sakit' | 'Keperluan Pribadi' | 'Training/Meeting' | 'Lainnya';

export interface LeaveRequest {
  id: string;
  senseiId: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveRequestType;
  note?: string;
  status: LeaveRequestStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  source?: 'leave_request' | 'legacy_offday';
  readOnly?: boolean;
}

export interface OffDay {
  id: string;
  senseiId: string;
  date: string; // ISO string
  reason: string;
}

export interface Schedule {
  id: string;
  senseiId: string;
  studentId?: string; // Kept for backward compatibility
  studentIds?: string[]; // Multiple students for Group/SP
  groupId?: string | null; // Group ID for SP/Group classes
  type: string;
  level: string;
  date: string; // ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'active' | 'completed' | 'cancelled';
  updatedAt?: string;
  updatedBy?: string;
  originalSenseiId?: string | null;
  substitutionStatus?: 'requested' | 'assigned' | 'cancelled' | null;
  substitutionRequestedAt?: string | null;
  substitutionRequestedBy?: string | null;
  substitutionAssignedAt?: string | null;
  substitutionAssignedBy?: string | null;
}

export type SenseiTimeBlockStatus = 'available_ans' | 'busy_cakap' | 'busy_personal' | 'off';

export interface SenseiTimeBlock {
  id: string;
  senseiId: string;
  date: string; // ISO string
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: SenseiTimeBlockStatus;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type AppRole = 'Super Admin' | 'Staff' | 'Sensei';

export interface UserProfile {
  id: string;
  email: string;
  role: AppRole;
  status: 'Approved' | 'Pending' | 'Suspended';
  lastLogin?: string;
}

export interface Permissions {
  role: AppRole;
  isApproved: boolean;
  canManageMasterData: boolean;
  canManageSchedules: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewReporting: boolean;
}
