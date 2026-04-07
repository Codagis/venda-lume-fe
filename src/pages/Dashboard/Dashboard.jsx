import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Spin,
  Alert,
  message,
  Table,
  Tag,
  Progress,
  Typography,
  Empty,
  DatePicker,
  Button,
} from 'antd'
import {
  DollarOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  InboxOutlined,
  WarningOutlined,
  ArrowUpOutlined,
  TrophyOutlined,
  RiseOutlined,
  PieChartOutlined,
  BulbOutlined,
  FilterOutlined,
  DownOutlined,
} from '@ant-design/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'

dayjs.locale('pt-br')
import { useAuth } from '../../contexts/AuthContext'
import { useModules } from '../../contexts/ModulesContext'
import { getIcon } from '../../config/iconRegistry'
import { getDashboardAnalytics } from '../../services/dashboardService'
import { getSalesAnalytics } from '../../services/salesAnalyticsService'
import * as tenantService from '../../services/tenantService'
import { RevealWhenReady, DelayedReveal } from '../../components/VlMotion'
import './Dashboard.css'

const { Text } = Typography
const COLORS = ['#22c55e', '#38bdf8', '#fbbf24', '#64748b', '#a78bfa', '#2dd4bf']
const COLORS2 = ['#115e59', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6']
const STRIP_ACCENT = ['#22c55e', '#fbbf24', '#38bdf8', '#64748b', '#a78bfa', '#34d399']
const RECOMMENDATION_ICONS = {
  PRODUCT_FOCUS: TrophyOutlined,
  INVESTMENT: RiseOutlined,
  SEGMENT_LEADER: BarChartOutlined,
  SEGMENT_GROWTH: PieChartOutlined,
  TICKET: DollarOutlined,
}
const SALE_TYPE_LABELS = {
  PDV: 'PDV',
  DELIVERY: 'Delivery',
  TAKEAWAY: 'Retirada',
  ONLINE: 'Online',
  WHOLESALE: 'Atacado',
  CATERING: 'Eventos',
}

function formatCurrency(value) {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

const DASH_GRID_GUTTER = [20, 20]

export default function Dashboard() {
  const { user } = useAuth()
  const { modules } = useModules()
  const navigate = useNavigate()

  const quickActionModules = modules
    .filter((m) => m.route && m.code !== 'DASHBOARD')
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999))
  const isRoot = user?.isRoot === true
  const [analytics, setAnalytics] = useState(null)
  const [salesAnalytics, setSalesAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day'))
  const [endDate, setEndDate] = useState(dayjs())
  const [appliedStartDate, setAppliedStartDate] = useState(dayjs().subtract(30, 'day'))
  const [appliedEndDate, setAppliedEndDate] = useState(dayjs())
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const loadTenants = useCallback(async () => {
    if (!isRoot) return
    try {
      const data = await tenantService.listTenants()
      setTenants(data || [])
      if (data?.length && !selectedTenantId) {
        setSelectedTenantId(data[0].id)
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresas.')
    }
  }, [isRoot])

  const loadAnalytics = useCallback(async (overrideStart, overrideEnd) => {
    if (isRoot && !selectedTenantId) {
      setAnalytics(null)
      setSalesAnalytics(null)
      setLoading(false)
      return
    }
    const start = (overrideStart ?? appliedStartDate).format('YYYY-MM-DD')
    const end = (overrideEnd ?? appliedEndDate).format('YYYY-MM-DD')
    setLoading(true)
    try {
      const [dashboardData, salesData] = await Promise.all([
        getDashboardAnalytics(isRoot ? selectedTenantId : null, start, end),
        getSalesAnalytics(isRoot ? selectedTenantId : null, start, end),
      ])
      setAnalytics(dashboardData)
      setSalesAnalytics(salesData)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar dashboard.')
      setAnalytics(null)
      setSalesAnalytics(null)
    } finally {
      setLoading(false)
    }
  }, [isRoot, selectedTenantId, appliedStartDate, appliedEndDate])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    if (!isRoot) loadAnalytics()
  }, [isRoot, loadAnalytics])

  useEffect(() => {
    if (isRoot && selectedTenantId) loadAnalytics()
  }, [isRoot, selectedTenantId, loadAnalytics])

  const handleBuscar = () => {
    if (startDate.isAfter(endDate, 'day')) {
      message.warning('Data início não pode ser maior que data fim.')
      return
    }
    setAppliedStartDate(startDate)
    setAppliedEndDate(endDate)
    loadAnalytics(startDate, endDate)
  }

  const month = analytics?.monthSummary
  const week = analytics?.weekSummary
  const today = analytics?.todaySummary
  const ticketMedio = month?.count > 0 && month?.totalAmount != null
    ? Number(month.totalAmount) / month.count
    : 0

  const salesByTypeFiltered = (analytics?.salesByType || []).filter(
    (s) => s.count > 0 || (s.total && Number(s.total) > 0)
  )
  const pieData = salesByTypeFiltered.map((s, i) => ({
    name: SALE_TYPE_LABELS[s.type] || s.type,
    value: Number(s.total || 0),
    fill: COLORS[i % COLORS.length],
  }))

  if (isRoot && tenants.length === 0 && !loading) {
    return (
      <div className="dashboard">
        <main className="dashboard-main">
          <Alert
            type="info"
            message="Nenhuma empresa cadastrada"
            description="Cadastre uma empresa para visualizar o dashboard."
            showIcon
          />
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        <header className="dashboard-hero">
          <p className="dashboard-hero-date">{dayjs().format('dddd, D [de] MMMM [de] YYYY')}</p>
          <h1 className="dashboard-hero-title">
            Bem-vindo de volta
            {user?.fullName
              ? `, ${user.fullName.trim().split(/\s+/)[0]}!`
              : '!'}
          </h1>
          <p className="dashboard-hero-sub">Visão geral do seu negócio e indicadores do período.</p>
        </header>

        <Card className="dashboard-filters-card dashboard-surface-card">
          <div className="dashboard-filters-toggle">
            <Button
              type="button"
              className={`dashboard-filters-toggle-btn${filtersExpanded ? ' dashboard-filters-toggle-btn--open' : ''}`}
              icon={<FilterOutlined />}
              onClick={() => setFiltersExpanded((v) => !v)}
              aria-expanded={filtersExpanded}
            >
              <span className="dashboard-filters-toggle-label">
                {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
              </span>
              <DownOutlined className="dashboard-filters-chevron" aria-hidden />
            </Button>
          </div>
          <div
            className={`dashboard-filters-expand${filtersExpanded ? ' dashboard-filters-expand--open' : ''}`}
            aria-hidden={!filtersExpanded}
          >
            <div className="dashboard-filters-expand-inner">
              <Row gutter={DASH_GRID_GUTTER} align="middle" className="dashboard-filters-row">
                <Col xs={24} sm={12} md={4}>
                  <label className="dashboard-filter-label">Data início</label>
                  <DatePicker
                    value={startDate}
                    onChange={(d) => setStartDate(d || dayjs().subtract(30, 'day'))}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    maxDate={dayjs()}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <label className="dashboard-filter-label">Data fim</label>
                  <DatePicker
                    value={endDate}
                    onChange={(d) => setEndDate(d || dayjs())}
                    format="DD/MM/YYYY"
                    allowClear={false}
                    maxDate={dayjs()}
                    disabledDate={(d) => startDate ? d.isBefore(startDate, 'day') : false}
                    style={{ width: '100%' }}
                  />
                </Col>
                {isRoot && tenants.length > 0 && (
                  <Col xs={24} sm={12} md={4}>
                    <label className="dashboard-filter-label">Empresa</label>
                    <Select
                      placeholder="Selecione a empresa"
                      options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                      value={selectedTenantId}
                      onChange={setSelectedTenantId}
                      className="dashboard-tenant-select"
                      style={{ width: '100%' }}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Col>
                )}
                <Col xs={24} sm={12} md={4} className="dashboard-filters-buscar-col">
                  <Button type="primary" icon={<FilterOutlined />} onClick={handleBuscar} loading={loading} block>
                    Buscar
                  </Button>
                </Col>
              </Row>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="dashboard-loading">
            <Spin size="large" tip="Carregando dashboard..." />
          </div>
        ) : !analytics ? (
          <Alert
            type="info"
            message="Selecione uma empresa"
            description="Escolha uma empresa acima para visualizar os indicadores."
            showIcon
          />
        ) : (
          <RevealWhenReady ready delayMs={110}>
            <>
            <div className="dashboard-kpis">
              <Row gutter={DASH_GRID_GUTTER}>
                <Col xs={24} lg={12}>
                  <Card className="dashboard-kpi-card dashboard-kpi-spotlight">
                    <div className="dashboard-kpi-spotlight-head">
                      <span className="dashboard-kpi-spotlight-label">
                        <DollarOutlined /> Faturamento do período
                      </span>
                    </div>
                    <div className="dashboard-kpi-spotlight-value">{formatCurrency(month?.totalAmount ?? 0)}</div>
                    <p className="dashboard-kpi-spotlight-hint">
                      {month?.count != null ? (
                        <>
                          <ArrowUpOutlined /> {month.count} vendas no período selecionado
                        </>
                      ) : (
                        'Indicador consolidado do intervalo'
                      )}
                    </p>
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card className="dashboard-kpi-card dashboard-kpi-stripes">
                    <div className="dashboard-kpi-stripes-head">
                      <span className="dashboard-kpi-stripes-title">Vendas do período</span>
                      <span className="dashboard-kpi-stripes-badge">{month?.count ?? 0}</span>
                    </div>
                    <div className="dashboard-kpi-stripes-bars" aria-hidden>
                      {Array.from({ length: 28 }).map((_, i) => (
                        <span
                          key={i}
                          className="dashboard-kpi-stripes-bar"
                          style={{
                            height: `${18 + ((i * 7) % 55)}%`,
                            opacity: 0.35 + ((i % 5) * 0.12),
                          }}
                        />
                      ))}
                    </div>
                    <p className="dashboard-kpi-stripes-foot">Volume de pedidos no período filtrado</p>
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={12}>
                  <Card className="dashboard-kpi-card dashboard-kpi-soft">
                    <Statistic
                      title="Ticket médio"
                      value={ticketMedio}
                      prefix={<BarChartOutlined />}
                      formatter={(v) => formatCurrency(v)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={12}>
                  <Card className="dashboard-kpi-card dashboard-kpi-soft">
                    <Statistic
                      title="Produtos cadastrados"
                      value={analytics.productCount ?? 0}
                      prefix={<InboxOutlined />}
                    />
                    {analytics.lowStockCount > 0 && (
                      <div className="dashboard-kpi-low-stock">
                        <WarningOutlined /> {analytics.lowStockCount} com estoque baixo
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </div>

            {salesByTypeFiltered.length > 0 && (
              <div className="dashboard-channel-strip dashboard-surface-card">
                <p className="dashboard-channel-strip-title">Mix por canal (período)</p>
                <div className="dashboard-channel-strip-track">
                  {(() => {
                    const total = salesByTypeFiltered.reduce(
                      (acc, s) => acc + Number(s.total || 0),
                      0
                    )
                    return salesByTypeFiltered.map((s, i) => {
                      const v = Number(s.total || 0)
                      const flexGrow = total > 0 ? Math.max(0.05, v / total) : 0
                      return (
                        <div
                          key={s.type}
                          className="dashboard-channel-seg"
                          style={{
                            flex: `${flexGrow} 1 0`,
                            minWidth: v > 0 ? 10 : 0,
                            background: STRIP_ACCENT[i % STRIP_ACCENT.length],
                            boxShadow: `0 0 20px ${STRIP_ACCENT[i % STRIP_ACCENT.length]}55`,
                          }}
                          title={`${SALE_TYPE_LABELS[s.type] || s.type}: ${formatCurrency(v)}`}
                        />
                      )
                    })
                  })()}
                </div>
                <div className="dashboard-channel-legend">
                  {salesByTypeFiltered.map((s, i) => (
                    <span key={s.type} className="dashboard-channel-legend-item">
                      <i style={{ background: STRIP_ACCENT[i % STRIP_ACCENT.length] }} />
                      {SALE_TYPE_LABELS[s.type] || s.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              <Col xs={24} lg={16}>
                <Card
                  className="dashboard-chart-card"
                  title={appliedStartDate && appliedEndDate ? `Vendas por dia (${appliedStartDate.format('DD/MM')} a ${appliedEndDate.format('DD/MM')})` : 'Vendas por dia'}
                  extra={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
                >
                  <div className="dashboard-chart-area">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart
                        data={analytics.salesByDay || []}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={{ stroke: '#e8e8e8' }}
                        />
                        <YAxis
                          tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), 'Total']}
                          labelFormatter={(label) => `Data: ${label}`}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#16a34a"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorTotal)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Card
                  className="dashboard-chart-card"
                  title="Vendas por tipo (período)"
                >
                  {pieData.length > 0 ? (
                    <div className="dashboard-chart-pie">
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(value)}
                            contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="dashboard-chart-empty">
                      Nenhuma venda no período
                    </div>
                  )}
                </Card>
              </Col>
            </Row>

            {(analytics?.accountsPayableSummary || analytics?.accountsReceivableSummary) && (
              <Row gutter={DASH_GRID_GUTTER} className="dashboard-summary-finance-row">
                {analytics?.accountsPayableSummary && (
                  <Col
                    xs={24}
                    md={analytics?.accountsReceivableSummary ? 12 : 24}
                  >
                    <Card className="dashboard-summary-card dashboard-cost-card">
                      <Statistic
                        title="Contas a pagar (pendente)"
                        value={Number(analytics.accountsPayableSummary.totalPending || 0)}
                        formatter={(v) => formatCurrency(v)}
                      />
                      {Number(analytics.accountsPayableSummary.totalOverdue || 0) > 0 && (
                        <div className="dashboard-overdue" style={{ color: '#cf1322', fontSize: 12, marginTop: 4 }}>
                          {analytics.accountsPayableSummary.countOverdue} vencida(s): {formatCurrency(analytics.accountsPayableSummary.totalOverdue)}
                        </div>
                      )}
                    </Card>
                  </Col>
                )}
                {analytics?.accountsReceivableSummary && (
                  <Col
                    xs={24}
                    md={analytics?.accountsPayableSummary ? 12 : 24}
                  >
                    <Card className="dashboard-summary-card dashboard-cost-card">
                      <Statistic
                        title="Contas a receber (pendente)"
                        value={Number(analytics.accountsReceivableSummary.totalPending || 0)}
                        formatter={(v) => formatCurrency(v)}
                      />
                      {Number(analytics.accountsReceivableSummary.totalOverdue || 0) > 0 && (
                        <div className="dashboard-overdue" style={{ color: '#cf1322', fontSize: 12, marginTop: 4 }}>
                          {analytics.accountsReceivableSummary.countOverdue} vencida(s): {formatCurrency(analytics.accountsReceivableSummary.totalOverdue)}
                        </div>
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            )}
            <Row gutter={DASH_GRID_GUTTER} className="dashboard-summary-period-row">
              <Col xs={24} md={8}>
                <Card className="dashboard-summary-card">
                  <Statistic
                    title="Hoje"
                    value={today?.count ?? 0}
                    suffix="vendas"
                  />
                  <div className="dashboard-summary-value">
                    {formatCurrency(today?.totalAmount)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="dashboard-summary-card">
                  <Statistic
                    title="Esta semana"
                    value={week?.count ?? 0}
                    suffix="vendas"
                  />
                  <div className="dashboard-summary-value">
                    {formatCurrency(week?.totalAmount)}
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={8}>
                <Card className="dashboard-summary-card">
                  <Statistic
                    title="Período selecionado"
                    value={month?.count ?? 0}
                    suffix="vendas"
                  />
                  <div className="dashboard-summary-value">
                    {formatCurrency(month?.totalAmount)}
                  </div>
                </Card>
              </Col>
            </Row>

            {((analytics?.payableByMonth?.length > 0) || (analytics?.receivableByMonth?.length > 0)) && (
            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              {analytics?.payableByMonth?.length > 0 && (
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Contas a pagar (últimos 6 meses)">
                  <div className="dashboard-chart-area">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={analytics.payableByMonth}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                        <YAxis
                          tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) => `Mês: ${label}`}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                        />
                        <Legend />
                        <Bar dataKey="pending" name="Pendente" fill="#e67e22" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="settled" name="Pago" fill="#27ae60" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              )}
              {analytics?.receivableByMonth?.length > 0 && (
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Contas a receber (últimos 6 meses)">
                  <div className="dashboard-chart-area">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={analytics.receivableByMonth}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e8e8e8' }} />
                        <YAxis
                          tickFormatter={(v) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`)}
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={50}
                        />
                        <Tooltip
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) => `Mês: ${label}`}
                          contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }}
                        />
                        <Legend />
                        <Bar dataKey="pending" name="Pendente" fill="#3498db" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="settled" name="Recebido" fill="#27ae60" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>
              )}
            </Row>
            )}

            {salesAnalytics && (
            <>
            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Top 8 produtos (quantidade)">
                  {(() => {
                    const topData = (salesAnalytics.topProductsByQuantity || []).slice(0, 8).map((p) => ({
                      name: (p.productName || '').length > 20 ? (p.productName || '').slice(0, 20) + '...' : p.productName,
                      quantidade: Number(p.totalQuantity || 0),
                    }))
                    return topData.length > 0 ? (
                      <div className="dashboard-chart-area">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={topData} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)} />
                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v) => [v, 'Unidades']} contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }} />
                            <Bar dataKey="quantidade" name="Unidades" fill="#34495E" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="dashboard-chart-empty">Nenhum produto vendido (últimos 30 dias)</div>
                    )
                  })()}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Vendas por segmento (últimos 30 dias)">
                  {(() => {
                    const segs = (salesAnalytics.salesBySegment || []).filter((s) => (s.saleCount || 0) > 0 || (s.totalRevenue || 0) > 0)
                    const segData = segs.map((s, i) => ({ name: s.label, value: Number(s.totalRevenue || 0), fill: COLORS2[i % COLORS2.length] }))
                    return segData.length > 0 ? (
                      <div className="dashboard-chart-pie">
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie data={segData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                              {segData.map((e, i) => <Cell key={e.name} fill={e.fill} />)}
                            </Pie>
                            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="dashboard-chart-empty">Nenhuma venda no período</div>
                    )
                  })()}
                </Card>
              </Col>
            </Row>

            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Produtos mais vendidos">
                  {(salesAnalytics.topProductsByQuantity || []).length > 0 ? (
                    <Table
                      size="small"
                      dataSource={salesAnalytics.topProductsByQuantity}
                      rowKey={(r) => r.productId || r.productName}
                      pagination={false}
                      scroll={{ y: 200 }}
                      columns={[
                        { title: 'Produto', dataIndex: 'productName', ellipsis: true, render: (v) => v || '-' },
                        { title: 'Qtd', dataIndex: 'totalQuantity', width: 80, align: 'right', render: (v) => Number(v || 0).toLocaleString('pt-BR') },
                        { title: 'Faturamento', dataIndex: 'totalRevenue', width: 100, align: 'right', render: (v) => formatCurrency(v) },
                        { title: '%', dataIndex: 'percentOfTotal', width: 60, align: 'right', render: (v) => <Progress percent={Math.round(v || 0)} size="small" showInfo={false} /> },
                      ]}
                    />
                  ) : (
                    <Empty description="Nenhum dado" />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card className="dashboard-chart-card" title="Produtos com maior faturamento">
                  {(salesAnalytics.topProductsByRevenue || []).length > 0 ? (
                    <Table
                      size="small"
                      dataSource={salesAnalytics.topProductsByRevenue}
                      rowKey={(r) => r.productId || r.productName}
                      pagination={false}
                      scroll={{ y: 200 }}
                      columns={[
                        { title: 'Produto', dataIndex: 'productName', ellipsis: true, render: (v) => v || '-' },
                        { title: 'Faturamento', dataIndex: 'totalRevenue', width: 100, align: 'right', render: (v) => formatCurrency(v) },
                        { title: 'Qtd', dataIndex: 'totalQuantity', width: 80, align: 'right', render: (v) => Number(v || 0).toLocaleString('pt-BR') },
                        { title: '%', dataIndex: 'percentOfTotal', width: 60, align: 'right', render: (v) => <Tag color="blue">{Number(v || 0).toFixed(1)}%</Tag> },
                      ]}
                    />
                  ) : (
                    <Empty description="Nenhum dado" />
                  )}
                </Card>
              </Col>
            </Row>

            {(salesAnalytics.recommendations || []).length > 0 && (
            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              <Col xs={24}>
                <Card className="dashboard-chart-card" title={<span><BulbOutlined style={{ marginRight: 8, color: '#faad14' }} />Recomendações estratégicas</span>} extra={<Text type="secondary">Últimos 30 dias</Text>}>
                  <Row gutter={DASH_GRID_GUTTER}>
                    {salesAnalytics.recommendations.map((rec, i) => {
                      const Icon = RECOMMENDATION_ICONS[rec.type] || BulbOutlined
                      return (
                        <Col xs={24} sm={12} md={8} key={i}>
                          <div className="dashboard-rec-card">
                            <div className="dashboard-rec-icon"><Icon /></div>
                            <div className="dashboard-rec-content">
                              <Text strong className="dashboard-rec-title">{rec.title}</Text>
                              <Text type="secondary" className="dashboard-rec-desc">{rec.description}</Text>
                              {rec.action && <Text type="secondary" className="dashboard-rec-action">→ {rec.action}</Text>}
                            </div>
                          </div>
                        </Col>
                      )
                    })}
                  </Row>
                </Card>
              </Col>
            </Row>
            )}

            <Row gutter={DASH_GRID_GUTTER} className="dashboard-charts-row">
              <Col xs={24}>
                <Card className="dashboard-chart-card" title="Resumo por canal (últimos 30 dias)">
                  {(() => {
                    const segs = (salesAnalytics.salesBySegment || []).filter((s) => (s.saleCount || 0) > 0 || (s.totalRevenue || 0) > 0)
                    return segs.length > 0 ? (
                      <div className="dashboard-chart-area">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={segs} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} width={90} />
                            <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e8e8e8' }} />
                            <Bar dataKey="totalRevenue" name="Faturamento" fill="#34495E" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="dashboard-chart-empty">Nenhum segmento com vendas</div>
                    )
                  })()}
                </Card>
              </Col>
            </Row>
            </>
            )}

            {quickActionModules.length > 0 && (
              <DelayedReveal delayMs={200}>
                <div className="dashboard-quick-actions">
                  <h3 className="dashboard-section-title">Acesso rápido</h3>
                  <Row gutter={DASH_GRID_GUTTER}>
                    {quickActionModules.map((m) => {
                      const Icon = getIcon(m.icon, m.code)
                      const path = m.route === '/' ? '/' : m.route
                      return (
                        <Col key={m.code} xs={24} sm={12} md={6}>
                          <Card
                            className="dashboard-action-card"
                            hoverable
                            onClick={() => navigate(path)}
                          >
                            <Icon className="dashboard-action-icon" />
                            <span>{m.name}</span>
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                </div>
              </DelayedReveal>
            )}
            </>
          </RevealWhenReady>
        )}
      </main>
    </div>
  )
}
