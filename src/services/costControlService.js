import { apiFetch } from './api'

// --- Contas a Pagar ---
export async function createPayable(data) {
  const res = await apiFetch('/cost-control/payables', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar conta a pagar.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cadastrar conta a pagar.')
  }
  return res.json()
}

export async function updatePayable(id, data) {
  const res = await apiFetch(`/cost-control/payables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar conta a pagar.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar conta a pagar.')
  }
  return res.json()
}

export async function getPayableById(id) {
  const res = await apiFetch(`/cost-control/payables/${id}`)
  if (!res.ok) throw new Error('Conta a pagar não encontrada.')
  return res.json()
}

export async function searchPayables(filter = {}, tenantId) {
  let url = '/cost-control/payables/search'
  if (tenantId != null && tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(tenantId)}`
  }
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
  if (!res.ok) throw new Error('Erro ao buscar contas a pagar.')
  return res.json()
}

export async function registerPayablePayment(id, data) {
  const res = await apiFetch(`/cost-control/payables/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao registrar pagamento.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao registrar pagamento.')
  }
  return res.json()
}

export async function deletePayable(id) {
  const res = await apiFetch(`/cost-control/payables/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir conta a pagar.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

// --- Contas a Receber ---
export async function createReceivable(data) {
  const res = await apiFetch('/cost-control/receivables', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar conta a receber.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cadastrar conta a receber.')
  }
  return res.json()
}

export async function updateReceivable(id, data) {
  const res = await apiFetch(`/cost-control/receivables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar conta a receber.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar conta a receber.')
  }
  return res.json()
}

export async function getReceivableById(id) {
  const res = await apiFetch(`/cost-control/receivables/${id}`)
  if (!res.ok) throw new Error('Conta a receber não encontrada.')
  return res.json()
}

export async function searchReceivables(filter = {}, tenantId) {
  let url = '/cost-control/receivables/search'
  if (tenantId != null && tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(tenantId)}`
  }
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(filter),
  })
  if (!res.ok) throw new Error('Erro ao buscar contas a receber.')
  return res.json()
}

export async function registerReceivablePayment(id, data) {
  const res = await apiFetch(`/cost-control/receivables/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao registrar recebimento.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao registrar recebimento.')
  }
  return res.json()
}

export async function deleteReceivable(id) {
  const res = await apiFetch(`/cost-control/receivables/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir conta a receber.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

// --- Relatórios (Excel/PDF) ---

function buildReportUrl(path, tenantId) {
  let url = `/cost-control${path}`
  if (tenantId != null && tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(tenantId)}`
  }
  return url
}

export async function downloadPayablesReportExcel(filter = {}, tenantId) {
  const url = buildReportUrl('/payables/report/excel', tenantId)
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(filter) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório Excel.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'contas-a-pagar.xls'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function downloadPayablesReportPdf(filter = {}, tenantId) {
  const url = buildReportUrl('/payables/report/pdf', tenantId)
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(filter) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório PDF.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'contas-a-pagar.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function downloadReceivablesReportExcel(filter = {}, tenantId) {
  const url = buildReportUrl('/receivables/report/excel', tenantId)
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(filter) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório Excel.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'contas-a-receber.xls'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function downloadReceivablesReportPdf(filter = {}, tenantId) {
  const url = buildReportUrl('/receivables/report/pdf', tenantId)
  const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(filter) })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório PDF.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'contas-a-receber.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}
