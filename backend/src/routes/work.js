import { Router } from 'express';
import { admin } from '../supabase.js';
import { h, ok, fail, log, requireRole, getClass, getChild } from '../lib.js';

const r = Router();

/* ---------- Materi ---------- */
r.post('/classes/:id/materials', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  const { title, type = 'document', url, content } = req.body;
  if (!title) throw fail(400, 'Judul materi wajib diisi');
  if (!url && !content) throw fail(400, 'Isi tautan atau teks materi');
  res.status(201).json(ok(await admin.from('materials').insert({ class_id: req.params.id, title, type, url: url || null, content: content || null }).select().single()));
}));

r.delete('/materials/:id', h(async (req, res) => {
  await getChild(req.user, 'materials', req.params.id, { manage: true });
  ok(await admin.from('materials').delete().eq('id', req.params.id));
  res.json({ ok: true });
}));

/* ---------- Tugas ---------- */
r.post('/classes/:id/assignments', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  const { title, description, due_date, max_score } = req.body;
  if (!title) throw fail(400, 'Judul tugas wajib diisi');
  const row = { class_id: req.params.id, title, description: description || '', due_date: due_date || null, max_score: Number(max_score) > 0 ? Number(max_score) : 100 };
  res.status(201).json(ok(await admin.from('assignments').insert(row).select().single()));
}));

r.delete('/assignments/:id', h(async (req, res) => {
  await getChild(req.user, 'assignments', req.params.id, { manage: true });
  ok(await admin.from('assignments').delete().eq('id', req.params.id));
  res.json({ ok: true });
}));

r.get('/assignments/:id', h(async (req, res) => {
  const { row, cls } = await getChild(req.user, 'assignments', req.params.id);
  const manage = req.user.role === 'admin' || cls.teacher_id === req.user.id;
  const out = { ...row, class_name: cls.name, manage };
  if (manage) {
    out.submissions = ok(await admin.from('submissions').select('*, student:profiles!student_id(full_name,nis)').eq('assignment_id', row.id).order('submitted_at'));
    const { count } = await admin.from('enrollments').select('id', { count: 'exact', head: true }).eq('class_id', cls.id);
    out.total_students = count || 0;
  } else {
    out.submission = (await admin.from('submissions').select('*').eq('assignment_id', row.id).eq('student_id', req.user.id).maybeSingle()).data;
  }
  res.json(out);
}));

r.post('/assignments/:id/submit', requireRole('student'), h(async (req, res) => {
  const { row, cls } = await getChild(req.user, 'assignments', req.params.id);
  const { content, file_url } = req.body;
  if (!content && !file_url) throw fail(400, 'Tulis jawaban atau lampirkan tautan file');
  const { data: prev } = await admin.from('submissions').select('id,score').eq('assignment_id', row.id).eq('student_id', req.user.id).maybeSingle();
  if (prev && prev.score !== null) throw fail(400, 'Tugas sudah dinilai dan tidak bisa diubah');
  const sub = ok(await admin.from('submissions').upsert(
    { assignment_id: row.id, student_id: req.user.id, content: content || null, file_url: file_url || null, submitted_at: new Date().toISOString() },
    { onConflict: 'assignment_id,student_id' }).select().single());
  log(req.user.id, 'submit_assignment', cls.id);
  res.status(201).json(sub);
}));

r.patch('/submissions/:id/grade', h(async (req, res) => {
  const { data: sub } = await admin.from('submissions').select('*, assignment:assignments(class_id,max_score)').eq('id', req.params.id).maybeSingle();
  if (!sub) throw fail(404, 'Pengumpulan tidak ditemukan');
  await getClass(req.user, sub.assignment.class_id, { manage: true });
  const score = Number(req.body.score);
  if (req.body.score === '' || req.body.score == null || Number.isNaN(score) || score < 0 || score > sub.assignment.max_score)
    throw fail(400, `Nilai harus antara 0 dan ${sub.assignment.max_score}`);
  res.json(ok(await admin.from('submissions').update({ score, feedback: req.body.feedback || null }).eq('id', sub.id).select().single()));
}));

/* ---------- Kuis & ujian (penilaian otomatis) ---------- */
r.post('/classes/:id/quizzes', h(async (req, res) => {
  await getClass(req.user, req.params.id, { manage: true });
  const { title, duration_minutes, passing_score, questions } = req.body;
  if (!title) throw fail(400, 'Judul kuis wajib diisi');
  if (!Array.isArray(questions) || !questions.length) throw fail(400, 'Tambahkan minimal satu soal');
  const qs = questions.map((q, i) => {
    const options = (q.options || []).map((o) => String(o).trim()).filter(Boolean);
    const correct = Number(q.correct_index);
    if (!q.question?.trim() || options.length < 2) throw fail(400, `Soal ${i + 1}: isi pertanyaan dan minimal 2 pilihan`);
    if (!(correct >= 0 && correct < options.length)) throw fail(400, `Soal ${i + 1}: kunci jawaban tidak valid`);
    return { question: q.question.trim(), options, correct_index: correct, points: Number(q.points) > 0 ? Number(q.points) : 10, position: i };
  });
  const quiz = ok(await admin.from('quizzes').insert({ class_id: req.params.id, title, duration_minutes: Number(duration_minutes) || 30, passing_score: Number(passing_score) || 70 }).select().single());
  const { error } = await admin.from('quiz_questions').insert(qs.map((q) => ({ ...q, quiz_id: quiz.id })));
  if (error) { await admin.from('quizzes').delete().eq('id', quiz.id); throw fail(400, error.message); }
  res.status(201).json(quiz);
}));

r.delete('/quizzes/:id', h(async (req, res) => {
  await getChild(req.user, 'quizzes', req.params.id, { manage: true });
  ok(await admin.from('quizzes').delete().eq('id', req.params.id));
  res.json({ ok: true });
}));

const review = (questions, answers = {}) => questions.map((q) => ({ ...q, chosen: answers[q.id] ?? null }));

r.get('/quizzes/:id', h(async (req, res) => {
  const { row, cls } = await getChild(req.user, 'quizzes', req.params.id);
  const manage = req.user.role === 'admin' || cls.teacher_id === req.user.id;
  const questions = ok(await admin.from('quiz_questions').select('*').eq('quiz_id', row.id).order('position'));
  const out = { ...row, class_name: cls.name, manage };
  if (manage) {
    out.questions = questions;
    out.attempts = ok(await admin.from('quiz_attempts').select('id,score,passed,created_at, student:profiles!student_id(full_name,nis)').eq('quiz_id', row.id).order('created_at', { ascending: false }));
  } else {
    const { data: att } = await admin.from('quiz_attempts').select('*').eq('quiz_id', row.id).eq('student_id', req.user.id).maybeSingle();
    if (att) out.attempt = { score: att.score, passed: att.passed, created_at: att.created_at, review: review(questions, att.answers) };
    else out.questions = questions.map(({ correct_index, ...q }) => q); // kunci jawaban tidak dikirim ke siswa
  }
  res.json(out);
}));

r.post('/quizzes/:id/attempt', requireRole('student'), h(async (req, res) => {
  const { row, cls } = await getChild(req.user, 'quizzes', req.params.id);
  const { data: prev } = await admin.from('quiz_attempts').select('id').eq('quiz_id', row.id).eq('student_id', req.user.id).maybeSingle();
  if (prev) throw fail(400, 'Anda sudah mengerjakan kuis ini');
  const questions = ok(await admin.from('quiz_questions').select('*').eq('quiz_id', row.id).order('position'));
  const answers = req.body.answers || {};
  const total = questions.reduce((s, q) => s + q.points, 0);
  const got = questions.reduce((s, q) => s + (Number(answers[q.id]) === q.correct_index ? q.points : 0), 0);
  const score = total ? Math.round((got / total) * 1000) / 10 : 0;
  const passed = score >= row.passing_score;
  const att = ok(await admin.from('quiz_attempts').insert({ quiz_id: row.id, student_id: req.user.id, score, passed, answers }).select().single());
  log(req.user.id, 'take_quiz', cls.id);
  res.status(201).json({ score, passed, created_at: att.created_at, review: review(questions, answers) });
}));

export default r;
