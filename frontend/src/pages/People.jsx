import { useState } from 'react';
import { api, useFetch } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { Badge, Empty, ErrorBox, Modal, PageHead, Spinner, fmtDay, roleLabel, scoreTone, useAction } from '../components/ui.jsx';

function History({ id, onClose }) {
  const { data, loading, error } = useFetch(`/users/${id}/history`);
  return (
    <Modal title="Riwayat pembelajaran" onClose={onClose} wide>
      {loading ? <Spinner /> : error ? <ErrorBox>{error}</ErrorBox> : (
        <div className="space-y-5 text-sm">
          <div><p className="text-lg font-bold">{data.profile.full_name}</p><p className="text-muted">{data.profile.email} · NIS {data.profile.nis || '-'} · {data.profile.major || 'Tanpa jurusan'}</p></div>
          <div><h3 className="mb-1 font-bold">Kelas ({data.classes.length})</h3>
            <p>{data.classes.map((e) => e.class?.name).join(', ') || 'Belum mengikuti kelas'}</p></div>
          <div><h3 className="mb-1 font-bold">Tugas</h3>
            {data.submissions.length === 0 ? <p className="text-muted">Belum ada pengumpulan.</p> : (
              <ul className="divide-y divide-line rounded-md border border-line">
                {data.submissions.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2 px-3 py-2"><span>{s.assignment?.title}<span className="block text-xs text-muted">{fmtDay(s.submitted_at)}</span></span>
                    {s.score !== null ? <Badge tone={scoreTone((s.score / s.assignment.max_score) * 100)}>{s.score}/{s.assignment.max_score}</Badge> : <Badge tone="yellow">Menunggu nilai</Badge>}</li>
                ))}
              </ul>
            )}
          </div>
          <div><h3 className="mb-1 font-bold">Kuis</h3>
            {data.attempts.length === 0 ? <p className="text-muted">Belum ada kuis dikerjakan.</p> : (
              <ul className="divide-y divide-line rounded-md border border-line">
                {data.attempts.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2 px-3 py-2"><span>{a.quiz?.title}<span className="block text-xs text-muted">{fmtDay(a.created_at)}</span></span><Badge tone={a.passed ? 'green' : 'red'}>{a.score}</Badge></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function People() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [view, setView] = useState(null);
  const { data, loading, error, reload } = useFetch(`/users${isAdmin && role ? `?role=${role}` : ''}`);
  const act = useAction();

  const list = (data || []).filter((u) => `${u.full_name} ${u.email} ${u.nis || ''}`.toLowerCase().includes(q.toLowerCase()));
  const changeRole = (id, r) => act.run(async () => { await api.patch(`/users/${id}`, { role: r }); reload(); });
  const remove = (u) => confirm(`Hapus akun ${u.full_name}? Seluruh data nilainya ikut terhapus.`) && act.run(async () => { await api.del(`/users/${u.id}`); reload(); });

  return (
    <>
      <PageHead title={isAdmin ? 'Pengguna' : 'Data siswa'} sub={isAdmin ? 'Kelola akun, peran, dan data seluruh pengguna.' : 'Data siswa dan riwayat pembelajarannya.'} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, atau NIS" aria-label="Cari" className="w-full max-w-xs rounded-md border border-line bg-white px-3 py-2 text-sm" />
        {isAdmin && (
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filter peran" className="rounded-md border border-line bg-white px-3 py-2 text-sm">
            <option value="">Semua peran</option><option value="student">Siswa</option><option value="teacher">Guru</option><option value="admin">Admin</option>
          </select>
        )}
      </div>
      <ErrorBox>{error || act.error}</ErrorBox>
      {loading && !data ? <Spinner /> : list.length === 0 ? <Empty title="Tidak ada data yang cocok" /> : (
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-muted"><tr><th className="px-4 py-2">Nama</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">NIS</th><th className="px-4 py-2">Jurusan</th><th className="px-4 py-2">Peran</th><th /></tr></thead>
            <tbody className="divide-y divide-line">
              {list.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2"><button onClick={() => setView(u.id)} className="font-semibold text-board underline">{u.full_name || '(tanpa nama)'}</button></td>
                  <td className="px-4 py-2">{u.email}</td><td className="px-4 py-2">{u.nis || '-'}</td><td className="px-4 py-2">{u.major || '-'}</td>
                  <td className="px-4 py-2">{isAdmin && u.id !== user.id ? (
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} aria-label={`Peran ${u.full_name}`} className="rounded border border-line px-2 py-1">
                      {Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  ) : <Badge>{roleLabel[u.role]}</Badge>}</td>
                  <td className="px-4 py-2 text-right">{isAdmin && u.id !== user.id && <button onClick={() => remove(u)} className="text-danger underline">Hapus</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view && <History id={view} onClose={() => setView(null)} />}
    </>
  );
}
