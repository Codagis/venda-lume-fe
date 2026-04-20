import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Table,
  Drawer,
  Space,
  message,
  Modal,
  Tag,
  Switch,
  Dropdown,
  Grid,
} from 'antd'
import { DesktopOutlined, PlusOutlined, EditOutlined, UserOutlined, DeleteOutlined, HistoryOutlined, MoreOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import * as tenantService from '../../services/tenantService'
import * as registerService from '../../services/registerService'
import '../Deliveries/Deliveries.css'

const EQUIPMENT_OPTIONS = [
  { value: 'PC', label: 'Computador' },
  { value: 'NOTEBOOK', label: 'Notebook' },
  { value: 'TABLET', label: 'Tablet' },
  { value: 'SMARTPHONE', label: 'Celular / Smartphone' },
  { value: 'OUTRO', label: 'Outro' },
]

export default function Registers() {
  const screens = Grid.useBreakpoint()
  const isCompact = screens.md === false

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

  const actionColumn = {
    title: '',
    key: 'actions',
    width: isCompact ? 44 : 72,
    align: 'center',
    ...(isCompact ? {} : { fixed: 'right' }),
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
        placement="bottomRight"
      >
        <Button type="text" size="small" icon={<MoreOutlined />} title="Ações" />
      </Dropdown>
    ),
  }

  const columns = isCompact
    ? [
        {
          title: 'Ponto de venda',
          key: 'summary',
          render: (_, r) => (
            <div className="registers-mobile-cell">
              <div className="registers-mobile-cell__name">{r.name || '—'}</div>
              <div className="registers-mobile-cell__meta">
                <span>{EQUIPMENT_OPTIONS.find((o) => o.value === r.equipmentType)?.label ?? r.equipmentType}</span>
                {r.code ? <span className="registers-mobile-cell__code">Cód. {r.code}</span> : null}
                {r.hasAccessPassword ? <Tag color="blue">Senha PDV</Tag> : null}
                {r.active !== false ? <Tag color="green">Ativo</Tag> : <Tag>Inativo</Tag>}
                <span className="registers-mobile-cell__ops">
                  {r.operators?.length ? `${r.operators.length} operador(es)` : 'Sem operadores'}
                </span>
              </div>
            </div>
          ),
        },
        actionColumn,
      ]
    : [
        { title: 'Nome', dataIndex: 'name', key: 'name', width: 140, ellipsis: true, render: (v) => v || '-' },
        {
          title: 'Código',
          dataIndex: 'code',
          key: 'code',
          width: 100,
          responsive: ['sm'],
          render: (v) => v || '-',
        },
        {
          title: 'Equipamento',
          dataIndex: 'equipmentType',
          key: 'equipmentType',
          width: 130,
          ellipsis: true,
          render: (v) => EQUIPMENT_OPTIONS.find((o) => o.value === v)?.label ?? v,
        },
        {
          title: 'Descrição',
          dataIndex: 'description',
          key: 'description',
          ellipsis: true,
          responsive: ['md'],
          render: (v) => v || '-',
        },
        {
          title: 'Senha PDV',
          key: 'hasAccessPassword',
          width: 90,
          align: 'center',
          responsive: ['md'],
          render: (_, r) => (r.hasAccessPassword ? <Tag color="blue">Sim</Tag> : '-'),
        },
        {
          title: 'Ativo',
          dataIndex: 'active',
          key: 'active',
          width: 72,
          align: 'center',
          render: (v) => (v !== false ? <Tag color="green">Sim</Tag> : <Tag color="default">Não</Tag>),
        },
        {
          title: <span style={{ whiteSpace: 'nowrap' }}>Operadores</span>,
          key: 'operators',
          width: 110,
          responsive: ['sm'],
          render: (_, r) => (
            <span style={{ whiteSpace: 'nowrap' }}>
              {r.operators?.length ? `${r.operators.length} operador(es)` : '-'}
            </span>
          ),
        },
        actionColumn,
      ]

  const drawerRootClass = `deliveries-drawer-root${isCompact ? ' deliveries-drawer-root--compact' : ''}`
  const drawerBodyStyle = {
    paddingBottom: isCompact ? 'max(20px, env(safe-area-inset-bottom, 0px))' : 24,
  }

  return (
    <div className={`deliveries-page${isCompact ? ' deliveries-page--compact' : ''}`}>
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
                style={{ width: isCompact ? '100%' : 280 }}
                allowClear={false}
                showSearch
                optionFilterProp="label"
              />
            </div>
          )}

          <div className="deliveries-toolbar" style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="deliveries-add-btn" block={isCompact}>
              Novo ponto de venda
            </Button>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={registers}
            loading={loading}
            size={isCompact ? 'small' : 'middle'}
            scroll={isCompact ? undefined : { x: 1000 }}
            tableLayout={isCompact ? 'fixed' : undefined}
            pagination={{
              pageSize: 15,
              showSizeChanger: !isCompact,
              showTotal: isCompact ? undefined : (t) => `${t} caixa(s)`,
              pageSizeOptions: ['10', '15', '30', '50'],
              simple: isCompact,
              responsive: true,
            }}
            className="deliveries-table deliveries-data-table"
          />
        </div>
      </main>

      <Drawer
        title={editingRegister ? 'Editar ponto de venda' : 'Novo ponto de venda'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        width={isCompact ? '100%' : 480}
        destroyOnHidden
        rootClassName={drawerRootClass}
        styles={{ body: drawerBodyStyle }}
        extra={
          <Space wrap={isCompact} size={isCompact ? 'small' : 'middle'} style={{ justifyContent: isCompact ? 'flex-end' : undefined }}>
            <Button onClick={() => setDrawerOpen(false)} block={isCompact}>
              Cancelar
            </Button>
            <Button type="primary" loading={saving} onClick={() => formRegister.submit()} block={isCompact}>
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
            <Select
              placeholder="Selecione"
              options={EQUIPMENT_OPTIONS}
              showSearch
              optionFilterProp="label"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item
            name="accessPassword"
            label="Senha de acesso do PDV"
            extra={editingRegister ? 'Deixe em branco para manter a senha atual.' : 'Obrigatória. O operador precisará digitar esta senha para acessar o caixa.'}
            rules={editingRegister ? [] : [{ required: true, message: 'Informe a senha de acesso do PDV' }]}
          >
            <Input.Password placeholder={editingRegister ? 'Manter senha atual' : 'Senha para acesso ao PDV'} autoComplete="new-password" />
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
        placement="right"
        width={isCompact ? '100%' : 440}
        destroyOnHidden
        rootClassName={drawerRootClass}
        styles={{ body: drawerBodyStyle }}
        extra={
          <Space wrap={isCompact} size={isCompact ? 'small' : 'middle'} style={{ justifyContent: isCompact ? 'flex-end' : undefined }}>
            <Button onClick={() => setOperatorsDrawerOpen(false)} block={isCompact}>
              Cancelar
            </Button>
            <Button type="primary" loading={savingOperators} onClick={() => operatorsForm.submit()} block={isCompact}>
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
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={`Histórico de sessões — ${registerForHistory?.name || ''}`}
        open={sessionHistoryOpen}
        onClose={() => { setSessionHistoryOpen(false); setSessionDetail(null) }}
        placement="right"
        width={isCompact ? '100%' : 720}
        destroyOnHidden
        rootClassName={drawerRootClass}
        styles={{ body: drawerBodyStyle }}
      >
        <Table
          rowKey="id"
          size="small"
          loading={loadingSessions}
          dataSource={sessions}
          scroll={{ x: isCompact ? 720 : undefined }}
          pagination={{
            pageSize: 10,
            showSizeChanger: !isCompact,
            showTotal: isCompact ? undefined : (t) => `${t} sessão(ões)`,
            simple: isCompact,
            responsive: true,
          }}
          className={isCompact ? 'deliveries-data-table' : undefined}
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
              responsive: ['md'],
              render: (v) => (v ? formatDateTime(v) : 'Em aberto'),
            },
            { title: 'Operador', dataIndex: 'userFullName', key: 'userFullName', ellipsis: true, render: (v) => v || '-' },
            {
              title: 'Vendas',
              dataIndex: 'salesCount',
              key: 'salesCount',
              width: 72,
              align: 'right',
              responsive: ['sm'],
            },
            {
              title: 'Total',
              dataIndex: 'totalSales',
              key: 'totalSales',
              width: 110,
              align: 'right',
              responsive: ['sm'],
              render: (v) => formatCurrency(v),
            },
            {
              title: '',
              key: 'detail',
              width: isCompact ? 100 : 90,
              ...(isCompact ? {} : { fixed: 'right' }),
              render: (_, row) => (
                <Button type="link" size="small" onClick={() => loadSessionDetail(row.id)} block={isCompact}>
                  Ver vendas
                </Button>
              ),
            },
          ]}
        />
        {sessionDetail && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <h4 style={{ marginBottom: 12, fontSize: isCompact ? 15 : undefined, lineHeight: 1.35 }}>
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
                scroll={{ x: isCompact ? 520 : undefined }}
                className={isCompact ? 'deliveries-data-table' : undefined}
                columns={[
                  { title: 'Nº', dataIndex: 'saleNumber', key: 'saleNumber', width: 88 },
                  {
                    title: 'Data',
                    dataIndex: 'saleDate',
                    key: 'saleDate',
                    width: 130,
                    responsive: ['sm'],
                    render: (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-'),
                  },
                  { title: 'Status', dataIndex: 'status', key: 'status', width: 86 },
                  {
                    title: 'Total',
                    dataIndex: 'total',
                    key: 'total',
                    width: 100,
                    align: 'right',
                    render: (v) => formatCurrency(v),
                  },
                ]}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
