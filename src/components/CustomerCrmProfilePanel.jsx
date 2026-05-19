import { useEffect, useState, useMemo } from 'react'
import { Alert, Spin, Tag, Typography, Row, Col, Statistic, Divider } from 'antd'
import {
  TrophyOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  BulbOutlined,
  SyncOutlined,
  WalletOutlined,
  ShopOutlined,
  CalendarOutlined,
  CarOutlined,
} from '@ant-design/icons'
import { fetchCrmProfile } from '../services/customerService'
import { formatCurrencyBr, getCrmSegmentMeta } from '../config/customerCrmSegments'

const { Text, Paragraph } = Typography

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildBehaviorCards(profile) {
  if (!profile) return []
  const cards = []

  if ((profile.totalOrders ?? 0) > 0) {
    cards.push({
      key: 'orders',
      icon: ShoppingOutlined,
      title: 'Histórico de pedidos',
      value: `${profile.totalOrders} pedido(s)`,
      detail: `Faturamento ${formatCurrencyBr(profile.totalRevenue)} · Ticket médio ${formatCurrencyBr(profile.averageTicket)}`,
      accent: 'orders',
    })
  }

  if (profile.purchasesPerWeek != null && Number(profile.purchasesPerWeek) > 0) {
    cards.push({
      key: 'frequency',
      icon: SyncOutlined,
      title: 'Frequência',
      value: `~${profile.purchasesPerWeek} compra(s)/semana`,
      detail: 'Média entre a primeira e a última compra',
      accent: 'frequency',
    })
  }

  if (profile.daysSinceLastPurchase != null) {
    const days = profile.daysSinceLastPurchase
    cards.push({
      key: 'recency',
      icon: ClockCircleOutlined,
      title: 'Última compra',
      value: days === 0 ? 'Hoje' : days === 1 ? 'Ontem' : `Há ${days} dias`,
      detail: profile.lastPurchaseAt
        ? formatDateTime(profile.lastPurchaseAt)
        : 'Data da última venda registrada',
      accent: days > 30 ? 'alert' : 'recency',
    })
  }

  if (profile.topProducts?.length > 0) {
    cards.push({
      key: 'products',
      icon: TrophyOutlined,
      title: 'Produtos favoritos',
      value: profile.topProducts
        .slice(0, 2)
        .map((p) => p.productName)
        .join(', '),
      detail:
        profile.topProducts.length > 2
          ? `+${profile.topProducts.length - 2} outro(s) no ranking`
          : 'Itens mais comprados',
      accent: 'products',
      wide: true,
      products: profile.topProducts,
    })
  }

  if (profile.preferredPaymentMethodLabel) {
    cards.push({
      key: 'payment',
      icon: WalletOutlined,
      title: 'Pagamento preferido',
      value: profile.preferredPaymentMethodLabel,
      detail: 'Forma mais utilizada nas vendas',
      accent: 'payment',
    })
  }

  if (profile.preferredChannelLabel) {
    cards.push({
      key: 'channel',
      icon: ShopOutlined,
      title: 'Canal preferido',
      value: profile.preferredChannelLabel,
      detail: 'Onde o cliente mais costuma comprar',
      accent: 'channel',
    })
  }

  if (profile.preferredDayOfWeek) {
    const when = profile.preferredTimeSlot
      ? `${profile.preferredDayOfWeek} (${profile.preferredTimeSlot})`
      : profile.preferredDayOfWeek
    cards.push({
      key: 'schedule',
      icon: CalendarOutlined,
      title: 'Quando compra',
      value: when,
      detail: 'Dia e período com mais pedidos',
      accent: 'schedule',
    })
  }

  if ((profile.deliveryOrdersCount ?? 0) > 0) {
    cards.push({
      key: 'delivery',
      icon: CarOutlined,
      title: 'Delivery',
      value: `${profile.deliveryOrdersCount} pedido(s)`,
      detail: 'Vendas com entrega no endereço',
      accent: 'delivery',
    })
  }

  if (
    profile.locationSummary &&
    profile.locationSummary !== 'Endereço não informado no cadastro'
  ) {
    cards.push({
      key: 'location',
      icon: EnvironmentOutlined,
      title: 'Localização',
      value: profile.locationSummary,
      detail: 'Região cadastrada do cliente',
      accent: 'location',
    })
  }

  return cards
}

function CrmBehaviorCard({ card }) {
  const Icon = card.icon
  return (
    <article
      className={`customers-crm-behavior-card customers-crm-behavior-card--${card.accent}${card.wide ? ' customers-crm-behavior-card--wide' : ''}`}
    >
      <div className="customers-crm-behavior-card-icon" aria-hidden>
        <Icon />
      </div>
      <div className="customers-crm-behavior-card-body">
        <Text type="secondary" className="customers-crm-behavior-card-title">
          {card.title}
        </Text>
        {!card.products?.length && (
          <p className="customers-crm-behavior-card-value">{card.value}</p>
        )}
        {card.products?.length > 0 ? (
          <ul className="customers-crm-behavior-products">
            {card.products.map((p) => (
              <li key={p.productName}>
                <span className="customers-crm-behavior-product-name">{p.productName}</span>
                <span className="customers-crm-behavior-product-meta">
                  {Number(p.quantity)} un. · {formatCurrencyBr(p.revenue)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          card.detail && (
            <Text type="secondary" className="customers-crm-behavior-card-detail">
              {card.detail}
            </Text>
          )
        )}
      </div>
    </article>
  )
}

export default function CustomerCrmProfilePanel({ customerId, tenantId, customerName }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!customerId) {
      setProfile(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchCrmProfile(customerId, tenantId)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Erro ao carregar perfil.')
          setProfile(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId, tenantId])

  const behaviorCards = useMemo(() => buildBehaviorCards(profile), [profile])

  if (loading) {
    return (
      <div className="customers-crm-loading">
        <Spin tip="Analisando histórico de compras..." />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" showIcon message={error} />
  }

  if (!profile) {
    return null
  }

  const summary = profile.summary || {}
  const primaryMeta = getCrmSegmentMeta(summary.primarySegment)
  const segments = summary.segments || []

  return (
    <div className="customers-crm-profile">
      <div className="customers-crm-profile-header">
        <div>
          <Text type="secondary">Perfil comportamental</Text>
          <h3 className="customers-crm-profile-name">{customerName || profile.customerName}</h3>
        </div>
        <Tag color={primaryMeta.color} className="customers-crm-primary-tag">
          {summary.primarySegmentLabel || primaryMeta.label}
        </Tag>
      </div>

      {segments.length > 1 && (
        <div className="customers-crm-segments-row">
          {segments.map((code) => {
            const meta = getCrmSegmentMeta(code)
            return (
              <Tag key={code} color={meta.color}>
                {meta.label}
              </Tag>
            )
          })}
        </div>
      )}

      <Alert
        type="info"
        showIcon
        icon={<BulbOutlined />}
        message="Estratégia recomendada"
        description={profile.strategicRecommendation || summary.strategicInsight}
        className="customers-crm-strategy-alert"
      />

      <Row gutter={[12, 12]} className="customers-crm-stats">
        <Col xs={12} sm={8}>
          <Statistic title="Pedidos" value={profile.totalOrders ?? 0} prefix={<ShoppingOutlined />} />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Ticket médio"
            value={formatCurrencyBr(profile.averageTicket)}
            valueStyle={{ fontSize: '1rem' }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Frequência"
            value={profile.purchasesPerWeek != null ? `~${profile.purchasesPerWeek}/sem` : '—'}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic title="Faturamento" value={formatCurrencyBr(profile.totalRevenue)} valueStyle={{ fontSize: '1rem' }} />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic
            title="Última compra"
            value={
              profile.daysSinceLastPurchase != null
                ? `${profile.daysSinceLastPurchase} dia(s)`
                : '—'
            }
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={8}>
          <Statistic title="Delivery" value={profile.deliveryOrdersCount ?? 0} />
        </Col>
      </Row>

      <section className="customers-crm-behavior-section">
        <div className="customers-crm-behavior-section-head">
          <h4 className="customers-crm-behavior-section-title">Comportamento de compra</h4>
          <Text type="secondary" className="customers-crm-behavior-section-sub">
            Insights automáticos a partir do histórico de vendas
          </Text>
        </div>
        {behaviorCards.length > 0 ? (
          <div className="customers-crm-behavior-grid">
            {behaviorCards.map((card) => (
              <CrmBehaviorCard key={card.key} card={card} />
            ))}
          </div>
        ) : (
          <Text type="secondary">Sem dados de compra suficientes para montar o perfil.</Text>
        )}
      </section>

      <Paragraph type="secondary" className="customers-crm-dates">
        Cliente desde {formatDateTime(profile.customerSince)}
        {profile.lastPurchaseAt && (
          <>
            {' '}
            · Última compra {formatDateTime(profile.lastPurchaseAt)}
          </>
        )}
      </Paragraph>
    </div>
  )
}
