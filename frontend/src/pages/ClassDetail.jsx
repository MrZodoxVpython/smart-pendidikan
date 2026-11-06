import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookMarked, FileText, Plus, Trash2, Video } from 'lucide-react';
import { api, useFetch } from '../lib/api.js';
import { Area, Badge, Btn, Empty, ErrorBox, Field, Modal, PageHead, Select, Spinner, cx, fmtDate, useAction, useForm } from '../components/ui.jsx';

const yt = (u) => { const m = u?.match(/(?:v=|youtu\.be\/)([\w-]{11})/); return m ? `https://www.youtube.com/embed/${m[1]}` : null; };
const typeIcon = { document: FileText, video: Video, module: BookMarked };
const typeName = { document: 'Dokumen', video: 'Video', module: 'Modul' };

function AddMaterial({ classId, onClose, onDone }) {
  const [f, bind] = useForm({ type: 'document' });
  const { busy, error, run } = useAction();
  return (
    <Modal title="Tambah materi" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/classes/${classId}/materials`, f); onDone(); }); }}>
        <Field label="Judul" required {...bind('title')} />
        <Select label="Jenis" {...bind('type')}><option value="document">Dokumen</option><option value="video">Video</option><option value="module">Modul (teks)</option></Select>
        <Field label="Tautan (Google Drive, PDF, YouTube, dll.)" type="url" placeholder="https://" {...bind('url')} />
        <Area label="Atau tulis isi materi" {...bind('content')} />
        <ErrorBox>{error}</ErrorBox>
        <Btn type="submit" disabled={busy}>Simpan materi</Btn>
      </form>
    </Modal>
  );
}

function AddAssignment({ classId, onClose, onDone }) {
  const [f, bind] = useForm({ max_score: 100 });
  const { busy, error, run } = useAction();
  const submit = (e) => {
    e.preventDefault();
    run(async () => { await api.post(`/classes/${classId}/assignments`, { ...f, due_date: f.due_date ? new Date(f.due_date).toISOString() : null }); onDone(); });
  };
  return (
    <Modal title="Buat tugas" onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Field label="Judul tugas" required {...bind('title')} />
        <Area label="Instruksi" {...bind('description')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tenggat" type="datetime-local" {...bind('due_date')} />
          <Field label="Nilai maksimal" type="number" min="1" {...bind('max_score')} />
        </div>
        <ErrorBox>{error}</ErrorBox>
        <Btn type="submit" disabled={busy}>Simpan tugas</Btn>
      </form>
    </Modal>
  );
}

const blank = () => ({ question: '', options: ['', '', '', ''], correct_index: 0, points: 10 });
function AddQuiz({ classId, onClose, onDone }) {
  const [f, bind] = useForm({ duration_minutes: 30, passing_score: 70 });
  const [qs, setQs] = useState([blank()]);
  const { busy, error, run } = useAction();
  const upd = (i, patch) => setQs((a) => a.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const setOpt = (i, k, v) => upd(i, { options: qs[i].options.map((o, j) => (j === k ? v : o)) });
  return (
    <Modal title="Buat kuis atau ujian" onClose={onClose} wide>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/classes/${classId}/quizzes`, { ...f, questions: qs }); onDone(); }); }}>
        <Field label="Judul" required {...bind('title')} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Durasi (menit)" type="number" min="1" {...bind('duration_minutes')} />
          <Field label="Nilai lulus" type="number" min="0" max="100" {...bind('passing_score')} />
        </div>
        {qs.map((q, i) => (
          <fieldset key={i} className="space-y-2 rounded-md border border-line p-4">
            <legend className="px-1 text-sm font-semibold">Soal {i + 1}</legend>
            <Field label="Pertanyaan" required value={q.question} onChange={(e) => upd(i, { question: e.target.value })} />
            {q.options.map((o, k) => (
              <div key={k} className="flex items-center gap-2">
                <input type="radio" name={`ans-${i}`} checked={q.correct_index === k} onChange={() => upd(i, { correct_index: k })} aria-label={`Jawaban benar: pilihan ${k + 1}`} />
                <input required value={o} onChange={(e) => setOpt(i, k, e.target.value)} placeholder={`Pilihan ${String.fromCharCode(65 + k)}`} className="flex-1 rounded-md border border-line px-3 py-2 text-sm" />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted">Pilih tombol di kiri untuk menandai kunci jawaban.</p>
              <div className="flex items-center gap-3">
                <label className="text-sm">Poin <input type="number" min="1" value={q.points} onChange={(e) => upd(i, { points: e.target.value })} className="ml-1 w-16 rounded-md border border-line px-2 py-1" /></label>
                {qs.length > 1 && <button type="button" onClick={() => setQs(qs.filter((_, j) => j !== i))} className="text-sm text-danger underline">Hapus soal</button>}
              </div>
            </div>
          </fieldset>
        ))}
        <Btn type="button" variant="ghost" onClick={() => setQs([...qs, blank()])}><Plus size={16} />Tambah soal</Btn>
        <ErrorBox>{error}</ErrorBox>
        <div><Btn type="submit" disabled={busy}>Simpan kuis</Btn></div>
      </form>
    </Modal>
  );
}

function PeopleTab({ c, reload }) {
  const { data: all } = useFetch('/users?role=student');
  const [sid, setSid] = useState('');
  const { busy, error, run } = useAction();
  const enrolled = new Set(c.students.map((s) => s.id));
  const add = () => run(async () => { await api.post(`/classes/${c.id}/students`, { student_id: sid }); setSid(''); reload(); });
  const remove = (id) => confirm('Keluarkan siswa dari kelas ini?') && run(async () => { await api.del(`/classes/${c.id}/students/${id}`); reload(); });
  return (
    <>
      <div className="mb-4 flex max-w-lg gap-2">
        <select value={sid} onChange={(e) => setSid(e.target.value)} aria-label="Pilih siswa" className="flex-1 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <option value="">Tambah siswa ke kelas…</option>
          {all?.filter((s) => !enrolled.has(s.id)).map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.nis ? ` (${s.nis})` : ''}</option>)}
        </select>
        <Btn onClick={add} disabled={!sid || busy}>Tambah</Btn>
      </div>
      <ErrorBox>{error}</ErrorBox>
      {c.students.length === 0 ? <Empty title="Belum ada peserta" hint={`Bagikan kode kelas ${c.code} atau tambahkan siswa secara manual.`} /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted"><tr><th className="px-4 py-2">Nama</th><th className="px-4 py-2">NIS</th><th className="px-4 py-2">Jurusan</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {c.students.map((s) => (
                <tr key={s.id}><td className="px-4 py-2 font-medium">{s.full_name}</td><td className="px-4 py-2">{s.nis || '-'}</td><td className="px-4 py-2">{s.major || '-'}</td>
                  <td className="px-4 py-2 text-right"><button onClick={() => remove(s.id)} className="text-danger underline">Keluarkan</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: c, loading, error, reload } = useFetch(`/classes/${id}`);
  const [tab, setTab] = useState('materials');
  const [modal, setModal] = useState(null);
  const act = useAction();
  if (loading && !c) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;

  const del = (url) => confirm('Hapus data ini? Tindakan tidak bisa dibatalkan.') && act.run(async () => { await api.del(url); reload(); });
  const done = () => { setModal(null); reload(); };
  const tabs = [['materials', 'Materi', c.materials.length], ['assignments', 'Tugas', c.assignments.length], ['quizzes', 'Kuis dan ujian', c.quizzes.length], ...(c.manage ? [['people', 'Peserta', c.students.length]] : [])];
  const addLabel = { materials: 'Tambah materi', assignments: 'Buat tugas', quizzes: 'Buat kuis' }[tab];

  const Trash = ({ url }) => <button onClick={() => del(url)} aria-label="Hapus" className="rounded p-2 text-muted hover:bg-red-50 hover:text-danger"><Trash2 size={16} /></button>;

  return (
    <>
      <Link to="/classes" className="mb-2 inline-block text-sm text-board underline">Semua kelas</Link>
      <PageHead title={c.name} sub={`${c.subject || 'Umum'} · ${c.teacher?.full_name} · ${c.schedule_day || '-'} ${c.schedule_time || ''}${c.room ? ` · ${c.room}` : ''}`}>
        {c.manage && <Badge tone="yellow">Kode kelas: {c.code}</Badge>}
        {c.manage ? <Btn variant="danger" onClick={() => confirm('Hapus kelas beserta seluruh isinya?') && act.run(async () => { await api.del(`/classes/${c.id}`); nav('/classes'); })}>Hapus kelas</Btn>
          : <Btn variant="danger" onClick={() => confirm('Keluar dari kelas ini?') && act.run(async () => { await api.del(`/classes/${c.id}/enroll`); nav('/classes'); })}>Keluar kelas</Btn>}
      </PageHead>
      {c.description && <p className="mb-6 max-w-2xl text-muted">{c.description}</p>}
      <ErrorBox>{act.error}</ErrorBox>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map(([k, label, n]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cx('whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold', tab === k ? 'border-board text-board' : 'border-transparent text-muted hover:text-ink')}>{label} ({n})</button>
        ))}
      </div>
      {c.manage && tab !== 'people' && <div className="mb-4"><Btn onClick={() => setModal(tab)}><Plus size={16} />{addLabel}</Btn></div>}

      {tab === 'materials' && (c.materials.length === 0 ? <Empty title="Belum ada materi" hint={c.manage ? 'Tambahkan modul, video, atau dokumen untuk siswa.' : 'Guru belum mengunggah materi.'} /> : (
        <ul className="space-y-3">
          {c.materials.map((m) => {
            const I = typeIcon[m.type]; const embed = m.type === 'video' && yt(m.url);
            return (
              <li key={m.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start gap-3">
                  <I size={20} className="mt-0.5 text-board-400" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{m.title} <Badge>{typeName[m.type]}</Badge></p>
                    {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="break-all text-sm text-board underline">{m.url}</a>}
                    {m.content && <p className="mt-2 whitespace-pre-wrap text-sm">{m.content}</p>}
                    {embed && <iframe title={m.title} src={embed} className="mt-3 aspect-video w-full max-w-xl rounded-md" allowFullScreen />}
                  </div>
                  {c.manage && <Trash url={`/materials/${m.id}`} />}
                </div>
              </li>
            );
          })}
        </ul>
      ))}

      {tab === 'assignments' && (c.assignments.length === 0 ? <Empty title="Belum ada tugas" /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {c.assignments.map((a) => {
            const s = c.mySubmissions?.[a.id];
            const late = a.due_date && new Date(a.due_date) < new Date();
            let badge = null;
            if (!c.manage) badge = s ? (s.score !== null ? <Badge tone="green">Nilai {s.score}/{a.max_score}</Badge> : <Badge tone="yellow">Menunggu nilai</Badge>) : late ? <Badge tone="red">Lewat tenggat</Badge> : <Badge>Belum dikumpulkan</Badge>;
            return (
              <li key={a.id} className="flex items-center">
                <Link to={`/assignments/${a.id}`} className="flex flex-1 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-paper">
                  <span><span className="font-semibold">{a.title}</span><span className="block text-sm text-muted">Tenggat: {fmtDate(a.due_date)}</span></span>{badge}
                </Link>
                {c.manage && <Trash url={`/assignments/${a.id}`} />}
              </li>
            );
          })}
        </ul>
      ))}

      {tab === 'quizzes' && (c.quizzes.length === 0 ? <Empty title="Belum ada kuis atau ujian" /> : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {c.quizzes.map((q) => {
            const at = c.myAttempts?.[q.id];
            return (
              <li key={q.id} className="flex items-center">
                <Link to={`/quizzes/${q.id}`} className="flex flex-1 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-paper">
                  <span><span className="font-semibold">{q.title}</span><span className="block text-sm text-muted">{q.quiz_questions?.[0]?.count ?? 0} soal · {q.duration_minutes} menit · lulus {q.passing_score}</span></span>
                  {!c.manage && (at ? <Badge tone={at.passed ? 'green' : 'red'}>Nilai {at.score}</Badge> : <Badge>Belum dikerjakan</Badge>)}
                </Link>
                {c.manage && <Trash url={`/quizzes/${q.id}`} />}
              </li>
            );
          })}
        </ul>
      ))}

      {tab === 'people' && c.manage && <PeopleTab c={c} reload={reload} />}

      {modal === 'materials' && <AddMaterial classId={c.id} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'assignments' && <AddAssignment classId={c.id} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'quizzes' && <AddQuiz classId={c.id} onClose={() => setModal(null)} onDone={done} />}
    </>
  );
}
