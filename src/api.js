// src/api.js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

let _token = sessionStorage.getItem('fc_token') || null;
const setToken = (t) => { _token = t; if(t) sessionStorage.setItem('fc_token',t); else sessionStorage.removeItem('fc_token'); };
const getToken = () => _token;

const req = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
};

export const authApi = {
  register: async (email, password) => {
    const data = await req('POST', '/api/auth/register', { email, password });
    setToken(data.token); return data.user;
  },
  login: async (email, password) => {
    const data = await req('POST', '/api/auth/login', { email, password });
    setToken(data.token); return data.user;
  },
  logout: () => setToken(null),
  me: () => req('GET', '/api/auth/me'),
  isLoggedIn: () => !!getToken(),
};

export const txApi = {
  getAll:  ()   => req('GET',    '/api/transactions?limit=500'),
  summary: ()   => req('GET',    '/api/transactions/summary'),
  create:  (tx) => req('POST',   '/api/transactions', tx),
  delete:  (id) => req('DELETE', `/api/transactions/${id}`),
};

export const walletApi = {
  getAll: ()        => req('GET', '/api/wallets'),
  save:   (wallets) => req('PUT', '/api/wallets', { wallets }),
};

export const mpApi = {
  getConnectUrl: () => req('GET',    '/api/mercadopago/connect'),
  status:        () => req('GET',    '/api/mercadopago/status'),
  sync:          () => req('POST',   '/api/mercadopago/sync'),
  disconnect:    () => req('DELETE', '/api/mercadopago/disconnect'),
};
