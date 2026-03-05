import { apiFetch } from './api'

export async function listByTenant(tenantId) {
  const res = await apiFetch(`/tenants/${tenantId}/card-machines`)
  if (!res.ok) throw new Error('Erro ao listar maquininhas.')
  return res.json()
}

export async function listCurrent() {
  const res = await apiFetch('/tenants/current/card-machines')
  if (!res.ok) throw new Error('Erro ao listar maquininhas.')
  return res.json()
}

export async function listActiveByTenant(tenantId) {
  const res = await apiFetch(`/tenants/${tenantId}/card-machines/active`)
  if (!res.ok) throw new Error('Erro ao listar maquininhas.')
  return res.json()
}

export async function listCurrentActive() {
  const res = await apiFetch('/tenants/current/card-machines/active')
  if (!res.ok) throw new Error('Erro ao listar maquininhas.')
  return res.json()
}

export async function create(tenantId, data) {
  const res = await apiFetch(`/tenants/${tenantId}/card-machines`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar maquininha.')
  }
  return res.json()
}

export async function createCurrent(data) {
  const res = await apiFetch('/tenants/current/card-machines', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar maquininha.')
  }
  return res.json()
}

export async function update(tenantId, id, data) {
  const res = await apiFetch(`/tenants/${tenantId}/card-machines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar maquininha.')
  }
  return res.json()
}

export async function updateCurrent(id, data) {
  const res = await apiFetch(`/tenants/current/card-machines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar maquininha.')
  }
  return res.json()
}

export async function remove(tenantId, id) {
  const res = await apiFetch(`/tenants/${tenantId}/card-machines/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir maquininha.')
  }
}

export async function removeCurrent(id) {
  const res = await apiFetch(`/tenants/current/card-machines/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir maquininha.')
  }
}
