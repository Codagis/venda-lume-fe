import { apiFetch } from './api'

export async function getSalesAnalytics(tenantId = null, startDate = null, endDate = null) {
  const params = new URLSearchParams()
  if (tenantId) params.append('tenantId', tenantId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  const query = params.toString()
  const url = query ? `/analytics/sales?${query}` : '/analytics/sales'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao carregar análise de vendas.')
  return res.json()
}
