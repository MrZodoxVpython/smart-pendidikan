import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, BarChart3, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { cx, roleLabel } from './ui.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const items = [
    { to: '/', label: 'Dasbor', icon: LayoutDashboard, end: true },
    { to: '/classes', label: 'Kelas', icon: BookOpen },
    ...(user.role !== 'student' ? [{ to: '/people', label: user.role === 'admin' ? 'Pengguna' : 'Siswa', icon: Users }] : []),
    { to: '/analytics', label: 'Analisis', icon: BarChart3 },
  ];
  const link = ({ isActive }) => cx('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition', isActive ? 'bg-white/10 text-mark' : 'text-white/80 hover:bg-white/5');
  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-board text-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:p-4">
        <div className="flex items-center gap-2 px-4 py-3 md:px-3 md:pb-6">
          <GraduationCap className="text-mark" />
          <span className="font-display text-xl font-bold">EduSmart</span>
          <button onClick={logout} className="ml-auto rounded p-2 hover:bg-white/10 md:hidden" aria-label="Keluar"><LogOut size={18} /></button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:px-0 md:pb-0" aria-label="Menu utama">
          {items.map(({ to, label, icon: I, end }) => (
            <NavLink key={to} to={to} end={end} className={link}><I size={18} />{label}</NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 pt-4 md:block">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="mb-3 text-xs text-white/60">{roleLabel[user.role]}</p>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/5"><LogOut size={16} />Keluar</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8"><Outlet /></main>
    </div>
  );
}
