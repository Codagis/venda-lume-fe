import { useState, useEffect } from 'react'
import { Table, Button, Drawer, Form, Input, InputNumber, Switch, message, Space } from 'antd'
import { AppstoreOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../contexts/ModulesContext'
import * as moduleService from '../services/moduleService'
import * as permissionService from '../services/permissionService'
import { confirmDeleteModal } from '../utils/confirmModal'
import './Settings.css'

export default function Modules() {
  const { user } = useAuth()
  const { reload } = useModules()
  const isRoot = user?.isRoot === true
  const [modules, setModules] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState({ open: false, id: null })
  const [form] = Form.useForm()

  const loadModules = async () => {
    if (!isRoot) return
    setLoading(true)
    try {
      const data = await moduleService.listModulesAdmin()
      setModules(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar módulos')
    } finally {
      setLoading(false)
    }
  }

  const loadPermissions = async () => {
    try {
      const data = await permissionService.listPermissions()
      setPermissions(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar permissões')
    }
  }

  useEffect(() => {
    if (isRoot) {
      loadModules()
      loadPermissions()
    }
  }, [isRoot])

  const openModal = (id = null) => {
    setModal({ open: true, id })
    form.resetFields()
    if (id) {
      moduleService.getModuleById(id).then((m) => {
        form.setFieldsValue({
          code: m.code,
          name: m.name,
          description: m.description,
          icon: m.icon,
          route: m.route,
          component: m.component,
          displayOrder: m.displayOrder ?? 0,
          viewPermissionCode: m.viewPermissionCode,
          active: m.active ?? true,
        })
      })
    } else {
      form.setFieldsValue({ displayOrder: 0, active: true })
    }
  }

  const closeModal = () => {
    setModal({ open: false, id: null })
    setSaving(false)
    form.resetFields()
  }

  const onFinish = async (values) => {
    setSaving(true)
    try {
      const payload = {
        code: values.code?.trim(),
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        icon: values.icon?.trim() || undefined,
        route: values.route?.trim(),
        component: values.component?.trim(),
        displayOrder: values.displayOrder ?? 0,
        viewPermissionCode: values.viewPermissionCode?.trim(),
        active: values.active ?? true,
      }
      if (modal.id) {
        await moduleService.updateModule(modal.id, payload)
        message.success('Módulo atualizado.')
      } else {
        await moduleService.createModule(payload)
        message.success('Módulo cadastrado.')
      }
      closeModal()
      loadModules()
      reload()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id) => {
    try {
      await moduleService.deleteModule(id)
      message.success('Módulo excluído.')
      loadModules()
      reload()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir')
    }
  }

  const columns = [
    { title: 'Código', dataIndex: 'code', key: 'code', width: 140 },
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Rota', dataIndex: 'route', key: 'route', width: 120 },
    { title: 'Componente', dataIndex: 'component', key: 'component', width: 120 },
    { title: 'Ordem', dataIndex: 'displayOrder', key: 'displayOrder', width: 80 },
    { title: 'Ativo', dataIndex: 'active', key: 'active', width: 80, render: (v) => (v ? 'Sim' : 'Não') },
    {
      title: 'Ações',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal(r.id)} />
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() =>
              confirmDeleteModal({
                title: 'Excluir este módulo?',
                onOk: () => onDelete(r.id),
              })
            }
          />
        </Space>
      ),
    },
  ]

  if (!isRoot) {
    return (
      <div className="settings-page">
        <main className="settings-main">
          <div className="settings-container">
            <p style={{ color: '#667085' }}>Acesso restrito. Apenas usuário root pode gerenciar módulos.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-container">
          <div className="settings-header-card">
            <div className="settings-header-card-icon">
              <AppstoreOutlined />
            </div>
            <div className="settings-header-card-content">
              <h2 className="settings-page-title">Cadastro de Módulos</h2>
              <p className="settings-page-subtitle">
                Gerencie os módulos do sistema. Cada módulo corresponde a uma tela/rota no menu.
              </p>
            </div>
          </div>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} className="settings-add-btn">
            Novo módulo
          </Button>
          <Table rowKey="id" columns={columns} dataSource={modules} loading={loading} pagination={{ pageSize: 10 }} />

          <Drawer
            title={modal.id ? 'Editar módulo' : 'Novo módulo'}
            open={modal.open}
            onClose={closeModal}
            placement="right"
            width={440}
            destroyOnClose
            extra={
              <Space>
                <Button onClick={closeModal} disabled={saving}>Cancelar</Button>
                <Button type="primary" loading={saving} onClick={() => form.submit()}>Salvar</Button>
              </Space>
            }
          >
            <Form form={form} layout="vertical" onFinish={onFinish}>
              <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                <Input placeholder="Ex: PRODUCTS" disabled={!!modal.id} />
              </Form.Item>
              <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                <Input placeholder="Nome do módulo" />
              </Form.Item>
              <Form.Item name="route" label="Rota" rules={[{ required: true }]}>
                <Input placeholder="Ex: /products" />
              </Form.Item>
              <Form.Item name="component" label="Componente React" rules={[{ required: true }]}>
                <Input placeholder="Ex: Products" />
              </Form.Item>
              <Form.Item name="viewPermissionCode" label="Permissão de visualização" rules={[{ required: true }]}>
                <Input placeholder="Ex: PRODUCT_VIEW" list="perm-list" />
                <datalist id="perm-list">
                  {permissions.map((p) => (
                    <option key={p.id} value={p.code} />
                  ))}
                </datalist>
              </Form.Item>
              <Form.Item name="icon" label="Ícone">
                <Input placeholder="Ex: ShoppingOutlined" />
              </Form.Item>
              <Form.Item name="description" label="Descrição">
                <Input placeholder="Descrição opcional" />
              </Form.Item>
              <Form.Item name="displayOrder" label="Ordem de exibição">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="active" label="Ativo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Form>
          </Drawer>
        </div>
      </main>
    </div>
  )
}
