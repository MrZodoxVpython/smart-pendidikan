import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../lib/auth.jsx';
import { useFetch } from '../lib/api.js';
import { Badge, Empty, ErrorBox, PageHead, Section, Spinner, scoreTone } from '../components/ui.jsx';
import { StatStrip } from './Dashboard.jsx';

const tick = { fontSize: 11, fill: '#5B6B64' };
const bucketColor = ['#B83A2A', '#E0A526', '#4F8FC0', '#2D8A6A', '#14352B'];
const Box = ({ children, h = 'h-64' }) => <div className={`${h} rounded-lg border border-line bg-white p-4`}>{children}</div>;

export default function Analytics() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/analytics/overview');
  if (loading && !data) return <Spinner />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const isStudent = user.role === 'student';
  const hasScores = data.distribution.some((d) => d.siswa > 0) || data.timeline.length > 0;

  return (
    <>
      <PageHead title="Analisis pendidikan" sub={`Nilai tugas dan kuis dinormalisasi ke skala 100. Ketuntasan minimal: ${data.kkm}.`} />
      <StatStrip cards={data.cards} />
      {!hasScores && <Empty title="Belum ada nilai untuk dianalisis" hint="Grafik akan terisi setelah tugas dinilai dan kuis dikerjakan." />}

      {hasScores && (
        <>
          {isStudent ? (
            <Section title="Perkembangan nilai">
              <Box><ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timeline}>
                  <CartesianGrid stroke="#E4EAE7" vertical={false} />
                  <XAxis dataKey="label" tick={tick} /><YAxis domain={[0, 100]} tick={tick} width={30} /><Tooltip />
                  <Line type="monotone" dataKey="nilai" name="Nilai" stroke="#1F6B52" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer></Box>
            </Section>
          ) : (
            <Section title="Sebaran rata-rata nilai siswa">
              <Box><ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution}>
                  <CartesianGrid stroke="#E4EAE7" vertical={false} />
                  <XAxis dataKey="range" tick={tick} /><YAxis allowDecimals={false} tick={tick} width={28} /><Tooltip />
                  <Bar dataKey="siswa" name="Jumlah siswa" radius={[3, 3, 0, 0]}>
                    {data.distribution.map((_, i) => <Cell key={i} fill={bucketColor[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer></Box>
            </Section>
          )}

          <Section title={isStudent ? 'Rata-rata per kelas' : 'Performa per kelas'}>
            <Box><ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.classes}>
                <CartesianGrid stroke="#E4EAE7" vertical={false} />
                <XAxis dataKey="name" tick={tick} /><YAxis domain={[0, 100]} tick={tick} width={30} /><Tooltip /><Legend />
                <Bar dataKey="rata" name="Rata-rata nilai" fill="#1F6B52" radius={[3, 3, 0, 0]} />
                {!isStudent && <Bar dataKey="lulus" name="Tuntas (%)" fill="#F0B429" radius={[3, 3, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer></Box>
          </Section>

          {!isStudent && (
            <div className="grid gap-6 md:grid-cols-2">
              <Section title="Nilai tertinggi">
                <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                  {data.ranking.map((s, i) => (
                    <li key={s.id} className="flex items-center justify-between px-4 py-3"><span>{i + 1}. {s.name}</span><Badge tone="green">{s.avg}</Badge></li>
                  ))}
                </ul>
              </Section>
              <Section title="Perlu perhatian (rata-rata di bawah 60)">
                {data.atRisk.length === 0 ? <Empty title="Tidak ada siswa berisiko" hint="Semua siswa bernilai 60 ke atas." /> : (
                  <ul className="divide-y divide-line rounded-lg border border-line bg-white">
                    {data.atRisk.map((s) => (
                      <li key={s.id} className="flex items-center justify-between px-4 py-3"><span>{s.name}</span><Badge tone={scoreTone(s.avg)}>{s.avg}</Badge></li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          )}
        </>
      )}
    </>
  );
}
