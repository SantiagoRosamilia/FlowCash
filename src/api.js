// src/api.js
// ─────────────────────────────────────────────────────────────
// Capa de comunicación con el backend en Railway.
// Todos los requests pasan por acá — ningún componente
// habla directamente con el servidor.
//
// IMPORTANTE: reemplazá VITE_API_URL en tu .env con la URL
// que Railway te da al hacer el deploy del backend.
// ─────────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Token storage (solo en memoria + sessionStorage) ─────────
// No usamos localStorage para el token porque sessionStorage
// se limpia cuando cerrás el tab — más seguro.
let _token = sessionStorage.getItem('fc_token') || null;

const setToken = (t) => {
  _token = t;
  if (t) sessionStorage.setItem('fc_token', t);
  else   sessionStorage.removeItem('fc_token');
};

const getToken = () => _token;

// ── Request helper ────────────────────────────────────────────
const req = async (method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();

  if (!res.ok) {
    // El backend siempre devuelve { error: "mensaje" }
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
};

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: async (email, password) => {
    const data = await req('POST', '/api/auth/register', { email, password });
    setToken(data.token);
    return data.user;
  },

  login: async (email, password) => {
    const data = await req('POST', '/api/auth/login', { email, password });
    setToken(data.token);
    return data.user;
  },

  logout: () => {
    setToken(null);
  },

  me: () => req('GET', '/api/auth/me'),

  isLoggedIn: () => !!getToken(),
};

// ── Transactions ──────────────────────────────────────────────
export const txApi = {
  // Traer TODOS los movimientos del usuario autenticado
  getAll: () => req('GET', '/api/transactions?limit=500'),

  // Resumen del dashboard (saldo, ingresos, gastos, por billetera)
  summary: () => req('GET', '/api/transactions/summary'),

  // Crear un movimiento nuevo
  create: (tx) => req('POST', '/api/transactions', tx),

  // Eliminar un movimiento
  delete: (id) => req('DELETE', `/api/transactions/${id}`),
};

// ── Mercado Pago ──────────────────────────────────────────────
export const mpApi = {
  // URL de autorización OAuth (para conectar MP)
  getConnectUrl: () => req('GET', '/api/mercadopago/connect'),

  // Estado de la conexión con MP
  status: () => req('GET', '/api/mercadopago/status'),

  // Sync manual (el botón "Actualizar")
  sync: () => req('POST', '/api/mercadopago/sync'),

  // Desconectar MP
  disconnect: () => req('DELETE', '/api/mercadopago/disconnect'),
};
