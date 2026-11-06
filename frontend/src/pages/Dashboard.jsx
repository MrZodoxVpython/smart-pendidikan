import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../lib/auth.jsx';
import { useFetch } from '../lib/api.js';
import { PageHead, Section, Spinner, Empty, ErrorBox, fmtDate } from '../components/ui.jsx';

const sub = {
  admin: 'Ringkasan seluruh sekolah.',
  teacher: 'Ringkasan kelas yang Anda ajar.',
  student: 'Ringkasan belajar Anda.',
};

export function StatStrip({ cards }) {
  return (
    <dl className="mb-8 grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-white md:flex">
      {cards.map((c) => (
        <div key={c.label} className="flex-1 border-b border-r border-line px-5 py-4 last:border-r-0 md:border-b-0">
          <dd className="font-display text-3xl font-bold">{c.value}</dd>
          <dt className="mt-1 text-sm text-muted">{c.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/analytics/overview');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const isStudent = user.role === 'student';

  return (
    <>
      <PageHead title={`Halo, ${user.full_name.split(' ')[0]}`} sub={sub[user.role]} />
      <StatStrip cards={data.cards} />

      <Section title="Aktivitas 14 hari terakhir">
        <div className="h-60 rounded-lg border border-line bg-white p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend}>
              <CartesianGrid stroke="#E4EAE7" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5B6B64' }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5B6B64' }} width={28} />
              <Tooltip />
              <Area type="monotone" dataKey="aktivitas" name="Aktivitas" stroke="#1F6B52" fill="#1F6B52" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {isStudent ? (
        <Section title="Tenggat terdekat">
          {data.upcoming.length === 0 ? (
            <Empty title="Tidak ada tugas yang menunggu" hint="Tugas baru dari guru akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {data.upcoming.map((a) => (
                <li key={a.id}><Link to={`/assignments/${a.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                  <span><span className="font-semibold">{a.title}</span><span className="block text-sm text-muted">{a.class_name}</span></span>
                  <span className="text-sm text-muted">{fmtDate(a.due_date)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Section>
      ) : (
        <Section title="Menunggu penilaian">
          {data.pending.length === 0 ? (
            <Empty title="Semua tugas sudah dinilai" hint="Pengumpulan baru dari siswa akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-white">
              {data.pending.map((p, i) => (
                <li key={i}><Link to={`/assignments/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-paper">
                  <span><span className="font-semibold">{p.student}</span><span className="block text-sm text-muted">{p.title}</span></span>
                  <span className="text-sm text-muted">{fmtDate(p.submitted_at)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}
