import { BookOpen, CheckCircle2, ClipboardList, Search, UserCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getScheduleStudentIds } from '../utils/helpers';

import { LessonTracker, Student } from '../types';
import { useAppContext } from '../context/AppContext';
import { getValidAcademicScore } from '../utils/helpers';

type StudentSummary = {
  student: Student;
  sessions: number;
  present: number;
  izin: number;
  noShow: number;
  averageScore: number | null;
  lastTracker: LessonTracker | null;
};

export const SenseiStudentsView = () => {
  const {
    studentList,
    schedules,
    lessonTrackers,
    setSelectedTrackerStudent,
    setShowTrackerModal,
    setSelectedResourceStudent,
    setShowResourceHub
  } = useAppContext(state => ({
    studentList: state.scopedStudentList,
    schedules: state.scopedSchedules,
    lessonTrackers: state.scopedLessonTrackers,
    setSelectedTrackerStudent: state.setSelectedTrackerStudent,
    setShowTrackerModal: state.setShowTrackerModal,
    setSelectedResourceStudent: state.setSelectedResourceStudent,
    setShowResourceHub: state.setShowResourceHub
  }));

  const [searchTerm, setSearchTerm] = useState('');

  const studentSummaries = useMemo<StudentSummary[]>(() => {
    const scheduledStudentIds = new Set<string>();
    schedules.forEach(schedule => {
      const ids = getScheduleStudentIds(schedule);
      ids.forEach(id => scheduledStudentIds.add(id));
    });

    const trackerByStudentId = new Map<string, LessonTracker[]>();
    lessonTrackers.forEach(tracker => {
      if (!tracker.studentId) return;
      const trackers = trackerByStudentId.get(tracker.studentId) || [];
      trackers.push(tracker);
      trackerByStudentId.set(tracker.studentId, trackers);
      scheduledStudentIds.add(tracker.studentId);
    });

    return studentList
      .map(student => {
        const trackers = [...(trackerByStudentId.get(student.id) || [])]
          .sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
        const validScores = trackers
          .map(tracker => getValidAcademicScore(tracker))
          .filter((score): score is number => score !== null);

        return {
          student,
          sessions: trackers.length,
          present: trackers.filter(tracker => tracker.attendance === 'Hadir').length,
          izin: trackers.filter(tracker => tracker.attendance === 'Izin' || tracker.attendance === 'Sakit').length,
          noShow: trackers.filter(tracker => tracker.attendance === 'No Show' || tracker.attendance === 'Alpa').length,
          averageScore: validScores.length ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1)) : null,
          lastTracker: trackers[0] || null
        };
      })
      .sort((a, b) => {
        if (a.student.is_active === false && b.student.is_active !== false) return 1;
        if (a.student.is_active !== false && b.student.is_active === false) return -1;
        return a.student.name.localeCompare(b.student.name);
      });
  }, [lessonTrackers, schedules, studentList]);

  const filteredStudents = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return studentSummaries;
    return studentSummaries.filter(item => (
      item.student.name.toLowerCase().includes(keyword) ||
      (item.student.level_sekarang || item.student.level || '').toLowerCase().includes(keyword) ||
      (item.lastTracker?.material || '').toLowerCase().includes(keyword)
    ));
  }, [searchTerm, studentSummaries]);

  const activeStudents = studentSummaries.filter(item => item.student.is_active !== false).length;
  const averageScore = useMemo(() => {
    const scores = studentSummaries
      .map(item => item.averageScore)
      .filter((score): score is number => score !== null);
    return scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : 'N/A';
  }, [studentSummaries]);
  const totalSessions = studentSummaries.reduce((sum, item) => sum + item.sessions, 0);

  const openStudentTracker = (student: Student) => {
    setSelectedTrackerStudent(student);
    setShowTrackerModal(true);
  };

  const openLearningLinks = (student: Student) => {
    setSelectedResourceStudent(student);
    setShowResourceHub(true);
  };

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Murid Saya</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">Progress murid yang pernah atau sedang diajar.</h2>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              Buka link belajar atau detail progress dari satu tempat.
            </p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              className="ui-input pl-10"
              placeholder="Cari murid / level / materi..."
            />
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <SenseiStudentMetric icon={<UserCheck size={18} />} label="Murid Aktif" value={activeStudents} tone="emerald" />
        <SenseiStudentMetric icon={<ClipboardList size={18} />} label="Tracker Tercatat" value={totalSessions} tone="indigo" />
        <SenseiStudentMetric icon={<CheckCircle2 size={18} />} label="Avg Nilai" value={averageScore} tone="amber" />
      </div>

      {filteredStudents.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <BookOpen size={34} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Belum ada murid yang cocok.</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Murid akan muncul setelah ada jadwal atau lesson tracker.</p>
        </section>
      ) : (
        <section className="grid gap-3 lg:grid-cols-2">
          {filteredStudents.map(item => (
            <article key={item.student.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">{item.student.name}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      item.student.is_active === false
                        ? 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                    }`}>
                      {item.student.is_active === false ? 'Nonaktif' : 'Aktif'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {item.student.level_awal || '-'} ke {item.student.level_sekarang || item.student.level || '-'} / {item.student.type || '-'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={!(item.student.classroom_link || item.student.chat_link || item.student.progress_link || item.student.curriculum_link)}
                    onClick={() => openLearningLinks(item.student)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                    title="Buka Google Classroom, Chat, Progress, dan Kurikulum"
                  >
                    <BookOpen size={14} />
                    {item.student.classroom_link || item.student.chat_link || item.student.progress_link || item.student.curriculum_link ? 'Link Belajar' : 'Link Belum Diisi'}
                  </button>
                  <button
                    onClick={() => openStudentTracker(item.student)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    Detail
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <MiniBox label="Sesi" value={item.sessions} />
                <MiniBox label="Hadir" value={item.present} />
                <MiniBox label="Izin" value={item.izin} />
                <MiniBox label="Nilai" value={item.averageScore ?? 'N/A'} />
              </div>

              <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="text-xs font-semibold text-slate-500">Progress terakhir</p>
                {item.lastTracker ? (
                  <>
                    <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">{item.lastTracker.material || 'Materi belum diisi'}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {item.lastTracker.date} / {item.lastTracker.attendance}
                      {item.lastTracker.curriculumUnit ? ` / ${item.lastTracker.curriculumUnit}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm font-bold text-slate-400">Belum ada tracker.</p>
                )}
              </div>

            </article>
          ))}
        </section>
      )}
    </div>
  );
};

const SenseiStudentMetric = ({
  icon,
  label,
  value,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: 'emerald' | 'indigo' | 'amber';
}) => {
  const toneClass = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300',
    amber: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
  }[tone];

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">{label}</p>
        {icon}
      </div>
      <p className="mt-4 text-3xl font-bold leading-none">{value}</p>
    </div>
  );
};

const MiniBox = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-2 text-center dark:border-slate-800 dark:bg-slate-950/40">
    <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    <p className="mt-1 text-[10px] font-semibold text-slate-400">{label}</p>
  </div>
);
