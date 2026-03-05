import { apiFetch } from './api'

export async function listUsers() {
  const res = await apiFetch('/users')
  if (!res.ok) throw new Error('Erro ao listar usuários')
  return res.json()
}

export async function getUserById(id) {
  const res = await apiFetch(`/users/${id}`)
  if (!res.ok) throw new Error('Usuário não encontrado')
  return res.json()
}

export async function createUser(data) {
  const res = await apiFetch('/users', { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar usuário')
  }
  return res.json()
}

export async function updateUser(id, data) {
  const res = await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar usuário')
  }
  return res.json()
}
