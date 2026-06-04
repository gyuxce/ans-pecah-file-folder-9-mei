# QC Checklist Dashboard ANS

Checklist ini dipakai setiap selesai update fitur, bug fix, SQL/RLS, atau optimasi performa. Tujuannya supaya pengecekan tidak acak dan hasilnya bisa diulang oleh developer maupun non-developer.

## 1. Smoke Test

Status lulus: aplikasi bisa dibuka, login berhasil, dan tidak ada halaman blank.

- [ ] Jalankan `npm run lint`
- [ ] Jalankan `npm run build`
- [ ] Buka dashboard di browser
- [ ] Login dengan akun Supabase yang valid
- [ ] Pastikan sidebar dan menu utama muncul
- [ ] Cek browser console, tidak ada error merah yang berulang

## 2. Alur Utama

Status lulus: fitur operasional harian bisa dipakai dari awal sampai akhir.

- [ ] Tambah student baru
- [ ] Edit data student
- [ ] Tambah sensei baru
- [ ] Tambah group atau semi-private
- [ ] Tambah schedule private
- [ ] Tambah schedule group/semi-private
- [ ] Buka Kalender Jadwal dan cek schedule muncul di tanggal/sensei yang benar
- [ ] Start lesson dari menu Operasional Mengajar
- [ ] Isi Lesson Tracker
- [ ] Edit riwayat Lesson Tracker
- [ ] Export CSV dari Master Data
- [ ] Export CSV dari Rekap Absensi

## 3. Supabase Dan Realtime

Status lulus: data tersimpan di Supabase dan update realtime masuk tanpa refresh manual.

- [ ] Tambah data dari browser pertama
- [ ] Buka browser kedua dengan akun lain
- [ ] Pastikan data baru muncul realtime
- [ ] Edit data dari browser kedua
- [ ] Pastikan browser pertama ikut update
- [ ] Hapus data test jika diperlukan
- [ ] Cek role Staff tidak bisa akses fitur admin-only
- [ ] Cek role Sensei hanya melihat data yang sesuai aksesnya

## 4. Security Dan RLS

Status lulus: user hanya bisa melihat/mengubah data sesuai policy.

- [ ] SQL policy bisa dijalankan tanpa error
- [ ] `profiles.id` dan `auth.uid()` tidak bentrok tipe data
- [ ] Staff tidak bisa manage user approval
- [ ] Sensei tidak bisa manage master data yang bukan haknya
- [ ] Data sensitif seperti nomor HP tetap dimasking untuk non-super-admin
- [ ] Tidak ada Supabase key rahasia di kode frontend

## 5. Data Integrity

Status lulus: tidak ada data yatim, double, atau tidak sinkron antar tabel.

- [ ] Schedule punya `senseiId` yang valid
- [ ] Schedule private punya minimal satu student
- [ ] Schedule group punya `groupId` yang valid
- [ ] Lesson tracker punya `scheduleId` yang valid jika berasal dari schedule
- [ ] Student inactive tidak menyebabkan crash di Kalender/Master Data
- [ ] Group tanpa member tidak menyebabkan crash
- [ ] Export CSV tetap aman saat field kosong

## 6. Performance

Status lulus: menu utama terasa responsif dengan data normal maupun data banyak.

- [ ] Kalender Jadwal terbuka tanpa delay berat
- [ ] Ganti week/month di Kalender tidak patah-patah
- [ ] Operasional Mengajar tidak lambat saat schedule banyak
- [ ] Lesson Tracker modal tetap ringan saat history panjang
- [ ] Master Data search dan pagination responsif
- [ ] Dashboard analytics tidak freeze saat data tracker/schedule banyak
- [ ] Hindari animasi per-item pada list besar
- [ ] Hindari `find/filter/map` besar berulang di dalam render loop

## 7. Mobile UI

Status lulus: fitur penting tetap nyaman dipakai di layar kecil.

- [ ] Sidebar bisa dibuka/tutup
- [ ] Schedule modal tidak kepotong
- [ ] Tombol Save tetap mudah dijangkau
- [ ] Dropdown student/sensei/group tidak ketutup footer modal
- [ ] Master Data modal bisa discroll dengan nyaman
- [ ] Tabel besar masih bisa horizontal scroll
- [ ] Toast sukses/error tetap terlihat

## 8. UX Feedback

Status lulus: user selalu tahu proses berhasil, gagal, atau sedang loading.

- [ ] Loading state muncul saat data awal dimuat
- [ ] Empty state jelas saat data kosong
- [ ] Save menampilkan toast sukses/gagal
- [ ] Export CSV meminta konfirmasi sebelum download
- [ ] Setelah CSV terdownload muncul toast sukses
- [ ] Tombol save/export tidak bisa diklik berulang saat proses berjalan
- [ ] Error Supabase ditampilkan dengan pesan yang bisa dimengerti

## 9. Regression Check

Status lulus: update baru tidak merusak fitur lama.

- [ ] Fitur yang baru diubah sudah dites ulang
- [ ] Alur utama dari bagian 2 tetap normal
- [ ] Tidak ada perubahan file di luar scope update
- [ ] `git status --short` bersih setelah commit
- [ ] Commit message menjelaskan update dengan jelas

## Format Catatan QC

Gunakan format ini saat menemukan bug atau masalah performa:

```text
Area:
Temuan:
Dampak:
Prioritas: High / Medium / Low
Saran Fix:
Status: Open / Fixed / Need Retest
```

Contoh:

```text
Area: Kalender Jadwal
Temuan: UI terasa berat saat membuka month view karena render grid besar dan animasi per kartu.
Dampak: User merasa dashboard lambat saat data schedule banyak.
Prioritas: High
Saran Fix: Kurangi animasi per item, cache tanggal, index schedule per sensei dan date.
Status: Fixed
```
