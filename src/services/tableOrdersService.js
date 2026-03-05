import { apiFetch } from './api'

export async function openOrder(tableId, tenantId = null) {
  const body = { tableId }
  if (tenantId) body.tenantId = tenantId
  const res = await apiFetch('/table-orders/open', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao abrir comanda.')
  }
  return res.json()
}

export async function getOrderById(id) {
  const res = await apiFetch(`/table-orders/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Comanda não encontrada.')
  }
  return res.json()
}

export async function listOpenOrders(tenantId = null) {
  let url = '/table-orders'
  if (tenantId) url += `?tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar comandas abertas.')
  return res.json()
}

export async function addOrderItem(orderId, productId, quantity = 1) {
  const res = await apiFetch(`/table-orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao adicionar item.')
  }
  return res.json()
}

export async function removeOrderItem(itemId) {
  const res = await apiFetch(`/table-orders/items/${itemId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao remover item.')
  }
}

export async function updateOrderItemQuantity(itemId, quantity) {
  const res = await apiFetch(`/table-orders/items/${itemId}/quantity`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar quantidade.')
  }
  return res.json()
}

export async function cancelOrder(orderId) {
  const res = await apiFetch(`/table-orders/${orderId}/cancel`, {
    method: 'POST',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao cancelar comanda.')
  }
}

export async function updateOrderNotes(orderId, notes) {
  const res = await apiFetch(`/table-orders/${orderId}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes: notes != null ? String(notes).trim() || null : null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar observações.')
  }
  return res.json()
}

export async function downloadComandaAccountPdf(orderId) {
  const res = await apiFetch(`/table-orders/${orderId}/account.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar conta.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `conta-${orderId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function closeOrderAsPending(orderId, data = {}) {
  const res = await apiFetch(`/table-orders/${orderId}/close-pending`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao criar venda pendente.')
  }
  return res.json()
}

export async function downloadComandaKitchenPdf(orderId) {
  const res = await apiFetch(`/table-orders/${orderId}/kitchen-receipt.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar comanda para cozinha.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comanda-cozinha-${orderId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function closeOrder(orderId, data) {
  const res = await apiFetch(`/table-orders/${orderId}/close`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao fechar comanda.')
  }
  return res.json()
}
