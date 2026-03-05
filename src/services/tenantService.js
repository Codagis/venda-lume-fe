import { apiFetch } from './api'

export async function listTenants() {
  const res = await apiFetch('/tenants')
  if (!res.ok) throw new Error('Erro ao listar empresas.')
  return res.json()
}

export async function getTenantById(id) {
  const res = await apiFetch(`/tenants/${id}`)
  if (!res.ok) throw new Error('Empresa não encontrada.')
  return res.json()
}

export async function getCurrentTenant() {
  const res = await apiFetch('/tenants/current')
  if (!res.ok) throw new Error('Empresa não encontrada.')
  return res.json()
}

export async function createTenant(data) {
  const res = await apiFetch('/tenants', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar empresa.')
  }
  return res.json()
}

export async function updateTenant(id, data) {
  const res = await apiFetch(`/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar empresa.')
  }
  return res.json()
}

export async function deleteTenant(id) {
  const res = await apiFetch(`/tenants/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir empresa.')
  }
}
