const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getAuthHeaders() {
  const token = sessionStorage.getItem('vendalume_access_token')
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * Upload de imagem de produto para o GCS.
 * Organização no bucket: tenants/{tenantId}/products/{productId}-{slug}/ ou .../novo/
 * @param {File} file - Arquivo de imagem (JPEG, PNG, GIF, WebP, máx 5MB)
 * @param {string} [productId] - ID do produto (quando editando)
 * @param {string} [productName] - Nome do produto (para slug na pasta)
 * @returns {Promise<{ url: string }>} URL pública da imagem
 */
export async function uploadProductImage(file, productId, productName, tenantId) {
  const formData = new FormData()
  formData.append('file', file)
  if (productId) formData.append('productId', productId)
  if (productName) formData.append('productName', productName)
  if (tenantId) formData.append('tenantId', tenantId)

  const res = await fetch(`${API_BASE}/products/upload-image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  if (res.status === 401) {
    sessionStorage.removeItem('vendalume_access_token')
    sessionStorage.removeItem('vendalume_refresh_token')
    sessionStorage.removeItem('vendalume_user')
    window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error || 'Erro no upload da imagem.'
    throw new Error(msg)
  }

  const data = await res.json()
  if (!data?.url) throw new Error('URL não retornada pelo servidor.')
  return data
}

/**
 * Upload de logo da empresa para o GCS.
 * @param {File} file - Arquivo de imagem (JPEG, PNG, GIF, WebP)
 * @returns {Promise<{ url: string }>} URL pública da imagem
 */
export async function uploadTenantLogo(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload?folder=tenants`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  if (res.status === 401) {
    sessionStorage.removeItem('vendalume_access_token')
    sessionStorage.removeItem('vendalume_refresh_token')
    sessionStorage.removeItem('vendalume_user')
    window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error || 'Erro no upload da logo.'
    throw new Error(msg)
  }

  const data = await res.json()
  if (!data?.url) throw new Error('URL não retornada pelo servidor.')
  return data
}

/**
 * Upload de foto/comprovante de entrega para o GCS.
 * @param {File} file - Arquivo de imagem (JPEG, PNG, etc.)
 * @returns {Promise<{ url: string }>} URL pública da imagem
 */
export async function uploadDeliveryProofPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload?folder=deliveries`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  })

  if (res.status === 401) {
    sessionStorage.removeItem('vendalume_access_token')
    sessionStorage.removeItem('vendalume_refresh_token')
    sessionStorage.removeItem('vendalume_user')
    window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error || 'Erro no upload da foto.'
    throw new Error(msg)
  }

  const data = await res.json()
  if (!data?.url) throw new Error('URL não retornada pelo servidor.')
  return data
}
