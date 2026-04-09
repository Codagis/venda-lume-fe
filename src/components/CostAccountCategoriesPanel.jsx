import { useState, useEffect, useCallback } from 'react'
import { Card, Tabs, Table, Button, Drawer, Form, Input, InputNumber, Switch, Space, message, Alert } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined } from '@ant-design/icons'
import * as costControlService from '../services/costControlService'
import { confirmDeleteModal } from '../utils/confirmModal'

const KIND_LABEL = {
  PAYABLE: 'Contas a pagar',
  RECEIVABLE: 'Contas a receber',
}

export default function CostAccountCategoriesPanel({ tenantId, isRoot }) {
  const [activeKind, setActiveKind] = useState('PAYABLE')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const effectiveTenantId = tenantId

  const load = useCallback(async () => {
    if (!effectiveTenantId) {
      setRows([])
      return
    }
    setLoading(true)
    try {
      const data = await costControlService.listCostCategories(activeKind, isRoot ? effectiveTenantId : undefined)
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar categorias.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeKind, effectiveTenantId, isRoot])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    form.resetFields()
    form.setFieldsValue({
      kind: activeKind,
      active: true,
      displayOrder: 0,
    })
    setDrawerOpen(true)
  }

  const openEdit = (record) => {
    setEditingId(record.id)
    form.setFieldsValue({
      kind: record.kind,
      name: record.name,
      description: record.description,
      active: record.active !== false,
      displayOrder: record.displayOrder ?? 0,
    })
    setDrawerOpen(true)
  }

  const onFinish = async (values) => {
    if (!effectiveTenantId) return
    setSaving(true)
    try {
      const payload = {
        tenantId: isRoot ? effectiveTenantId : undefined,
        kind: values.kind || activeKind,
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        active: values.active !== false,
        displayOrder: values.displayOrder != null ? Number(values.displayOrder) : 0,
      }
      if (editingId) {
        await costControlService.updateCostCategory(editingId, payload)
        message.success('Categoria atualizada.')
      } else {
        await costControlService.createCostCategory(payload)
        message.success('Categoria cadastrada.')
      }
      setDrawerOpen(false)
      load()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = (record) => {
    confirmDeleteModal({
      title: 'Excluir esta categoria?',
      description: 'Contas já lançadas não são alteradas; apenas o cadastro da categoria será removido.',
      onOk: async () => {
        try {
          await costControlService.deleteCostCategory(record.id, isRoot ? effectiveTenantId : undefined)
          message.success('Categoria excluída.')
          load()
        } catch (e) {
          message.error(e?.message || 'Erro ao excluir.')
        }
      },
    })
  }

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true, render: (t) => t || '—' },
    {
      title: 'Ordem',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 90,
      render: (v) => (v != null ? v : 0),
    },
    {
      title: 'Ativa',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (v) => (v !== false ? 'Sim' : 'Não'),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            Editar
          </Button>
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(record)}>
            Excluir
          </Button>
        </Space>
      ),
    },
  ]

  if (isRoot && !effectiveTenantId) {
    return (
      <Card>
        <Alert type="info" showIcon message="Selecione a empresa acima para cadastrar e listar as categorias." />
      </Card>
    )
  }

  if (!effectiveTenantId) {
    return (
      <Card>
        <Alert type="warning" showIcon message="Não foi possível identificar a empresa." />
      </Card>
    )
  }

  return (
    <Card
      title={
        <span>
          <TagsOutlined style={{ marginRight: 8 }} />
          Categorias por empresa
        </span>
      }
    >
      <p style={{ marginBottom: 16, color: '#666', fontSize: 13 }}>
        Cadastre nomes de categoria para organizar lançamentos de contas a pagar e a receber. Use os mesmos nomes ao preencher o campo
        &quot;Categoria&quot; nas contas.
      </p>
      <Tabs
        activeKey={activeKind}
        onChange={setActiveKind}
        items={[
          { key: 'PAYABLE', label: KIND_LABEL.PAYABLE },
          { key: 'RECEIVABLE', label: KIND_LABEL.RECEIVABLE },
        ]}
        style={{ marginBottom: 16 }}
      />
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Nova categoria ({KIND_LABEL[activeKind]})
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{ pageSize: 12 }}
        size="middle"
      />

      <Drawer
        title={editingId ? 'Editar categoria' : 'Nova categoria'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="kind" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex: Fornecedores, Folha, Vendas a prazo" maxLength={120} />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={2} placeholder="Opcional" maxLength={2000} showCount />
          </Form.Item>
          <Form.Item name="displayOrder" label="Ordem de exibição">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  )
}
