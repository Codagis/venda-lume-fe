import { apiFetch } from './api'

export async function searchDeliveries(filter = {}, tenantId = null) {
  let url = '/deliveries/search'
  if (tenantId) url += '?tenantId=' + encodeURIComponent(tenantId)
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
  if (!res.ok) throw new Error('Erro ao buscar entregas.')
  return res.json()
}

export async function listMyDeliveries() {
  const res = await apiFetch('/deliveries/my')
  if (!res.ok) throw new Error('Erro ao listar minhas entregas.')
  return res.json()
}

export async function listActiveDeliveries(tenantId = null) {
  let url = '/deliveries/active'
  if (tenantId) url += '?tenantId=' + encodeURIComponent(tenantId)
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar entregas ativas.')
  return res.json()
}

export async function listSalesWithoutDelivery(tenantId = null) {
  let url = '/deliveries/sales-without-delivery'
  if (tenantId) url += '?tenantId=' + encodeURIComponent(tenantId)
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar vendas sem entrega.')
  return res.json()
}

export async function listDeliveryPersons(tenantId = null) {
  let url = '/deliveries/delivery-persons'
  if (tenantId) url += '?tenantId=' + encodeURIComponent(tenantId)
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar entregadores.')
  return res.json()
}

export async function getDeliveryById(id) {
  const res = await apiFetch(`/deliveries/${id}`)
  if (!res.ok) throw new Error('Entrega não encontrada.')
  return res.json()
}

/**
 * Obtém dados do mapa OSM (Leaflet + OpenStreetMap). 100% gratuito.
 * @returns {Promise<{originLat, originLon, destLat, destLon, originAddress, destAddress, distanceText, byFoot, byBike, byCar}>}
 */
export async function getDeliveryMapOsm(id) {
  const res = await apiFetch(`/deliveries/${id}/map-osm`)
  if (!res.ok) throw new Error('Erro ao obter mapa.')
  return res.json()
}

export async function createDelivery(data) {
  const res = await apiFetch('/deliveries', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao criar entrega.')
  }
  return res.json()
}

export async function assignDeliveryPerson(id, deliveryPersonId) {
  const res = await apiFetch(`/deliveries/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify({ deliveryPersonId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atribuir entregador.')
  }
  return res.json()
}

export async function updateDeliveryStatus(id, data) {
  const res = await apiFetch(`/deliveries/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar status.')
  }
  return res.json()
}
