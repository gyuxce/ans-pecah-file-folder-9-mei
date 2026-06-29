import { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

import type { Sensei, Student } from '../types';
import type { DbOps } from '../store/useAppStore';

type ImportType = 'sensei' | 'student';
type ParsedRow = Record<string, string>;
type ImportPreview = {
  rowNumber: number;
  label: string;
  data?: Record<string, unknown>;
  errors: string[];
};

type Props = {
  type: ImportType;
  senseiList: Sensei[];
  studentList: Student[];
  dbOps: DbOps;
  onClose: () => void;
};

const SENSEI_TEMPLATE = [{
  nama: 'Contoh Sensei',
  email: 'sensei@example.com',
  whatsapp: '081234567890',
  zona_waktu: 'WIB'
}];

const STUDENT_TEMPLATE = [{
  nama: 'Contoh Siswa',
  whatsapp: '081234567890',
  sensei: 'Contoh Sensei',
  tipe_kelas: 'Private',
  level_awal: 'N5',
  status_pembayaran: 'Paid'
}];

const cleanHeader = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const cleanValue = (value: unknown) => String(value ?? '').trim();
const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '');

const pick = (row: ParsedRow, keys: string[]) => {
  for (const key of keys) {
    const value = cleanValue(row[key]);
    if (value) return value;
  }
  return '';
};

const timezoneFromCsv = (value: string) => {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'WITA' || value === 'Asia/Makassar') return 'Asia/Makassar';
  if (normalized === 'WIT' || value === 'Asia/Jayapura') return 'Asia/Jayapura';
  return 'Asia/Jakarta';
};

const paymentFromCsv = (value: string): Student['payment_status'] => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'paid' || normalized === 'sudah bayar') return 'Paid';
  if (normalized === 'lunas') return 'Lunas';
  if (normalized === 'cicilan') return 'Cicilan';
  return 'Unpaid';
};

const downloadCsv = (type: ImportType) => {
  const csv = type === 'sensei'
    ? Papa.unparse(SENSEI_TEMPLATE)
    : Papa.unparse(STUDENT_TEMPLATE);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `template_import_${type}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const BulkImportModal = ({ type, senseiList, studentList, dbOps, onClose }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ImportPreview[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const validRows = useMemo(() => preview.filter(item => item.errors.length === 0 && item.data), [preview]);
  const invalidRows = useMemo(() => preview.filter(item => item.errors.length > 0), [preview]);

  const parseSensei = (rows: ParsedRow[]) => {
    const existingEmails = new Set(senseiList.map(item => item.email?.trim().toLowerCase()).filter(Boolean));
    const existingPhones = new Set(senseiList.map(item => normalizePhone(item.no_wa || '')).filter(Boolean));
    const fileEmails = new Set<string>();
    const filePhones = new Set<string>();

    return rows.map((row, index): ImportPreview => {
      const name = pick(row, ['nama', 'nama_lengkap', 'name']);
      const email = pick(row, ['email']).toLowerCase();
      const phone = normalizePhone(pick(row, ['whatsapp', 'no_whatsapp', 'no_wa', 'wa']));
      const timezone = timezoneFromCsv(pick(row, ['zona_waktu', 'timezone']));
      const errors: string[] = [];

      if (!name) errors.push('Nama wajib diisi.');
      if (!email) errors.push('Email wajib diisi.');
      else if (!/^\S+@\S+\.\S+$/.test(email)) errors.push('Format email tidak valid.');
      else if (existingEmails.has(email) || fileEmails.has(email)) errors.push('Email sudah terdaftar atau duplikat di file.');
      if (!phone) errors.push('WhatsApp wajib diisi.');
      else if (existingPhones.has(phone) || filePhones.has(phone)) errors.push('WhatsApp sudah terdaftar atau duplikat di file.');

      if (email) fileEmails.add(email);
      if (phone) filePhones.add(phone);

      return {
        rowNumber: index + 2,
        label: name || email || `Baris ${index + 2}`,
        errors,
        data: errors.length === 0 ? {
          id: crypto.randomUUID(),
          name,
          email,
          no_wa: phone,
          timezone,
          note: '',
          level_mengajar: '',
          kelas_tersedia: ''
        } : undefined
      };
    });
  };

  const parseStudents = (rows: ParsedRow[]) => {
    const existingPhones = new Set(studentList.map(item => normalizePhone(item.phone || '')).filter(Boolean));
    const filePhones = new Set<string>();
    const senseiByName = new Map(senseiList.map(item => [item.name.trim().toLowerCase(), item]));

    return rows.map((row, index): ImportPreview => {
      const name = pick(row, ['nama', 'nama_lengkap', 'name']);
      const phone = normalizePhone(pick(row, ['whatsapp', 'no_whatsapp', 'phone', 'wa']));
      const senseiInput = pick(row, ['sensei', 'nama_sensei']);
      const sensei = senseiByName.get(senseiInput.toLowerCase());
      const classType = pick(row, ['tipe_kelas', 'kelas', 'type']) || 'Private';
      const initialLevel = pick(row, ['level_awal', 'level']) || 'blank';
      const paymentStatus = paymentFromCsv(pick(row, ['status_pembayaran', 'pembayaran']));
      const errors: string[] = [];

      if (!name) errors.push('Nama wajib diisi.');
      if (!phone) errors.push('WhatsApp wajib diisi.');
      else if (existingPhones.has(phone) || filePhones.has(phone)) errors.push('WhatsApp sudah terdaftar atau duplikat di file.');
      if (!senseiInput) errors.push('Nama sensei wajib diisi.');
      else if (!sensei) errors.push(`Sensei "${senseiInput}" tidak ditemukan.`);

      if (phone) filePhones.add(phone);

      return {
        rowNumber: index + 2,
        label: name || phone || `Baris ${index + 2}`,
        errors,
        data: errors.length === 0 ? {
          id: crypto.randomUUID(),
          name,
          phone,
          sensei_name: sensei?.name || senseiInput,
          type: classType,
          level_awal: initialLevel,
          level_sekarang: initialLevel,
          level: initialLevel,
          payment_status: paymentStatus,
          is_active: true
        } : undefined
      };
    });
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: cleanHeader,
      complete: result => {
        if (result.errors.length > 0 && result.data.length === 0) {
          toast.error('CSV tidak dapat dibaca. Periksa format file.');
          setPreview([]);
          return;
        }
        setPreview(type === 'sensei' ? parseSensei(result.data) : parseStudents(result.data));
      },
      error: () => {
        toast.error('Gagal membaca file CSV.');
        setPreview([]);
      }
    });
  };

  const handleImport = async () => {
    if (validRows.length === 0) return toast.error('Tidak ada baris valid untuk diimpor.');
    setIsSaving(true);
    try {
      await dbOps.bulkSave(type === 'sensei' ? 'sensei' : 'students', validRows.map(item => item.data!));
      toast.success(`${validRows.length} data ${type === 'sensei' ? 'sensei' : 'siswa'} berhasil diimpor.`);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Impor data gagal.');
    } finally {
      setIsSaving(false);
    }
  };

  const title = type === 'sensei' ? 'Impor Sensei' : 'Impor Siswa';

  return (
    <div className="ui-modal-overlay">
      <div className="ui-modal-panel-wide">
        <div className="ui-modal-header">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Input Massal</p>
            <h3 className="ui-modal-title">{title}</h3>
          </div>
          <button onClick={onClose} className="border border-slate-200 p-2 text-slate-500"><X size={18} /></button>
        </div>

        <div className="ui-modal-body space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => downloadCsv(type)} className="flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-indigo-300 hover:text-indigo-600">
              <Download size={17} /> Unduh Template CSV
            </button>
            <button onClick={() => inputRef.current?.click()} className="flex items-center justify-center gap-2 border border-indigo-600 bg-indigo-600 px-4 py-3 text-sm font-black text-white hover:bg-indigo-700">
              <Upload size={17} /> Pilih File CSV
            </button>
            <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={event => handleFile(event.target.files?.[0])} className="hidden" />
          </div>

          {!fileName ? (
            <div className="border border-dashed border-slate-200 p-10 text-center">
              <FileSpreadsheet size={36} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600">Unduh template, isi datanya, lalu unggah kembali.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-xs font-black text-slate-800">{fileName}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">{preview.length} baris terbaca</p>
                </div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={13} /> {validRows.length} valid</span>
                  <span className="inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-black text-rose-700"><AlertCircle size={13} /> {invalidRows.length} bermasalah</span>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200">
                {preview.map(item => (
                  <div key={item.rowNumber} className="flex items-start justify-between gap-4 border-b border-slate-100 px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{item.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400">Baris {item.rowNumber}</p>
                    </div>
                    {item.errors.length === 0 ? (
                      <span className="shrink-0 text-xs font-black text-emerald-600">Siap diimpor</span>
                    ) : (
                      <p className="max-w-sm text-right text-xs font-semibold text-rose-600">{item.errors.join(' ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="ui-modal-footer">
          <button onClick={onClose} className="ui-btn-secondary">Batal</button>
          <button disabled={validRows.length === 0 || isSaving} onClick={handleImport} className="ui-btn-primary disabled:cursor-not-allowed disabled:opacity-50">
            {isSaving ? 'Mengimpor...' : `Impor ${validRows.length} Data Valid`}
          </button>
        </div>
      </div>
    </div>
  );
};
