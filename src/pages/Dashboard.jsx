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
  Space,
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
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../contexts/ModulesContext'
import { getIcon } from '../config/iconRegistry'
import { getDashboardAnalytics } from '../services/dashboardService'
import { getSalesAnalytics } from '../services/salesAnalyticsService'
import * as tenantService from '../services/tenantService'
import './Dashboard.css'

const { Text } = Typography
const COLORS = ['#34495E', '#5D6D7E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#2C3E50']
const COLORS2 = ['#34495E', '#27ae60', '#3498db', '#e67e22', '#9b59b6', '#1abc9c']
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
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">
              Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Bem-vindo{user?.fullName ? `, ${user.fullName}` : ''}. Visão geral do seu negócio.
            </p>
          </div>
        </div>

        <Card className="dashboard-filters-card">
          <div className="dashboard-filters-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFiltersExpanded((v) => !v)}
            >
              {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
          </div>
          {filtersExpanded && (
            <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
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
              <Col xs={24} sm={12} md={4} style={{ marginTop: 24 }}>
                <Button type="primary" icon={<FilterOutlined />} onClick={handleBuscar} loading={loading} block>
                  Buscar
                </Button>
              </Col>
            </Row>
          )}
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
          <>
            <div className="dashboard-kpis">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="dashboard-kpi-card dashboard-kpi-revenue">
                    <Statistic
                      title="Faturamento do período"
                      value={month?.totalAmount ?? 0}
                      prefix={<DollarOutlined />}
                      formatter={(v) => formatCurrency(v)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="dashboard-kpi-card dashboard-kpi-sales">
                    <Statistic
                      title="Vendas do período"
                      value={month?.count ?? 0}
                      prefix={<ShoppingCartOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="dashboard-kpi-card dashboard-kpi-ticket">
                    <Statistic
                      title="Ticket médio"
                      value={ticketMedio}
                      prefix={<BarChartOutlined />}
                      formatter={(v) => formatCurrency(v)}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card className="dashboard-kpi-card dashboard-kpi-products">
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

            <Row gutter={[16, 16]} className="dashboard-charts-row">
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
                            <stop offset="5%" stopColor="#34495E" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#34495E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
                          stroke="#34495E"
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

            <Row gutter={[16, 16]}>
              {analytics?.accountsPayableSummary && (
              <Col xs={24} md={6}>
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
              <Col xs={24} md={6}>
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
              <Col xs={24} md={analytics?.accountsPayableSummary ? 4 : 8}>
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
              <Col xs={24} md={analytics?.accountsPayableSummary ? 4 : 8}>
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
              <Col xs={24} md={analytics?.accountsPayableSummary ? 4 : 8}>
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
            <Row gutter={[16, 16]} className="dashboard-charts-row">
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
            <Row gutter={[16, 16]} className="dashboard-charts-row">
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

            <Row gutter={[16, 16]}>
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
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Card className="dashboard-chart-card" title={<span><BulbOutlined style={{ marginRight: 8, color: '#faad14' }} />Recomendações estratégicas</span>} extra={<Text type="secondary">Últimos 30 dias</Text>}>
                  <Row gutter={[16, 16]}>
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

            <Row gutter={[16, 16]}>
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
            <div className="dashboard-quick-actions">
              <h3 className="dashboard-section-title">Acesso rápido</h3>
              <Row gutter={[16, 16]}>
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
            )}
          </>
        )}
      </main>
    </div>
  )
}
