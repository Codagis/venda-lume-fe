import { apiFetch } from './api'

export async function createEmployee(data) {
  const res = await apiFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cadastrar funcionário.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function updateEmployee(id, data) {
  const res = await apiFetch(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar funcionário.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function getEmployeeById(id) {
  const res = await apiFetch(`/employees/${id}`)
  if (!res.ok) throw new Error('Funcionário não encontrado.')
  return res.json()
}

export async function deleteEmployee(id) {
  const res = await apiFetch(`/employees/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao excluir funcionário.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
}

export async function searchEmployees(filter = {}) {
  let url = '/employees/search'
  if (filter.tenantId != null && filter.tenantId !== '') {
    url += '?tenantId=' + encodeURIComponent(filter.tenantId)
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar funcionários.')
  return res.json()
}

export async function generatePayroll(tenantId, year, month) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  if (tenantId != null && tenantId !== '') params.set('tenantId', tenantId)
  const res = await apiFetch(`/payroll/generate?${params}`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao gerar folha.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

/**
 * Gera contas a pagar para funcionários e meses selecionados.
 * @param {string|null} tenantId - ID da empresa (root)
 * @param {Object} payload - { employeeIds: string[], months: { year: number, month: number }[] }
 */
export async function generatePayrollBatch(tenantId, payload) {
  let url = '/payroll/generate-batch'
  if (tenantId != null && tenantId !== '') {
    url += '?tenantId=' + encodeURIComponent(tenantId)
  }
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao gerar contas.'
    throw new Error(typeof msg === 'string' ? msg : msg)
  }
  return res.json()
}

export async function getGeneratedPayrolls(tenantId) {
  let url = '/payroll/generated'
  if (tenantId != null && tenantId !== '') url += `?tenantId=${encodeURIComponent(tenantId)}`
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao listar folhas geradas.')
  return res.json()
}

export async function getPayrollReport(tenantId, year, month) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  if (tenantId != null && tenantId !== '') params.set('tenantId', tenantId)
  const res = await apiFetch(`/payroll/report?${params}`)
  if (!res.ok) throw new Error('Erro ao carregar folha.')
  return res.json()
}

function buildPayrollReportUrl(path, tenantId, year, month) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  if (tenantId != null && tenantId !== '') params.set('tenantId', tenantId)
  return `/payroll/report${path}?${params}`
}

export async function downloadPayrollReportPdf(tenantId, year, month) {
  const url = buildPayrollReportUrl('/pdf', tenantId, year, month)
  const res = await apiFetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar PDF da folha.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = `folha-pagamento-${year}-${String(month).padStart(2, '0')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function downloadPayrollReportExcel(tenantId, year, month) {
  const url = buildPayrollReportUrl('/excel', tenantId, year, month)
  const res = await apiFetch(url)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar Excel da folha.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = `folha-pagamento-${year}-${String(month).padStart(2, '0')}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function downloadSalaryReceiptPdf(tenantId, employeeId, year, month) {
  const params = new URLSearchParams({ year: String(year), month: String(month) })
  if (tenantId != null && tenantId !== '') params.set('tenantId', tenantId)
  const res = await apiFetch(`/payroll/receipt/${employeeId}?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar recibo.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = `recibo-salario-${year}-${String(month).padStart(2, '0')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}
