import { admin } from './supabase.js';

export const fail = (status, message) => Object.assign(new Error(message), { status });
export const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export const ok = ({ data, error }) => {
  if (error) throw fail(400, error.message);
  return data;
};
// Catat aktivitas untuk analisis keaktifan (tidak memblokir respons).
export const log = (user_id, action, class_id = null) => {
  admin.from('activity_logs').insert({ user_id, action, class_id }).then(() => {}, () => {});
};

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) throw fail(401, 'Silakan masuk terlebih dahulu');
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) throw fail(401, 'Sesi berakhir, silakan masuk lagi');
    const { data: profile } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
    if (!profile) throw fail(401, 'Profil tidak ditemukan');
    req.user = profile;
    next();
  } catch (e) { next(e); }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : next(fail(403, 'Anda tidak punya izin untuk tindakan ini'));

export const canManage = (user, cls) => user.role === 'admin' || cls.teacher_id === user.id;

// Ambil kelas sekaligus memeriksa hak akses. manage=true: hanya admin / guru pemilik.
export async function getClass(user, id, { manage = false } = {}) {
  const { data: cls } = await admin.from('classes').select('*').eq('id', id).maybeSingle();
  if (!cls) throw fail(404, 'Kelas tidak ditemukan');
  if (canManage(user, cls)) return cls;
  if (manage) throw fail(403, 'Anda tidak punya akses mengelola kelas ini');
  if (user.role === 'student') {
    const { data: e } = await admin.from('enrollments').select('id').eq('class_id', id).eq('student_id', user.id).maybeSingle();
    if (e) return cls;
  }
  throw fail(403, 'Anda belum terdaftar di kelas ini');
}

// Ambil baris anak (materi/tugas/kuis) lalu pastikan user boleh mengakses kelasnya.
export async function getChild(user, table, id, opts) {
  const { data: row } = await admin.from(table).select('*').eq('id', id).maybeSingle();
  if (!row) throw fail(404, 'Data tidak ditemukan');
  const cls = await getClass(user, row.class_id, opts);
  return { row, cls };
}
