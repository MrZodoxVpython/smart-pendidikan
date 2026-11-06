import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, DoorOpen, Plus, Users } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { api, useFetch } from '../lib/api.js';
import { Btn, Empty, ErrorBox, Field, Area, Select, Modal, PageHead, Spinner, useAction, useForm, cx } from '../components/ui.jsx';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function CreateClass({ onClose, onDone, isAdmin }) {
  const [f, bind] = useForm({ schedule_day: 'Senin' });
  const { data: teachers } = useFetch(isAdmin ? '/users?role=teacher' : null);
  const { busy, error, run } = useAction();
  return (
    <Modal title="Buat kelas" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post('/classes', f); onDone(); }); }}>
        <Field label="Nama kelas" placeholder="Contoh: Matematika XI-A" required {...bind('name')} />
        <Field label="Mata pelajaran" {...bind('subject')} />
        {isAdmin && (
          <Select label="Guru pengampu" required {...bind('teacher_id')}>
            <option value="">Pilih guru</option>
            {teachers?.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Select label="Hari" {...bind('schedule_day')}>{DAYS.map((d) => <option key={d}>{d}</option>)}</Select>
          <Field label="Jam" type="time" {...bind('schedule_time')} />
          <Field label="Ruang" {...bind('room')} />
        </div>
        <Area label="Deskripsi" rows={3} {...bind('description')} />
        <ErrorBox>{error}</ErrorBox>
        <Btn type="submit" disabled={busy}>Simpan kelas</Btn>
      </form>
    </Modal>
  );
}

export default function Classes() {
  const { user } = useAuth();
  const isStudent = user.role === 'student';
  const [browse, setBrowse] = useState(false);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState('');
  const { data, loading, error, reload } = useFetch(`/classes${browse ? '?browse=1' : ''}`);
  const act = useAction();

  const join = (id) => act.run(async () => { await api.post(`/classes/${id}/enroll`); reload(); });
  const joinCode = (e) => {
    e.preventDefault();
    act.run(async () => { await api.post('/classes/join', { code }); setCode(''); setBrowse(false); reload(); });
  };

  return (
    <>
      <PageHead title="Kelas" sub={isStudent ? (browse ? 'Semua kelas yang tersedia.' : 'Kelas yang Anda ikuti.') : 'Kelas online, jadwal, dan peserta.'}>
        {isStudent ? (
          <Btn variant="ghost" onClick={() => setBrowse(!browse)}>{browse ? 'Lihat kelas saya' : 'Jelajahi kelas'}</Btn>
        ) : (
          <Btn onClick={() => setCreating(true)}><Plus size={16} />Buat kelas</Btn>
        )}
      </PageHead>

      {isStudent && (
        <form onSubmit={joinCode} className="mb-6 flex max-w-md gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Punya kode kelas? Masukkan di sini" aria-label="Kode kelas" className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm uppercase placeholder:normal-case" />
          <Btn type="submit" disabled={!code || act.busy}>Gabung</Btn>
        </form>
      )}
      <ErrorBox>{error || act.error}</ErrorBox>

      {loading && !data ? <Spinner /> : data?.length === 0 ? (
        <Empty title={isStudent ? 'Anda belum mengikuti kelas' : 'Belum ada kelas'} hint={isStudent ? 'Jelajahi daftar kelas atau masukkan kode dari guru.' : 'Buat kelas pertama untuk mulai menambahkan materi dan tugas.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((c) => {
            const open = !isStudent || c.enrolled;
            const body = (
              <>
                <p className="text-sm font-semibold text-board-400">{c.subject || 'Umum'}</p>
                <h3 className="mt-1 text-xl font-bold">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">{c.teacher?.full_name}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="flex items-center gap-1"><Clock size={14} />{c.schedule_day || '-'} {c.schedule_time || ''}</span>
                  {c.room && <span className="flex items-center gap-1"><DoorOpen size={14} />{c.room}</span>}
                  <span className="flex items-center gap-1"><Users size={14} />{c.student_count} siswa</span>
                </div>
              </>
            );
            const cls = 'block rounded-lg border border-line bg-white p-5';
            return open ? (
              <Link key={c.id} to={`/classes/${c.id}`} className={cx(cls, 'hover:border-board')}>{body}</Link>
            ) : (
              <div key={c.id} className={cls}>{body}<Btn className="mt-4" onClick={() => join(c.id)} disabled={act.busy}>Gabung kelas</Btn></div>
            );
          })}
        </div>
      )}
      {creating && <CreateClass isAdmin={user.role === 'admin'} onClose={() => setCreating(false)} onDone={() => { setCreating(false); reload(); }} />}
    </>
  );
}
