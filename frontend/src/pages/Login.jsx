import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { Btn, Field, Select, ErrorBox, useForm, useAction } from '../components/ui.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [f, bind] = useForm({ role: 'student' });
  const { busy, error, run } = useAction();
  const isReg = mode === 'register';

  const submit = (e) => {
    e.preventDefault();
    run(() => (isReg ? register(f) : login(f.email, f.password)));
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="ruled flex flex-col justify-between bg-board p-8 text-white md:p-14">
        <p className="font-display text-xl font-bold text-mark">EduSmart</p>
        <div className="py-10">
          <h1 className="max-w-md text-4xl font-extrabold leading-tight md:text-5xl">Belajar, mengajar, dan membaca data sekolah di satu tempat.</h1>
          <ul className="mt-8 max-w-md space-y-3 text-white/80">
            <li><b className="text-white">Siswa</b> mengikuti kelas, mengumpulkan tugas, dan mengerjakan kuis yang dinilai otomatis.</li>
            <li><b className="text-white">Guru</b> mengelola materi, menilai tugas, dan melihat siapa yang perlu dibantu.</li>
            <li><b className="text-white">Admin</b> memantau kelulusan dan keaktifan seluruh sekolah.</li>
          </ul>
        </div>
        <p className="text-sm text-white/50">Akun contoh (setelah menjalankan seed): admin@edusmart.id, guru1@edusmart.id, siswa1@edusmart.id. Kata sandi: password123</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold">{isReg ? 'Buat akun baru' : 'Masuk ke EduSmart'}</h2>
          {isReg && <Field label="Nama lengkap" required {...bind('full_name')} />}
          <Field label="Email" type="email" required autoComplete="email" {...bind('email')} />
          <Field label="Kata sandi" type="password" required minLength={6} autoComplete={isReg ? 'new-password' : 'current-password'} {...bind('password')} />
          {isReg && (
            <>
              <Select label="Daftar sebagai" {...bind('role')}>
                <option value="student">Siswa</option>
                <option value="teacher">Guru</option>
              </Select>
              {f.role === 'student' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="NIS" {...bind('nis')} />
                  <Select label="Jurusan" {...bind('major')}><option value="">Pilih</option><option>IPA</option><option>IPS</option><option>Bahasa</option></Select>
                </div>
              ) : (
                <Field label="Kode undangan guru" placeholder="Tanyakan ke admin sekolah" {...bind('invite_code')} />
              )}
            </>
          )}
          <ErrorBox>{error}</ErrorBox>
          <Btn type="submit" disabled={busy} className="w-full">{busy ? 'Memproses…' : isReg ? 'Daftar' : 'Masuk'}</Btn>
          <p className="text-center text-sm text-muted">
            {isReg ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
            <button type="button" onClick={() => setMode(isReg ? 'login' : 'register')} className="font-semibold text-board underline">{isReg ? 'Masuk' : 'Daftar'}</button>
          </p>
        </form>
      </section>
    </div>
  );
}
