import { apiFetch } from './api'

export async function listProfiles(tenantId = null) {
  const url = tenantId ? `/profiles?tenantId=${tenantId}` : '/profiles'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar perfis.')
  return res.json()
}

export async function getProfileById(id) {
  const res = await apiFetch(`/profiles/${id}`)
  if (!res.ok) throw new Error('Perfil não encontrado.')
  return res.json()
}

export async function createProfile(data) {
  const res = await apiFetch('/profiles', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar perfil.')
  }
  return res.json()
}

export async function updateProfile(id, data) {
  const res = await apiFetch(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar perfil.')
  }
  return res.json()
}

export async function deleteProfile(id) {
  const res = await apiFetch(`/profiles/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir perfil.')
  }
}
