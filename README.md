# ANS Schedule Dashboard

## Overview
Dashboard tracking guru dan murid untuk LPK ANS. Fitur utama: master data sensei dan student, jadwal kelas mingguan/bulanan, lesson tracker untuk absensi dan progres, reporting analytics, data grup/semi-private, resource hub siswa, serta sinkronisasi opsional ke Google Sheets via Apps Script.

## Tech Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Supabase untuk auth dan database
- Recharts untuk chart
- Motion untuk animasi
- Sonner untuk toast notification
- date-fns untuk date handling
- xlsx untuk export Excel

## Prerequisites
- Node.js 18 atau lebih baru
- Akun Supabase
- Optional: Google Apps Script URL untuk sync ke Sheets

## Setup

1. Clone atau download repo ini, lalu masuk ke folder project.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` menjadi `.env.local`.
4. Isi value di `.env.local`:
   - `VITE_SUPABASE_URL`: Supabase dashboard -> Project Settings -> API -> Project URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase dashboard -> Project Settings -> API -> anon public key
5. Untuk project Supabase baru, jalankan `schema.sql` di Supabase SQL Editor.
6. Untuk project Supabase lama yang sudah punya tabel utama, jalankan `supabase_updates.sql`.
7. Jalankan development server:
   ```bash
   npm run dev
   ```
   Aplikasi akan jalan di http://localhost:3000
8. Untuk production build:
   ```bash
   npm run build
   ```

## Features
- Authentication via Supabase
- Role akses: `Super Admin`, `Staff`, dan `Sensei`
- Approval user oleh Super Admin sebelum dashboard bisa dipakai
- Master data sensei dengan info kontak, level mengajar, dan kelas tersedia
- Master data student dengan status aktif/inactive, alasan inactive, payment, dan link resource
- Data grup/semi-private dengan multi siswa
- Kalender jadwal dengan view week/month
- Schedule builder dengan deteksi bentrok dan off day sensei
- Lesson tracker untuk absensi, materi, score, catatan kasus, feedback siswa, dan keterlambatan sesi
- Reporting dashboard untuk workload sensei, tren kelas, pembayaran, dan alasan siswa inactive
- Smart Checker untuk validasi konflik jadwal
- Export data ke Excel
- Dark mode
- Sync opsional ke Google Sheets
- Audit log untuk perubahan data penting

## Project Structure
```text
|-- src/
|   |-- components/
|   |-- App.tsx
|   |-- main.tsx
|   |-- index.css
|   `-- vite-env.d.ts
|-- .env.example
|-- package.json
|-- schema.sql
|-- supabase_updates.sql
|-- tsconfig.json
`-- vite.config.ts
```

## Admin Access
Email super admin dapat dilihat di `src/App.tsx` pada constant `ADMIN_EMAILS`. Super admin punya akses ke Sync Settings dan User Management.

## License
Internal use only - ANS.
