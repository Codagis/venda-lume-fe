const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

function appendBlob(form, field, blob) {
  if (!blob || !(blob instanceof Blob) || blob.size === 0) return
  const name = blob.name || `${field}.bin`
  form.append(field, blob, name)
}

export async function importSaleFromInvoice({ tenantId, saleType, xml, json, jsonText, notes } = {}) {
  const form = new FormData()
  if (tenantId) form.append('tenantId', tenantId)
  if (saleType) form.append('saleType', saleType)
  if (notes) form.append('notes', notes)
  if (jsonText) form.append('jsonText', jsonText)
  appendBlob(form, 'xml', xml)
  appendBlob(form, 'json', json)

  if (!form.has('xml') && !form.has('json') && !jsonText) {
    throw new Error('Arquivo não foi anexado ao envio. Selecione o XML ou JSON novamente.')
  }

  const res = await fetch(`${API_BASE}/sales/import/invoice`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao importar venda a partir da nota.')
  }
  return res.json()
}
