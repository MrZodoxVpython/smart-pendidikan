import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, useFetch } from '../lib/api.js';
import { Area, Badge, Btn, Empty, ErrorBox, Field, PageHead, Spinner, fmtDate, useAction } from '../components/ui.jsx';

function GradeRow({ s, max, due, onSaved }) {
  const [score, setScore] = useState(s.score ?? '');
  const [feedback, setFeedback] = useState(s.feedback ?? '');
  const { busy, error, run } = useAction();
  const late = due && new Date(s.submitted_at) > new Date(due);
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{s.student?.full_name} {s.student?.nis && <span className="font-normal text-muted">({s.student.nis})</span>}</p>
        <span className="text-sm text-muted">{fmtDate(s.submitted_at)} {late && <Badge tone="red">Terlambat</Badge>}</span>
      </div>
      {s.content && <p className="whitespace-pre-wrap rounded-md bg-paper p-3 text-sm">{s.content}</p>}
      {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" className="break-all text-sm text-board underline">{s.file_url}</a>}
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Nilai (maks. {max})<input type="number" min="0" max={max} value={score} onChange={(e) => setScore(e.target.value)} className="mt-1 block w-28 rounded-md border border-line px-3 py-2" /></label>
        <label className="min-w-48 flex-1 text-sm">Umpan balik<input value={feedback} onChange={(e) => setFeedback(e.target.value)} className="mt-1 block w-full rounded-md border border-line px-3 py-2" /></label>
        <Btn disabled={busy || score === ''} onClick={() => run(async () => { await api.patch(`/submissions/${s.id}/grade`, { score, feedback }); onSaved(); })}>{s.score !== null ? 'Perbarui nilai' : 'Simpan nilai'}</Btn>
      </div>
      <ErrorBox>{error}</ErrorBox>
    </li>
  );
}

function SubmitForm({ a, reload }) {
  const s = a.submission;
  const [content, setContent] = useState(s?.content ?? '');
  const [file_url, setUrl] = useState(s?.file_url ?? '');
  const { busy, error, run } = useAction();
  const graded = s && s.score !== null;
  return (
    <form className="max-w-2xl space-y-3" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.post(`/assignments/${a.id}/submit`, { content, file_url }); reload(); }); }}>
      {graded && (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm text-muted">Nilai Anda</p>
          <p className="font-display text-4xl font-bold">{s.score}<span className="text-lg text-muted"> / {a.max_score}</span></p>
          {s.feedback && <p className="mt-2 text-sm">Umpan balik guru: {s.feedback}</p>}
        </div>
      )}
      {s && !graded && <Badge tone="yellow">Dikumpulkan {fmtDate(s.submitted_at)}. Anda masih bisa memperbaruinya sampai dinilai.</Badge>}
      <Area label="Jawaban" value={content} onChange={(e) => setContent(e.target.value)} disabled={graded} rows={7} />
      <Field label="Tautan file (Google Drive, dll.)" type="url" placeholder="https://" value={file_url} onChange={(e) => setUrl(e.target.value)} disabled={graded} />
      <ErrorBox>{error}</ErrorBox>
      {!graded && <Btn type="submit" disabled={busy}>{s ? 'Perbarui pengumpulan' : 'Kumpulkan tugas'}</Btn>}
    </form>
  );
}

export default function AssignmentView() {
  const { id } = useParams();
  const { data: a, loading, error, reload } = useFetch(`/assignments/${id}`);
  if (loading && !a) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  return (
    <>
      <Link to={`/classes/${a.class_id}`} className="mb-2 inline-block text-sm text-board underline">{a.class_name}</Link>
      <PageHead title={a.title} sub={`Tenggat ${fmtDate(a.due_date)} · Nilai maksimal ${a.max_score}`} />
      {a.description && <p className="mb-6 max-w-2xl whitespace-pre-wrap">{a.description}</p>}
      {a.manage ? (
        <>
          <p className="mb-3 text-sm text-muted">{a.submissions.length} dari {a.total_students} siswa sudah mengumpulkan.</p>
          {a.submissions.length === 0 ? <Empty title="Belum ada pengumpulan" /> : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {a.submissions.map((s) => <GradeRow key={s.id + (s.score ?? '')} s={s} max={a.max_score} due={a.due_date} onSaved={reload} />)}
            </ul>
          )}
        </>
      ) : <SubmitForm a={a} reload={reload} />}
    </>
  );
}
