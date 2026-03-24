import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  InputNumber,
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
  Modal,
  Upload,
} from 'antd'
import {
  FileTextOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  DeleteOutlined,
  UploadOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import * as contractorService from '../services/contractorService'
import * as tenantService from '../services/tenantService'
import { confirmDeleteModal } from '../utils/confirmModal'
import './Contractors.css'

const { TextArea } = Input

const FILTER_ALL = '__all__'
const initialFormValues = { active: true }

function formatMoney(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export default function Contractors() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [formInvoice] = Form.useForm()
  const [contractors, setContractors] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActive, setFilterActive] = useState(FILTER_ALL)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceUploadModalOpen, setInvoiceUploadModalOpen] = useState(false)
  const [selectedInvoiceForUpload, setSelectedInvoiceForUpload] = useState(null)
  const [uploadFileList, setUploadFileList] = useState([])
  const [uploadingInvoice, setUploadingInvoice] = useState(false)
  const [savingInvoice, setSavingInvoice] = useState(false)

  const FILTER_OPTIONS = [
    { value: FILTER_ALL, label: 'Todos' },
    { value: true, label: 'Ativos' },
    { value: false, label: 'Inativos' },
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
      setContractors([])
      return
    }
    setLoadingList(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'name', sortDirection: 'asc' }
      if (filterSearch?.trim()) filter.search = filterSearch.trim()
      if (filterActive !== FILTER_ALL) filter.active = filterActive
      if (isRoot && selectedTenantId != null && selectedTenantId !== '') filter.tenantId = selectedTenantId
      const res = await contractorService.searchContractors(filter, isRoot ? selectedTenantId : undefined)
      setContractors(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar prestadores.')
      setContractors([])
    } finally {
      setLoadingList(false)
    }
  }, [isRoot, selectedTenantId, filterSearch, filterActive])

  const loadInvoices = useCallback(async (contractorId) => {
    if (!contractorId) return
    try {
      const data = await contractorService.listContractorInvoices(contractorId)
      setInvoices(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar notas fiscais.')
      setInvoices([])
    }
  }, [])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  const openDrawer = (contractor = null) => {
    setEditingId(contractor?.id ?? null)
    form.resetFields()
    form.setFieldsValue(initialFormValues)
    if (contractor) {
      form.setFieldsValue({
        name: contractor.name,
        tradeName: contractor.tradeName,
        cnpj: contractor.cnpj,
        email: contractor.email,
        phone: contractor.phone,
        phoneAlt: contractor.phoneAlt,
        addressStreet: contractor.addressStreet,
        addressNumber: contractor.addressNumber,
        addressComplement: contractor.addressComplement,
        addressNeighborhood: contractor.addressNeighborhood,
        addressCity: contractor.addressCity,
        addressState: contractor.addressState,
        addressZip: contractor.addressZip,
        bankName: contractor.bankName,
        bankAgency: contractor.bankAgency,
        bankAccount: contractor.bankAccount,
        bankPix: contractor.bankPix,
        notes: contractor.notes,
        active: contractor.active ?? true,
      })
      loadInvoices(contractor.id)
    } else {
      setInvoices([])
    }
    if (isRoot && !contractor) form.setFieldsValue({ tenantId: selectedTenantId ?? undefined })
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    setInvoices([])
    form.resetFields()
    setInvoiceModalOpen(false)
    setInvoiceUploadModalOpen(false)
  }

  const handleDelete = async (id) => {
    try {
      await contractorService.deleteContractor(id)
      message.success('Prestador excluído.')
      handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir prestador.')
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = {
        name: values.name?.trim(),
        tradeName: values.tradeName?.trim() || undefined,
        cnpj: values.cnpj?.trim() || undefined,
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
        bankName: values.bankName?.trim() || undefined,
        bankAgency: values.bankAgency?.trim() || undefined,
        bankAccount: values.bankAccount?.trim() || undefined,
        bankPix: values.bankPix?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        active: values.active ?? true,
      }
      if (editingId) {
        await contractorService.updateContractor(editingId, payload)
        message.success('Prestador atualizado com sucesso!')
      } else {
        if (isRoot) payload.tenantId = values.tenantId
        await contractorService.createContractor(payload)
        message.success('Prestador cadastrado com sucesso!')
      }
      closeDrawer()
      handleFilter()
    } catch (error) {
      message.error(error?.message || 'Erro ao salvar prestador.')
    } finally {
      setLoading(false)
    }
  }

  const openInvoiceModal = () => {
    formInvoice.resetFields()
    formInvoice.setFieldsValue({ referenceMonth: new Date().toISOString().slice(0, 7) })
    setInvoiceModalOpen(true)
  }

  const onInvoiceFinish = async (values) => {
    if (!editingId) return
    setSavingInvoice(true)
    try {
      const file = uploadFileList[0]?.originFileObj
      await contractorService.createContractorInvoice(
        editingId,
        {
          referenceMonth: values.referenceMonth,
          amount: values.amount,
          nfNumber: values.nfNumber?.trim() || undefined,
          nfKey: values.nfKey?.trim() || undefined,
          description: values.description?.trim() || undefined,
        },
        file
      )
      message.success('Nota fiscal registrada.')
      setInvoiceModalOpen(false)
      setUploadFileList([])
      loadInvoices(editingId)
    } catch (e) {
      message.error(e?.message || 'Erro ao registrar NF.')
    } finally {
      setSavingInvoice(false)
    }
  }

  const openUploadModal = (inv) => {
    setSelectedInvoiceForUpload(inv)
    setUploadFileList([])
    setInvoiceUploadModalOpen(true)
  }

  const handleUploadInvoiceFile = async () => {
    if (!editingId || !selectedInvoiceForUpload || uploadFileList.length === 0) {
      message.warning('Selecione um arquivo PDF ou XML.')
      return
    }
    setUploadingInvoice(true)
    try {
      await contractorService.uploadContractorInvoiceFile(
        editingId,
        selectedInvoiceForUpload.id,
        uploadFileList[0].originFileObj
      )
      message.success('Arquivo da NF enviado.')
      setInvoiceUploadModalOpen(false)
      setSelectedInvoiceForUpload(null)
      setUploadFileList([])
      loadInvoices(editingId)
    } catch (e) {
      message.error(e?.message || 'Erro ao enviar arquivo.')
    } finally {
      setUploadingInvoice(false)
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
    { title: 'Razão social', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Nome fantasia', dataIndex: 'tradeName', key: 'tradeName', width: 160, ellipsis: true },
    { title: 'CNPJ', dataIndex: 'cnpj', key: 'cnpj', width: 160, ellipsis: true },
    { title: 'E-mail', dataIndex: 'email', key: 'email', width: 180, ellipsis: true },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: 'Endereço', key: 'address', ellipsis: true, render: (_, r) => formatAddress(r) },
    {
      title: 'Status',
      key: 'status',
      width: 90,
      render: (_, r) => (
        <Space size={4}>
          {r.active ? (
            <span className="contractors-badge contractors-badge-active">Ativo</span>
          ) : (
            <span className="contractors-badge contractors-badge-inactive">Inativo</span>
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
              title: 'Excluir este prestador?',
              onOk: () => handleDelete(record.id),
            })
          }}
        />
      ),
    },
  ]

  return (
    <div className="contractors-page">
      <main className="contractors-main">
        <div className="contractors-container">
          <div className="contractors-header-card">
            <div className="contractors-header-card-icon">
              <FileTextOutlined />
            </div>
            <div className="contractors-header-card-content">
              <h2 className="contractors-page-title">Prestadores PJ</h2>
              <p className="contractors-page-subtitle">
                Cadastre prestadores de serviço (PJ) e anexe as notas fiscais de cada competência. Necessário para registrar pagamentos em Contas a pagar.
              </p>
            </div>
          </div>

          <div className="contractors-toolbar">
            <Card className="contractors-filters-card sales-consult-filters-card" style={{ width: '100%' }}>
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
                      placeholder="Nome, CNPJ, e-mail"
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
            <div className="contractors-toolbar-actions">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()} className="contractors-add-btn">
                Novo prestador PJ
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={contractors}
            loading={loadingList}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} prestador(es)` }}
            className="contractors-table"
            onRow={(record) => ({ onClick: () => openDrawer(record), style: { cursor: 'pointer' } })}
          />
        </div>
      </main>

      <Drawer
        title={editingId ? 'Editar prestador PJ' : 'Novo prestador PJ'}
        open={drawerOpen}
        onClose={closeDrawer}
        placement="right"
        width={560}
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
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={initialFormValues} className="contractors-form contractors-drawer-form">
          {isRoot && !editingId && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select placeholder="Selecione a empresa" options={tenants.map((t) => ({ value: t.id, label: t.name }))} showSearch optionFilterProp="label" />
            </Form.Item>
          )}

          <div className="contractors-drawer-section">
            <h3 className="contractors-section-title">Dados básicos</h3>
            <Form.Item name="name" label="Razão social" rules={[{ required: true, message: 'Obrigatório' }, { max: 255 }]}>
              <Input placeholder="Razão social" />
            </Form.Item>
            <Form.Item name="tradeName" label="Nome fantasia" rules={[{ max: 255 }]}>
              <Input placeholder="Nome fantasia" />
            </Form.Item>
            <Form.Item name="cnpj" label="CNPJ" rules={[{ max: 18 }]}>
              <Input placeholder="CNPJ" />
            </Form.Item>
            <Form.Item name="email" label="E-mail" rules={[{ max: 255 }]}>
              <Input placeholder="E-mail" type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Telefone" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone" />
            </Form.Item>
            <Form.Item name="phoneAlt" label="Telefone alternativo" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone alternativo" />
            </Form.Item>
          </div>

          <div className="contractors-drawer-section">
            <h3 className="contractors-section-title">Endereço</h3>
            <Form.Item name="addressStreet" label="Logradouro" rules={[{ max: 255 }]}>
              <Input placeholder="Rua, avenida, etc." />
            </Form.Item>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="addressNumber" label="Número" rules={[{ max: 20 }]}>
                  <Input placeholder="Nº" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="addressComplement" label="Complemento" rules={[{ max: 100 }]}>
                  <Input placeholder="Apto, bloco" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="addressNeighborhood" label="Bairro" rules={[{ max: 100 }]}>
              <Input placeholder="Bairro" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item name="addressCity" label="Cidade" rules={[{ max: 100 }]}>
                  <Input placeholder="Cidade" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item name="addressState" label="UF" rules={[{ max: 2 }]}>
                  <Input placeholder="UF" maxLength={2} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="addressZip" label="CEP" rules={[{ max: 10 }]}>
                  <Input placeholder="CEP" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="contractors-drawer-section">
            <h3 className="contractors-section-title">Dados bancários</h3>
            <Form.Item name="bankName" label="Banco" rules={[{ max: 100 }]}>
              <Input placeholder="Nome do banco" />
            </Form.Item>
            <Form.Item name="bankAgency" label="Agência" rules={[{ max: 20 }]}>
              <Input placeholder="Agência" />
            </Form.Item>
            <Form.Item name="bankAccount" label="Conta" rules={[{ max: 30 }]}>
              <Input placeholder="Conta" />
            </Form.Item>
            <Form.Item name="bankPix" label="Chave PIX" rules={[{ max: 100 }]}>
              <Input placeholder="Chave PIX" />
            </Form.Item>
          </div>

          <div className="contractors-drawer-section">
            <Form.Item name="notes" label="Observações">
              <TextArea rows={2} placeholder="Observações (opcional)" />
            </Form.Item>
            <Form.Item name="active" valuePropName="checked" label="Ativo">
              <Switch checkedChildren="Sim" unCheckedChildren="Não" />
            </Form.Item>
          </div>

          {editingId && (
            <div className="contractors-drawer-section">
              <h3 className="contractors-section-title">Notas fiscais</h3>
              <p className="contractors-invoices-hint">Registre a NF de cada competência e anexe o arquivo (PDF ou XML) para poder registrar o pagamento em Contas a pagar.</p>
              <Button type="primary" ghost icon={<PlusOutlined />} onClick={openInvoiceModal} style={{ marginBottom: 12 }}>
                Registrar nova NF
              </Button>
              <Table
                size="small"
                rowKey="id"
                dataSource={invoices}
                pagination={false}
                columns={[
                  { title: 'Competência', dataIndex: 'referenceMonth', key: 'referenceMonth', width: 100 },
                  { title: 'Valor', dataIndex: 'amount', key: 'amount', width: 100, render: (v) => formatMoney(v) },
                  { title: 'Nº NF', dataIndex: 'nfNumber', key: 'nfNumber', width: 90 },
                  { title: 'Arquivo', key: 'file', width: 90, render: (_, r) => (r.fileGcsPath ? '✓' : '—') },
                  {
                    title: 'Ações',
                    key: 'actions',
                    width: 100,
                    render: (_, r) =>
                      r.fileGcsPath ? null : (
                        <Button type="link" size="small" icon={<UploadOutlined />} onClick={(e) => { e.stopPropagation(); openUploadModal(r) }}>
                          Enviar arquivo
                        </Button>
                      ),
                  },
                ]}
              />
            </div>
          )}
        </Form>
      </Drawer>

      <Modal
        title="Registrar nota fiscal"
        open={invoiceModalOpen}
        onCancel={() => { setInvoiceModalOpen(false); setUploadFileList([]) }}
        footer={null}
        width={480}
        destroyOnClose
      >
        <Form form={formInvoice} layout="vertical" onFinish={onInvoiceFinish}>
          <Form.Item name="referenceMonth" label="Competência (YYYY-MM)" rules={[{ required: true }, { pattern: /^\d{4}-\d{2}$/, message: 'Use YYYY-MM' }]}>
            <Input placeholder="2025-03" />
          </Form.Item>
          <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nfNumber" label="Número da NF">
            <Input placeholder="Número da nota" />
          </Form.Item>
          <Form.Item name="nfKey" label="Chave NF-e (44 dígitos)">
            <Input placeholder="Chave da NF-e" maxLength={44} />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input placeholder="Descrição (opcional)" />
          </Form.Item>
          <Form.Item label="Arquivo da NF (PDF ou XML)">
            <Upload.Dragger
              maxCount={1}
              accept=".pdf,.xml,application/pdf,application/xml,text/xml"
              fileList={uploadFileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Clique ou arraste PDF/XML (até 10 MB)</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Space>
              <Button onClick={() => { setInvoiceModalOpen(false); setUploadFileList([]) }}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={savingInvoice}>Salvar NF</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Enviar arquivo da NF"
        open={invoiceUploadModalOpen}
        onCancel={() => { setInvoiceUploadModalOpen(false); setSelectedInvoiceForUpload(null); setUploadFileList([]) }}
        onOk={handleUploadInvoiceFile}
        okText="Enviar"
        confirmLoading={uploadingInvoice}
        destroyOnClose
      >
        {selectedInvoiceForUpload && (
          <p style={{ marginBottom: 12 }}>Competência: <strong>{selectedInvoiceForUpload.referenceMonth}</strong> — Valor: {formatMoney(selectedInvoiceForUpload.amount)}</p>
        )}
        <Upload.Dragger
          maxCount={1}
          accept=".pdf,.xml,application/pdf,application/xml,text/xml"
          fileList={uploadFileList}
          beforeUpload={() => false}
          onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Arraste ou clique para selecionar PDF ou XML</p>
        </Upload.Dragger>
      </Modal>
    </div>
  )
}
