import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Table,
  Drawer,
  DatePicker,
  Statistic,
  message,
  Space,
  Tag,
  Dropdown,
  Steps,
  Descriptions,
} from 'antd'
import {
  CarOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  MoreOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../../contexts/AuthContext'
import * as deliveryService from '../../services/deliveryService'
import * as tenantService from '../../services/tenantService'
import DeliveryMap from '../../components/DeliveryMap'
import { normalizePhone } from '../../utils/masks'
import './Deliveries.css'

const { TextArea } = Input
const { RangePicker } = DatePicker

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'ASSIGNED', label: 'Atribuída' },
  { value: 'ACCEPTED', label: 'Aceita' },
  { value: 'PICKING_UP', label: 'Coletando' },
  { value: 'PICKED_UP', label: 'Coletado' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'ARRIVED', label: 'Chegou' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'FAILED', label: 'Falhou' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'RETURNED', label: 'Devolvido' },
]

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const STATUS_COLORS = {
  PENDING: 'orange',
  ASSIGNED: 'blue',
  ACCEPTED: 'cyan',
  PICKING_UP: 'geekblue',
  PICKED_UP: 'purple',
  IN_TRANSIT: 'volcano',
  ARRIVED: 'gold',
  DELIVERED: 'green',
  FAILED: 'red',
  CANCELLED: 'default',
  RETURNED: 'magenta',
}

function formatMoney(val) {
  if (val == null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(d) {
  if (!d) return '-'
  return dayjs(d).format('DD/MM/YYYY HH:mm')
}

export default function Deliveries() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formCreate] = Form.useForm()
  const [formAssign] = Form.useForm()
  const [formStatus] = Form.useForm()
  const [formEdit] = Form.useForm()

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [activeDeliveries, setActiveDeliveries] = useState([])
  const [salesWithoutDelivery, setSalesWithoutDelivery] = useState([])
  const [deliveryPersons, setDeliveryPersons] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [mapRefreshKey, setMapRefreshKey] = useState(0)
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false)
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false)
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: undefined,
    deliveryPersonId: undefined,
    dateRange: null,
    listType: 'all',
  })

  const effectiveTenantId = isRoot ? selectedTenantId : user?.tenantId

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

  const loadDeliveries = useCallback(async () => {
    if (isRoot && !effectiveTenantId) return
    setLoading(true)
    try {
      const filter = { page: 0, size: 200 }
      if (filters.search?.trim()) filter.search = filters.search.trim()
      if (filters.status) filter.status = filters.status
      if (filters.deliveryPersonId) filter.deliveryPersonId = filters.deliveryPersonId
      if (filters.dateRange?.[0]) filter.startDate = filters.dateRange[0].format('YYYY-MM-DD') + 'T00:00:00'
      if (filters.dateRange?.[1]) filter.endDate = filters.dateRange[1].format('YYYY-MM-DD') + 'T23:59:59'

      const [allRes, activeRes] = await Promise.all([
        deliveryService.searchDeliveries(filter, isRoot ? effectiveTenantId : undefined),
        deliveryService.listActiveDeliveries(isRoot ? effectiveTenantId : undefined),
      ])
      setDeliveries(allRes?.content ?? [])
      setActiveDeliveries(activeRes ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar entregas.')
      setDeliveries([])
      setActiveDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot, filters])

  const loadSalesWithoutDelivery = useCallback(async () => {
    if (!effectiveTenantId && isRoot) return
    try {
      const data = await deliveryService.listSalesWithoutDelivery(isRoot ? effectiveTenantId : undefined)
      setSalesWithoutDelivery(data ?? [])
    } catch (e) {
      setSalesWithoutDelivery([])
    }
  }, [effectiveTenantId, isRoot])

  const loadDeliveryPersons = useCallback(async () => {
    if (!effectiveTenantId && isRoot) return
    try {
      const data = await deliveryService.listDeliveryPersons(isRoot ? effectiveTenantId : undefined)
      setDeliveryPersons(data ?? [])
    } catch (e) {
      setDeliveryPersons([])
    }
  }, [effectiveTenantId, isRoot])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot])



  useEffect(() => {
    if (effectiveTenantId !== undefined) loadDeliveryPersons()
  }, [effectiveTenantId, loadDeliveryPersons])

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await userService.listUsers()
      setAllUsers(data || [])
    } catch (e) {
      setAllUsers([])
    }
  }, [])

  useEffect(() => {
    if (createDrawerOpen) {
      loadSalesWithoutDelivery()
    }
  }, [createDrawerOpen, loadSalesWithoutDelivery])

  useEffect(() => {
    if (assignDrawerOpen) loadDeliveryPersons()
  }, [assignDrawerOpen, loadDeliveryPersons])

  const stats = {
    pending: deliveries.filter((d) => ['PENDING', 'ASSIGNED'].includes(d.status)).length,
    inTransit: deliveries.filter((d) =>
      ['ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status)
    ).length,
    deliveredToday: deliveries.filter(
      (d) => d.status === 'DELIVERED' && d.deliveredAt && dayjs(d.deliveredAt).isSame(dayjs(), 'day')
    ).length,
    total: deliveries.length,
  }

  const listToShow = (filters.listType === 'active' ? activeDeliveries : deliveries)

  const openDetail = (d) => {
    setSelectedDelivery(d)
    setDetailDrawerOpen(true)
    setMapRefreshKey((k) => k + 1)
  }

  const openAssign = (d) => {
    setSelectedDelivery(d)
    formAssign.resetFields()
    formAssign.setFieldsValue({ deliveryPersonId: d.deliveryPersonId || undefined })
    setAssignDrawerOpen(true)
  }

  const openStatus = (d) => {
    setSelectedDelivery(d)
    formStatus.resetFields()
    formStatus.setFieldsValue({
      status: d.status,
      failureReason: d.failureReason,
      returnReason: d.returnReason,
      deliveryNotes: d.deliveryNotes,
      receivedBy: d.receivedBy,
    })
    setStatusDrawerOpen(true)
  }

  const openEdit = async (d) => {
    setSelectedDelivery(d)
    setEditDrawerOpen(true)
    formEdit.resetFields()
    try {
      const full = await deliveryService.getDeliveryById(d.id)
      setSelectedDelivery(full)
      formEdit.setFieldsValue({
        recipientName: full.recipientName,
        recipientPhone: full.recipientPhone,
        address: full.address,
        complement: full.complement,
        zipCode: full.zipCode,
        neighborhood: full.neighborhood,
        city: full.city,
        state: full.state,
        priority: full.priority,
        scheduledAt: full.scheduledAt ? dayjs(full.scheduledAt) : null,
        instructions: full.instructions,
        deliveryFee: full.deliveryFee != null ? Number(full.deliveryFee) : null,
      })
    } catch {
      formEdit.setFieldsValue({
        recipientName: d.recipientName,
        recipientPhone: d.recipientPhone,
        address: d.address,
        complement: d.complement,
        zipCode: d.zipCode,
        neighborhood: d.neighborhood,
        city: d.city,
        state: d.state,
        priority: d.priority,
        scheduledAt: d.scheduledAt ? dayjs(d.scheduledAt) : null,
        instructions: d.instructions,
        deliveryFee: d.deliveryFee != null ? Number(d.deliveryFee) : null,
      })
    }
  }

  const handleEditDelivery = async () => {
    const values = await formEdit.validateFields().catch(() => null)
    if (!values || !selectedDelivery) return
    setLoadingCreate(true)
    try {
      const payload = {
        recipientName: values.recipientName?.trim() || undefined,
        recipientPhone: values.recipientPhone?.trim() || undefined,
        address: values.address?.trim() || undefined,
        complement: values.complement != null ? String(values.complement).trim() : undefined,
        zipCode: values.zipCode != null ? String(values.zipCode).trim() : undefined,
        neighborhood: values.neighborhood != null ? String(values.neighborhood).trim() : undefined,
        city: values.city != null ? String(values.city).trim() : undefined,
        state: values.state != null ? String(values.state).trim().toUpperCase().slice(0, 2) : undefined,
        priority: values.priority || undefined,
        scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null,
        instructions: values.instructions != null ? String(values.instructions).trim() : undefined,
        deliveryFee: values.deliveryFee != null && values.deliveryFee !== '' ? Number(values.deliveryFee) : undefined,
      }
      await deliveryService.updateDelivery(selectedDelivery.id, payload)
      message.success('Entrega atualizada!')
      setEditDrawerOpen(false)
      formEdit.resetFields()
      loadDeliveries()
      const updated = await deliveryService.getDeliveryById(selectedDelivery.id)
      setSelectedDelivery(updated)
    } catch (e) {
      message.error(e?.message || 'Erro ao atualizar entrega.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleCreateDelivery = async (values) => {
    if (!values.saleId) {
      message.warning('Selecione uma venda.')
      return
    }
    setLoadingCreate(true)
    try {
      const payload = {
        saleId: values.saleId,
        priority: values.priority,
        scheduledAt: values.scheduledAt?.toISOString(),
        instructions: values.instructions?.trim() || undefined,
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      await deliveryService.createDelivery(payload)
      message.success('Entrega criada com sucesso!')
      setCreateDrawerOpen(false)
      formCreate.resetFields()
      loadDeliveries()
      loadSalesWithoutDelivery()
    } catch (e) {
      message.error(e?.message || 'Erro ao criar entrega.')
    } finally {
      setLoadingCreate(false)
    }
  }

  const handleAssign = async () => {
    const values = await formAssign.validateFields().catch(() => null)
    if (!values || !selectedDelivery) return
    try {
      await deliveryService.assignDeliveryPerson(selectedDelivery.id, values.deliveryPersonId)
      message.success('Entregador atribuído!')
      setAssignDrawerOpen(false)
      loadDeliveries()
      const updated = await deliveryService.getDeliveryById(selectedDelivery.id)
      setSelectedDelivery(updated)
    } catch (e) {
      message.error(e?.message || 'Erro ao atribuir.')
    }
  }

  const handleUpdateStatus = async () => {
    const values = await formStatus.validateFields().catch(() => null)
    if (!values || !selectedDelivery) return
    try {
      const payload = {
        status: values.status,
        failureReason: values.failureReason?.trim() || undefined,
        returnReason: values.returnReason?.trim() || undefined,
        deliveryNotes: values.deliveryNotes?.trim() || undefined,
        receivedBy: values.receivedBy?.trim() || undefined,
      }
      await deliveryService.updateDeliveryStatus(selectedDelivery.id, payload)
      message.success('Status atualizado!')
      setStatusDrawerOpen(false)
      loadDeliveries()
      const updated = await deliveryService.getDeliveryById(selectedDelivery.id)
      setSelectedDelivery(updated)
    } catch (e) {
      message.error(e?.message || 'Erro ao atualizar status.')
    }
  }

  const getStatusSteps = (d) => {
    const statusOrder = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED']
    const idx = statusOrder.indexOf(d.status)
    const current = idx >= 0 ? idx : 0
    return statusOrder.slice(0, current + 1).map((s, i) => ({
      title: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
      status: i < current ? 'finish' : i === current ? 'process' : 'wait',
    }))
  }

  const columns = [
    { title: 'Nº', dataIndex: 'deliveryNumber', key: 'deliveryNumber', width: 100 },
    { title: 'Venda', dataIndex: 'saleNumber', key: 'saleNumber', width: 90 },
    { title: 'Destinatário', dataIndex: 'recipientName', key: 'recipientName', ellipsis: true },
    { title: 'Telefone', dataIndex: 'recipientPhone', key: 'recipientPhone', width: 120 },
    {
      title: 'Endereço',
      key: 'address',
      ellipsis: true,
      render: (_, r) => (
        <span title={r.address}>
          {r.address?.length > 40 ? r.address.slice(0, 40) + '...' : r.address || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag>,
    },
    { title: 'Entregador', dataIndex: 'deliveryPersonName', key: 'deliveryPersonName', width: 120, ellipsis: true },
    {
      title: 'Valor',
      dataIndex: 'saleTotal',
      key: 'saleTotal',
      width: 100,
      render: (v) => formatMoney(v),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: 'detail', label: 'Ver detalhes', onClick: () => openDetail(record) },
              { key: 'edit', label: 'Editar', onClick: () => openEdit(record) },
              ...(record.status === 'PENDING' || record.status === 'ASSIGNED'
                ? [{ key: 'assign', label: 'Atribuir entregador', onClick: () => openAssign(record) }]
                : []),
              { key: 'status', label: 'Atualizar status', onClick: () => openStatus(record) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="deliveries-page">
      <main className="deliveries-main">
        <div className="deliveries-container">
          <div className="deliveries-header-card">
            <div className="deliveries-header-icon">
              <CarOutlined />
            </div>
            <div className="deliveries-header-content">
              <h2 className="deliveries-title">Entregas</h2>
              <p className="deliveries-subtitle">
                Gerencie e acompanhe as entregas em tempo real. Atribua entregadores, atualize o status e acompanhe o trajeto.
              </p>
            </div>
          </div>

          {isRoot && (
            <div className="deliveries-tenant-card">
              <label>Empresa</label>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                style={{ width: 280 }}
                allowClear={false}
              />
            </div>
          )}

          <div className="deliveries-stats-row">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Pendentes" value={stats.pending} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Em rota" value={stats.inTransit} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Entregues hoje" value={stats.deliveredToday} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Total" value={stats.total} />
                </Card>
              </Col>
            </Row>
          </div>

          <div className="deliveries-toolbar deliveries-toolbar-stacked">
            <Card className="deliveries-filters-card">
              <Row gutter={16} align="middle">
                <Col xs={24} sm={12} md={6}>
                  <label>Todas / Ativas</label>
                  <Select
                    value={filters.listType}
                    onChange={(v) => setFilters((f) => ({ ...f, listType: v }))}
                    options={[
                      { value: 'all', label: 'Todas' },
                      { value: 'active', label: 'Ativas' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <div className="vl-filters-toggle deliveries-filters-toggle" style={{ marginTop: 24 }}>
                    <Button
                      type="button"
                      className={`vl-filters-toggle-btn${filtersExpanded ? ' vl-filters-toggle-btn--open' : ''}`}
                      icon={<FilterOutlined />}
                      onClick={() => setFiltersExpanded((v) => !v)}
                      aria-expanded={filtersExpanded}
                    >
                      <span className="vl-filters-toggle-label">
                        {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                      </span>
                      <DownOutlined className="vl-filters-chevron" aria-hidden />
                    </Button>
                  </div>
                </Col>
              </Row>
              <div
                className={`vl-filters-expand${filtersExpanded ? ' vl-filters-expand--open' : ''}`}
                aria-hidden={!filtersExpanded}
              >
                <div className="vl-filters-expand-inner">
                <Row gutter={16} align="bottom" className="vl-filters-row">
                  <Col xs={24} sm={12} md={6}>
                    <label>Buscar</label>
                    <Input
                      placeholder="Nº, destinatário, endereço"
                      prefix={<SearchOutlined />}
                      value={filters.search}
                      onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                      onPressEnter={loadDeliveries}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <label>Status</label>
                    <Select
                      placeholder="Todos"
                      options={STATUS_OPTIONS}
                      value={filters.status}
                      onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <label>Entregador</label>
                    <Select
                      placeholder="Todos"
                      options={deliveryPersons.map((p) => ({ value: p.id, label: p.fullName || p.username }))}
                      value={filters.deliveryPersonId}
                      onChange={(v) => setFilters((f) => ({ ...f, deliveryPersonId: v }))}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <label>Período</label>
                    <RangePicker
                      value={filters.dateRange}
                      onChange={(v) => setFilters((f) => ({ ...f, dateRange: v }))}
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} md={6}>
                    <label style={{ visibility: 'hidden' }}>.</label>
                    <Button type="primary" icon={<SearchOutlined />} onClick={loadDeliveries} loading={loading} block>
                      Filtrar
                    </Button>
                  </Col>
                </Row>
                </div>
              </div>
            </Card>
            <div className="deliveries-toolbar-actions">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateDrawerOpen(true)} className="deliveries-add-btn">
                Nova entrega
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={listToShow}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} entrega(s)` }}
            className="deliveries-table"
          />
        </div>
      </main>

      <Drawer
        title={`Entrega ${selectedDelivery?.deliveryNumber || ''}`}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={520}
        className="deliveries-detail-drawer"
      >
        {selectedDelivery && (
          <>
            <div className="deliveries-detail-drawer-actions">
              <Space wrap size="small">
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => setMapRefreshKey((k) => k + 1)}
                  disabled={!selectedDelivery?.id}
                >
                  Atualizar mapa
                </Button>
                {(selectedDelivery?.status === 'PENDING' || selectedDelivery?.status === 'ASSIGNED') && (
                  <Button icon={<UserOutlined />} onClick={() => openAssign(selectedDelivery)}>
                    Atribuir
                  </Button>
                )}
                <Button type="primary" onClick={() => openStatus(selectedDelivery)}>
                  Atualizar status
                </Button>
              </Space>
            </div>
            <Steps
              direction="vertical"
              size="small"
              current={Math.max(0, getStatusSteps(selectedDelivery).length - 1)}
              items={getStatusSteps(selectedDelivery).map((s) => ({
                title: s.title,
                status: s.status,
              }))}
            />
            <Descriptions column={1} bordered size="small" style={{ marginTop: 24 }}>
              <Descriptions.Item label="Venda">{selectedDelivery.saleNumber}</Descriptions.Item>
              <Descriptions.Item label="Destinatário">{selectedDelivery.recipientName}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{selectedDelivery.recipientPhone}</Descriptions.Item>
              <Descriptions.Item label="Endereço">{selectedDelivery.address}</Descriptions.Item>
              {selectedDelivery.complement && (
                <Descriptions.Item label="Complemento">{selectedDelivery.complement}</Descriptions.Item>
              )}
              <Descriptions.Item label="Entregador">{selectedDelivery.deliveryPersonName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Taxa entrega">{formatMoney(selectedDelivery.deliveryFee)}</Descriptions.Item>
              <Descriptions.Item label="Valor total">{formatMoney(selectedDelivery.saleTotal)}</Descriptions.Item>
              <Descriptions.Item label="Criado em">{formatDate(selectedDelivery.createdAt)}</Descriptions.Item>
              {selectedDelivery.deliveredAt && (
                <Descriptions.Item label="Entregue em">{formatDate(selectedDelivery.deliveredAt)}</Descriptions.Item>
              )}
            </Descriptions>
            <DeliveryMap delivery={selectedDelivery} refreshKey={mapRefreshKey} />
          </>
        )}
      </Drawer>

      <Drawer title="Atribuir entregador" open={assignDrawerOpen} onClose={() => setAssignDrawerOpen(false)} width={400}>
        <Form form={formAssign} layout="vertical" onFinish={handleAssign}>
          <Form.Item
            name="deliveryPersonId"
            label="Entregador"
            rules={[{ required: true, message: 'Selecione o entregador' }]}
          >
            <Select
              placeholder="Selecione o entregador"
              options={deliveryPersons.map((p) => ({ value: p.id, label: p.fullName || p.username }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Atribuir
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer title="Atualizar status" open={statusDrawerOpen} onClose={() => setStatusDrawerOpen(false)} width={420}>
        <Form form={formStatus} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="Novo status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} placeholder="Selecione o status" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'FAILED' ? (
                <Form.Item name="failureReason" label="Motivo da falha">
                  <TextArea rows={3} placeholder="Descreva o motivo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'RETURNED' ? (
                <Form.Item name="returnReason" label="Motivo da devolução">
                  <TextArea rows={3} placeholder="Descreva o motivo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'DELIVERED' ? (
                <>
                  <Form.Item name="receivedBy" label="Quem recebeu">
                    <Input placeholder="Nome de quem recebeu" />
                  </Form.Item>
                  <Form.Item name="deliveryNotes" label="Observações">
                    <TextArea rows={2} placeholder="Observações do entregador" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Atualizar
            </Button>
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title="Nova entrega"
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        width={480}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setCreateDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={loadingCreate} onClick={() => formCreate.submit()}>
              Criar entrega
            </Button>
          </Space>
        }
      >
        <Form form={formCreate} layout="vertical" onFinish={handleCreateDelivery}>
          <Form.Item name="saleId" label="Venda" rules={[{ required: true, message: 'Selecione a venda' }]}>
            <Select
              placeholder="Selecione uma venda sem entrega"
              options={salesWithoutDelivery.map((s) => ({
                value: s.id,
                label: `${s.saleNumber} - ${s.customerName || 'Cliente'} - ${formatMoney(s.total)}`,
              }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="priority" label="Prioridade">
            <Select options={PRIORITY_OPTIONS} placeholder="Normal" />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Previsão de entrega">
            <DatePicker showTime style={{ width: '100%' }} placeholder="Opcional" />
          </Form.Item>
          <Form.Item name="instructions" label="Instruções">
            <TextArea rows={2} placeholder="Instruções para o entregador" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={`Editar entrega ${selectedDelivery?.deliveryNumber || ''}`}
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        width={520}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setEditDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={loadingCreate} onClick={handleEditDelivery}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={formEdit} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="recipientName" label="Destinatário" rules={[{ required: true, message: 'Informe o destinatário' }]}>
                <Input placeholder="Nome" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="recipientPhone"
                label="Telefone"
                normalize={normalizePhone}
                rules={[{ required: true, message: 'Informe o telefone' }, { max: 20 }]}
              >
                <Input placeholder="(DDD) ..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Endereço" rules={[{ required: true, message: 'Informe o endereço' }]}>
            <Input placeholder="Rua, número" />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="complement" label="Complemento">
                <Input placeholder="Apto, bloco, referência" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="zipCode" label="CEP">
                <Input placeholder="00000-000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col xs={24} md={10}>
              <Form.Item name="neighborhood" label="Bairro">
                <Input placeholder="Bairro" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="city" label="Cidade">
                <Input placeholder="Cidade" />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="state" label="UF">
                <Input placeholder="UF" maxLength={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="priority" label="Prioridade">
                <Select options={PRIORITY_OPTIONS} placeholder="Normal" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="scheduledAt" label="Previsão de entrega">
                <DatePicker showTime style={{ width: '100%' }} placeholder="Opcional" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="deliveryFee" label="Taxa de entrega">
            <Input type="number" inputMode="decimal" step="0.01" placeholder="Opcional" />
          </Form.Item>

          <Form.Item name="instructions" label="Instruções">
            <TextArea rows={3} placeholder="Instruções para o entregador" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
