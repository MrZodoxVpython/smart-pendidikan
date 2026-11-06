import { useCallback, useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || '/api';
const J = { 'Content-Type': 'application/json' };
let refreshing = null;

function refresh() {
  const rt = localStorage.getItem('edu_refresh');
  if (!rt) return Promise.resolve(false);
  refreshing ||= fetch(`${BASE}/auth/refresh`, { method: 'POST', headers: J, body: JSON.stringify({ refresh_token: rt }) })
    .then(async (r) => {
      if (!r.ok) return false;
      const d = await r.json();
      localStorage.setItem('edu_token', d.token);
      localStorage.setItem('edu_refresh', d.refresh_token);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });
  return refreshing;
}

async function request(path, { method = 'GET', body } = {}, retry = true) {
  const token = localStorage.getItem('edu_token');
  const res = await fetch(BASE + path, {
    method,
    headers: { ...J, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token && !path.startsWith('/auth/login')) {
    if (retry && (await refresh())) return request(path, { method, body }, false);
    localStorage.removeItem('edu_token');
    localStorage.removeItem('edu_refresh');
    window.dispatchEvent(new Event('edu-logout'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan, coba lagi');
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body = {}) => request(p, { method: 'POST', body }),
  put: (p, body = {}) => request(p, { method: 'PUT', body }),
  patch: (p, body = {}) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
};

// Ambil data dari API. Pass path=null untuk menunda.
export function useFetch(path) {
  const [s, setS] = useState({ data: null, loading: !!path, error: null });
  const load = useCallback(() => {
    if (!path) return;
    setS((x) => ({ ...x, loading: true, error: null }));
    api.get(path)
      .then((data) => setS({ data, loading: false, error: null }))
      .catch((e) => setS({ data: null, loading: false, error: e.message }));
  }, [path]);
  useEffect(load, [load]);
  return { ...s, reload: load };
}
