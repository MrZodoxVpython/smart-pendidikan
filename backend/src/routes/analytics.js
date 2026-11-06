import { Router } from 'express';
import { admin } from '../supabase.js';
import { h, ok } from '../lib.js';

const r = Router();
const KKM = 70; // batas ketuntasan
const avg = (a) => (a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null);
const group = (arr, key) => arr.reduce((m, x) => ((m[x[key]] ||= []).push(x), m), {});

r.get('/overview', h(async (req, res) => {
  const u = req.user;
  const isStudent = u.role === 'student';

  // 1. Kelas dalam cakupan pengguna
  const cq = admin.from('classes').select('id,name,teacher_id');
  let classes;
  if (u.role === 'teacher') classes = ok(await cq.eq('teacher_id', u.id));
  else if (isStudent) {
    const ids = ok(await admin.from('enrollments').select('class_id').eq('student_id', u.id)).map((e) => e.class_id);
    classes = ids.length ? ok(await admin.from('classes').select('id,name,teacher_id').in('id', ids)) : [];
  } else classes = ok(await cq);
  const cids = classes.map((c) => c.id);
  const fetchIn = async (table, sel, col, ids, extra = (q) => q) => (ids.length ? ok(await extra(admin.from(table).select(sel).in(col, ids))) : []);

  const [enr, asg, qz] = await Promise.all([
    fetchIn('enrollments', 'class_id,student_id,student:profiles!student_id(full_name)', 'class_id', cids),
    fetchIn('assignments', 'id,class_id,title,due_date,max_score', 'class_id', cids),
    fetchIn('quizzes', 'id,class_id,title,passing_score', 'class_id', cids),
  ]);
  const own = (q) => (isStudent ? q.eq('student_id', u.id) : q);
  const [subs, att] = await Promise.all([
    fetchIn('submissions', 'id,assignment_id,student_id,score,submitted_at,student:profiles!student_id(full_name)', 'assignment_id', asg.map((a) => a.id), own),
    fetchIn('quiz_attempts', 'quiz_id,student_id,score,created_at', 'quiz_id', qz.map((q) => q.id), own),
  ]);

  // 2. Semua nilai dinormalisasi ke skala 0-100
  const aMap = Object.fromEntries(asg.map((a) => [a.id, a]));
  const qMap = Object.fromEntries(qz.map((q) => [q.id, q]));
  const scores = [
    ...subs.filter((s) => s.score !== null).map((s) => {
      const a = aMap[s.assignment_id];
      return { student_id: s.student_id, class_id: a.class_id, score: (s.score / a.max_score) * 100, date: s.submitted_at, label: a.title, kind: 'Tugas' };
    }),
    ...att.map((a) => ({ student_id: a.student_id, class_id: qMap[a.quiz_id].class_id, score: Number(a.score), date: a.created_at, label: qMap[a.quiz_id].title, kind: 'Kuis' })),
  ];
  const names = Object.fromEntries(enr.map((e) => [e.student_id, e.student?.full_name]));
  const studentIds = isStudent ? [u.id] : [...new Set(enr.map((e) => e.student_id))];
  const byStudent = Object.fromEntries(Object.entries(group(scores, 'student_id')).map(([id, xs]) => [id, avg(xs.map((x) => x.score))]));
  const studentAvgs = Object.entries(byStudent).map(([id, a]) => ({ id, name: names[id] || '-', avg: a }));

  // 3. Keaktifan 14 hari terakhir
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  let lq = admin.from('activity_logs').select('user_id,created_at').gte('created_at', since);
  let logs = [];
  if (isStudent) logs = ok(await lq.eq('user_id', u.id));
  else if (u.role === 'admin') logs = ok(await lq);
  else if (cids.length) logs = ok(await lq.in('class_id', cids));
  const trend = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 864e5);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), aktivitas: 0 };
  });
  logs.forEach((l) => { const t = trend.find((x) => x.key === l.created_at.slice(0, 10)); if (t) t.aktivitas++; });
  const weekAgo = Date.now() - 7 * 864e5;
  const activeNow = new Set(logs.filter((l) => new Date(l.created_at) >= weekAgo).map((l) => l.user_id));
  const activePct = studentIds.length ? Math.round((studentIds.filter((id) => activeNow.has(id)).length / studentIds.length) * 100) : 0;

  // 4. Agregasi
  const overall = avg(scores.map((s) => s.score));
  const passRate = studentAvgs.length ? Math.round((studentAvgs.filter((s) => s.avg >= KKM).length / studentAvgs.length) * 100) : 0;
  const distribution = [['0-59', 0, 59.99], ['60-69', 60, 69.99], ['70-79', 70, 79.99], ['80-89', 80, 89.99], ['90-100', 90, 100]]
    .map(([range, lo, hi]) => ({ range, siswa: studentAvgs.filter((s) => s.avg >= lo && s.avg <= hi).length }));
  const scoresByClass = group(scores, 'class_id');
  const classStats = classes.map((c) => {
    const xs = scoresByClass[c.id] || [];
    const perStudent = Object.values(group(xs, 'student_id')).map((v) => avg(v.map((x) => x.score)));
    return {
      id: c.id, name: c.name,
      siswa: enr.filter((e) => e.class_id === c.id).length,
      rata: avg(xs.map((x) => x.score)) ?? 0,
      lulus: perStudent.length ? Math.round((perStudent.filter((a) => a >= KKM).length / perStudent.length) * 100) : 0,
    };
  });
  const sorted = [...studentAvgs].sort((a, b) => b.avg - a.avg);
  const pending = subs.filter((s) => s.score === null).sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at))
    .map((s) => ({ id: s.assignment_id, student: s.student?.full_name, title: aMap[s.assignment_id].title, submitted_at: s.submitted_at }));

  let cards;
  if (isStudent) {
    cards = [
      { label: 'Kelas diikuti', value: classes.length },
      { label: 'Rata-rata nilai', value: overall ?? '-' },
      { label: 'Tugas terkumpul', value: `${subs.length}/${asg.length}` },
      { label: 'Kuis selesai', value: `${att.length}/${qz.length}` },
    ];
  } else {
    cards = [{ label: 'Siswa', value: studentIds.length }];
    if (u.role === 'admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher');
      cards.push({ label: 'Guru', value: count || 0 });
    }
    cards.push({ label: 'Kelas', value: classes.length }, { label: 'Rata-rata nilai', value: overall ?? '-' }, { label: 'Keaktifan 7 hari', value: `${activePct}%` });
    cards.push(u.role === 'admin' ? { label: 'Tingkat kelulusan', value: `${passRate}%` } : { label: 'Perlu dinilai', value: pending.length });
  }

  const submitted = new Set(subs.map((s) => s.assignment_id));
  res.json({
    role: u.role, kkm: KKM, cards,
    trend: trend.map(({ label, aktivitas }) => ({ label, aktivitas })),
    distribution, classes: classStats,
    ranking: isStudent ? [] : sorted.slice(0, 5),
    atRisk: isStudent ? [] : sorted.filter((s) => s.avg < 60).reverse().slice(0, 8),
    pending: isStudent ? [] : pending.slice(0, 8),
    upcoming: isStudent
      ? asg.filter((a) => !submitted.has(a.id) && a.due_date && new Date(a.due_date) >= new Date())
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 6)
          .map((a) => ({ id: a.id, title: a.title, due_date: a.due_date, class_name: classes.find((c) => c.id === a.class_id)?.name }))
      : [],
    timeline: isStudent ? scores.sort((a, b) => new Date(a.date) - new Date(b.date)).map((s) => ({ label: s.label, kind: s.kind, nilai: Math.round(s.score * 10) / 10 })) : [],
  });
}));

export default r;
