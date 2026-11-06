import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { api, useFetch } from '../lib/api.js';
import { Badge, Btn, ErrorBox, PageHead, Spinner, cx, fmtDate, useAction } from '../components/ui.jsx';

const L = (i) => String.fromCharCode(65 + i);

function Review({ items }) {
  return (
    <ol className="space-y-4">
      {items.map((q, i) => (
        <li key={q.id} className="rounded-lg border border-line bg-white p-4">
          <p className="mb-2 font-semibold">{i + 1}. {q.question}</p>
          <ul className="space-y-1 text-sm">
            {q.options.map((o, k) => {
              const right = k === q.correct_index; const chosen = q.chosen !== undefined && Number(q.chosen) === k && q.chosen !== null;
              return (
                <li key={k} className={cx('flex items-center gap-2 rounded px-2 py-1', right && 'bg-board-100 font-semibold', chosen && !right && 'bg-red-50 text-danger')}>
                  {right ? <Check size={14} /> : chosen ? <X size={14} /> : <span className="w-3.5" />}{L(k)}. {o}
                  {chosen && <span className="ml-auto text-xs">jawaban Anda</span>}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Result({ r, quiz }) {
  return (
    <>
      <div className="mb-6 rounded-lg border border-line bg-white p-6">
        <p className="text-sm text-muted">Nilai Anda</p>
        <p className="font-display text-5xl font-bold">{r.score}</p>
        <p className="mt-2"><Badge tone={r.passed ? 'green' : 'red'}>{r.passed ? 'Lulus' : `Belum lulus (minimal ${quiz.passing_score})`}</Badge></p>
      </div>
      <h2 className="mb-3 text-xl font-bold">Pembahasan</h2>
      <Review items={r.review} />
    </>
  );
}

function Taker({ quiz, onDone }) {
  const [answers, setAnswers] = useState({});
  const [left, setLeft] = useState(quiz.duration_minutes * 60);
  const ref = useRef(answers); ref.current = answers;
  const sent = useRef(false);
  const { busy, error, run } = useAction();

  const submit = () => {
    if (sent.current) return;
    sent.current = true;
    run(() => api.post(`/quizzes/${quiz.id}/attempt`, { answers: ref.current })).then((r) => (r ? onDone(r) : (sent.current = false)));
  };
  useEffect(() => {
    if (left <= 0) { submit(); return undefined; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  const mm = String(Math.floor(left / 60)).padStart(2, '0'); const ss = String(left % 60).padStart(2, '0');
  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between border-b border-line bg-paper px-4 py-3 md:-mx-10 md:px-10">
        <span className="text-sm text-muted">{Object.keys(answers).length} dari {quiz.questions.length} terjawab</span>
        <span className={cx('font-display text-2xl font-bold', left < 60 && 'text-danger')} role="timer">{mm}:{ss}</span>
      </div>
      <ol className="space-y-4">
        {quiz.questions.map((q, i) => (
          <li key={q.id}><fieldset className="rounded-lg border border-line bg-white p-4">
            <legend className="px-1 font-semibold">{i + 1}. {q.question}</legend>
            {q.options.map((o, k) => (
              <label key={k} className={cx('mt-1 flex cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-paper', answers[q.id] === k && 'bg-board-100')}>
                <input type="radio" name={q.id} checked={answers[q.id] === k} onChange={() => setAnswers({ ...answers, [q.id]: k })} />{L(k)}. {o}
              </label>
            ))}
          </fieldset></li>
        ))}
      </ol>
      <div className="mt-6 space-y-3">
        <ErrorBox>{error}</ErrorBox>
        <Btn variant="mark" disabled={busy} onClick={() => { if (Object.keys(answers).length === quiz.questions.length || confirm('Masih ada soal yang belum dijawab. Kumpulkan sekarang?')) submit(); }}>Kumpulkan jawaban</Btn>
      </div>
    </>
  );
}

export default function QuizRunner() {
  const { id } = useParams();
  const { data: quiz, loading, error } = useFetch(`/quizzes/${id}`);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState(null);
  if (loading && !quiz) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const done = result || quiz.attempt;

  return (
    <>
      <Link to={`/classes/${quiz.class_id}`} className="mb-2 inline-block text-sm text-board underline">{quiz.class_name}</Link>
      <PageHead title={quiz.title} sub={`${quiz.duration_minutes} menit · nilai lulus ${quiz.passing_score}`} />

      {quiz.manage ? (
        <>
          <h2 className="mb-3 text-xl font-bold">Soal dan kunci jawaban</h2>
          <Review items={quiz.questions} />
          <h2 className="mb-3 mt-8 text-xl font-bold">Hasil siswa ({quiz.attempts.length})</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-muted"><tr><th className="px-4 py-2">Siswa</th><th className="px-4 py-2">Nilai</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Waktu</th></tr></thead>
              <tbody className="divide-y divide-line">
                {quiz.attempts.map((a) => (
                  <tr key={a.id}><td className="px-4 py-2">{a.student?.full_name}</td><td className="px-4 py-2 font-semibold">{a.score}</td>
                    <td className="px-4 py-2"><Badge tone={a.passed ? 'green' : 'red'}>{a.passed ? 'Lulus' : 'Belum lulus'}</Badge></td><td className="px-4 py-2 text-muted">{fmtDate(a.created_at)}</td></tr>
                ))}
                {quiz.attempts.length === 0 && <tr><td colSpan="4" className="px-4 py-6 text-center text-muted">Belum ada yang mengerjakan.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : done ? <Result r={done} quiz={quiz} /> : !started ? (
        <div className="max-w-lg rounded-lg border border-line bg-white p-6">
          <p>Kuis ini berisi {quiz.questions.length} soal dan hanya bisa dikerjakan satu kali. Waktu berjalan begitu Anda menekan tombol mulai, dan jawaban dikumpulkan otomatis saat waktu habis.</p>
          <Btn className="mt-4" onClick={() => setStarted(true)}>Mulai kerjakan</Btn>
        </div>
      ) : <Taker quiz={quiz} onDone={setResult} />}
    </>
  );
}
