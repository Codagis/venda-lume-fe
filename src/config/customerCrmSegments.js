/** Segmentos CRM automáticos (espelham CustomerCrmSegment no backend). */
export const CRM_SEGMENT_META = {
  NEW: { label: 'Novo', color: 'cyan' },
  CHURNED: { label: 'Sumido', color: 'red' },
  VIP: { label: 'VIP', color: 'gold' },
  PREMIUM: { label: 'Premium', color: 'purple' },
  FREQUENT: { label: 'Frequente', color: 'green' },
  PROMOTION: { label: 'Promoção', color: 'orange' },
  REGULAR: { label: 'Regular', color: 'default' },
  NO_PURCHASES: { label: 'Sem compras', color: 'default' },
}

export function getCrmSegmentMeta(code) {
  return CRM_SEGMENT_META[code] || { label: code || '—', color: 'default' }
}

export function formatCurrencyBr(value) {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(value))
}
