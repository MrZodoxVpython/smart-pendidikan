import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');
export const fmtDate = (d) => (d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const roleLabel = { admin: 'Admin', teacher: 'Guru', student: 'Siswa' };

export function useForm(init) {
  const [f, setF] = useState(init);
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => setF((p) => ({ ...p, [k]: e.target.value })) });
  return [f, bind, setF];
}

// Jalankan aksi async dengan status sibuk dan pesan galat.
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setBusy(true); setError('');
    try { return await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return { busy, error, run, setError };
}

const variants = {
  primary: 'bg-board text-white hover:bg-board-700',
  mark: 'bg-mark text-ink hover:brightness-95',
  ghost: 'border border-line bg-white hover:bg-board-100',
  danger: 'border border-line bg-white text-danger hover:bg-red-50',
};
export function Btn({ variant = 'primary', className, ...p }) {
  return <button className={cx('inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', variants[variant], className)} {...p} />;
}

const field = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-board';
export const Field = ({ label, ...p }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span><input className={field} {...p} /></label>
);
export const Area = ({ label, ...p }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span><textarea rows={4} className={field} {...p} /></label>
);
export const Select = ({ label, children, ...p }) => (
  <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span><select className={field} {...p}>{children}</select></label>
);

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('my-8 w-full rounded-lg bg-white', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="rounded p-1 hover:bg-paper"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const tones = { green: 'bg-board-100 text-board', yellow: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-danger', gray: 'bg-paper text-muted border border-line' };
export const Badge = ({ tone = 'gray', children }) => (
  <span className={cx('inline-block rounded px-2 py-0.5 text-xs font-semibold', tones[tone])}>{children}</span>
);

export const PageHead = ({ title, sub, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-3xl font-bold">{title}</h1>{sub && <p className="mt-1 text-muted">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Spinner = () => (
  <div className="flex justify-center py-16 text-board" role="status" aria-label="Memuat"><Loader2 className="animate-spin" /></div>
);
export const ErrorBox = ({ children }) => children ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{children}</p> : null;
export const Empty = ({ title, hint, children }) => (
  <div className="rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center">
    <p className="font-semibold">{title}</p>
    {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);
export const Section = ({ title, action, children }) => (
  <section className="mb-8">
    <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2>{action}</div>
    {children}
  </section>
);
export const scoreTone = (s, kkm = 70) => (s >= kkm ? 'green' : s >= 60 ? 'yellow' : 'red');
