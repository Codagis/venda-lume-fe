import { apiFetch } from './api'


export async function createSection(data) {
  const res = await apiFetch('/tables/sections', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao criar seção.')
  }
  return res.json()
}

export async function updateSection(id, data) {
  const res = await apiFetch(`/tables/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar seção.')
  }
  return res.json()
}

export async function getSectionById(id) {
  const res = await apiFetch(`/tables/sections/${id}`)
  if (!res.ok) throw new Error('Seção não encontrada.')
  return res.json()
}

export async function listSections(tenantId = null) {
  let url = '/tables/sections'
  if (tenantId) url += `?tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar seções.')
  return res.json()
}

export async function searchSections(filter = {}) {
  let url = '/tables/sections/search'
  if (filter.tenantId) url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar seções.')
  return res.json()
}

export async function deleteSection(id) {
  const res = await apiFetch(`/tables/sections/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir seção.')
  }
}

export async function createTable(data) {
  const res = await apiFetch('/tables', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao criar mesa.')
  }
  return res.json()
}

export async function updateTable(id, data) {
  const res = await apiFetch(`/tables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar mesa.')
  }
  return res.json()
}

export async function getTableById(id) {
  const res = await apiFetch(`/tables/${id}`)
  if (!res.ok) throw new Error('Mesa não encontrada.')
  return res.json()
}

export async function listTablesBySection(tenantId, sectionId) {
  let url = `/tables?sectionId=${encodeURIComponent(sectionId)}`
  if (tenantId) url += `&tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar mesas.')
  return res.json()
}

export async function searchTables(filter = {}) {
  let url = '/tables/search'
  if (filter.tenantId) url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar mesas.')
  return res.json()
}

export async function deleteTable(id) {
  const res = await apiFetch(`/tables/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir mesa.')
  }
}


export async function createReservation(data) {
  const res = await apiFetch('/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao criar reserva.')
  }
  return res.json()
}

export async function updateReservation(id, data) {
  const res = await apiFetch(`/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao atualizar reserva.')
  }
  return res.json()
}

export async function getReservationById(id) {
  const res = await apiFetch(`/reservations/${id}`)
  if (!res.ok) throw new Error('Reserva não encontrada.')
  return res.json()
}

export async function searchReservations(filter = {}) {
  let url = '/reservations/search'
  if (filter.tenantId) url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar reservas.')
  return res.json()
}

export async function deleteReservation(id) {
  const res = await apiFetch(`/reservations/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao excluir reserva.')
  }
}

export async function downloadReservationReceiptPdf(reservationId) {
  const res = await apiFetch(`/reservations/${reservationId}/receipt.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar comprovante.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comprovante-reserva-${reservationId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
