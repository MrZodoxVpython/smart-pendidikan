import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('edu_token'));

  useEffect(() => {
    if (localStorage.getItem('edu_token')) {
      api.get('/auth/me').then((d) => setUser(d.user)).catch(() => {}).finally(() => setLoading(false));
    }
    const out = () => setUser(null);
    window.addEventListener('edu-logout', out);
    return () => window.removeEventListener('edu-logout', out);
  }, []);

  const finish = (d) => {
    localStorage.setItem('edu_token', d.token);
    localStorage.setItem('edu_refresh', d.refresh_token);
    setUser(d.user);
  };
  const value = {
    user, loading,
    login: async (email, password) => finish(await api.post('/auth/login', { email, password })),
    register: async (form) => finish(await api.post('/auth/register', form)),
    logout: () => { localStorage.removeItem('edu_token'); localStorage.removeItem('edu_refresh'); setUser(null); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
