import { useState, useEffect, useCallback } from 'react'
import {
  Input,
  InputNumber,
  Select,
  Radio,
  Button,
  Table,
  message,
  Card,
  Row,
  Col,
  Space,
  DatePicker,
  Drawer,
  Modal,
  Descriptions,
  Popconfirm,
  Statistic,
  Tooltip,
  Alert,
  Divider,
  Spin,
  Timeline,
  Form,
} from 'antd'
import {
  FileSearchOutlined,
  SearchOutlined,
  FilterOutlined,
  ShoppingOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  FileExcelOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import {
  searchSales,
  getSaleById,
  getSalesSummary,
  cancelSale,
  getSaleAudit,
  updateSaleCardAuthorization,
  updateSaleCustomer,
  addSalePayment,
  downloadFiscalReceiptPdf,
  downloadSimpleReceiptPdf,
  downloadNfePdf,
  downloadSalesReportExcel,
  downloadSalesReportPdf,
  SALE_TYPE_OPTIONS,
  SALE_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_OPTIONS_PDV,
  getSaleTypeLabel,
} from '../services/salesService'
import * as tenantService from '../services/tenantService'
import * as cardMachineService from '../services/cardMachineService'
import dayjs from 'dayjs'
import './SalesConsult.css'

function formatPrice(value) {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getPaymentLabel(value) {
  if (!value) return '—'
  const opt = PAYMENT_METHOD_OPTIONS.find((o) => o.value === value)
  return opt ? opt.label : value
}

const STATUS_LABELS = {
  DRAFT: 'Rascunho',
  OPEN: 'Pendente',
  PAID: 'Paga',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Estornada',
}

const CARD_BRAND_OPTIONS = [
  { value: '01', label: 'Visa' },
  { value: '02', label: 'Master' },
  { value: '03', label: 'Amex' },
  { value: '04', label: 'Sorocred' },
  { value: '99', label: 'Outros' },
]

export default function SalesConsult() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [startDate, setStartDate] = useState(dayjs().startOf('month'))
  const [endDate, setEndDate] = useState(dayjs().endOf('day'))
  const [filterStatus, setFilterStatus] = useState(null)
  const [filterSaleType, setFilterSaleType] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [sales, setSales] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [loadingFiscalReceipt, setLoadingFiscalReceipt] = useState(false)
  const [loadingNfe, setLoadingNfe] = useState(false)
  const [loadingSimpleReceipt, setLoadingSimpleReceipt] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [auditList, setAuditList] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)
  const [cardAuthValue, setCardAuthValue] = useState('')
  const [savingCardAuth, setSavingCardAuth] = useState(false)
  const [customerEditName, setCustomerEditName] = useState('')
  const [customerEditDoc, setCustomerEditDoc] = useState('')
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [paymentFormPaymentMethod, setPaymentFormPaymentMethod] = useState('PIX')
  const [paymentFormAmountReceived, setPaymentFormAmountReceived] = useState(null)
  const [paymentFormDiscountAmount, setPaymentFormDiscountAmount] = useState(0)
  const [paymentFormDiscountPercent, setPaymentFormDiscountPercent] = useState(0)
  const [paymentFormDeliveryFee, setPaymentFormDeliveryFee] = useState(0)
  const [paymentFormDiscountType, setPaymentFormDiscountType] = useState('amount')
  const [paymentFormInstallmentsCount, setPaymentFormInstallmentsCount] = useState(1)
  const [paymentFormCardMachineId, setPaymentFormCardMachineId] = useState(null)
  const [paymentFormCardBrand, setPaymentFormCardBrand] = useState('99')
  const [paymentFormCardAuthorization, setPaymentFormCardAuthorization] = useState('')
  const [cardMachines, setCardMachines] = useState([])
  const [tenantConfig, setTenantConfig] = useState({ maxInstallments: 12 })
  const [savingPayment, setSavingPayment] = useState(false)
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const effectiveTenantId = isRoot ? selectedTenantId : user?.tenantId

  const buildReportFilter = useCallback(() => {
    const start = startDate ? startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined
    const end = endDate ? endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined
    const f = {
      startDate: start,
      endDate: end,
      status: filterStatus || undefined,
      saleType: filterSaleType || undefined,
      search: filterSearch?.trim() || undefined,
    }
    if (effectiveTenantId) f.tenantId = effectiveTenantId
    return f
  }, [effectiveTenantId, startDate, endDate, filterStatus, filterSaleType, filterSearch])

  const loadTenants = useCallback(async () => {
    if (!isRoot) return
    try {
      const data = await tenantService.listTenants()
      setTenants(data || [])
      if (data?.length && !selectedTenantId) setSelectedTenantId(data[0].id)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresas.')
    }
  }, [isRoot])

  const loadData = useCallback(async () => {
    if (!effectiveTenantId && isRoot) return
    setLoading(true)
    try {
      const start = startDate ? startDate.startOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined
      const end = endDate ? endDate.endOf('day').format('YYYY-MM-DDTHH:mm:ss') : undefined
      const filter = {
        startDate: start,
        endDate: end,
        status: filterStatus || undefined,
        saleType: filterSaleType || undefined,
        search: filterSearch?.trim() || undefined,
        page: 0,
        size: 100,
      }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId

      const [salesRes, summaryRes] = await Promise.all([
        searchSales(filter),
        getSalesSummary(filter),
      ])
      setSales(salesRes?.content ?? [])
      setSummary(summaryRes)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar vendas.')
      setSales([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot, startDate, endDate, filterStatus, filterSaleType, filterSearch])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])



  useEffect(() => {
    if (selectedSale?.status === 'OPEN') {
      setPaymentFormPaymentMethod('PIX')
      setPaymentFormAmountReceived(null)
      setPaymentFormDiscountAmount(Number(selectedSale?.discountAmount) || 0)
      setPaymentFormDiscountPercent(Number(selectedSale?.discountPercent) || 0)
      setPaymentFormDeliveryFee(Number(selectedSale?.deliveryFee) || 0)
      setPaymentFormDiscountType('amount')
      setPaymentFormInstallmentsCount(1)
      setPaymentFormCardMachineId(null)
      setPaymentFormCardBrand('99')
      setPaymentFormCardAuthorization('')
    }
  }, [selectedSale?.id, selectedSale?.status, selectedSale?.discountAmount, selectedSale?.discountPercent, selectedSale?.deliveryFee])

  useEffect(() => {
    if (detailDrawerOpen && selectedSale?.status === 'OPEN' && effectiveTenantId) {
      cardMachineService.listByTenant(effectiveTenantId).then((data) => setCardMachines(data || [])).catch(() => setCardMachines([]))
      tenantService.getTenantById(effectiveTenantId).then((t) => setTenantConfig({
        maxInstallments: t?.maxInstallments ?? 12,
        maxInstallmentsNoInterest: t?.maxInstallmentsNoInterest ?? 1,
        interestRatePercent: t?.interestRatePercent ?? 0,
        cardFeeType: t?.cardFeeType ?? null,
        cardFeeValue: t?.cardFeeValue ?? null,
      })).catch(() => setTenantConfig({ maxInstallments: 12 }))
    }
  }, [detailDrawerOpen, selectedSale?.status, effectiveTenantId])

  const handleFilter = () => {
    loadData()
  }

  const handleExportExcel = async () => {
    if (!effectiveTenantId && isRoot) {
      message.warning('Selecione uma empresa para exportar.')
      return
    }
    setExportingExcel(true)
    try {
      await downloadSalesReportExcel(buildReportFilter())
      message.success('Relatório Excel exportado com sucesso.')
    } catch (e) {
      message.error(e?.message || 'Erro ao exportar Excel.')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    if (!effectiveTenantId && isRoot) {
      message.warning('Selecione uma empresa para exportar.')
      return
    }
    setExportingPdf(true)
    try {
      await downloadSalesReportPdf(buildReportFilter())
      message.success('Relatório PDF exportado com sucesso.')
    } catch (e) {
      message.error(e?.message || 'Erro ao exportar PDF.')
    } finally {
      setExportingPdf(false)
    }
  }

  const openDetail = async (record) => {
    try {
      const sale = await getSaleById(record.id)
      setSelectedSale(sale)
      setCardAuthValue((sale.paymentMethod === 'CREDIT_CARD' || sale.paymentMethod === 'DEBIT_CARD') ? (sale.cardAuthorization || '') : '')
      setCustomerEditName(sale.customerName || '')
      setCustomerEditDoc(sale.customerDocument || '')
      setDetailDrawerOpen(true)
      setAuditList([])
      setLoadingAudit(true)
      getSaleAudit(record.id)
        .then((list) => setAuditList(Array.isArray(list) ? list : []))
        .catch(() => setAuditList([]))
        .finally(() => setLoadingAudit(false))
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar detalhes.')
    }
  }

  const loadAudit = useCallback(async () => {
    if (!selectedSale?.id) return
    setLoadingAudit(true)
    try {
      const list = await getSaleAudit(selectedSale.id)
      setAuditList(Array.isArray(list) ? list : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar auditoria.')
      setAuditList([])
    } finally {
      setLoadingAudit(false)
    }
  }, [selectedSale?.id])

  const handleCancelSale = async (id) => {
    try {
      await cancelSale(id)
      message.success('Venda cancelada.')
      setDetailDrawerOpen(false)
      setSelectedSale(null)
      loadData()
    } catch (e) {
      message.error(e?.message || 'Erro ao cancelar venda.')
    }
  }

  const columns = [
    {
      title: 'Nº',
      dataIndex: 'saleNumber',
      key: 'saleNumber',
      width: 80,
      fixed: 'left',
      render: (v, record) => (
        <a onClick={(e) => { e.stopPropagation(); openDetail(record) }} style={{ fontWeight: 600 }}>
          {v}
        </a>
      ),
    },
    {
      title: 'Data / Hora',
      key: 'saleDate',
      width: 140,
      render: (_, r) => new Date(r.saleDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: 'Cliente',
      dataIndex: 'customerName',
      key: 'customerName',
      width: 160,
      ellipsis: { showTitle: false },
      render: (v) =>
        v ? (
          <Tooltip title={v} placement="topLeft">
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {v}
            </span>
          </Tooltip>
        ) : (
          '—'
        ),
    },
    {
      title: 'Tipo',
      dataIndex: 'saleType',
      key: 'saleType',
      width: 100,
      render: (v) => getSaleTypeLabel(v),
    },
    {
      title: 'Pagamento',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (v) => getPaymentLabel(v),
    },
    {
      title: 'Subtotal',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 100,
      align: 'right',
      render: (v) => formatPrice(v),
    },
    {
      title: 'Desconto',
      dataIndex: 'discountAmount',
      key: 'discountAmount',
      width: 90,
      align: 'right',
      render: (v) => (v != null && Number(v) !== 0 ? formatPrice(v) : '—'),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 100,
      align: 'right',
      render: (v) => <strong>{formatPrice(v)}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 95,
      render: (v) => (
        <span className={v === 'CANCELLED' ? 'sales-consult-status-cancelled' : v === 'OPEN' ? 'sales-consult-status-pending' : 'sales-consult-status'}>
          {STATUS_LABELS[v] || v}
        </span>
      ),
    },
  ]

  return (
    <div className="sales-consult-page">
      <main className="sales-consult-main">
        <div className="sales-consult-container">
          <div className="sales-consult-header-card">
            <div className="sales-consult-header-card-icon">
              <FileSearchOutlined />
            </div>
            <div className="sales-consult-header-card-content">
              <h2 className="sales-consult-page-title">Consultar vendas</h2>
              <p className="sales-consult-page-subtitle">
                Consulte vendas por período, filtre por status e tipo. Visualize detalhes e totalizadores.
              </p>
            </div>
          </div>

          {isRoot && (
            <div className="sales-consult-toolbar" style={{ marginBottom: 16 }}>
              <Select
                placeholder="Empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                style={{ minWidth: 200 }}
              />
            </div>
          )}

          <Card className="sales-consult-filters-card">
            <div className="sales-consult-filters-toggle" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFiltersExpanded((v) => !v)}
              >
                {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Button>
              <Space>
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={handleExportExcel}
                  loading={exportingExcel}
                  disabled={!effectiveTenantId && isRoot}
                >
                  Exportar Excel
                </Button>
                <Button
                  icon={<FilePdfOutlined />}
                  onClick={handleExportPdf}
                  loading={exportingPdf}
                  disabled={!effectiveTenantId && isRoot}
                >
                  Exportar PDF
                </Button>
              </Space>
            </div>
            {filtersExpanded && (
            <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
              <Col xs={24} sm={12} md={4}>
                <label>Data início</label>
                <DatePicker
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d || dayjs().startOf('month'))
                    if (d && endDate && d.isAfter(endDate)) setEndDate(d)
                  }}
                  disabledDate={(d) => (endDate ? d.isAfter(endDate, 'day') : false)}
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <label>Data fim</label>
                <DatePicker
                  value={endDate}
                  onChange={(d) => {
                    setEndDate(d || dayjs().endOf('day'))
                    if (d && startDate && d.isBefore(startDate, 'day')) setStartDate(d)
                  }}
                  disabledDate={(d) => (startDate ? d.isBefore(startDate, 'day') : false)}
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <label>Status</label>
                <Select
                  placeholder="Todos"
                  options={[{ value: null, label: 'Todos' }, ...SALE_STATUS_OPTIONS]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  style={{ width: '100%' }}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={4}>
                <label>Tipo</label>
                <Select
                  placeholder="Todos"
                  options={[{ value: null, label: 'Todos' }, ...SALE_TYPE_OPTIONS]}
                  value={filterSaleType}
                  onChange={setFilterSaleType}
                  style={{ width: '100%' }}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <label>Nº / Cliente / Doc.</label>
                <Input
                  placeholder="Buscar"
                  prefix={<SearchOutlined />}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  onPressEnter={handleFilter}
                />
              </Col>
              <Col xs={24} md={4} style={{ marginTop: 24 }}>
                <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loading} block>
                  Filtrar
                </Button>
              </Col>
            </Row>
            )}
          </Card>

          {summary != null && (
            <Row gutter={16} className="sales-consult-summary-row">
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title="Quantidade de vendas" value={summary.count} prefix={<ShoppingOutlined />} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title="Valor total" value={summary.totalAmount ?? 0} prefix="R$" precision={2} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title="Descontos" value={summary.discountAmount ?? 0} prefix="R$" precision={2} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card>
                  <Statistic title="Subtotal" value={summary.subtotalAmount ?? 0} prefix="R$" precision={2} />
                </Card>
              </Col>
            </Row>
          )}

          <Card className="sales-consult-table-card" title="Vendas do período">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={sales}
              loading={loading}
              scroll={{ x: 1100 }}
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} venda(s)` }}
              onRow={(record) => ({
                onClick: () => openDetail(record),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>
        </div>
      </main>

      <Drawer
        title={`Venda ${selectedSale?.saleNumber || ''}`}
        placement="right"
        width={560}
        open={detailDrawerOpen}
        onClose={() => { setDetailDrawerOpen(false); setSelectedSale(null); setAuditList([]); setAddPaymentModalOpen(false) }}
      >
        {selectedSale && (
          <div className="sale-detail-sections">
            <Card size="small" className="sale-detail-section" title="Dados da venda">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Data">
                  {new Date(selectedSale.saleDate).toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' })}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <span className={selectedSale.status === 'CANCELLED' ? 'sales-consult-status-cancelled' : selectedSale.status === 'OPEN' ? 'sales-consult-status-pending' : 'sales-consult-status'}>
                    {STATUS_LABELS[selectedSale.status] || selectedSale.status}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="Tipo">{getSaleTypeLabel(selectedSale.saleType)}</Descriptions.Item>
                {selectedSale.sellerName && (
                  <Descriptions.Item label="Vendedor">{selectedSale.sellerName}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            <Card size="small" className="sale-detail-section" title="Cliente">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Nome">{selectedSale.customerName || '—'}</Descriptions.Item>
                {(selectedSale.customerDocument != null && selectedSale.customerDocument !== '') && (
                  <Descriptions.Item label="CPF/CNPJ">{selectedSale.customerDocument}</Descriptions.Item>
                )}
                {selectedSale.customerPhone && (
                  <Descriptions.Item label="Telefone">{selectedSale.customerPhone}</Descriptions.Item>
                )}
                {selectedSale.customerEmail && (
                  <Descriptions.Item label="E-mail">{selectedSale.customerEmail}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {selectedSale.status !== 'CANCELLED' && (
              <Card size="small" className="sale-detail-section" title="Alterar cliente da venda">
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Input
                    value={customerEditName}
                    onChange={(e) => setCustomerEditName(e.target.value)}
                    placeholder={`Nome atual: ${selectedSale.customerName || '—'}`}
                  />
                  <Input
                    value={customerEditDoc}
                    onChange={(e) => setCustomerEditDoc(e.target.value)}
                    placeholder={`CPF/CNPJ atual: ${selectedSale.customerDocument || 'não informado'}`}
                    maxLength={18}
                  />
                  <Button
                    type="primary"
                    loading={savingCustomer}
                    onClick={async () => {
                      const name = customerEditName?.trim() || selectedSale.customerName || undefined
                      const doc = customerEditDoc?.trim() || undefined
                      setSavingCustomer(true)
                      try {
                        const updated = await updateSaleCustomer(selectedSale.id, {
                          customerName: name,
                          customerDocument: doc,
                        })
                        setSelectedSale(updated)
                        setCustomerEditName('')
                        setCustomerEditDoc('')
                        const audit = await getSaleAudit(selectedSale.id)
                        setAuditList(Array.isArray(audit) ? audit : [])
                        message.success('Cliente da venda atualizado. Alteração registrada na auditoria.')
                      } catch (e) {
                        message.error(e?.message || 'Erro ao atualizar.')
                      } finally {
                        setSavingCustomer(false)
                      }
                    }}
                  >
                    Salvar nome e CPF/CNPJ
                  </Button>
                  <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
                    Altere o nome e/ou CPF/CNPJ do cliente. A alteração fica registrada na auditoria da venda.
                  </p>
                </Space>
              </Card>
            )}

            <Card size="small" className="sale-detail-section" title="Valores e pagamento">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Subtotal">{formatPrice(selectedSale.subtotal)}</Descriptions.Item>
                <Descriptions.Item label="Desconto">{formatPrice(selectedSale.discountAmount)}</Descriptions.Item>
                <Descriptions.Item label="Taxa de entrega">{formatPrice(selectedSale.deliveryFee)}</Descriptions.Item>
                <Descriptions.Item label="Total">
                  <strong>{formatPrice(selectedSale.total)}</strong>
                </Descriptions.Item>
                {selectedSale.status !== 'OPEN' && (
                  <Descriptions.Item label="Forma de pagamento">{getPaymentLabel(selectedSale.paymentMethod)}</Descriptions.Item>
                )}
                {selectedSale.installmentsCount != null && selectedSale.installmentsCount > 0 && (
                  <Descriptions.Item label="Parcelas">
                    {selectedSale.installmentsCount}x de {formatPrice((selectedSale.total || 0) / selectedSale.installmentsCount)}
                  </Descriptions.Item>
                )}
                {selectedSale.cardBrand && (
                  <Descriptions.Item label="Bandeira do cartão">
                    {CARD_BRAND_OPTIONS.find((o) => o.value === selectedSale.cardBrand)?.label || selectedSale.cardBrand}
                  </Descriptions.Item>
                )}
                {selectedSale.cardMachineName && (
                  <Descriptions.Item label="Maquininha">{selectedSale.cardMachineName}</Descriptions.Item>
                )}
                {selectedSale.cardAuthorization && (
                  <Descriptions.Item label="Autorização">{selectedSale.cardAuthorization}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {selectedSale.status === 'OPEN' && (
              <Card size="small" className="sale-detail-section">
                <Button type="primary" block size="large" onClick={() => setAddPaymentModalOpen(true)}>
                  Adicionar pagamento
                </Button>
              </Card>
            )}

            <Modal
              title="Adicionar pagamento"
              open={addPaymentModalOpen}
              onCancel={() => setAddPaymentModalOpen(false)}
              footer={null}
              width={460}
              destroyOnClose
            >
              {selectedSale && (() => {
                const subtotal = Number(selectedSale.subtotal) || 0
                const saleDiscount = paymentFormDiscountType === 'percent'
                  ? subtotal * (paymentFormDiscountPercent / 100)
                  : Number(paymentFormDiscountAmount) || 0
                const deliveryVal = Number(paymentFormDeliveryFee) || 0
                const total = Math.max(0, subtotal - saleDiscount + deliveryVal)
                const selectedCardMachine = paymentFormCardMachineId ? cardMachines.find((m) => m.id === paymentFormCardMachineId) : null
                const effectiveMaxInstallments = selectedCardMachine?.maxInstallments ?? tenantConfig.maxInstallments ?? 12
                const effectiveMaxInstallmentsNoInterest = selectedCardMachine?.maxInstallmentsNoInterest ?? tenantConfig.maxInstallmentsNoInterest ?? 1
                const effectiveInterestRatePercent = selectedCardMachine?.interestRatePercent != null
                  ? Number(selectedCardMachine.interestRatePercent)
                  : (Number(tenantConfig.interestRatePercent) || 0)
                const installmentsCalc = paymentFormPaymentMethod === 'CREDIT_CARD' && paymentFormInstallmentsCount > 0 ? (() => {
                  const maxNoInterest = effectiveMaxInstallmentsNoInterest
                  const interestPercent = effectiveInterestRatePercent
                  const n = Math.min(paymentFormInstallmentsCount, effectiveMaxInstallments)
                  let totalWithInterest = total
                  if (n > maxNoInterest && interestPercent > 0) {
                    const i = interestPercent / 100
                    const periodosComJuros = n - maxNoInterest
                    totalWithInterest = total * Math.pow(1 + i, periodosComJuros)
                  }
                  const installmentValue = totalWithInterest / n
                  let cardFee = 0
                  const feeType = selectedCardMachine?.feeType ?? tenantConfig.cardFeeType
                  const feeValue = selectedCardMachine?.feeValue ?? tenantConfig.cardFeeValue
                  if (feeType === 'PERCENTAGE' && feeValue != null) {
                    cardFee = totalWithInterest * (Number(feeValue) / 100)
                  } else if (feeType === 'FIXED_AMOUNT' && feeValue != null) {
                    cardFee = Number(feeValue)
                  }
                  return { totalWithInterest, installmentValue, cardFee }
                })() : null
                const totalAPagar = installmentsCalc
                  ? installmentsCalc.totalWithInterest + (installmentsCalc.cardFee || 0)
                  : total
                return (
                  <div>
                    <Card size="small" style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>Subtotal: <strong>{formatPrice(subtotal)}</strong></div>
                      <Form layout="vertical" size="small">
                        <Form.Item label="Tipo de desconto">
                          <Radio.Group value={paymentFormDiscountType} onChange={(e) => setPaymentFormDiscountType(e.target.value)}>
                            <Radio.Button value="amount">Valor (R$)</Radio.Button>
                            <Radio.Button value="percent">Percentual</Radio.Button>
                          </Radio.Group>
                        </Form.Item>
                        {paymentFormDiscountType === 'amount' ? (
                          <Form.Item label="Desconto (R$)">
                            <InputNumber min={0} value={paymentFormDiscountAmount} onChange={setPaymentFormDiscountAmount} style={{ width: '100%' }} prefix="R$" />
                          </Form.Item>
                        ) : (
                          <Form.Item label="Desconto (%)">
                            <InputNumber min={0} max={100} value={paymentFormDiscountPercent} onChange={setPaymentFormDiscountPercent} style={{ width: '100%' }} addonAfter="%" />
                          </Form.Item>
                        )}
                        <Form.Item label="Taxa de entrega">
                          <InputNumber min={0} value={paymentFormDeliveryFee} onChange={setPaymentFormDeliveryFee} style={{ width: '100%' }} prefix="R$" />
                        </Form.Item>
                      </Form>
                      <Divider style={{ margin: '12px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Desconto</span>
                        <span>- {formatPrice(saleDiscount)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span>Entrega</span>
                        <span>{formatPrice(deliveryVal)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 8 }}>
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                      {installmentsCalc && (
                        <>
                          {installmentsCalc.totalWithInterest > total && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#666' }}>
                              <span>Juros (parcelado)</span>
                              <span>{formatPrice(installmentsCalc.totalWithInterest - total)}</span>
                            </div>
                          )}
                          {installmentsCalc.cardFee > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#666' }}>
                              <span>Taxa cartão</span>
                              <span>{formatPrice(installmentsCalc.cardFee)}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 8 }}>
                            <span>Total a pagar</span>
                            <span>{formatPrice(totalAPagar)}</span>
                          </div>
                        </>
                      )}
                    </Card>
                    <Form layout="vertical" size="small">
                      <Form.Item label="Forma de pagamento" required>
                        <Select
                          value={paymentFormPaymentMethod}
                          onChange={(v) => {
                            setPaymentFormPaymentMethod(v)
                            if (v !== 'CREDIT_CARD') setPaymentFormInstallmentsCount(1)
                          }}
                          options={PAYMENT_METHOD_OPTIONS_PDV}
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                      {(paymentFormPaymentMethod === 'CREDIT_CARD' || paymentFormPaymentMethod === 'DEBIT_CARD') && (
                        <>
                          <Form.Item label="Maquininha">
                            <Select
                              placeholder="Selecione a maquininha"
                              value={paymentFormCardMachineId}
                              onChange={setPaymentFormCardMachineId}
                              options={cardMachines.map((m) => ({
                                value: m.id,
                                label: m.acquirerCnpj ? `${m.name} (CNPJ adq.)` : m.name,
                              }))}
                              style={{ width: '100%' }}
                              allowClear
                            />
                          </Form.Item>
                          <Form.Item label="Bandeira do cartão">
                            <Select value={paymentFormCardBrand} onChange={setPaymentFormCardBrand} options={CARD_BRAND_OPTIONS} style={{ width: '100%' }} />
                          </Form.Item>
                          <Form.Item label="Número da autorização" extra="Necessário para emissão de NFC-e.">
                            <Input value={paymentFormCardAuthorization} onChange={(e) => setPaymentFormCardAuthorization(e.target.value)} placeholder="Código (até 20 caracteres)" maxLength={20} />
                          </Form.Item>
                          {paymentFormPaymentMethod === 'CREDIT_CARD' && (
                            <Form.Item label="Parcelas">
                              <Select
                                value={paymentFormInstallmentsCount}
                                onChange={setPaymentFormInstallmentsCount}
                                options={Array.from({ length: Math.max(1, effectiveMaxInstallments) }, (_, i) => {
                                  const n = i + 1
                                  const maxNoInterest = effectiveMaxInstallmentsNoInterest
                                  const interestPercent = effectiveInterestRatePercent
                                  let totalWithInt = total
                                  if (n > maxNoInterest && interestPercent > 0) {
                                    totalWithInt = total * Math.pow(1 + interestPercent / 100, n - maxNoInterest)
                                  }
                                  const cardMachine = paymentFormCardMachineId ? cardMachines.find((m) => m.id === paymentFormCardMachineId) : null
                                  const ft = cardMachine?.feeType ?? tenantConfig.cardFeeType
                                  const fv = cardMachine?.feeValue ?? tenantConfig.cardFeeValue
                                  let cardFee = 0
                                  if (ft === 'PERCENTAGE' && fv != null) cardFee = totalWithInt * (Number(fv) / 100)
                                  else if (ft === 'FIXED_AMOUNT' && fv != null) cardFee = Number(fv)
                                  const totalPagar = totalWithInt + cardFee
                                  const valParcela = totalPagar / n
                                  return { value: n, label: `${n}x de ${formatPrice(valParcela)}` }
                                })}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          )}
                        </>
                      )}
                      <Form.Item label="Valor recebido" extra={paymentFormPaymentMethod === 'CASH' ? 'Informe o valor dado pelo cliente para calcular o troco.' : null}>
                        <InputNumber
                          min={0}
                          value={paymentFormAmountReceived}
                          onChange={setPaymentFormAmountReceived}
                          placeholder={formatPrice(totalAPagar)}
                          style={{ width: '100%' }}
                          prefix="R$"
                          disabled={['CREDIT_CARD', 'DEBIT_CARD', 'PIX'].includes(paymentFormPaymentMethod)}
                        />
                      </Form.Item>
                      {paymentFormPaymentMethod === 'CASH' && paymentFormAmountReceived != null && paymentFormAmountReceived > totalAPagar && (
                        <div style={{ marginBottom: 12, color: '#52c41a', fontWeight: 600 }}>Troco: {formatPrice(paymentFormAmountReceived - totalAPagar)}</div>
                      )}
                      <Button
                        type="primary"
                        block
                        size="large"
                        loading={savingPayment}
                        onClick={async () => {
                          const amount = paymentFormAmountReceived ?? totalAPagar
                          if (amount < totalAPagar) {
                            message.warning('O valor recebido não pode ser menor que o total a pagar.')
                            return
                          }
                          setSavingPayment(true)
                          try {
                            const payload = {
                              paymentMethod: paymentFormPaymentMethod,
                              amountReceived: amount,
                              deliveryFee: paymentFormDeliveryFee,
                            }
                            if (paymentFormDiscountType === 'amount') payload.discountAmount = paymentFormDiscountAmount
                            else if (paymentFormDiscountType === 'percent') payload.discountPercent = paymentFormDiscountPercent
                            if (paymentFormPaymentMethod === 'CREDIT_CARD' && paymentFormInstallmentsCount > 0) payload.installmentsCount = paymentFormInstallmentsCount
                            if ((paymentFormPaymentMethod === 'CREDIT_CARD' || paymentFormPaymentMethod === 'DEBIT_CARD') && paymentFormCardMachineId) {
                              payload.cardMachineId = paymentFormCardMachineId
                              payload.cardBrand = paymentFormCardBrand || '99'
                              if (paymentFormCardAuthorization?.trim()) payload.cardAuthorization = paymentFormCardAuthorization.trim()
                              payload.cardIntegrationType = 2
                            }
                            const updated = await addSalePayment(selectedSale.id, payload)
                            setSelectedSale(updated)
                            setAddPaymentModalOpen(false)
                            const audit = await getSaleAudit(selectedSale.id)
                            setAuditList(Array.isArray(audit) ? audit : [])
                            message.success('Pagamento adicionado! A venda foi concluída.')
                          } catch (e) {
                            message.error(e?.message || 'Erro ao adicionar pagamento.')
                          } finally {
                            setSavingPayment(false)
                          }
                        }}
                      >
                        Adicionar pagamento e concluir venda
                      </Button>
                    </Form>
                  </div>
                )
              })()}
            </Modal>

            {(selectedSale.paymentMethod === 'CREDIT_CARD' || selectedSale.paymentMethod === 'DEBIT_CARD') && selectedSale.status !== 'CANCELLED' && (
              <Card size="small" className="sale-detail-section" title="Código de autorização do cartão">
                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    value={cardAuthValue}
                    onChange={(e) => setCardAuthValue(e.target.value)}
                    placeholder="Código até 20 caracteres"
                    maxLength={20}
                  />
                  <Button
                    type="primary"
                    loading={savingCardAuth}
                    onClick={async () => {
                      const value = cardAuthValue?.trim() || null
                      setSavingCardAuth(true)
                      try {
                        const updated = await updateSaleCardAuthorization(selectedSale.id, value)
                        setSelectedSale(updated)
                        setCardAuthValue('')
                        const audit = await getSaleAudit(selectedSale.id)
                        setAuditList(Array.isArray(audit) ? audit : [])
                        message.success('Código de autorização atualizado.')
                      } catch (e) {
                        message.error(e?.message || 'Erro ao atualizar.')
                      } finally {
                        setSavingCardAuth(false)
                      }
                    }}
                  >
                    Atualizar
                  </Button>
                </Space.Compact>
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#666' }}>
                  Preencha e clique em Atualizar para alterar o código. A alteração fica registrada na auditoria.
                </p>
              </Card>
            )}

            {selectedSale.items?.length > 0 && (
              <Card size="small" className="sale-detail-section" title="Itens da venda">
                <Table
                  dataSource={selectedSale.items}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: 'Produto', dataIndex: 'productName', ellipsis: true },
                    { title: 'Qtd', dataIndex: 'quantity', width: 64 },
                    { title: 'Unit.', dataIndex: 'unitPrice', width: 80, render: formatPrice },
                    { title: 'Total', dataIndex: 'total', width: 80, render: formatPrice },
                  ]}
                />
              </Card>
            )}

            {(selectedSale.deliveryAddress || selectedSale.deliveryFee > 0) && (
              <Card size="small" className="sale-detail-section" title="Entrega">
                {selectedSale.deliveryAddress && (
                  <p style={{ margin: 0, fontSize: 13 }}>{selectedSale.deliveryAddress}</p>
                )}
                {selectedSale.deliveryFee > 0 && (
                  <p style={{ margin: '8px 0 0', fontSize: 13 }}>Taxa: {formatPrice(selectedSale.deliveryFee)}</p>
                )}
              </Card>
            )}

            {selectedSale.notes && (
              <Card size="small" className="sale-detail-section" title="Observações">
                <p style={{ margin: 0, fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedSale.notes}</p>
              </Card>
            )}

            {selectedSale.nfeRequiresCustomerDocument && (
              <Alert
                type="warning"
                showIcon
                message="Sem CPF ou CNPJ não é possível emitir NF-e"
                description="O botão Gerar NF-e só aparece quando o cliente da venda tiver CPF ou CNPJ informado. Use a seção 'Alterar cliente da venda' abaixo para informar o documento."
                style={{ marginBottom: 16 }}
              />
            )}

            <Card
              size="small"
              className="sale-detail-section"
              title={
                <Space>
                  <HistoryOutlined />
                  Auditoria da venda
                  {auditList.length === 0 && !loadingAudit && (
                    <Button type="link" size="small" onClick={loadAudit}>Carregar</Button>
                  )}
                </Space>
              }
            >
              {loadingAudit ? (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <Spin />
                </div>
              ) : auditList.length > 0 ? (
                <Timeline
                  items={auditList.map((a) => ({
                    color: a.eventType === 'CANCELLED' ? 'red' : a.eventType === 'CREATED' ? 'green' : 'blue',
                    children: (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>
                          {a.eventType === 'CREATED' ? 'Criada' : a.eventType === 'UPDATED' ? 'Editada' : 'Cancelada'}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {new Date(a.occurredAt).toLocaleString('pt-BR')}
                          {a.userName && ` · ${a.userName}`}
                        </div>
                        {a.description && (
                          <div style={{ marginTop: 4, fontSize: 12 }}>{a.description}</div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <p style={{ margin: 0, color: '#888', fontSize: 13 }}>Nenhum registro de auditoria carregado.</p>
              )}
            </Card>

            <Divider style={{ margin: '16px 0' }} />

            <Card size="small" className="sale-detail-section sale-detail-actions" title="Ações">
              <div className="sale-detail-actions-grid">
                {selectedSale.canEmitFiscalReceipt && (
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={async () => {
                      setLoadingFiscalReceipt(true)
                      try {
                        await downloadFiscalReceiptPdf(selectedSale.id, selectedSale.saleNumber)
                        message.success('Cupom fiscal baixado com sucesso!')
                      } catch (e) {
                        message.error(e?.message || 'Erro ao gerar cupom fiscal.')
                      } finally {
                        setLoadingFiscalReceipt(false)
                      }
                    }}
                    loading={loadingFiscalReceipt}
                    className="sale-detail-action-btn"
                    block
                  >
                    Cupom fiscal (NFC-e)
                  </Button>
                )}
                {selectedSale.canEmitNfe && (
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={async () => {
                      setLoadingNfe(true)
                      try {
                        await downloadNfePdf(selectedSale.id)
                        message.success('NF-e baixada com sucesso!')
                      } catch (e) {
                        message.error(e?.message || 'Erro ao gerar NF-e.')
                      } finally {
                        setLoadingNfe(false)
                      }
                    }}
                    loading={loadingNfe}
                    className="sale-detail-action-btn"
                    block
                  >
                    NF-e
                  </Button>
                )}
                {selectedSale.canEmitSimpleReceipt && (
                  <Button
                    icon={<FilePdfOutlined />}
                    onClick={async () => {
                      setLoadingSimpleReceipt(true)
                      try {
                        await downloadSimpleReceiptPdf(selectedSale.id, selectedSale.saleNumber)
                        message.success('Comprovante baixado com sucesso!')
                      } catch (e) {
                        message.error(e?.message || 'Erro ao gerar comprovante.')
                      } finally {
                        setLoadingSimpleReceipt(false)
                      }
                    }}
                    loading={loadingSimpleReceipt}
                    className="sale-detail-action-btn"
                    block
                  >
                    Comprovante
                  </Button>
                )}
                {selectedSale.status !== 'CANCELLED' && (
                  <Popconfirm
                    title="Cancelar esta venda?"
                    description="A venda será marcada como cancelada. Esta ação pode ser registrada na auditoria."
                    onConfirm={() => handleCancelSale(selectedSale.id)}
                    okText="Sim, cancelar"
                    cancelText="Não"
                    okButtonProps={{ danger: true }}
                    className="sale-detail-action-btn-popconfirm"
                  >
                    <Button danger icon={<DeleteOutlined />} className="sale-detail-action-btn" block>
                      Cancelar venda
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  )
}
