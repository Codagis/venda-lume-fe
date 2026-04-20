import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Drawer,
  Table,
  message,
  Space,
  Grid,
} from 'antd'
import {
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import { confirmDeleteModal } from '../../utils/confirmModal'
import * as customerService from '../../services/customerService'
import * as tenantService from '../../services/tenantService'
import { normalizeCpfCnpj, normalizePhone } from '../../utils/masks'
import { antdRuleCpfCnpj, antdRuleEmail } from '../../utils/validators'
import './Customers.css'

const { TextArea } = Input

const FILTER_ALL = '__all__'
const initialFormValues = { active: true }

function mapCustomerToFormValues(customer) {
  return {
    name: customer.name,
    document: customer.document,
    email: customer.email,
    phone: customer.phone,
    phoneAlt: customer.phoneAlt,
    addressStreet: customer.addressStreet,
    addressNumber: customer.addressNumber,
    addressComplement: customer.addressComplement,
    addressNeighborhood: customer.addressNeighborhood,
    addressCity: customer.addressCity,
    addressState: customer.addressState,
    addressZip: customer.addressZip,
    notes: customer.notes,
    active: customer.active ?? true,
  }
}

export default function Customers() {
  const screens = Grid.useBreakpoint()
  const isCompact = screens.sm === false
  const isNarrow = screens.md === false
  const dashGutter = useMemo(
    () => (isCompact ? [12, 12] : isNarrow ? [14, 14] : [16, 16]),
    [isCompact, isNarrow]
  )

  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActive, setFilterActive] = useState(FILTER_ALL)
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const FILTER_OPTIONS = [
    { value: FILTER_ALL, label: 'Todos' },
    { value: true, label: 'Sim' },
    { value: false, label: 'Não' },
  ]

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

  const handleFilter = useCallback(async () => {
    if (isRoot && !selectedTenantId) {
      setCustomers([])
      return
    }
    setLoadingList(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'name', sortDirection: 'asc' }
      if (filterSearch?.trim()) filter.search = filterSearch.trim()
      if (filterActive !== FILTER_ALL) filter.active = filterActive
      if (isRoot && selectedTenantId != null && selectedTenantId !== '') {
        filter.tenantId = selectedTenantId
      }
      const res = await customerService.searchCustomers(filter)
      setCustomers(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar clientes.')
      setCustomers([])
    } finally {
      setLoadingList(false)
    }
  }, [isRoot, selectedTenantId, filterSearch, filterActive])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    if (!drawerOpen) return
    const t = window.setTimeout(() => {
      form.resetFields()
      if (drawerRecord) {
        form.setFieldsValue({ ...initialFormValues, ...mapCustomerToFormValues(drawerRecord) })
      } else {
        const next = { ...initialFormValues }
        if (isRoot) next.tenantId = selectedTenantId ?? undefined
        form.setFieldsValue(next)
      }
    }, 0)
    return () => window.clearTimeout(t)
  }, [drawerOpen, drawerRecord, isRoot, selectedTenantId, form])

  const openDrawer = (customer = null) => {
    setEditingId(customer?.id ?? null)
    setDrawerRecord(customer ?? null)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    setDrawerRecord(null)
    form.resetFields()
  }

  const handleDelete = useCallback(
    async (id) => {
      try {
        await customerService.deleteCustomer(id)
        message.success('Cliente excluído.')
        handleFilter()
      } catch (e) {
        message.error(e?.message || 'Erro ao excluir cliente.')
      }
    },
    [handleFilter]
  )

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = {
        name: values.name?.trim(),
        document: values.document?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        phoneAlt: values.phoneAlt?.trim() || undefined,
        addressStreet: values.addressStreet?.trim() || undefined,
        addressNumber: values.addressNumber?.trim() || undefined,
        addressComplement: values.addressComplement?.trim() || undefined,
        addressNeighborhood: values.addressNeighborhood?.trim() || undefined,
        addressCity: values.addressCity?.trim() || undefined,
        addressState: values.addressState?.trim()?.toUpperCase() || undefined,
        addressZip: values.addressZip?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        active: values.active ?? true,
      }
      if (editingId) {
        await customerService.updateCustomer(editingId, payload)
        message.success('Cliente atualizado com sucesso!')
      } else {
        if (isRoot) payload.tenantId = values.tenantId
        await customerService.createCustomer(payload)
        message.success('Cliente cadastrado com sucesso!')
      }
      closeDrawer()
      handleFilter()
    } catch (error) {
      message.error(error?.message || 'Erro ao salvar cliente.')
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (r) => {
    const parts = []
    if (r.addressStreet) parts.push(r.addressStreet)
    if (r.addressNumber) parts.push(r.addressNumber)
    if (r.addressNeighborhood) parts.push(r.addressNeighborhood)
    if (r.addressCity) parts.push(r.addressCity)
    if (r.addressState) parts.push(r.addressState)
    return parts.length ? parts.join(', ') : '—'
  }

  const columns = useMemo(
    () => [
      { title: 'Nome', dataIndex: 'name', key: 'name', ellipsis: true },
      {
        title: 'Documento',
        dataIndex: 'document',
        key: 'document',
        width: isCompact ? 112 : 130,
        ellipsis: true,
      },
      {
        title: 'E-mail',
        dataIndex: 'email',
        key: 'email',
        width: 180,
        ellipsis: true,
        responsive: ['sm'],
      },
      {
        title: 'Telefone',
        dataIndex: 'phone',
        key: 'phone',
        width: 120,
        responsive: ['sm'],
      },
      {
        title: 'Endereço',
        key: 'address',
        ellipsis: true,
        responsive: ['md'],
        render: (_, r) => formatAddress(r),
      },
      {
        title: 'Status',
        key: 'status',
        width: isCompact ? 76 : 90,
        render: (_, r) => (
          <Space size={4}>
            {r.active ? (
              <span className="customers-badge customers-badge-active">Ativo</span>
            ) : (
              <span className="customers-badge customers-badge-inactive">Inativo</span>
            )}
          </Space>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: isCompact ? 44 : 50,
        align: 'center',
        render: (_, record) => (
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              confirmDeleteModal({
                title: 'Excluir este cliente?',
                onOk: () => handleDelete(record.id),
              })
            }}
          />
        ),
      },
    ],
    [isCompact, handleDelete]
  )

  return (
    <div className={`customers-page${isCompact ? ' customers-page--compact' : ''}`}>
      <main className="customers-main">
        <div className="customers-container">
          <div className="customers-header-card">
            <div className="customers-header-card-icon">
              <UserOutlined />
            </div>
            <div className="customers-header-card-content">
              <h2 className="customers-page-title">Clientes</h2>
              <p className="customers-page-subtitle">
                Cadastre e gerencie os clientes da sua empresa. Clique em um item para editar.
              </p>
            </div>
          </div>

          <div className="customers-toolbar">
            <Card className="customers-filters-card sales-consult-filters-card" style={{ width: '100%' }}>
              <div
                className={`customers-filters-head vl-filters-toggle sales-consult-filters-toggle${isCompact ? ' customers-filters-head--stack' : ''}`}
              >
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
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openDrawer()}
                  className="customers-add-btn"
                  block={isCompact}
                >
                  Novo cliente
                </Button>
              </div>
              <div
                className={`vl-filters-expand${filtersExpanded ? ' vl-filters-expand--open' : ''}`}
                aria-hidden={!filtersExpanded}
              >
                <div className="vl-filters-expand-inner">
                <Row gutter={dashGutter} align="middle" className="vl-filters-row">
                  <Col xs={24} sm={12} md={6}>
                    <label>Buscar</label>
                    <Input
                      placeholder="Nome, documento, e-mail"
                      prefix={<SearchOutlined />}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      onPressEnter={handleFilter}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <label>Ativo</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterActive}
                      onChange={setFilterActive}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  {isRoot && (
                    <Col xs={24} sm={12} md={6}>
                      <label>Empresa</label>
                      <Select
                        placeholder="Empresa"
                        options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                        value={selectedTenantId}
                        onChange={setSelectedTenantId}
                        style={{ width: '100%' }}
                        allowClear={false}
                      />
                    </Col>
                  )}
                  <Col xs={24} md={6} className="customers-filter-submit-col">
                    <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loadingList} block>
                      Filtrar
                    </Button>
                  </Col>
                </Row>
                </div>
              </div>
            </Card>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={customers}
            loading={loadingList}
            size={isCompact ? 'small' : 'middle'}
            scroll={{ x: isCompact ? 520 : 1100 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: !isCompact,
              showTotal: isCompact ? undefined : (t) => `${t} cliente(s)`,
              simple: isCompact,
              responsive: true,
            }}
            className="customers-table customers-data-table"
            onRow={(record) => ({
              onClick: () => openDrawer(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </main>

      <Drawer
        title={editingId ? 'Editar cliente' : 'Novo cliente'}
        open={drawerOpen}
        onClose={closeDrawer}
        placement="right"
        width={isCompact ? '100%' : 520}
        destroyOnHidden
        rootClassName={`customers-drawer-root${isCompact ? ' customers-drawer-root--compact' : ''}`}
        styles={{
          body: {
            paddingBottom: isCompact ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 24,
          },
        }}
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          preserve={false}
          className="customers-form customers-drawer-form"
        >
          {isRoot && !editingId && (
            <Form.Item
              name="tenantId"
              label="Empresa"
              rules={[{ required: true, message: 'Selecione a empresa' }]}
            >
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <div className="customers-drawer-section">
            <h3 className="customers-section-title">Dados básicos</h3>
            <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Obrigatório' }, { max: 255 }]}>
              <Input placeholder="Nome ou razão social" />
            </Form.Item>
            <Form.Item
              name="document"
              label="CPF ou CNPJ"
              normalize={normalizeCpfCnpj}
              rules={[{ max: 20 }, antdRuleCpfCnpj()]}
              extra="Aceita CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem formatação."
            >
              <Input placeholder="CPF ou CNPJ" inputMode="numeric" />
            </Form.Item>
            <Form.Item name="email" label="E-mail" rules={[{ max: 255 }, antdRuleEmail()]}>
              <Input placeholder="E-mail" type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Telefone" normalize={normalizePhone} rules={[{ max: 20 }]}>
              <Input placeholder="Telefone com DDD" inputMode="tel" />
            </Form.Item>
            <Form.Item name="phoneAlt" label="Telefone alternativo" normalize={normalizePhone} rules={[{ max: 20 }]}>
              <Input placeholder="Opcional (com DDD)" inputMode="tel" />
            </Form.Item>
          </div>

          <div className="customers-drawer-section">
            <h3 className="customers-section-title">Endereço</h3>
            <Form.Item name="addressStreet" label="Logradouro" rules={[{ max: 255 }]}>
              <Input placeholder="Rua, avenida, etc." />
            </Form.Item>
            <Form.Item name="addressNumber" label="Número" rules={[{ max: 20 }]}>
              <Input placeholder="Nº" />
            </Form.Item>
            <Form.Item name="addressComplement" label="Complemento" rules={[{ max: 100 }]}>
              <Input placeholder="Apto, bloco, etc." />
            </Form.Item>
            <Form.Item name="addressNeighborhood" label="Bairro" rules={[{ max: 100 }]}>
              <Input placeholder="Bairro" />
            </Form.Item>
            <Form.Item name="addressCity" label="Cidade" rules={[{ max: 100 }]}>
              <Input placeholder="Cidade" />
            </Form.Item>
            <Form.Item name="addressState" label="UF" rules={[{ max: 2 }]}>
              <Input placeholder="UF" maxLength={2} />
            </Form.Item>
            <Form.Item name="addressZip" label="CEP" rules={[{ max: 10 }]}>
              <Input placeholder="CEP" />
            </Form.Item>
          </div>

          <div className="customers-drawer-section">
            <Form.Item name="notes" label="Observações">
              <TextArea rows={2} placeholder="Observações (opcional)" />
            </Form.Item>
            <Form.Item name="active" valuePropName="checked" label="Ativo">
              <Switch checkedChildren="Sim" unCheckedChildren="Não" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  )
}
