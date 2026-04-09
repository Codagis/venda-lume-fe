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

  const columns = [
    { title: 'Nome', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Usuário', dataIndex: 'username', key: 'username' },
    {
      title: 'Perfil',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v,
    },
  ]

  return (
    <div className="deliveries-page">
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
                style={{ width: 280 }}
                allowClear={false}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="deliveries-add-btn">
              Novo operador de caixa
            </Button>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={cashiers}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} operador(es)` }}
            className="deliveries-table"
          />
        </div>
      </main>

      <Drawer
        title="Novo operador de caixa"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={460}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => formCashier.submit()}>
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
              />
            </Form.Item>
          )}
          <Form.Item name="role" label="Perfil" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} placeholder="Caixa ou Operador" />
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
