import { useState, useEffect, useCallback } from 'react'
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
  Popconfirm,
} from 'antd'
import {
  UserOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import * as customerService from '../services/customerService'
import * as tenantService from '../services/tenantService'
import './Customers.css'

const { TextArea } = Input

const FILTER_ALL = '__all__'
const initialFormValues = { active: true }

export default function Customers() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
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

  // Consulta só é aplicada ao clicar em Filtrar (não auto-load)

  const openDrawer = (customer = null) => {
    setEditingId(customer?.id ?? null)
    form.resetFields()
    form.setFieldsValue(initialFormValues)
    if (customer) {
      form.setFieldsValue({
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
      })
    } else if (isRoot) {
      form.setFieldsValue({ tenantId: selectedTenantId ?? undefined })
    }
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const handleDelete = async (id) => {
    try {
      await customerService.deleteCustomer(id)
      message.success('Cliente excluído.')
      handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir cliente.')
    }
  }

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

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Documento', dataIndex: 'document', key: 'document', width: 130, ellipsis: true },
    { title: 'E-mail', dataIndex: 'email', key: 'email', width: 180, ellipsis: true },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', width: 120 },
    {
      title: 'Endereço',
      key: 'address',
      ellipsis: true,
      render: (_, r) => formatAddress(r),
    },
    {
      title: 'Status',
      key: 'status',
      width: 90,
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
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Excluir este cliente?"
          description="Esta ação não pode ser desfeita."
          onConfirm={(e) => {
            e?.stopPropagation?.()
            handleDelete(record.id)
          }}
          okText="Excluir"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="customers-page">
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
              <div className="sales-consult-filters-toggle">
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setFiltersExpanded((v) => !v)}
                >
                  {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                </Button>
              </div>
              {filtersExpanded && (
                <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
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
                  <Col xs={24} md={6} style={{ marginTop: 24 }}>
                    <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loadingList} block>
                      Filtrar
                    </Button>
                  </Col>
                </Row>
              )}
            </Card>
            <div className="customers-toolbar-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openDrawer()}
                className="customers-add-btn"
              >
                Novo cliente
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={customers}
            loading={loadingList}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} cliente(s)` }}
            className="customers-table"
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
        width={520}
        destroyOnClose
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
          initialValues={initialFormValues}
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
            <Form.Item name="document" label="CPF ou CNPJ" rules={[{ max: 20 }]} extra="Aceita CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem formatação.">
              <Input placeholder="CPF ou CNPJ" />
            </Form.Item>
            <Form.Item name="email" label="E-mail" rules={[{ max: 255 }]}>
              <Input placeholder="E-mail" type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Telefone" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone principal" />
            </Form.Item>
            <Form.Item name="phoneAlt" label="Telefone alternativo" rules={[{ max: 20 }]}>
              <Input placeholder="Opcional" />
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
