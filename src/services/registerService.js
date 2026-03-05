import { apiFetch } from './api'

export async function listRegisters(tenantId = null, activeOnly = false) {
  const params = new URLSearchParams()
  if (tenantId) params.append('tenantId', tenantId)
  if (activeOnly) params.append('activeOnly', 'true')
  const q = params.toString()
  const url = q ? `/registers?${q}` : '/registers'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar pontos de venda.')
  return res.json()
}

export async function getRegisterById(id, tenantId = null) {
  const url = tenantId ? `/registers/${id}?tenantId=${encodeURIComponent(tenantId)}` : `/registers/${id}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Ponto de venda não encontrado.')
  return res.json()
}

export async function createRegister(data, tenantId = null) {
  const url = tenantId ? `/registers?tenantId=${encodeURIComponent(tenantId)}` : '/registers'
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cadastrar.')
  }
  return res.json()
}

export async function updateRegister(id, data, tenantId = null) {
  const url = tenantId ? `/registers/${id}?tenantId=${encodeURIComponent(tenantId)}` : `/registers/${id}`
  const res = await apiFetch(url, { method: 'PUT', body: JSON.stringify(data) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar.')
  }
  return res.json()
}

export async function deleteRegister(id, tenantId = null) {
  const url = tenantId ? `/registers/${id}?tenantId=${encodeURIComponent(tenantId)}` : `/registers/${id}`
  const res = await apiFetch(url, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir.')
  }
}

export async function assignOperators(registerId, userIds, tenantId = null) {
  const url = tenantId
    ? `/registers/${registerId}/operators?tenantId=${encodeURIComponent(tenantId)}`
    : `/registers/${registerId}/operators`
  const res = await apiFetch(url, { method: 'PUT', body: JSON.stringify({ userIds }) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atribuir operadores.')
  }
  return res.json()
}

export async function listCashiers(tenantId = null) {
  const url = tenantId ? `/registers/cashiers?tenantId=${encodeURIComponent(tenantId)}` : '/registers/cashiers'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar operadores de caixa.')
  return res.json()
}
