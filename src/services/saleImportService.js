import { apiFetch } from './api'

export async function importSaleFromInvoice({ tenantId, saleType, pdf, xml, json, jsonText, notes } = {}) {
  const form = new FormData()
  if (tenantId) form.append('tenantId', tenantId)
  if (saleType) form.append('saleType', saleType)
  if (notes) form.append('notes', notes)
  if (jsonText) form.append('jsonText', jsonText)
  if (pdf) form.append('pdf', pdf)
  if (xml) form.append('xml', xml)
  if (json) form.append('json', json)

  const res = await apiFetch('/sales/import/invoice', {
    method: 'POST',
    headers: {}, // deixa o browser setar multipart boundary
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao importar venda a partir da nota.')
  }
  return res.json()
}

