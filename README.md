# EduSmart

Platform pendidikan terintegrasi: LMS (kelas, materi, tugas, kuis otomatis), sistem informasi sekolah (siswa, guru, kelas, nilai), dan analisis data pendidikan.

**Stack:** React + Vite + Tailwind + Recharts · Node.js + Express · Supabase (PostgreSQL + Auth)

## Peran dan fitur

| Peran | Bisa melakukan |
|---|---|
| Siswa | Gabung kelas (kode/daftar), baca materi, kumpulkan tugas, kerjakan kuis berwaktu, lihat nilai & pembahasan, dasbor progres pribadi |
| Guru | Buat kelas, kelola materi/tugas/kuis, nilai tugas + umpan balik, kelola peserta, analisis kelas, daftar siswa perlu perhatian |
| Admin | Semua akses guru untuk seluruh kelas, kelola pengguna & peran, analisis seluruh sekolah (kelulusan, keaktifan) |

## Menjalankan

1. **Supabase**: buat proyek di supabase.com. Buka *SQL Editor*, tempel isi `database/schema.sql`, jalankan.
   Di *Authentication > Providers > Email*, boleh matikan "Confirm email" (backend sudah membuat akun terkonfirmasi).
2. **Backend**
   ```bash
   cd backend
   cp .env.example .env     # isi SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY (Project Settings > API)
   npm install
   npm run seed             # opsional: data contoh (kata sandi semua akun: password123)
   npm run dev              # http://localhost:4000
   ```
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev              # http://localhost:5173
   ```
4. Masuk dengan `admin@edusmart.id`, `guru1@edusmart.id`, atau `siswa1@edusmart.id` (jika seed dijalankan).

Tanpa seed, jadikan akun admin pertama lewat SQL Editor setelah mendaftar:
`update public.profiles set role = 'admin' where email = 'email-anda@contoh.id';`

## Arsitektur singkat

- Frontend hanya bicara ke API Express. Backend memverifikasi token Supabase Auth di setiap request, lalu memeriksa peran dan kepemilikan kelas.
- Tabel dilindungi RLS tanpa policy: anon key tidak bisa membaca data langsung. `SUPABASE_SERVICE_KEY` hanya ada di backend.
- Peran `admin` tidak bisa dipilih saat mendaftar. Pendaftaran guru bisa dikunci dengan `TEACHER_INVITE_CODE`.
- Kunci jawaban kuis tidak pernah dikirim ke siswa. Penilaian dilakukan di server, satu percobaan per siswa.
- Analisis (`GET /api/analytics/overview`) menormalisasi nilai tugas dan kuis ke skala 100; ketuntasan minimal 70 (`KKM` di `routes/analytics.js`).

## Endpoint utama

`/api/auth/{register,login,refresh,me}` · `/api/users` · `/api/classes` · `/api/classes/:id/{materials,assignments,quizzes,students,enroll}` · `/api/assignments/:id{,/submit}` · `/api/submissions/:id/grade` · `/api/quizzes/:id{,/attempt}` · `/api/analytics/overview`

## Batasan yang perlu diketahui

- Lampiran tugas dan materi berupa tautan (Drive, YouTube, dll.), belum unggah file. Supabase Storage bisa ditambahkan di tahap berikutnya.
- Analisis mengambil data per kelas lalu menghitung di server; cukup untuk satu sekolah. Untuk puluhan ribu baris, pindahkan agregasi ke SQL view/RPC.
- Belum ada pengujian otomatis.
