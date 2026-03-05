import { apiFetch } from './api'

/**
 * @param {string|null} tenantId
 * @param {string} [startDate] - YYYY-MM-DD
 * @param {string} [endDate] - YYYY-MM-DD
 */
export async function getDashboardAnalytics(tenantId = null, startDate = null, endDate = null) {
  const params = new URLSearchParams()
  if (tenantId != null && tenantId !== '') params.append('tenantId', tenantId)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  const query = params.toString()
  const url = query ? `/dashboard/analytics?${query}` : '/dashboard/analytics'
  const res = await apiFetch(url)
  if (!res.ok) throw new Error('Erro ao carregar dados do dashboard.')
  return res.json()
}
