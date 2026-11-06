import { Router } from 'express';
import { admin } from '../supabase.js';
import { h, ok, fail, log, requireRole, getClass, canManage } from '../lib.js';

const r = Router();
const SEL = '*, teacher:profiles!teacher_id(id,full_name), enrollments(count)';
const genCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
const shape = (c, enrolled) => ({ ...c, student_count: c.enrollments?.[0]?.count ?? 0, enrollments: undefined, enrolled });
const inIds = async (table, sel, col, ids, extra = (q) => q) => (ids.length ? ok(await extra(admin.from(table).select(sel).in(col, ids))) : []);
const enroll = (class_id, student_id) =>
  admin.from('enrollments').upsert({ class_id, student_id }, { onConflict: 'class_id,student_id', ignoreDuplicates: true });

r.get('/', h(async (req, res) => {
  const u = req.user;
  let mine = new Set();
  if (u.role === 'student') {
    mine = new Set(ok(await admin.from('enrollments').select('class_id').eq('student_id', u.id)).map((e) => e.class_id));
  }
  let q = admin.from('classes').select(SEL).order('created_at', { ascending: false });
  if (u.role === 'teacher') q = q.eq('teacher_id', u.id);
  let list = ok(await q);
  if (u.role === 'student' && req.query.browse !== '1') list = list.filter((c) => mine.has(c.id));
  res.json(list.map((c) => shape(c, mine.has(c.id))));
}));

r.post('/', requireRole('admin', 'teacher'), h(async (req, res) => {
  const { name, subject, description, schedule_day, schedule_time, room } = req.body;
  if (!name) throw fail(400, 'Nama kelas wajib diisi');
  const teacher_id = req.user.role === 'admin' && req.body.teacher_id ? req.body.teacher_id : req.user.id;
  const row = { name, subject: subject || '', description: description || '', schedule_day, schedule_time, room, teacher_id, code: genCode() };
  res.status(201).json(ok(await admin.from('classes').insert(row).select().single()));
}));

r.post('/join', requireRole('student'), h(async (req, res) => {
  const { data: cls } = await admin.from('classes').select('id,name').eq('code', String(req.body.code || '').trim().toUpperCase()).maybeSingle();
  if (!cls) throw fail(404, 'Kode kelas tidak ditemukan');
  ok(await enroll(cls.id, req.user.id));
  log(req.user.id, 'join_class', cls.id);
  res.json(cls);
}));

r.get('/:id', h(async (req, res) => {
  const cls = await getClass(req.user, req.params.id);
  const manage = canManage(req.user, cls);
  const [teacher, materials, assignments, quizzes] = await Promise.all([
    admin.from('profiles').select('id,full_name,email').eq('id', cls.teacher_id).maybeSingle(),
    admin.from('materials').select('*').eq('class_id', cls.id).order('created_at', { ascending: false }),
    admin.from('assignments').select('*').eq('class_id', cls.id).order('due_date'),
    admin.from('quizzes').select('*, quiz_questions(count)').eq('class_id', cls.id).order('created_at', { ascending: false }),
  ]);
  const out = { ...cls, manage, teacher: teacher.data, materials: ok(materials), assignments: ok(assignments), quizzes: ok(quizzes) };
  if (manage) {
    const en = ok(await admin.from('enrollments').select('student:profiles!student_id(id,full_name,email,nis,major)').eq('class_id', cls.id));
    out.students = en.map((e) => e.student).sort((a, b) => a.full_name.localeCompare(b.full_name));
  } else {
    const subs = await inIds('submissions', 'assignment_id,score,feedback,submitted_at', 'assignment_id', out.assignments.map((a) => a.id), (q) => q.eq('student_id', req.user.id));
    const att = await inIds('quiz_attempts', 'quiz_id,score,passed', 'quiz_id', out.quizzes.map((x) => x.id), (q) => q.eq('student_id', req.user.id));
    out.mySubmissions = Object.fromEntries(subs.map((s) => [s.assignment_id, s]));
    out.myAttempts = Object.fromEntries(att.map((a) => [a.quiz_id, a]));
    log(req.user.id, 'view_class', cls.id);
  }
  res.json(out);
}));

r.put('/:id', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  const { name, subject, description, schedule_day, schedule_time, room } = req.body;
  res.json(ok(await admin.from('classes').update({ name, subject, description, schedule_day, schedule_time, room }).eq('id', req.params.id).select().single()));
}));

r.delete('/:id', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  ok(await admin.from('classes').delete().eq('id', req.params.id));
  res.json({ ok: true });
}));

r.post('/:id/enroll', requireRole('student'), h(async (req, res) => {
  const { data: cls } = await admin.from('classes').select('id').eq('id', req.params.id).maybeSingle();
  if (!cls) throw fail(404, 'Kelas tidak ditemukan');
  ok(await enroll(cls.id, req.user.id));
  log(req.user.id, 'join_class', cls.id);
  res.json({ ok: true });
}));

r.delete('/:id/enroll', requireRole('student'), h(async (req, res) => {
  ok(await admin.from('enrollments').delete().eq('class_id', req.params.id).eq('student_id', req.user.id));
  res.json({ ok: true });
}));

// Guru/admin menambah atau mengeluarkan siswa.
r.post('/:id/students', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  if (!req.body.student_id) throw fail(400, 'Pilih siswa terlebih dahulu');
  ok(await enroll(req.params.id, req.body.student_id));
  res.status(201).json({ ok: true });
}));
r.delete('/:id/students/:sid', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  ok(await admin.from('enrollments').delete().eq('class_id', req.params.id).eq('student_id', req.params.sid));
  res.json({ ok: true });
}));

export default r;
