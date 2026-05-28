export function formatMoney(value) {
  if (value == null) return 'R$ 0,00'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(iso) {
  if (!iso) return '-'
  const [y, m, d] = String(iso).split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export const STATUS_LABELS = {
  PENDING: { color: 'processing', text: 'Pendente' },
  OVERDUE: { color: 'error', text: 'Em atraso' },
  PAID: { color: 'success', text: 'Pago' },
  CANCELLED: { color: 'default', text: 'Cancelada' },
}

export function canAccessSubscription(user) {
  if (!user || user.isRoot) return false
  if (user.role === 'TENANT_ADMIN' || user.role === 'SUPER_ADMIN') return true
  const authorities = user.authorities || []
  return (
    authorities.includes('PERMISSION_SUBSCRIPTION_VIEW') ||
    authorities.includes('PERMISSION_TENANT_MANAGE')
  )
}
