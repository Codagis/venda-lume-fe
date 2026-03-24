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
} from 'antd'
import {
  ShopOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  DownOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { confirmDeleteModal } from '../utils/confirmModal'
import * as supplierService from '../services/supplierService'
import * as tenantService from '../services/tenantService'
import './Suppliers.css'

const { TextArea } = Input

const FILTER_ALL = '__all__'
const initialFormValues = { active: true }

export default function Suppliers() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [suppliers, setSuppliers] = useState([])
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
      setSuppliers([])
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
      const res = await supplierService.searchSuppliers(filter)
      setSuppliers(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar fornecedores.')
      setSuppliers([])
    } finally {
      setLoadingList(false)
    }
  }, [isRoot, selectedTenantId, filterSearch, filterActive])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  const openDrawer = (supplier = null) => {
    setEditingId(supplier?.id ?? null)
    form.resetFields()
    form.setFieldsValue(initialFormValues)
    if (supplier) {
      form.setFieldsValue({
        name: supplier.name,
        tradeName: supplier.tradeName,
        document: supplier.document,
        stateRegistration: supplier.stateRegistration,
        municipalRegistration: supplier.municipalRegistration,
        contactName: supplier.contactName,
        contactPhone: supplier.contactPhone,
        contactEmail: supplier.contactEmail,
        bankName: supplier.bankName,
        bankAgency: supplier.bankAgency,
        bankAccount: supplier.bankAccount,
        bankPix: supplier.bankPix,
        paymentTerms: supplier.paymentTerms,
        addressStreet: supplier.addressStreet,
        addressNumber: supplier.addressNumber,
        addressComplement: supplier.addressComplement,
        addressNeighborhood: supplier.addressNeighborhood,
        addressCity: supplier.addressCity,
        addressState: supplier.addressState,
        addressZip: supplier.addressZip,
        notes: supplier.notes,
        active: supplier.active ?? true,
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
      await supplierService.deleteSupplier(id)
      message.success('Fornecedor excluído.')
      handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir fornecedor.')
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = {
        name: values.name?.trim(),
        tradeName: values.tradeName?.trim() || undefined,
        document: values.document?.trim() || undefined,
        stateRegistration: values.stateRegistration?.trim() || undefined,
        municipalRegistration: values.municipalRegistration?.trim() || undefined,
        contactName: values.contactName?.trim() || undefined,
        contactPhone: values.contactPhone?.trim() || undefined,
        contactEmail: values.contactEmail?.trim() || undefined,
        bankName: values.bankName?.trim() || undefined,
        bankAgency: values.bankAgency?.trim() || undefined,
        bankAccount: values.bankAccount?.trim() || undefined,
        bankPix: values.bankPix?.trim() || undefined,
        paymentTerms: values.paymentTerms?.trim() || undefined,
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
        await supplierService.updateSupplier(editingId, payload)
        message.success('Fornecedor atualizado com sucesso!')
      } else {
        if (isRoot) payload.tenantId = values.tenantId
        await supplierService.createSupplier(payload)
        message.success('Fornecedor cadastrado com sucesso!')
      }
      closeDrawer()
      handleFilter()
    } catch (error) {
      message.error(error?.message || 'Erro ao salvar fornecedor.')
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
    { title: 'Nome fantasia', dataIndex: 'tradeName', key: 'tradeName', width: 160, ellipsis: true },
    { title: 'Documento', dataIndex: 'document', key: 'document', width: 130, ellipsis: true },
    { title: 'E-mail contato', dataIndex: 'contactEmail', key: 'contactEmail', width: 180, ellipsis: true },
    { title: 'Telefone contato', dataIndex: 'contactPhone', key: 'contactPhone', width: 120 },
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
            <span className="suppliers-badge suppliers-badge-active">Ativo</span>
          ) : (
            <span className="suppliers-badge suppliers-badge-inactive">Inativo</span>
          )}
        </Space>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            confirmDeleteModal({
              title: 'Excluir este fornecedor?',
              onOk: () => handleDelete(record.id),
            })
          }}
        />
      ),
    },
  ]

  return (
    <div className="suppliers-page">
      <main className="suppliers-main">
        <div className="suppliers-container">
          <div className="suppliers-header-card">
            <div className="suppliers-header-card-icon">
              <ShopOutlined />
            </div>
            <div className="suppliers-header-card-content">
              <h2 className="suppliers-page-title">Fornecedores</h2>
              <p className="suppliers-page-subtitle">
                Cadastre e gerencie os fornecedores da sua empresa. Clique em um item para editar.
              </p>
            </div>
          </div>

          <div className="suppliers-toolbar">
            <Card className="suppliers-filters-card sales-consult-filters-card" style={{ width: '100%' }}>
              <div className="vl-filters-toggle sales-consult-filters-toggle">
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
              <div
                className={`vl-filters-expand${filtersExpanded ? ' vl-filters-expand--open' : ''}`}
                aria-hidden={!filtersExpanded}
              >
                <div className="vl-filters-expand-inner">
                <Row gutter={16} align="middle" className="vl-filters-row">
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
                </div>
              </div>
            </Card>
            <div className="suppliers-toolbar-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openDrawer()}
                className="suppliers-add-btn"
              >
                Novo fornecedor
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={suppliers}
            loading={loadingList}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} fornecedor(es)` }}
            className="suppliers-table"
            onRow={(record) => ({
              onClick: () => openDrawer(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </main>

      <Drawer
        title={editingId ? 'Editar fornecedor' : 'Novo fornecedor'}
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
          className="suppliers-form suppliers-drawer-form"
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

          <div className="suppliers-drawer-section">
            <h3 className="suppliers-section-title">Dados básicos</h3>
            <Form.Item name="name" label="Razão social" rules={[{ required: true, message: 'Obrigatório' }, { max: 255 }]}>
              <Input placeholder="Razão social" />
            </Form.Item>
            <Form.Item name="tradeName" label="Nome fantasia" rules={[{ max: 255 }]}>
              <Input placeholder="Nome fantasia" />
            </Form.Item>
            <Form.Item name="document" label="CPF/CNPJ" rules={[{ max: 20 }]}>
              <Input placeholder="Documento" />
            </Form.Item>
            <Form.Item name="stateRegistration" label="Inscrição estadual" rules={[{ max: 50 }]}>
              <Input placeholder="Inscrição estadual" />
            </Form.Item>
            <Form.Item name="municipalRegistration" label="Inscrição municipal" rules={[{ max: 50 }]}>
              <Input placeholder="Inscrição municipal" />
            </Form.Item>
          </div>

          <div className="suppliers-drawer-section">
            <h3 className="suppliers-section-title">Contato</h3>
            <Form.Item name="contactName" label="Nome do contato" rules={[{ max: 255 }]}>
              <Input placeholder="Nome do contato" />
            </Form.Item>
            <Form.Item name="contactPhone" label="Telefone" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone do contato" />
            </Form.Item>
            <Form.Item name="contactEmail" label="E-mail" rules={[{ max: 255 }]}>
              <Input placeholder="E-mail do contato" type="email" />
            </Form.Item>
          </div>

          <div className="suppliers-drawer-section">
            <h3 className="suppliers-section-title">Endereço</h3>
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

          <div className="suppliers-drawer-section">
            <h3 className="suppliers-section-title">Dados bancários e condições de pagamento</h3>
            <Form.Item name="bankName" label="Banco" rules={[{ max: 100 }]}>
              <Input placeholder="Nome do banco" />
            </Form.Item>
            <Form.Item name="bankAgency" label="Agência" rules={[{ max: 20 }]}>
              <Input placeholder="Agência" />
            </Form.Item>
            <Form.Item name="bankAccount" label="Conta" rules={[{ max: 30 }]}>
              <Input placeholder="Conta bancária" />
            </Form.Item>
            <Form.Item name="bankPix" label="PIX" rules={[{ max: 100 }]}>
              <Input placeholder="Chave PIX" />
            </Form.Item>
            <Form.Item name="paymentTerms" label="Condições de pagamento" rules={[{ max: 255 }]}>
              <TextArea rows={2} placeholder="Ex: 30/60/90 dias, à vista, etc." />
            </Form.Item>
          </div>

          <div className="suppliers-drawer-section">
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
