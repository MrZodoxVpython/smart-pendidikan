// Mengisi data contoh: 1 admin, 2 guru, 8 siswa, kelas, materi, tugas, kuis, nilai, aktivitas.
// Jalankan: npm run seed   (kata sandi semua akun: password123)
import { admin } from './supabase.js';
import { ok } from './lib.js';

const PASS = 'password123';
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const daysAgo = (n) => new Date(Date.now() - n * 864e5 - rnd(0, 36e5 * 10)).toISOString();

async function user(email, full_name, role, extra = {}) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { full_name, role: role === 'admin' ? 'student' : role, ...extra } });
  let id = data?.user?.id;
  if (error) id = ok(await admin.from('profiles').select('id').eq('email', email).single()).id;
  if (role === 'admin') await admin.from('profiles').update({ role: 'admin' }).eq('id', id);
  return id;
}

const adminId = await user('admin@edusmart.id', 'Administrator Sekolah', 'admin');
const teachers = [await user('guru1@edusmart.id', 'Ibu Ratna Wulandari', 'teacher'), await user('guru2@edusmart.id', 'Pak Dimas Prasetyo', 'teacher')];
const names = ['Aulia Rahma', 'Bagas Saputra', 'Citra Lestari', 'Dewi Anggraini', 'Eko Prasetyo', 'Farhan Maulana', 'Gita Permata', 'Hendra Wijaya'];
const students = [];
for (const [i, n] of names.entries()) students.push(await user(`siswa${i + 1}@edusmart.id`, n, 'student', { nis: `2024${String(i + 1).padStart(3, '0')}`, major: i % 2 ? 'IPS' : 'IPA' }));

const defs = [
  ['Matematika XI-A', 'Matematika', teachers[0], 'Senin', '08:00', 'R.201', 'MTK11A'],
  ['Bahasa Indonesia XI-A', 'Bahasa Indonesia', teachers[0], 'Rabu', '10:00', 'R.105', 'BIN11A'],
  ['Fisika XI-IPA', 'Fisika', teachers[1], 'Kamis', '09:00', 'Lab Fisika', 'FIS11I'],
];
for (const [name, subject, teacher_id, schedule_day, schedule_time, room, code] of defs) {
  let { data: cls } = await admin.from('classes').select('*').eq('code', code).maybeSingle();
  if (cls) continue;
  cls = ok(await admin.from('classes').insert({ name, subject, teacher_id, schedule_day, schedule_time, room, code, description: `Kelas ${subject} semester ganjil.` }).select().single());
  const enrolled = students.filter(() => Math.random() > 0.15);
  ok(await admin.from('enrollments').insert(enrolled.map((student_id) => ({ class_id: cls.id, student_id }))));
  ok(await admin.from('materials').insert([
    { class_id: cls.id, title: `Modul ${subject} Bab 1`, type: 'module', content: 'Baca ringkasan bab 1 dan kerjakan latihan di akhir modul.' },
    { class_id: cls.id, title: `Video penjelasan ${subject}`, type: 'video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  ]));
  const asg = ok(await admin.from('assignments').insert([1, 2].map((n) => ({ class_id: cls.id, title: `Tugas ${n}: ${subject}`, description: 'Kerjakan soal latihan dan jelaskan langkahnya.', due_date: daysAgo(n === 1 ? 10 : -5), max_score: 100 }))).select());
  const quiz = ok(await admin.from('quizzes').insert({ class_id: cls.id, title: `Kuis ${subject} 1`, duration_minutes: 15, passing_score: 70 }).select().single());
  const qs = ok(await admin.from('quiz_questions').insert([0, 1, 2, 3].map((i) => ({ quiz_id: quiz.id, position: i, question: `Contoh soal ${subject} nomor ${i + 1}?`, options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D'], correct_index: i % 4, points: 25 }))).select());
  for (const s of enrolled) {
    const ability = rnd(45, 95); // kemampuan dasar siswa agar sebaran nilai realistis
    if (Math.random() > 0.1) ok(await admin.from('submissions').insert({ assignment_id: asg[0].id, student_id: s, content: 'Jawaban saya terlampir.', score: Math.min(100, Math.max(0, ability + rnd(-10, 10))), feedback: 'Bagus, pertahankan.', submitted_at: daysAgo(rnd(8, 12)) }));
    if (Math.random() > 0.5) ok(await admin.from('submissions').insert({ assignment_id: asg[1].id, student_id: s, content: 'Jawaban tugas 2.', submitted_at: daysAgo(rnd(0, 2)) }));
    if (Math.random() > 0.2) {
      const answers = Object.fromEntries(qs.map((q) => [q.id, Math.random() * 100 < ability ? q.correct_index : (q.correct_index + 1) % 4]));
      const score = qs.reduce((t, q) => t + (answers[q.id] === q.correct_index ? q.points : 0), 0);
      ok(await admin.from('quiz_attempts').insert({ quiz_id: quiz.id, student_id: s, score, passed: score >= 70, answers, created_at: daysAgo(rnd(1, 9)) }));
    }
    const logs = Array.from({ length: rnd(2, ability > 60 ? 18 : 6) }, () => ({ user_id: s, class_id: cls.id, action: 'view_class', created_at: daysAgo(rnd(0, 13)) }));
    ok(await admin.from('activity_logs').insert(logs));
  }
}
console.log('Seed selesai. Masuk dengan admin@edusmart.id / guru1@edusmart.id / siswa1@edusmart.id, kata sandi: ' + PASS);
void adminId;
