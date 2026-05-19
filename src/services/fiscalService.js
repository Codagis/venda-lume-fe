import { apiFetch } from './api'

export async function listNfeIssued(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.top != null) qs.set('$top', String(params.top))
  if (params.skip != null) qs.set('$skip', String(params.skip))
  if (params.inlinecount != null) qs.set('$inlinecount', String(params.inlinecount))
  if (params.referencia) qs.set('referencia', params.referencia)
  if (params.chave) qs.set('chave', params.chave)
  if (params.serie) qs.set('serie', params.serie)
  const res = await apiFetch(`/fiscal/nfe?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao listar NF-e emitidas.')
  }
  return res.json()
}

export async function syncNfeReceived(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.distNsu != null) qs.set('dist_nsu', String(params.distNsu))
  const res = await apiFetch(`/fiscal/nfe/received/sync?${qs.toString()}`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao buscar NF-e recebidas na SEFAZ.')
  }
  return res.json()
}

export async function listNfeReceived(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.top != null) qs.set('$top', String(params.top))
  if (params.skip != null) qs.set('$skip', String(params.skip))
  if (params.inlinecount != null) qs.set('$inlinecount', String(params.inlinecount))
  if (params.distNsu != null) qs.set('dist_nsu', String(params.distNsu))
  if (params.formaDistribuicao) qs.set('forma_distribuicao', params.formaDistribuicao)
  if (params.chaveAcesso) qs.set('chave_acesso', params.chaveAcesso)
  const res = await apiFetch(`/fiscal/nfe/received?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao listar NF-e recebidas.')
  }
  return res.json()
}

export async function getNfeReceivedById(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/received/${encodeURIComponent(id)}?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao detalhar NF-e recebida.')
  }
  return res.json()
}

export async function downloadNfeReceivedPdf(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/received/${encodeURIComponent(id)}/pdf?${qs.toString()}`, {
    headers: {},
  })
  if (!res.ok) throw new Error('Erro ao baixar PDF da NF-e recebida.')
  return res.blob()
}

export async function downloadNfeReceivedXml(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/received/${encodeURIComponent(id)}/xml?${qs.toString()}`, {
    headers: {},
  })
  if (!res.ok) throw new Error('Erro ao baixar XML da NF-e recebida.')
  return res.blob()
}

export async function getNfeIssuedById(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/${encodeURIComponent(id)}?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao detalhar NF-e.')
  }
  return res.json()
}

export async function downloadNfeIssuedPdf(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/${encodeURIComponent(id)}/pdf?${qs.toString()}`, { headers: {} })
  if (!res.ok) throw new Error('Erro ao baixar PDF da NF-e.')
  return res.blob()
}

export async function downloadNfeIssuedXml(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/${encodeURIComponent(id)}/xml?${qs.toString()}`, { headers: {} })
  if (!res.ok) throw new Error('Erro ao baixar XML da NF-e.')
  return res.blob()
}

export async function getFiscalNfeIssuedTaxes(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/${encodeURIComponent(id)}/taxes?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao consultar impostos da NF-e.')
  }
  return res.json()
}

export async function getFiscalNfeReceivedTaxes(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfe/received/${encodeURIComponent(id)}/taxes?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao consultar impostos da NF-e recebida.')
  }
  return res.json()
}

export async function getFiscalNfceIssuedTaxes(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfce/${encodeURIComponent(id)}/taxes?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao consultar impostos da NFC-e.')
  }
  return res.json()
}

export async function getNfceIssuedById(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfce/${encodeURIComponent(id)}?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao detalhar NFC-e.')
  }
  return res.json()
}

export async function downloadNfceIssuedPdf(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfce/${encodeURIComponent(id)}/pdf?${qs.toString()}`, { headers: {} })
  if (!res.ok) throw new Error('Erro ao baixar PDF da NFC-e.')
  return res.blob()
}

export async function downloadNfceIssuedXml(id, params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  const res = await apiFetch(`/fiscal/nfce/${encodeURIComponent(id)}/xml?${qs.toString()}`, { headers: {} })
  if (!res.ok) throw new Error('Erro ao baixar XML da NFC-e.')
  return res.blob()
}

export async function listNfeAll(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.top != null) qs.set('$top', String(params.top))
  if (params.skip != null) qs.set('$skip', String(params.skip))
  if (params.inlinecount != null) qs.set('$inlinecount', String(params.inlinecount))

  if (params.referencia) qs.set('referencia', params.referencia)
  if (params.chave) qs.set('chave', params.chave)
  if (params.serie) qs.set('serie', params.serie)

  if (params.distNsu != null) qs.set('dist_nsu', String(params.distNsu))
  if (params.formaDistribuicao) qs.set('forma_distribuicao', params.formaDistribuicao)
  if (params.chaveAcesso) qs.set('chave_acesso', params.chaveAcesso)

  const res = await apiFetch(`/fiscal/nfe/all?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao listar todas as NF-e.')
  }
  return res.json()
}

export async function runFiscalReconciliation(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate) qs.set('endDate', params.endDate)
  if (params.includeNfe != null) qs.set('includeNfe', String(params.includeNfe))
  const res = await apiFetch(`/fiscal/reconciliation?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao executar conciliação fiscal.')
  }
  return res.json()
}

export async function listNfceIssued(params = {}) {
  const qs = new URLSearchParams()
  if (params.tenantId) qs.set('tenantId', params.tenantId)
  if (params.top != null) qs.set('$top', String(params.top))
  if (params.skip != null) qs.set('$skip', String(params.skip))
  if (params.inlinecount != null) qs.set('$inlinecount', String(params.inlinecount))
  if (params.referencia) qs.set('referencia', params.referencia)
  if (params.chave) qs.set('chave', params.chave)
  if (params.serie) qs.set('serie', params.serie)
  const res = await apiFetch(`/fiscal/nfce?${qs.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || err?.error || 'Erro ao listar NFC-e emitidas.')
  }
  return res.json()
}

