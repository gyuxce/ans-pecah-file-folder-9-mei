import type { LeaveRequest, OffDay, SenseiTimezone } from '../types';
import { splitOffdayReason } from '../constants';

export const DEFAULT_SENSEI_TIMEZONE: SenseiTimezone = 'Asia/Jakarta';

export const SENSEI_TIMEZONE_OPTIONS: Array<{
  value: SenseiTimezone;
  label: string;
  abbreviation: 'WIB' | 'WITA' | 'WIT';
}> = [
  { value: 'Asia/Jakarta', label: 'Waktu Indonesia Barat', abbreviation: 'WIB' },
  { value: 'Asia/Makassar', label: 'Waktu Indonesia Tengah', abbreviation: 'WITA' },
  { value: 'Asia/Jayapura', label: 'Waktu Indonesia Timur', abbreviation: 'WIT' }
];

export const normalizeSenseiTimezone = (timezone?: string | null): SenseiTimezone => {
  return SENSEI_TIMEZONE_OPTIONS.some(option => option.value === timezone)
    ? timezone as SenseiTimezone
    : DEFAULT_SENSEI_TIMEZONE;
};

export const buildLegacyLeaveRequests = (offDays: OffDay[]): LeaveRequest[] => {
  return offDays.map(offDay => {
    const reason = splitOffdayReason(offDay.reason || '');
    const allowedType = ['Izin/Cuti', 'Sakit', 'Keperluan Pribadi', 'Training/Meeting', 'Lainnya'].includes(reason.type)
      ? reason.type as LeaveRequest['leaveType']
      : 'Lainnya';

    return {
      id: `legacy-offday-${offDay.id}`,
      senseiId: offDay.senseiId,
      startDate: offDay.date,
      endDate: offDay.date,
      leaveType: allowedType,
      note: allowedType === 'Lainnya' ? offDay.reason : reason.note,
      status: 'approved',
      submittedAt: `${offDay.date}T00:00:00.000Z`,
      reviewedAt: null,
      reviewedBy: null,
      source: 'legacy_offday',
      readOnly: true
    };
  });
};

export const mergeLeaveRequestsWithLegacy = (
  leaveRequests: LeaveRequest[],
  offDays: OffDay[]
): LeaveRequest[] => {
  const existingApprovedKeys = new Set(
    leaveRequests
      .filter(request => request.status === 'approved')
      .map(request => `${request.senseiId}:${request.startDate}:${request.endDate}`)
  );

  const legacyRequests = buildLegacyLeaveRequests(offDays).filter(request => (
    !existingApprovedKeys.has(`${request.senseiId}:${request.startDate}:${request.endDate}`)
  ));

  return [...leaveRequests, ...legacyRequests];
};
