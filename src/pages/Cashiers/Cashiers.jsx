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
  Grid,
  Tag,
} from 'antd'
import { UserOutlined, PlusOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import * as tenantService from '../../services/tenantService'
import * as userService from '../../services/userService'
import * as registerService from '../../services/registerService'
import { normalizePhone } from '../../utils/masks'
import { antdRuleEmail } from '../../utils/validators'
import '../Deliveries/Deliveries.css'

const ROLE_OPTIONS = [
  { value: 'CASHIER', label: 'Caixa' },
  { value: 'OPERATOR', label: 'Operador' },
]

export default function Cashiers() {
  const screens = Grid.useBreakpoint()
  /* Mesmo critério do MainLayout (mobile drawer): abaixo de md = layout compacto */
  const isCompact = screens.md === false

  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formCashier] = Form.useForm()

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [cashiers, setCashiers] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const loadCashiers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await registerService.listCashiers(isRoot ? effectiveTenantId : null)
      setCashiers(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar operadores de caixa.')
      setCashiers([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot])

  useEffect(() => {
    loadCashiers()
  }, [loadCashiers])

  const openCreate = () => {
    formCashier.resetFields()
    formCashier.setFieldsValue({
      role: 'CASHIER',
      tenantId: effectiveTenantId ?? undefined,
    })
    setDrawerOpen(true)
  }

  const handleCreateCashier = async (values) => {
    setSaving(true)
    try {
      await userService.createUser({
        username: values.username?.trim(),
        password: values.password?.trim(),
        fullName: values.fullName?.trim(),
        email: values.email?.trim(),
        phone: values.phone?.trim() || undefined,
        role: values.role || 'CASHIER',
        tenantId: values.tenantId || effectiveTenantId,
      })
      message.success('Operador de caixa cadastrado!')
      setDrawerOpen(false)
      loadCashiers()
    } catch (e) {
      message.error(e?.message || 'Erro ao cadastrar.')
    } finally {
      setSaving(false)
    }
  }

  const columns = isCompact
    ? [
        {
          title: 'Operador',
          key: 'operator',
          render: (_, record) => {
            const roleLabel = ROLE_OPTIONS.find((o) => o.value === record.role)?.label ?? record.role
            return (
              <div className="cashiers-mobile-cell">
                <div className="cashiers-mobile-cell__name">{record.fullName || '—'}</div>
                <div className="cashiers-mobile-cell__meta">
                  <Tag color="cyan" className="cashiers-mobile-cell__tag">
                    {roleLabel}
                  </Tag>
                  <span className="cashiers-mobile-cell__user">@{record.username || '—'}</span>
                </div>
              </div>
            )
          },
        },
      ]
    : [
        { title: 'Nome', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
        { title: 'Usuário', dataIndex: 'username', key: 'username', width: 140, ellipsis: true },
        {
          title: 'Perfil',
          dataIndex: 'role',
          key: 'role',
          width: 120,
          render: (v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v,
        },
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
              <UserOutlined />
            </div>
            <div className="deliveries-header-content">
              <h2 className="deliveries-title">Operadores de Caixa</h2>
              <p className="deliveries-subtitle">
                Cadastre os usuários que podem operar os caixas (PDV). Estes usuários devem ter perfil Caixa ou Operador. Depois, atribua-os aos pontos de venda na tela Pontos de Venda.
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
              Novo operador de caixa
            </Button>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={cashiers}
            loading={loading}
            size={isCompact ? 'small' : 'middle'}
            scroll={isCompact ? undefined : { x: 720 }}
            tableLayout={isCompact ? 'fixed' : undefined}
            pagination={{
              pageSize: 15,
              showSizeChanger: !isCompact,
              showTotal: isCompact ? undefined : (t) => `${t} operador(es)`,
              pageSizeOptions: ['10', '15', '30', '50'],
              simple: isCompact,
              responsive: true,
            }}
            className="deliveries-table deliveries-data-table"
          />
        </div>
      </main>

      <Drawer
        title="Novo operador de caixa"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement="right"
        width={isCompact ? '100%' : 460}
        destroyOnHidden
        rootClassName={drawerRootClass}
        styles={{ body: drawerBodyStyle }}
        extra={
          <Space wrap={isCompact} size={isCompact ? 'small' : 'middle'} style={{ justifyContent: isCompact ? 'flex-end' : undefined }}>
            <Button onClick={() => setDrawerOpen(false)} block={isCompact}>
              Cancelar
            </Button>
            <Button type="primary" loading={saving} onClick={() => formCashier.submit()} block={isCompact}>
              Cadastrar
            </Button>
          </Space>
        }
      >
        <Form form={formCashier} layout="vertical" onFinish={handleCreateCashier}>
          {isRoot && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
                style={{ width: '100%' }}
              />
            </Form.Item>
          )}
          <Form.Item name="role" label="Perfil" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} placeholder="Caixa ou Operador" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="username" label="Usuário" rules={[{ required: true }, { min: 3 }]}>
            <Input placeholder="Nome de usuário para login" />
          </Form.Item>
          <Form.Item name="password" label="Senha" rules={[{ required: true }, { min: 8, message: 'Mínimo 8 caracteres' }]}>
            <Input.Password placeholder="Senha" />
          </Form.Item>
          <Form.Item name="fullName" label="Nome completo" rules={[{ required: true }]}>
            <Input placeholder="Nome completo" />
          </Form.Item>
          <Form.Item name="email" label="E-mail" rules={[{ required: true }, antdRuleEmail({ required: true })]}>
            <Input placeholder="E-mail" type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Telefone" normalize={normalizePhone}>
            <Input placeholder="Telefone com DDD" inputMode="tel" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
