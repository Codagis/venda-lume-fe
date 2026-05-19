import { useState, useEffect, useCallback, useMemo } from 'react'
import { Form, Input, Select, Switch, Button, Table, Drawer, Space, message, Grid } from 'antd'
import { UserOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import * as tenantService from '../../services/tenantService'
import * as userService from '../../services/userService'
import { normalizePhone } from '../../utils/masks'
import { antdRuleEmail } from '../../utils/validators'
import '../Deliveries/Deliveries.css'

export default function DeliveryPersons() {
  const screens = Grid.useBreakpoint()
  const isCompact = screens.sm === false

  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formDeliveryPerson] = Form.useForm()

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [deliveryPersonDrawerOpen, setDeliveryPersonDrawerOpen] = useState(false)
  const [editingDeliveryPersonId, setEditingDeliveryPersonId] = useState(null)
  const [savingDeliveryPerson, setSavingDeliveryPerson] = useState(false)

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

  const loadAllUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await userService.listUsers()
      setAllUsers(data || [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar usuários.')
      setAllUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    loadAllUsers()
  }, [loadAllUsers])

  const deliveryPersonsList = allUsers.filter(
    (u) => u.role === 'DELIVERY' && (!effectiveTenantId || u.tenantId === effectiveTenantId)
  )

  const closeDeliveryPersonDrawer = () => {
    setDeliveryPersonDrawerOpen(false)
    setEditingDeliveryPersonId(null)
    formDeliveryPerson.resetFields()
  }

  const openDeliveryPersonDrawer = (person = null) => {
    setEditingDeliveryPersonId(person?.id ?? null)
    formDeliveryPerson.resetFields()
    if (person) {
      formDeliveryPerson.setFieldsValue({
        username: person.username,
        fullName: person.fullName,
        email: person.email,
        phone: person.phone,
        tenantId: person.tenantId ?? effectiveTenantId ?? undefined,
        active: person.active !== false,
      })
    } else {
      formDeliveryPerson.setFieldsValue({
        role: 'DELIVERY',
        tenantId: effectiveTenantId ?? undefined,
        active: true,
      })
    }
    setDeliveryPersonDrawerOpen(true)
  }

  const handleSaveDeliveryPerson = async (values) => {
    setSavingDeliveryPerson(true)
    try {
      if (editingDeliveryPersonId) {
        const payload = {
          email: values.email?.trim(),
          fullName: values.fullName?.trim(),
          role: 'DELIVERY',
          tenantId: values.tenantId || effectiveTenantId,
          active: values.active ?? true,
          phone: values.phone?.trim() || undefined,
        }
        if (values.password?.trim()) payload.password = values.password.trim()
        await userService.updateUser(editingDeliveryPersonId, payload)
        message.success('Entregador atualizado!')
      } else {
        await userService.createUser({
          username: values.username?.trim(),
          password: values.password?.trim(),
          fullName: values.fullName?.trim(),
          email: values.email?.trim(),
          phone: values.phone?.trim() || undefined,
          role: 'DELIVERY',
          tenantId: values.tenantId || effectiveTenantId,
        })
        message.success('Entregador cadastrado!')
      }
      closeDeliveryPersonDrawer()
      loadAllUsers()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar.')
    } finally {
      setSavingDeliveryPerson(false)
    }
  }

  const columns = useMemo(
    () => [
      { title: 'Nome', dataIndex: 'fullName', key: 'fullName', ellipsis: true },
      { title: 'Usuário', dataIndex: 'username', key: 'username', width: isCompact ? 100 : undefined, ellipsis: true },
      {
        title: 'E-mail',
        dataIndex: 'email',
        key: 'email',
        ellipsis: true,
        responsive: ['md'],
      },
      {
        title: 'Telefone',
        dataIndex: 'phone',
        key: 'phone',
        width: 130,
        responsive: ['sm'],
        render: (v) => v || '—',
      },
      {
        title: 'Ativo',
        dataIndex: 'active',
        key: 'active',
        width: 72,
        align: 'center',
        render: (v) => (v !== false ? 'Sim' : 'Não'),
      },
      {
        title: '',
        key: 'actions',
        width: 52,
        align: 'center',
        render: (_, record) => (
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            title="Editar"
            aria-label="Editar entregador"
            onClick={(e) => {
              e.stopPropagation()
              openDeliveryPersonDrawer(record)
            }}
          />
        ),
      },
    ],
    [isCompact]
  )

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
              <h2 className="deliveries-title">Entregadores</h2>
              <p className="deliveries-subtitle">
                Cadastre e gerencie os entregadores disponíveis para atribuir às entregas.
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openDeliveryPersonDrawer()}
              className="deliveries-add-btn"
              block={isCompact}
            >
              Novo entregador
            </Button>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={deliveryPersonsList}
            loading={loading}
            size={isCompact ? 'small' : 'middle'}
            scroll={{ x: isCompact ? 560 : 900 }}
            pagination={{
              pageSize: 15,
              showSizeChanger: !isCompact,
              showTotal: isCompact ? undefined : (t) => `${t} entregador(es)`,
              pageSizeOptions: ['10', '15', '30', '50'],
              simple: isCompact,
              responsive: true,
            }}
            className="deliveries-table deliveries-data-table"
          />
        </div>
      </main>

      <Drawer
        title={editingDeliveryPersonId ? 'Editar entregador' : 'Novo entregador'}
        open={deliveryPersonDrawerOpen}
        onClose={closeDeliveryPersonDrawer}
        placement="right"
        width={isCompact ? '100%' : 460}
        destroyOnHidden
        rootClassName={drawerRootClass}
        styles={{ body: drawerBodyStyle }}
        extra={
          <Space>
            <Button onClick={closeDeliveryPersonDrawer}>Cancelar</Button>
            <Button type="primary" loading={savingDeliveryPerson} onClick={() => formDeliveryPerson.submit()}>
              {editingDeliveryPersonId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={formDeliveryPerson} layout="vertical" onFinish={handleSaveDeliveryPerson}>
          {isRoot && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
                disabled={!!editingDeliveryPersonId}
              />
            </Form.Item>
          )}
          <Form.Item
            name="username"
            label="Usuário"
            rules={editingDeliveryPersonId ? [] : [{ required: true }, { min: 3 }]}
          >
            <Input placeholder="Nome de usuário para login" disabled={!!editingDeliveryPersonId} />
          </Form.Item>
          <Form.Item
            name="password"
            label="Senha"
            rules={editingDeliveryPersonId ? [] : [{ required: true }, { min: 8, message: 'Mínimo 8 caracteres' }]}
            extra={editingDeliveryPersonId ? 'Deixe em branco para não alterar' : undefined}
          >
            <Input.Password placeholder={editingDeliveryPersonId ? 'Nova senha (opcional)' : 'Senha'} />
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
          {editingDeliveryPersonId && (
            <Form.Item name="active" valuePropName="checked" label="Ativo">
              <Switch checkedChildren="Sim" unCheckedChildren="Não" />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  )
}
