export const CLASS_TYPES = ["Private", "Semi-Private", "Group", "Kids Private", "Kids Semi Private", "blank"];

export const CLASS_LEVELS = [
  "Intensif Pra Guntai", "Intensif N5", "Intensif N4", "Intensif N3", "Intensif N2", 
  "Pra Guntai", "Guntai 1", "Guntai 2", "Guntai 3", "Guntai 4", "Guntai 5", "Guntai 6", 
  "Guntai 7", "Guntai 8", "Guntai 9", "Guntai 10", "Daimyou 1", "Daimyou 2", "Daimyou 3", 
  "Daimyou 4", "Daimyou 5", "Daimyou 6", "Shogun 1", "Shogun 2", "Shogun 3", "Shogun 4", 
  "Shogun 5", "Shogun 6", "Shogun 7", "Shogun 8", "Level 0 Kids", "Level 1 Kids", 
  "Level 2 Kids", "Level 3 Kids", "Level 4 Kids", "Level 5 Kids", "Level 6 Kids", 
  "Level 7 Kids", "Level 8 Kids", "Level 9 Kids", "Level 10 Kids", "Level 11 Kids", 
  "Level 12 Kids", "Level 13 Kids", "Level 14 Kids", "Level 15 Kids", "Level 16 Kids", 
  "Level 17 Kids", "Level 18 Kids", "Custom N5", "Custom N4", "Custom N3", "Custom Kaiwa", 
  "N5", "N4", "N3", "N2", "Custom Intensif N5", "Custom Intensif N4", "Irodori", "blank"
];

export const DAYS_OF_WEEK = [
  { label: 'Senin', value: 1 },
  { label: 'Selasa', value: 2 },
  { label: 'Rabu', value: 3 },
  { label: 'Kamis', value: 4 },
  { label: 'Jumat', value: 5 },
  { label: 'Sabtu', value: 6 },
  { label: 'Minggu', value: 0 }
];

export const TYPE_COLORS: Record<string, string> = {
  "Private": "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "Semi-Private": "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "Group": "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  "Kids Private": "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
  "Kids Semi Private": "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800",
  "blank": "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  "No Show": "bg-red-950 text-white border-red-900 shadow-lg shadow-red-900/20"
};
