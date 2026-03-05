import { apiFetch } from './api'

export const STOCK_MOVEMENT_TYPES = {
  SALE: { value: 'SALE', label: 'Venda' },
  MANUAL_ENTRY: { value: 'MANUAL_ENTRY', label: 'Entrada manual' },
  MANUAL_EXIT: { value: 'MANUAL_EXIT', label: 'Saída manual' },
  ADJUSTMENT: { value: 'ADJUSTMENT', label: 'Ajuste' },
}

export async function searchStockMovements(tenantId, filter = {}) {
  let url = '/stock/movements/search'
  if (tenantId) url += `?tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
  if (!res.ok) throw new Error('Erro ao buscar movimentações.')
  return res.json()
}

export async function getMovementsByProduct(tenantId, productId, limit = 20) {
  let url = `/stock/movements/product/${productId}?limit=${limit}`
  if (tenantId) url += `&tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao buscar movimentações do produto.')
  return res.json()
}

export async function registerMovement(tenantId, data) {
  let url = '/stock/movements'
  if (tenantId) url += `?tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao registrar movimentação.')
  }
  return res.json()
}
