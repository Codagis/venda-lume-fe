import { apiFetch } from './api'

export const SALE_TYPE_OPTIONS = [
  { value: 'PDV', label: 'PDV' },
  { value: 'DELIVERY', label: 'Entrega' },
  { value: 'TAKEAWAY', label: 'Retirada' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'WHOLESALE', label: 'Atacado' },
  { value: 'CATERING', label: 'Eventos' },
]

/** Retorna o label em português do tipo de venda */
export function getSaleTypeLabel(value) {
  if (!value) return '—'
  const opt = SALE_TYPE_OPTIONS.find((o) => o.value === value)
  return opt ? opt.label : value
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'BANK_TRANSFER', label: 'Transferência' },
  { value: 'MEAL_VOUCHER', label: 'Vale refeição' },
  { value: 'FOOD_VOUCHER', label: 'Vale alimentação' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'CREDIT', label: 'Crédito/Fiado' },
  { value: 'OTHER', label: 'Outro' },
]

/** Opções de forma de pagamento no PDV (sem Crédito/Fiado e sem Outro) */
export const PAYMENT_METHOD_OPTIONS_PDV = PAYMENT_METHOD_OPTIONS.filter((o) => o.value !== 'CREDIT' && o.value !== 'OTHER')

export async function createSale(data) {
  const res = await apiFetch('/sales', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao registrar venda.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao registrar venda.')
  }
  return res.json()
}

export async function getSaleById(id) {
  const res = await apiFetch(`/sales/${id}`)
  if (!res.ok) throw new Error('Venda não encontrada.')
  return res.json()
}

/**
 * Atualiza apenas o código de autorização do cartão (venda com pagamento crédito/débito).
 * Alteração é auditada.
 */
export async function updateSaleCardAuthorization(saleId, cardAuthorization) {
  const res = await apiFetch(`/sales/${saleId}/card-authorization`, {
    method: 'PATCH',
    body: JSON.stringify({ cardAuthorization: cardAuthorization != null ? String(cardAuthorization).trim() : null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar autorização.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar autorização.')
  }
  return res.json()
}

/**
 * Adiciona o pagamento a uma venda pendente (status OPEN) e conclui a venda.
 */
export async function addSalePayment(saleId, data) {
  const res = await apiFetch(`/sales/${saleId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({
      paymentMethod: data.paymentMethod,
      amountReceived: data.amountReceived ?? undefined,
      discountAmount: data.discountAmount ?? undefined,
      discountPercent: data.discountPercent ?? undefined,
      deliveryFee: data.deliveryFee ?? undefined,
      installmentsCount: data.installmentsCount ?? undefined,
      cardMachineId: data.cardMachineId ?? undefined,
      cardBrand: data.cardBrand ?? undefined,
      cardAuthorization: data.cardAuthorization?.trim() || undefined,
      cardIntegrationType: data.cardIntegrationType ?? undefined,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao adicionar pagamento.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao adicionar pagamento.')
  }
  return res.json()
}

/**
 * Atualiza o cliente da venda (nome e CPF/CNPJ). Alteração é auditada.
 */
export async function updateSaleCustomer(saleId, data) {
  const res = await apiFetch(`/sales/${saleId}/customer`, {
    method: 'PATCH',
    body: JSON.stringify({
      customerId: data.customerId ?? undefined,
      customerName: data.customerName != null ? String(data.customerName).trim() || undefined : undefined,
      customerDocument: data.customerDocument != null ? String(data.customerDocument).trim() || undefined : undefined,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao atualizar cliente da venda.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao atualizar cliente da venda.')
  }
  return res.json()
}

/**
 * Lista registros de auditoria da venda (criação, cancelamento, emissão de nota etc.).
 */
export async function getSaleAudit(saleId) {
  const res = await apiFetch(`/sales/${saleId}/audit`)
  if (!res.ok) throw new Error('Erro ao carregar auditoria da venda.')
  return res.json()
}

export async function searchSales(filter = {}) {
  let url = '/sales/search'
  if (filter.tenantId != null && filter.tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar vendas.')
  return res.json()
}

export async function getSalesSummary(filter = {}) {
  let url = '/sales/summary'
  if (filter.tenantId != null && filter.tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Erro ao buscar resumo de vendas.')
  return res.json()
}

export const SALE_STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'PAID', label: 'Paga' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'OPEN', label: 'Aberta' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

/**
 * Emite NFC-e via Fiscal Simplify e faz download do PDF oficial da SEFAZ (cupom fiscal completo).
 */
export async function downloadFiscalReceiptPdf(saleId, saleNumber = '') {
  const res = await apiFetch(`/sales/${saleId}/fiscal-receipt.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar cupom fiscal (Fiscal Simplify). Verifique se a empresa está cadastrada no Fiscal Simplify.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cupom-fiscal-nfce-${saleNumber || saleId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadReceiptPdf(saleId, saleNumber = '') {
  const res = await apiFetch(`/sales/${saleId}/receipt.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao gerar cupom fiscal.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cupom-fiscal-${saleNumber || saleId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadSimpleReceiptPdf(saleId, saleNumber = '') {
  const res = await apiFetch(`/sales/${saleId}/simple-receipt.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao gerar comprovante.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comprovante-venda-${saleNumber || saleId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Emite NF-e via Fiscal Simplify, grava na venda e faz download do PDF (DANFE).
 */
export async function downloadNfePdf(saleId, saleNumber = '') {
  const res = await apiFetch(`/sales/${saleId}/nfe.pdf`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar NF-e. Verifique se a empresa está configurada para NF-e.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nfe-${saleNumber || saleId}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Exporta relatório de vendas em Excel (XLS) conforme filtros aplicados.
 */
export async function downloadSalesReportExcel(filter = {}) {
  let url = '/sales/report/excel'
  if (filter.tenantId != null && filter.tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório Excel.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'relatorio-vendas.xls'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

/**
 * Exporta relatório de vendas em PDF conforme filtros aplicados.
 */
export async function downloadSalesReportPdf(filter = {}) {
  let url = '/sales/report/pdf'
  if (filter.tenantId != null && filter.tenantId !== '') {
    url += `?tenantId=${encodeURIComponent(filter.tenantId)}`
  }
  const body = { ...filter }
  delete body.tenantId
  const res = await apiFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao gerar relatório PDF.')
  }
  const blob = await res.blob()
  const urlObj = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = urlObj
  a.download = 'relatorio-vendas.pdf'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(urlObj)
}

export async function cancelSale(id, reason) {
  const res = await apiFetch(`/sales/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason || null }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.message || err?.error || 'Erro ao cancelar venda.'
    throw new Error(typeof msg === 'string' ? msg : 'Erro ao cancelar venda.')
  }
  return res.json()
}
