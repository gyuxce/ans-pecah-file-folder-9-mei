import type { LeaveRequest, LessonTracker, OffDay, Schedule, Sensei, SessionLog, Student } from '../types';
import { getScheduleStudentIds, getValidAcademicScore } from './helpers';
import type { ExcelSheet } from './excelExport';

type GroupRecord = { id: string; name: string; studentIds?: string[] };

type ReportInput = {
  studentList: Student[];
  senseiList: Sensei[];
  groupList: GroupRecord[];
  schedules: Schedule[];
  lessonTrackers: LessonTracker[];
  sessionLogs: SessionLog[];
  offDays: OffDay[];
  leaveRequests: LeaveRequest[];
  selectedStudentIds?: Set<string>;
  selectedSenseiIds?: Set<string>;
  revealPhoneNumbers: boolean;
};

const maskPhone = (phone: string) => phone ? `${phone.slice(0, 4)}*****` : '';

export const buildOperationalReport = (input: ReportInput): ExcelSheet[] => {
  const {
    studentList,
    senseiList,
    groupList,
    schedules,
    lessonTrackers,
    sessionLogs,
    offDays,
    leaveRequests,
    selectedStudentIds,
    selectedSenseiIds,
    revealPhoneNumbers
  } = input;

  const allStudentById = new Map(studentList.map(student => [student.id, student]));
  const allSenseiById = new Map(senseiList.map(sensei => [sensei.id, sensei]));
  const groupById = new Map(groupList.map(group => [group.id, group]));

  const scheduleMatches = (schedule: Schedule) => {
    if (selectedSenseiIds && !selectedSenseiIds.has(schedule.senseiId) && !selectedSenseiIds.has(schedule.originalSenseiId || '')) return false;
    if (selectedStudentIds && !getScheduleStudentIds(schedule).some(id => selectedStudentIds.has(id))) return false;
    return true;
  };
  const selectedSchedules = schedules.filter(scheduleMatches);
  const scheduleIds = new Set(selectedSchedules.map(schedule => schedule.id));
  const scheduledStudentIds = new Set(selectedSchedules.flatMap(getScheduleStudentIds));
  const selectedSenseiNames = new Set(senseiList.filter(sensei => selectedSenseiIds?.has(sensei.id)).map(sensei => sensei.name));

  const selectedStudents = studentList.filter(student => {
    if (selectedStudentIds) return selectedStudentIds.has(student.id);
    if (selectedSenseiIds) return scheduledStudentIds.has(student.id) || selectedSenseiNames.has(student.sensei_name);
    return true;
  });
  const selectedStudentIdSet = new Set(selectedStudents.map(student => student.id));
  const studentSenseiNames = new Set(selectedStudents.map(student => student.sensei_name).filter(Boolean));
  const scheduledSenseiIds = new Set(selectedSchedules.flatMap(schedule => [schedule.senseiId, schedule.originalSenseiId || '']).filter(Boolean));
  const selectedSensei = senseiList.filter(sensei => {
    if (selectedSenseiIds) return selectedSenseiIds.has(sensei.id);
    if (selectedStudentIds) return scheduledSenseiIds.has(sensei.id) || studentSenseiNames.has(sensei.name);
    return true;
  });
  const selectedSenseiIdSet = new Set(selectedSensei.map(sensei => sensei.id));
  const selectedTrackers = lessonTrackers.filter(tracker => (
    selectedStudentIdSet.has(tracker.studentId)
    && (!selectedStudentIds && !selectedSenseiIds || scheduleIds.has(tracker.scheduleId) || selectedStudentIds?.has(tracker.studentId))
  ));
  const trackersByStudent = new Map<string, LessonTracker[]>();
  selectedTrackers.forEach(tracker => trackersByStudent.set(tracker.studentId, [...(trackersByStudent.get(tracker.studentId) || []), tracker]));
  const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
  const sessionLogBySchedule = new Map(sessionLogs.map(log => [log.scheduleId, log]));

  const studentRows = selectedStudents.map(student => {
    const trackers = trackersByStudent.get(student.id) || [];
    const validScores = trackers.map(getValidAcademicScore).filter((score): score is number => score !== null);
    const studentSchedules = selectedSchedules.filter(schedule => getScheduleStudentIds(schedule).includes(student.id));
    const latestSchedule = [...studentSchedules].sort((a, b) => b.date.localeCompare(a.date))[0];
    return {
      'ID Siswa': student.id,
      'Nama Siswa': student.name,
      'WhatsApp': revealPhoneNumbers ? student.phone : maskPhone(student.phone),
      'Status': student.is_active === false ? 'Nonaktif' : 'Aktif',
      'Sensei Utama': student.sensei_name || '',
      'Tipe Kelas': student.type || '',
      'Durasi Kelas': student.durasi_kelas || '',
      'Level Awal': student.level_awal || '',
      'Level Sekarang': student.level_sekarang || student.level || '',
      'Level Kurikulum': student.curriculumLevel || '',
      'Unit / Bab': student.curriculumUnit || '',
      'Progress Kurikulum': student.curriculumProgress || '',
      'Target Graduate': student.graduateLevel || '',
      'Total Tracker': trackers.length,
      'Hadir': trackers.filter(item => item.attendance === 'Hadir').length,
      'Izin / Sakit': trackers.filter(item => item.attendance === 'Izin' || item.attendance === 'Sakit').length,
      'No Show / Alpa': trackers.filter(item => item.attendance === 'No Show' || item.attendance === 'Alpa').length,
      'Rata-rata Nilai': validScores.length ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1)) : '',
      'Pembayaran': student.payment_status || '',
      'Jadwal Terakhir': latestSchedule?.date || '',
      'Alasan Nonaktif': student.inactive_reason || '',
      'Google Classroom': student.classroom_link || '',
      'Google Chat Space': student.chat_link || '',
      'Progress Google Sheets': student.progress_link || '',
      'Curriculum Google Sheets': student.curriculum_link || ''
    };
  });

  const senseiRows = selectedSensei.map(sensei => {
    const senseiSchedules = selectedSchedules.filter(schedule => schedule.senseiId === sensei.id || schedule.originalSenseiId === sensei.id);
    const senseiScheduleIds = new Set(senseiSchedules.map(schedule => schedule.id));
    const completedTrackers = selectedTrackers.filter(tracker => tracker.senseiId === sensei.id || senseiScheduleIds.has(tracker.scheduleId));
    const activeStudentIds = new Set(senseiSchedules.flatMap(getScheduleStudentIds).filter(id => allStudentById.get(id)?.is_active !== false));
    const logs = sessionLogs.filter(log => senseiScheduleIds.has(log.scheduleId));
    return {
      'ID Sensei': sensei.id,
      'Nama Sensei': sensei.name,
      'Email': sensei.email || '',
      'WhatsApp': revealPhoneNumbers ? sensei.no_wa : maskPhone(sensei.no_wa),
      'Zona Waktu': sensei.timezone === 'Asia/Makassar' ? 'WITA' : sensei.timezone === 'Asia/Jayapura' ? 'WIT' : 'WIB',
      'Level Mengajar': sensei.level_mengajar || '',
      'Kelas Tersedia': sensei.kelas_tersedia || '',
      'Siswa Aktif': activeStudentIds.size,
      'Total Jadwal': senseiSchedules.length,
      'Tracker Selesai': completedTrackers.filter(tracker => Boolean(tracker.material)).length,
      'Laporan Belum Diisi': logs.filter(log => log.status === 'report_pending').length,
      'Sebagai Pengganti': senseiSchedules.filter(schedule => schedule.substitutionStatus === 'assigned' && schedule.senseiId === sensei.id).length,
      'Hari Libur Tercatat': offDays.filter(day => day.senseiId === sensei.id).length
    };
  });

  const sessionRows = selectedTrackers.map(tracker => {
    const schedule = scheduleById.get(tracker.scheduleId);
    const student = allStudentById.get(tracker.studentId);
    const log = sessionLogBySchedule.get(tracker.scheduleId);
    const plannedSensei = schedule ? allSenseiById.get(schedule.originalSenseiId || schedule.senseiId) : undefined;
    const actualSensei = allSenseiById.get(tracker.senseiId || schedule?.senseiId || '');
    return {
      'ID Tracker': tracker.id,
      'Tanggal': tracker.date,
      'Jam Jadwal': schedule ? `${schedule.startTime}-${schedule.endTime}` : '',
      'Clock-in': log?.checkInAt || tracker.actualStartTime || '',
      'Clock-out': log?.checkOutAt || tracker.actualEndTime || '',
      'Zona Waktu': log?.timezone || '',
      'Sensei Terjadwal': plannedSensei?.name || '',
      'Sensei Mengajar': actualSensei?.name || schedule?.substitutionSenseiName || '',
      'Siswa': student?.name || '',
      'Grup / SP': schedule?.groupId ? groupById.get(schedule.groupId)?.name || '' : '',
      'Kehadiran': tracker.attendance,
      'Nilai': getValidAcademicScore(tracker) ?? '',
      'Unit Kurikulum': tracker.curriculumUnit || '',
      'Materi': tracker.material || '',
      'Ringkasan Pembelajaran': tracker.notes || '',
      'Catatan Internal': tracker.caseNotes || '',
      'Feedback Siswa': tracker.studentFeedback || ''
    };
  });

  const scheduleRows = selectedSchedules.map(schedule => ({
    'ID Jadwal': schedule.id,
    'Tanggal': schedule.date,
    'Mulai': schedule.startTime,
    'Selesai': schedule.endTime,
    'Sensei': allSenseiById.get(schedule.senseiId)?.name || schedule.substitutionSenseiName || '',
    'Sensei Asal': schedule.originalSenseiId ? allSenseiById.get(schedule.originalSenseiId)?.name || '' : '',
    'Peserta': getScheduleStudentIds(schedule).map(id => allStudentById.get(id)?.name || id).join(', '),
    'Grup / SP': schedule.groupId ? groupById.get(schedule.groupId)?.name || '' : '',
    'Tipe Kelas': schedule.type,
    'Level': schedule.level,
    'Status Jadwal': schedule.status,
    'Status Pengganti': schedule.substitutionStatus || '',
    'Nama Pengganti': schedule.substitutionSenseiName || '',
    'Diperbarui Oleh': schedule.updatedBy || ''
  }));

  const requestRows: Array<Record<string, unknown>> = [
    ...leaveRequests
      .filter(request => !selectedSenseiIds || selectedSenseiIds.has(request.senseiId))
      .map(request => ({
        'Jenis Permintaan': 'Libur / Cuti',
        'Sensei': allSenseiById.get(request.senseiId)?.name || '',
        'Tanggal Mulai': request.startDate,
        'Tanggal Selesai': request.endDate,
        'Detail': request.leaveType,
        'Catatan': request.note || '',
        'Status': request.status,
        'Diajukan': request.submittedAt,
        'Diproses Oleh': request.reviewedBy || ''
      })),
    ...selectedSchedules
      .filter(schedule => Boolean(schedule.substitutionStatus))
      .map(schedule => ({
        'Jenis Permintaan': 'Pengganti Sensei',
        'Sensei': allSenseiById.get(schedule.originalSenseiId || schedule.senseiId)?.name || '',
        'Tanggal Mulai': schedule.date,
        'Tanggal Selesai': schedule.date,
        'Detail': `${schedule.startTime}-${schedule.endTime}`,
        'Catatan': schedule.substitutionSenseiName ? `Pengganti: ${schedule.substitutionSenseiName}` : '',
        'Status': schedule.substitutionStatus || '',
        'Diajukan': schedule.substitutionRequestedAt || '',
        'Diproses Oleh': schedule.substitutionAssignedBy || ''
      }))
  ];

  const summaryRows = [
    { 'Metrik': 'Tanggal Ekspor', 'Nilai': new Date().toISOString() },
    { 'Metrik': 'Siswa', 'Nilai': selectedStudents.length },
    { 'Metrik': 'Siswa Aktif', 'Nilai': selectedStudents.filter(student => student.is_active !== false).length },
    { 'Metrik': 'Sensei', 'Nilai': selectedSensei.length },
    { 'Metrik': 'Jadwal', 'Nilai': selectedSchedules.length },
    { 'Metrik': 'Tracker Sesi', 'Nilai': selectedTrackers.length },
    { 'Metrik': 'Laporan Belum Diisi', 'Nilai': sessionLogs.filter(log => scheduleIds.has(log.scheduleId) && log.status === 'report_pending').length },
    { 'Metrik': 'Permintaan Pending', 'Nilai': requestRows.filter(row => String(row.Status).toLowerCase() === 'pending' || String(row.Status).toLowerCase() === 'requested').length }
  ];

  return [
    { name: 'Ringkasan', rows: summaryRows },
    { name: 'Data Siswa', rows: studentRows },
    { name: 'Data Sensei', rows: senseiRows },
    { name: 'Riwayat Sesi', rows: sessionRows },
    { name: 'Jadwal', rows: scheduleRows },
    { name: 'Permintaan', rows: requestRows }
  ];
};
