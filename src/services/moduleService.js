import { apiFetch } from './api'

export async function listModules() {
  const res = await apiFetch('/modules')
  if (!res.ok) throw new Error('Falha ao carregar módulos')
  return res.json()
}


export async function listModulesAdmin() {
  const res = await apiFetch('/modules/admin')
  if (!res.ok) throw new Error('Falha ao carregar módulos')
  return res.json()
}

export async function getModuleById(id) {
  const res = await apiFetch(`/modules/admin/${id}`)
  if (!res.ok) throw new Error('Módulo não encontrado')
  return res.json()
}

export async function createModule(data) {
  const res = await apiFetch('/modules/admin', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar módulo')
  }
  return res.json()
}

export async function updateModule(id, data) {
  const res = await apiFetch(`/modules/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar módulo')
  }
  return res.json()
}

export async function deleteModule(id) {
  const res = await apiFetch(`/modules/admin/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir módulo')
  }
}
