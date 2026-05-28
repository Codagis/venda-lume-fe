import { apiFetch } from './api'

export async function getSubscriptionAccess() {
  const res = await apiFetch('/subscriptions/access')
  if (!res.ok) throw new Error('Erro ao verificar mensalidade.')
  return res.json()
}

export async function listSubscriptionInvoices() {
  const res = await apiFetch('/subscriptions/invoices')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao listar mensalidades.')
  }
  return res.json()
}

export async function getAdminSubscriptionDashboard(status) {
  const params = status ? `?status=${encodeURIComponent(status)}` : ''
  const res = await apiFetch(`/subscriptions/admin/dashboard${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao carregar resumo de mensalidades.')
  }
  return res.json()
}

export async function cancelAdminInvoice(invoiceId) {
  const res = await apiFetch(`/subscriptions/admin/invoices/${invoiceId}/cancel`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao cancelar fatura.')
  }
}

export async function refreshInvoicePix(invoiceId) {
  const res = await apiFetch(`/subscriptions/invoices/${invoiceId}/refresh-pix`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao gerar PIX.')
  }
  return res.json()
}

export async function syncInvoiceStatus(invoiceId) {
  const res = await apiFetch(`/subscriptions/invoices/${invoiceId}/sync-status`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || 'Erro ao verificar pagamento.')
  }
  return res.json()
}
