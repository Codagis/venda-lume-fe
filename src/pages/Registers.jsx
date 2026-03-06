import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Table,
  Drawer,
  Space,
  message,
  Modal,
  Tag,
  Switch,
  Dropdown,
} from 'antd'
import { DesktopOutlined, PlusOutlined, EditOutlined, UserOutlined, DeleteOutlined, HistoryOutlined, MoreOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import * as tenantService from '../services/tenantService'
import * as registerService from '../services/registerService'
import './Deliveries.css'

const EQUIPMENT_OPTIONS = [
  { value: 'PC', label: 'Computador' },
  { value: 'NOTEBOOK', label: 'Notebook' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'SMARTPHONE', label: 'Celular / Smartphone' },
  { value: 'OUTRO', label: 'Outro' },
]

export default function Registers() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formRegister] = Form.useForm()

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [registers, setRegisters] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [operatorsDrawerOpen, setOperatorsDrawerOpen] = useState(false)
  const [editingRegister, setEditingRegister] = useState(null)
  const [selectedRegisterForOperators, setSelectedRegisterForOperators] = useState(null)
  const [operatorsForm] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [savingOperators, setSavingOperators] = useState(false)
  const [sessionHistoryOpen, setSessionHistoryOpen] = useState(false)
  const [registerForHistory, setRegisterForHistory] = useState(null)
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [sessionDetail, setSessionDetail] = useState(null)
  const [loadingSessionDetail, setLoadingSessionDetail] = useState(false)

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

  const loadRegisters = useCallback(async () => {
    if (!effectiveTenantId && isRoot) return
    setLoading(true)
    try {
      const data = await registerService.listRegisters(isRoot ? effectiveTenantId : null)
      setRegisters(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar pontos de venda.')
      setRegisters([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot])

  const loadCashiers = useCallback(async () => {
    try {
      const data = await registerService.listCashiers(isRoot ? effectiveTenantId : null)
      setCashiers(Array.isArray(data) ? data : [])
    } catch (e) {
      setCashiers([])
    }
  }, [effectiveTenantId, isRoot])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot])

  useEffect(() => {
    loadRegisters()
  }, [loadRegisters])

  useEffect(() => {
    if (operatorsDrawerOpen && effectiveTenantId !== undefined) loadCashiers()
  }, [operatorsDrawerOpen, effectiveTenantId, loadCashiers])

  const openCreate = () => {
    setEditingRegister(null)
    formRegister.resetFields()
    formRegister.setFieldsValue({ active: true })
    setDrawerOpen(true)
  }

  const openEdit = (record) => {
    setEditingRegister(record)
    formRegister.setFieldsValue({
      name: record.name,
      code: record.code || undefined,
      equipmentType: record.equipmentType,
      description: record.description || undefined,
      active: record.active !== false,
      imei: record.imei || undefined,
      accessPassword: undefined,
    })
    setDrawerOpen(true)
  }

  const handleSubmitRegister = async () => {
    const values = await formRegister.validateFields().catch(() => null)
    if (!values) return
    setSaving(true)
    try {
      const payload = {
        name: values.name?.trim(),
        code: values.code?.trim() || undefined,
        equipmentType: values.equipmentType,
        description: values.description?.trim() || undefined,
        active: values.active,
        imei: values.imei?.trim() || undefined,
        accessPassword: values.accessPassword || undefined,
      }
      if (editingRegister) {
        await registerService.updateRegister(editingRegister.id, payload, isRoot ? effectiveTenantId : null)
        message.success('Ponto de venda atualizado!')
      } else {
        await registerService.createRegister(payload, isRoot ? effectiveTenantId : null)
        message.success('Ponto de venda cadastrado!')
      }
      setDrawerOpen(false)
      loadRegisters()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Excluir ponto de venda',
      content: `Deseja realmente excluir "${record.name}"? Os operadores atribuídos serão desvinculados.`,
      okText: 'Excluir',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await registerService.deleteRegister(record.id, isRoot ? effectiveTenantId : null)
          message.success('Excluído.')
          loadRegisters()
        } catch (e) {
          message.error(e?.message || 'Erro ao excluir.')
        }
      },
    })
  }

  const openOperatorsDrawer = (record) => {
    setSelectedRegisterForOperators(record)
    operatorsForm.setFieldsValue({
      userIds: (record.operators || []).map((o) => o.userId),
    })
    setOperatorsDrawerOpen(true)
  }

  const handleSubmitOperators = async () => {
    const values = await operatorsForm.validateFields().catch(() => null)
    if (!values || !selectedRegisterForOperators) return
    setSavingOperators(true)
    try {
      await registerService.assignOperators(
        selectedRegisterForOperators.id,
        values.userIds || [],
        isRoot ? effectiveTenantId : null
      )
      message.success('Operadores atualizados!')
      setOperatorsDrawerOpen(false)
      loadRegisters()
    } catch (e) {
      message.error(e?.message || 'Erro ao atribuir.')
    } finally {
      setSavingOperators(false)
    }
  }

  const openSessionHistory = async (record) => {
    setRegisterForHistory(record)
    setSessionHistoryOpen(true)
    setSessions([])
    setSessionDetail(null)
    setLoadingSessions(true)
    try {
      const data = await registerService.listSessionsByRegister(record.id, isRoot ? effectiveTenantId : null)
      setSessions(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar histórico.')
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const loadSessionDetail = async (sessionId) => {
    setLoadingSessionDetail(true)
    setSessionDetail(null)
    try {
      const data = await registerService.getSessionDetail(sessionId, isRoot ? effectiveTenantId : null)
      setSessionDetail(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar detalhe.')
    } finally {
      setLoadingSessionDetail(false)
    }
  }

  const formatDateTime = (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-')
  const formatCurrency = (v) => (v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '-')

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', width: 140, render: (v) => v || '-' },
    { title: 'Código', dataIndex: 'code', key: 'code', width: 100, render: (v) => v || '-' },
    {
      title: 'IMEI (equipamento)',
      dataIndex: 'imei',
      key: 'imei',
      width: 180,
      ellipsis: true,
      render: (v) => (v ? (v.length > 20 ? `${v.slice(0, 10)}…${v.slice(-8)}` : v) : '-'),
    },
    {
      title: 'Equipamento',
      dataIndex: 'equipmentType',
      key: 'equipmentType',
      width: 130,
      render: (v) => EQUIPMENT_OPTIONS.find((o) => o.value === v)?.label ?? v,
    },
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true, render: (v) => v || '-' },
    {
      title: 'Senha PDV',
      key: 'hasAccessPassword',
      width: 90,
      render: (_, r) => (r.hasAccessPassword ? <Tag color="blue">Sim</Tag> : '-'),
    },
    {
      title: 'Ativo',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (v) => (v !== false ? <Tag color="green">Sim</Tag> : <Tag color="default">Não</Tag>),
    },
    {
      title: <span style={{ whiteSpace: 'nowrap' }}>Operadores</span>,
      key: 'operators',
      width: 110,
      render: (_, r) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {r.operators?.length ? `${r.operators.length} operador(es)` : '-'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 72,
      align: 'center',
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              { key: 'edit', label: 'Editar', icon: <EditOutlined />, onClick: () => openEdit(record) },
              { key: 'operators', label: 'Operadores', icon: <UserOutlined />, onClick: () => openOperatorsDrawer(record) },
              { key: 'history', label: 'Histórico', icon: <HistoryOutlined />, onClick: () => openSessionHistory(record) },
              { type: 'divider' },
              { key: 'delete', label: 'Excluir', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record) },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} title="Ações" />
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
              <DesktopOutlined />
            </div>
            <div className="deliveries-header-content">
              <h2 className="deliveries-title">Pontos de Venda</h2>
              <p className="deliveries-subtitle">
                Cadastre os caixas da sua empresa (Caixa 1, Caixa 2, etc.), informe o tipo de equipamento e atribua os operadores que podem usar cada PDV.
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

          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="deliveries-add-btn">
              Novo ponto de venda
            </Button>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={registers}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} caixa(s)` }}
            className="deliveries-table"
          />
        </div>
      </main>

      <Drawer
        title={editingRegister ? 'Editar ponto de venda' : 'Novo ponto de venda'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={480}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => formRegister.submit()}>
              {editingRegister ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={formRegister} layout="vertical" onFinish={handleSubmitRegister}>
          <Form.Item name="name" label="Nome do caixa" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: Caixa 1, Caixa 2" />
          </Form.Item>
          <Form.Item name="code" label="Código (opcional)">
            <Input placeholder="Código de identificação" />
          </Form.Item>
          <Form.Item name="equipmentType" label="Equipamento" rules={[{ required: true, message: 'Selecione o equipamento' }]}>
            <Select placeholder="Selecione" options={EQUIPMENT_OPTIONS} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="imei" label="IMEI do equipamento" extra="Código único do tablet/celular. No PDV, o app exibe esse código para você vincular aqui.">
            <Input placeholder="Cole o IMEI exibido no equipamento (opcional)" />
          </Form.Item>
          <Form.Item name="accessPassword" label="Senha de acesso do PDV" extra="O operador precisará digitar esta senha para iniciar sessão neste caixa.">
            <Input.Password placeholder="Deixe em branco para não exigir senha" autoComplete="new-password" />
          </Form.Item>
          <Form.Item name="description" label="Descrição ou observações">
            <Input.TextArea rows={2} placeholder="Ex: Balcão principal, loja 2" />
          </Form.Item>
          <Form.Item name="active" label="Ativo" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={`Operadores — ${selectedRegisterForOperators?.name || ''}`}
        open={operatorsDrawerOpen}
        onClose={() => setOperatorsDrawerOpen(false)}
        width={440}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setOperatorsDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={savingOperators} onClick={() => operatorsForm.submit()}>
              Salvar
            </Button>
          </Space>
        }
      >
        <p style={{ marginBottom: 16, color: '#667085' }}>
          Selecione os usuários (perfil Caixa ou Operador) que podem operar este ponto de venda.
        </p>
        <Form form={operatorsForm} layout="vertical" onFinish={handleSubmitOperators}>
          <Form.Item name="userIds" label="Operadores">
            <Select
              mode="multiple"
              placeholder="Selecione os operadores"
              options={cashiers.map((c) => ({ value: c.id, label: `${c.fullName || c.username} (${c.username})` }))}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={`Histórico de sessões — ${registerForHistory?.name || ''}`}
        open={sessionHistoryOpen}
        onClose={() => { setSessionHistoryOpen(false); setSessionDetail(null) }}
        width={Math.min(720, window.innerWidth * 0.9)}
        destroyOnClose
      >
        <Table
          rowKey="id"
          size="small"
          loading={loadingSessions}
          dataSource={sessions}
          pagination={{ pageSize: 10, showTotal: (t) => `${t} sessão(ões)` }}
          columns={[
            {
              title: 'Abertura',
              dataIndex: 'openedAt',
              key: 'openedAt',
              width: 140,
              render: (v) => formatDateTime(v),
            },
            {
              title: 'Fechamento',
              dataIndex: 'closedAt',
              key: 'closedAt',
              width: 140,
              render: (v) => (v ? formatDateTime(v) : 'Em aberto'),
            },
            { title: 'Operador', dataIndex: 'userFullName', key: 'userFullName', ellipsis: true, render: (v) => v || '-' },
            { title: 'Vendas', dataIndex: 'salesCount', key: 'salesCount', width: 80, align: 'right' },
            {
              title: 'Total',
              dataIndex: 'totalSales',
              key: 'totalSales',
              width: 110,
              align: 'right',
              render: (v) => formatCurrency(v),
            },
            {
              title: '',
              key: 'detail',
              width: 90,
              render: (_, row) => (
                <Button type="link" size="small" onClick={() => loadSessionDetail(row.id)}>
                  Ver vendas
                </Button>
              ),
            },
          ]}
        />
        {sessionDetail && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <h4 style={{ marginBottom: 12 }}>
              Sessão: {formatDateTime(sessionDetail.openedAt)} — {sessionDetail.userFullName || sessionDetail.username || '-'}
            </h4>
            {loadingSessionDetail ? (
              <p>Carregando vendas...</p>
            ) : (
              <Table
                rowKey="id"
                size="small"
                dataSource={sessionDetail.sales || []}
                pagination={false}
                columns={[
                  { title: 'Nº', dataIndex: 'saleNumber', key: 'saleNumber', width: 100 },
                  {
                    title: 'Data',
                    dataIndex: 'saleDate',
                    key: 'saleDate',
                    width: 130,
                    render: (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'),
                  },
                  { title: 'Status', dataIndex: 'status', key: 'status', width: 90 },
                  { title: 'Total', dataIndex: 'total', key: 'total', width: 100, align: 'right', render: (v) => formatCurrency(v) },
                ]}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
