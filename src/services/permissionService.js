import { apiFetch } from './api'

export async function listPermissions() {
  const res = await apiFetch('/permissions')
  if (!res.ok) throw new Error('Erro ao listar permissões.')
  return res.json()
}

export async function listPermissionsByModule(module) {
  const res = await apiFetch(`/permissions/module/${encodeURIComponent(module)}`)
  if (!res.ok) throw new Error('Erro ao listar permissões.')
  return res.json()
}

export async function getPermissionById(id) {
  const res = await apiFetch(`/permissions/${id}`)
  if (!res.ok) throw new Error('Permissão não encontrada.')
  return res.json()
}

export async function createPermission(data) {
  const res = await apiFetch('/permissions', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar permissão.')
  }
  return res.json()
}

export async function updatePermission(id, data) {
  const res = await apiFetch(`/permissions/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar permissão.')
  }
  return res.json()
}

export async function deletePermission(id) {
  const res = await apiFetch(`/permissions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir permissão.')
  }
}
