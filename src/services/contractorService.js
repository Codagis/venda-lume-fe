import { apiFetch } from './api'

export async function searchContractors(params = {}, tenantId) {
  const { search, active, page = 0, size = 20, sortBy = 'name', sortDirection = 'asc' } = params
  let url = '/contractors?page=' + page + '&size=' + size + '&sortBy=' + sortBy + '&sortDirection=' + sortDirection
  if (tenantId != null && tenantId !== '') url += '&tenantId=' + encodeURIComponent(tenantId)
  if (search != null && search !== '') url += '&search=' + encodeURIComponent(search)
  if (active !== undefined && active !== null && active !== '') url += '&active=' + (active === true || active === 'true')
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao buscar prestadores PJ.')
  return res.json()
}

export async function getContractorById(id) {
  const res = await apiFetch(`/contractors/${id}`)
  if (!res.ok) throw new Error('Prestador não encontrado.')
  return res.json()
}

export async function createContractor(data) {
  const res = await apiFetch('/contractors', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar prestador.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function updateContractor(id, data) {
  const res = await apiFetch(`/contractors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar prestador.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function deleteContractor(id) {
  const res = await apiFetch(`/contractors/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir prestador.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

export async function listContractorsOptions(tenantId) {
  let url = '/contractors/options'
  if (tenantId != null && tenantId !== '') {
    url += '?tenantId=' + encodeURIComponent(tenantId)
  }
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao carregar prestadores PJ.')
  return res.json()
}

export async function listContractorInvoices(contractorId) {
  const res = await apiFetch(`/contractors/${contractorId}/invoices`)
  if (!res.ok) throw new Error('Erro ao carregar notas fiscais do prestador.')
  return res.json()
}

export async function createContractorInvoice(contractorId, data, file) {
  const formData = new FormData()
  formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  if (file) formData.append('file', file)
  const res = await apiFetch(`/contractors/${contractorId}/invoices`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao registrar nota fiscal.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function uploadContractorInvoiceFile(contractorId, invoiceId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await apiFetch(`/contractors/${contractorId}/invoices/${invoiceId}/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao enviar arquivo da NF.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}
