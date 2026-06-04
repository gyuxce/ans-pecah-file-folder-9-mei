import { Schedule } from '../types';

export const fetchFromGAS = async (url: string) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error('Error fetching from GAS:', error);
    return null;
  }
};

export const pushToGAS = async (url: string, sheetName: string, data: any[]) => {
  if (!url) return false;
  try {
    // We use text/plain to avoid CORS preflight issues with GAS
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({ sheetName, data }),
    });
    return true;
  } catch (error) {
    console.error(`Error pushing ${sheetName} to GAS:`, error);
    return false;
  }
};

const csvEscape = (value: unknown) => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportToCsv = (data: any[], fileName: string) => {
  const downloadName = `${fileName}.csv`;
  const headers: string[] = Array.from(
    data.reduce<Set<string>>((keys, row) => {
      Object.keys(row || {}).forEach(key => keys.add(key));
      return keys;
    }, new Set<string>())
  );

  const rows = [
    headers.map(csvEscape).join(','),
    ...data.map(row => headers.map(header => csvEscape(row?.[header])).join(','))
  ];

  const blob = new Blob([`\uFEFF${rows.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return downloadName;
};

export const scheduleHasStudent = (s: Schedule, studentId: string): boolean => {
  if (s.studentIds && s.studentIds.length > 0) return s.studentIds.includes(studentId);
  return s.studentId === studentId;
};
