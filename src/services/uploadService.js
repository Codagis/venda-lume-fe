const API_BASE = import.meta.env.VITE_API_URL || '/api'

const defaultOptions = { credentials: 'include' }

export async function uploadProductImage(file, productId, productName, tenantId) {
  const formData = new FormData()
  formData.append('file', file)
  if (productId) formData.append('productId', productId)
  if (productName) formData.append('productName', productName)
  if (tenantId) formData.append('tenantId', tenantId)

  const res = await fetch(`${API_BASE}/products/upload-image`, {
    method: 'POST',
    ...defaultOptions,
    body: formData,
  })

  if (res.status === 401) {
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

export async function uploadTenantLogo(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload?folder=tenants`, {
    method: 'POST',
    ...defaultOptions,
    body: formData,
  })

  if (res.status === 401) {
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

export async function uploadDeliveryProofPhoto(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/upload?folder=deliveries`, {
    method: 'POST',
    ...defaultOptions,
    body: formData,
  })

  if (res.status === 401) {
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
