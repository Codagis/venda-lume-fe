import { apiFetch } from './api'

export async function createCustomer(data) {
  const res = await apiFetch('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar cliente.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cadastrar cliente.')
  }
  return res.json()
}

export async function updateCustomer(id, data) {
  const res = await apiFetch(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar cliente.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar cliente.')
  }
  return res.json()
}

export async function getCustomerById(id) {
  const res = await apiFetch(`/customers/${id}`)
  if (!res.ok) throw new Error('Cliente não encontrado.')
  return res.json()
}

export async function deleteCustomer(id) {
  const res = await apiFetch(`/customers/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir cliente.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

export async function searchCustomers(filter = {}) {
  let url = '/customers/search'
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
  if (!res.ok) throw new Error('Erro ao buscar clientes.')
  return res.json()
}
