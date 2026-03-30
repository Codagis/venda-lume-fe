const API_BASE = import.meta.env.VITE_API_URL || '/api'

const defaultOptions = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    ...defaultOptions,
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Credenciais inválidas. Tente novamente.'
    throw new Error(typeof msg === 'string' ? msg : 'Credenciais inválidas. Tente novamente.')
  }

  return res.json()
}

export async function refreshToken() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  return res.json()
}

export async function fetchMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  })
  if (res.status === 401) return null
  if (!res.ok) return null
  return res.json()
}

export async function logoutApi() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

function clearAuthAndRedirect() {
  window.location.href = '/login'
}

async function handleUnauthorized(res, path, opts) {
  if (res.status !== 401) return res
  try {
    await refreshToken()
    const retry = await fetch(`${API_BASE}${path}`, {
      ...opts,
      credentials: 'include',
      headers: { ...defaultOptions.headers, ...opts?.headers },
    })
    if (retry.status === 401) clearAuthAndRedirect()
    return retry
  } catch {
    clearAuthAndRedirect()
  }
  return res
}

export function apiFetch(path, options = {}) {
  const opts = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options?.headers },
  }
  // Para uploads multipart/form-data, o browser precisa definir o Content-Type com boundary.
  if (opts.body instanceof FormData) {
    const headers = { ...(opts.headers || {}) }
    delete headers['Content-Type']
    delete headers['content-type']
    opts.headers = headers
  }
  return fetch(`${API_BASE}${path}`, opts).then((res) => {
    if (res.status === 401) {
      return handleUnauthorized(res, path, opts)
    }
    return res
  })
}
