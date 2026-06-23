export interface Sensei {
  id: string;
  name: string;
  note: string;
  no_wa: string;
  email: string;
  level_mengajar: string;
  kelas_tersedia: string;
}

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
  payment_status: 'Lunas' | 'Cicilan' | 'Paid' | 'Unpaid';
  is_active: boolean;
  inactive_reason?: string;
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
  isDelayed?: boolean;
  createdAt: string;
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
