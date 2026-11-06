import { Router } from 'express';
import { admin } from '../supabase.js';
import { h, ok, fail, requireRole } from '../lib.js';

const r = Router();

r.get('/', requireRole('admin', 'teacher'), h(async (req, res) => {
  let q = admin.from('profiles').select('*').order('full_name');
  if (req.user.role === 'teacher') q = q.eq('role', 'student');
  else if (req.query.role) q = q.eq('role', req.query.role);
  res.json(ok(await q));
}));

// Riwayat pembelajaran satu siswa: kelas, nilai tugas, hasil kuis.
r.get('/:id/history', h(async (req, res) => {
  if (req.user.role === 'student' && req.user.id !== req.params.id) throw fail(403, 'Tidak diizinkan');
  const id = req.params.id;
  const [profile, enr, subs, att] = await Promise.all([
    admin.from('profiles').select('*').eq('id', id).maybeSingle(),
    admin.from('enrollments').select('created_at, class:classes(id,name,subject)').eq('student_id', id),
    admin.from('submissions').select('score,feedback,submitted_at, assignment:assignments(title,max_score)').eq('student_id', id).order('submitted_at', { ascending: false }),
    admin.from('quiz_attempts').select('score,passed,created_at, quiz:quizzes(title)').eq('student_id', id).order('created_at', { ascending: false }),
  ]);
  if (!profile.data) throw fail(404, 'Pengguna tidak ditemukan');
  res.json({ profile: profile.data, classes: ok(enr), submissions: ok(subs), attempts: ok(att) });
}));

r.patch('/:id', requireRole('admin'), h(async (req, res) => {
  const { role, full_name, nis, major } = req.body;
  if (role && !['admin', 'teacher', 'student'].includes(role)) throw fail(400, 'Peran tidak valid');
  if (req.params.id === req.user.id && role && role !== 'admin') throw fail(400, 'Anda tidak bisa menurunkan peran akun sendiri');
  const patch = Object.fromEntries(Object.entries({ role, full_name, nis, major }).filter(([, v]) => v !== undefined));
  res.json(ok(await admin.from('profiles').update(patch).eq('id', req.params.id).select().single()));
}));

r.delete('/:id', requireRole('admin'), h(async (req, res) => {
  if (req.params.id === req.user.id) throw fail(400, 'Anda tidak bisa menghapus akun sendiri');
  const { error } = await admin.auth.admin.deleteUser(req.params.id);
  if (error) throw fail(400, error.message);
  res.json({ ok: true });
}));

export default r;
