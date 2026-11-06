import { Router } from 'express';
import { admin, anon } from '../supabase.js';
import { h, ok, fail, log, requireAuth } from '../lib.js';

const r = Router();

async function signIn(email, password) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw fail(401, 'Email atau kata sandi salah');
  const user = ok(await admin.from('profiles').select('*').eq('id', data.user.id).single());
  log(user.id, 'login');
  return { token: data.session.access_token, refresh_token: data.session.refresh_token, user };
}

r.post('/register', h(async (req, res) => {
  const { email, password, full_name, role = 'student', nis, major, invite_code } = req.body;
  if (!email || !password || !full_name) throw fail(400, 'Nama, email, dan kata sandi wajib diisi');
  if (password.length < 6) throw fail(400, 'Kata sandi minimal 6 karakter');
  if (!['student', 'teacher'].includes(role)) throw fail(400, 'Peran tidak valid');
  const code = process.env.TEACHER_INVITE_CODE;
  if (role === 'teacher' && code && invite_code !== code) throw fail(403, 'Kode undangan guru salah');
  const { error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role, nis: nis || null, major: major || null },
  });
  if (error) throw fail(400, /already|registered/i.test(error.message) ? 'Email sudah terdaftar' : error.message);
  res.status(201).json(await signIn(email, password));
}));

r.post('/login', h(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw fail(400, 'Email dan kata sandi wajib diisi');
  res.json(await signIn(email, password));
}));

r.post('/refresh', h(async (req, res) => {
  const { data, error } = await anon.auth.refreshSession({ refresh_token: req.body.refresh_token });
  if (error || !data.session) throw fail(401, 'Sesi berakhir');
  res.json({ token: data.session.access_token, refresh_token: data.session.refresh_token });
}));

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.put('/me', requireAuth, h(async (req, res) => {
  const { full_name, nis, major } = req.body;
  const user = ok(await admin.from('profiles').update({ full_name, nis, major }).eq('id', req.user.id).select().single());
  res.json({ user });
}));

export default r;
