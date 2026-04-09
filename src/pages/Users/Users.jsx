import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Switch,
  message,
  Space,
} from 'antd'
import { TeamOutlined, PlusOutlined, EditOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import * as userService from '../../services/userService'
import * as tenantService from '../../services/tenantService'
import * as profileService from '../../services/profileService'
import { antdRuleEmail } from '../../utils/validators'
import '../Settings/Settings.css'

const USER_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'TENANT_ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gerente' },
  { value: 'OPERATOR', label: 'Operador' },
  { value: 'CASHIER', label: 'Caixa' },
  { value: 'DELIVERY', label: 'Entrega' },
  { value: 'CUSTOMER_SUPPORT', label: 'Suporte' },
  { value: 'VIEWER', label: 'Visualizador' },
]

export default function Users() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [users, setUsers] = useState([])
  const [tenants, setTenants] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState({ open: false })
  const [editingId, setEditingId] = useState(null)
  const [form] = Form.useForm()

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.listUsers()
      setUsers(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const loadTenants = async () => {
    if (!isRoot) return
    try {
      const data = await tenantService.listTenants()
      setTenants(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresas')
    }
  }

  const loadProfiles = async (tenantId) => {
    try {
      const data = await profileService.listProfiles(tenantId || undefined)
      setProfiles(data || [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar perfis')
      setProfiles([])
    }
  }

  useEffect(() => {
    loadUsers()
    if (isRoot) loadTenants()
  }, [isRoot])

  useEffect(() => {
    if (!modal.open) return
    if (isRoot) {
      const tid = form.getFieldValue('tenantId')
      loadProfiles(tid || undefined)
    } else {
      loadProfiles(user?.tenantId)
    }
  }, [modal.open, isRoot, user?.tenantId])

  const openModal = (userToEdit = null) => {
    setEditingId(userToEdit?.id ?? null)
    form.resetFields()
    if (userToEdit) {
      form.setFieldsValue({
        username: userToEdit.username,
        fullName: userToEdit.fullName,
        email: userToEdit.email,
        role: userToEdit.role,
        tenantId: userToEdit.tenantId ?? undefined,
        profileId: userToEdit.profileId ?? undefined,
        active: userToEdit.active ?? true,
      })
      setTimeout(() => loadProfiles(isRoot ? userToEdit.tenantId : user?.tenantId), 0)
    } else {
      form.setFieldsValue({ tenantId: user?.tenantId || undefined })
      setTimeout(() => loadProfiles(isRoot ? undefined : user?.tenantId), 0)
    }
    setModal({ open: true })
  }

  const closeModal = () => {
    setModal({ open: false })
    setEditingId(null)
    form.resetFields()
  }

  const onFinish = async (values) => {
    setSaving(true)
    try {
      if (editingId) {
        const payload = {
          email: values.email?.trim(),
          fullName: values.fullName?.trim(),
          role: values.role,
          tenantId: values.tenantId || undefined,
          profileId: values.profileId || undefined,
          active: values.active ?? true,
        }
        if (values.password?.trim()) payload.password = values.password.trim()
        await userService.updateUser(editingId, payload)
        message.success('Usuário atualizado.')
      } else {
        await userService.createUser({
          username: values.username?.trim(),
          password: values.password?.trim(),
          email: values.email?.trim(),
          fullName: values.fullName?.trim(),
          role: values.role,
          tenantId: values.tenantId || undefined,
          profileId: values.profileId || undefined,
        })
        message.success('Usuário cadastrado.')
      }
      closeModal()
      loadUsers()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const tenantOptions = (tenants || [])
    .filter((t) => t != null && t.id != null)
    .map((t) => ({ value: t.id, label: t.name ?? String(t.id) }))
  const profileSelectOptions = (profiles || [])
    .filter((p) => p != null && p.id != null)
    .map((p) => ({
      value: p.id,
      label: p.tenantId ? `${p.name ?? ''}` : `${p.name ?? ''} (Sistema)`,
    }))

  const columns = [
    { title: 'Usuário', dataIndex: 'username', key: 'username', width: 120 },
    { title: 'Nome', dataIndex: 'fullName', key: 'fullName' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    {
      title: 'Papel',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (r) => USER_ROLES.find((x) => x.value === r)?.label || r,
    },
    ...(isRoot ? [{
      title: 'Empresa',
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 140,
      render: (id) => (id ? (tenants || []).find((t) => t.id === id)?.name || id : '-'),
    }] : []),
    {
      title: 'Perfil',
      dataIndex: 'profileName',
      key: 'profileId',
      width: 120,
      render: (name) => name || '-',
    },
    {
      title: 'Root',
      dataIndex: 'isRoot',
      key: 'isRoot',
      width: 80,
      render: (v) => (v ? 'Sim' : 'Não'),
    },
    {
      title: 'Ativo',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (v) => (v ? 'Sim' : 'Não'),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            openModal(record)
          }}
          title="Editar"
        />
      ),
    },
  ]

  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-container">
          <div className="settings-header-card">
            <div className="settings-header-card-icon">
              <TeamOutlined />
            </div>
            <div className="settings-header-card-content">
              <h2 className="settings-page-title">Cadastro de Usuários</h2>
              <p className="settings-page-subtitle">
                Visualize e cadastre usuários do sistema. Root vê todos; demais usuários veem apenas os da sua empresa.
              </p>
            </div>
          </div>

          <Button type="primary" icon={<PlusOutlined />} onClick={openModal} className="settings-add-btn">
            Novo usuário
          </Button>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />

          <Drawer
            title={editingId ? 'Editar usuário' : 'Novo usuário'}
            open={modal.open}
            onClose={closeModal}
            placement="right"
            width={420}
            destroyOnHidden
            extra={
              <Space>
                <Button onClick={closeModal} disabled={saving}>Cancelar</Button>
                <Button type="primary" loading={saving} onClick={() => form.submit()}>
                  {editingId ? 'Salvar' : 'Cadastrar'}
                </Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item
                name="username"
                label="Usuário"
                rules={editingId ? [] : [{ required: true }, { min: 3 }]}
              >
                <Input placeholder="Nome de usuário para login" disabled={!!editingId} />
              </Form.Item>
              <Form.Item
                name="password"
                label="Senha"
                rules={editingId ? [] : [{ required: true }, { min: 8 }]}
                extra={editingId ? 'Deixe em branco para não alterar' : undefined}
              >
                <Input.Password placeholder={editingId ? 'Nova senha (opcional)' : 'Mínimo 8 caracteres'} />
              </Form.Item>
              <Form.Item name="fullName" label="Nome completo" rules={[{ required: true }]}>
                <Input placeholder="Nome do usuário" />
              </Form.Item>
              <Form.Item name="email" label="E-mail" rules={[{ required: true }, antdRuleEmail({ required: true })]}>
                <Input placeholder="E-mail" />
              </Form.Item>
              <Form.Item name="role" label="Papel" rules={[{ required: true }]}>
                <Select options={USER_ROLES} placeholder="Selecione" />
              </Form.Item>
              {isRoot && (
                <Form.Item
                  name="tenantId"
                  label="Empresa"
                  extra="Ao selecionar empresa, os perfis disponíveis são filtrados"
                >
                  <Select
                    options={tenantOptions}
                    placeholder="Selecione a empresa"
                    allowClear
                    onChange={(val) => {
                      loadProfiles(val || undefined)
                      form.setFieldValue('profileId', undefined)
                    }}
                  />
                </Form.Item>
              )}
              <Form.Item name="profileId" label="Perfil">
                <Select options={profileSelectOptions} placeholder="Selecione o perfil (opcional)" allowClear />
              </Form.Item>
              {editingId && (
                <Form.Item name="active" valuePropName="checked" label="Ativo">
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              )}
            </Form>
          </Drawer>
        </div>
      </main>
    </div>
  )
}
