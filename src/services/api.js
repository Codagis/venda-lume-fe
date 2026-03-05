const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders() {
  const token = sessionStorage.getItem('vendalume_access_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Credenciais inválidas. Tente novamente.'
    throw new Error(typeof msg === 'string' ? msg : 'Credenciais inválidas. Tente novamente.')
  }

  return res.json()
}

export async function refreshToken(refreshTokenValue) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  })

  if (!res.ok) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return res.json()
}

function clearAuthAndRedirect() {
  sessionStorage.removeItem('vendalume_access_token')
  sessionStorage.removeItem('vendalume_refresh_token')
  sessionStorage.removeItem('vendalume_user')
  window.location.href = '/login'
}

export function apiFetch(path, options = {}) {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  }).then((res) => {
    if (res.status === 401) {
      clearAuthAndRedirect()
    }
    return res
  })
}
