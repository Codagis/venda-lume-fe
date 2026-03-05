import { apiFetch } from './api'

export const UNIT_OF_MEASURE_OPTIONS = [
  { value: 'UN', label: 'Unidade (un)' },
  { value: 'KG', label: 'Quilograma (kg)' },
  { value: 'G', label: 'Grama (g)' },
  { value: 'LT', label: 'Litro (L)' },
  { value: 'ML', label: 'Mililitro (ml)' },
  { value: 'CX', label: 'Caixa (cx)' },
  { value: 'PC', label: 'Pacote (pç)' },
  { value: 'EMB', label: 'Embalagem (emb)' },
  { value: 'DZ', label: 'Dúzia (dz)' },
  { value: 'MD', label: 'Meia dúzia (1/2dz)' },
  { value: 'PORC', label: 'Porção' },
  { value: 'FAT', label: 'Fatia (fat)' },
  { value: 'M', label: 'Metro (m)' },
  { value: 'MLN', label: 'Metro linear (ml)' },
  { value: 'PAR', label: 'Par (par)' },
  { value: 'KIT', label: 'Kit/Conjunto (kit)' },
]

export async function createProduct(data) {
  const res = await apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar produto.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cadastrar produto.')
  }
  return res.json()
}

export async function updateProduct(id, data) {
  const res = await apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar produto.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar produto.')
  }
  return res.json()
}

export async function getProductById(id) {
  const res = await apiFetch(`/products/${id}`)
  if (!res.ok) throw new Error('Produto não encontrado.')
  return res.json()
}

export async function listProducts() {
  const res = await apiFetch('/products/active')
  if (!res.ok) throw new Error('Erro ao listar produtos.')
  return res.json()
}

export async function deleteProduct(id) {
  const res = await apiFetch(`/products/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir produto.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

export async function searchProducts(filter = {}) {
  let url = '/products/search'
  if (filter.tenantId != null && filter.tenantId !== '') {
    const tenantId = typeof filter.tenantId === 'string' ? filter.tenantId : filter.tenantId
    url += `?tenantId=${encodeURIComponent(tenantId)}`
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar produtos.')
  return res.json()
}
