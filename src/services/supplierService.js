import { apiFetch } from './api'

export async function createSupplier(data) {
  const res = await apiFetch('/suppliers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar fornecedor.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cadastrar fornecedor.')
  }
  return res.json()
}

export async function updateSupplier(id, data) {
  const res = await apiFetch(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar fornecedor.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar fornecedor.')
  }
  return res.json()
}

export async function getSupplierById(id) {
  const res = await apiFetch(`/suppliers/${id}`)
  if (!res.ok) throw new Error('Fornecedor nao encontrado.')
  return res.json()
}

export async function deleteSupplier(id) {
  const res = await apiFetch(`/suppliers/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir fornecedor.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

export async function searchSuppliers(filter = {}) {
  let url = '/suppliers/search'
  if (filter.tenantId != null && filter.tenantId !== '') {
    const tid = typeof filter.tenantId === 'string' ? filter.tenantId : filter.tenantId
    url += '?tenantId=' + encodeURIComponent(tid)
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar fornecedores.')
  return res.json()
}
