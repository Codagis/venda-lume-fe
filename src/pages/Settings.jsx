import { useState, useEffect } from 'react'
import {
  Tabs,
  Table,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  message,
  Popconfirm,
  Space,
  Upload,
  Avatar,
  Divider,
} from 'antd'
import {
  SettingOutlined,
  BankOutlined,
  TeamOutlined,
  SafetyOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import * as tenantService from '../services/tenantService'
import * as cardMachineService from '../services/cardMachineService'
import { uploadTenantLogo } from '../services/uploadService'
import * as permissionService from '../services/permissionService'
import * as profileService from '../services/profileService'
import './Settings.css'

const UF_OPTIONS = [
  { value: 'AC', label: 'AC - Acre' }, { value: 'AL', label: 'AL - Alagoas' }, { value: 'AP', label: 'AP - Amapá' },
  { value: 'AM', label: 'AM - Amazonas' }, { value: 'BA', label: 'BA - Bahia' }, { value: 'CE', label: 'CE - Ceará' },
  { value: 'DF', label: 'DF - Distrito Federal' }, { value: 'ES', label: 'ES - Espírito Santo' }, { value: 'GO', label: 'GO - Goiás' },
  { value: 'MA', label: 'MA - Maranhão' }, { value: 'MT', label: 'MT - Mato Grosso' }, { value: 'MS', label: 'MS - Mato Grosso do Sul' },
  { value: 'MG', label: 'MG - Minas Gerais' }, { value: 'PA', label: 'PA - Pará' }, { value: 'PB', label: 'PB - Paraíba' },
  { value: 'PR', label: 'PR - Paraná' }, { value: 'PE', label: 'PE - Pernambuco' }, { value: 'PI', label: 'PI - Piauí' },
  { value: 'RJ', label: 'RJ - Rio de Janeiro' }, { value: 'RN', label: 'RN - Rio Grande do Norte' }, { value: 'RS', label: 'RS - Rio Grande do Sul' },
  { value: 'RO', label: 'RO - Rondônia' }, { value: 'RR', label: 'RR - Roraima' }, { value: 'SC', label: 'SC - Santa Catarina' },
  { value: 'SP', label: 'SP - São Paulo' }, { value: 'SE', label: 'SE - Sergipe' }, { value: 'TO', label: 'TO - Tocantins' },
]
const CRT_OPTIONS = [
  { value: 1, label: '1 - Simples Nacional' },
  { value: 2, label: '2 - Simples Nacional - Excesso sublimite' },
  { value: 3, label: '3 - Regime Normal' },
  { value: 4, label: '4 - MEI' },
]
const AMBIENTE_OPTIONS = [
  { value: 'homologacao', label: 'Homologação (teste SEFAZ)' },
  { value: 'producao', label: 'Produção' },
]

export default function Settings() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true

  const [tenants, setTenants] = useState([])
  const [permissions, setPermissions] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState({ tenants: false, permissions: false, profiles: false })
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState({ open: false, type: null, id: null })
  const [form] = Form.useForm()
  const [tenantOptions, setTenantOptions] = useState([])
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [certificadoPfxBase64, setCertificadoPfxBase64] = useState(null)
  const [editingTenantData, setEditingTenantData] = useState(null)
  const [cardMachines, setCardMachines] = useState([])
  const [pendingCardMachines, setPendingCardMachines] = useState([])
  const [cardMachineModal, setCardMachineModal] = useState({ open: false, id: null })
  const [cardMachineForm] = Form.useForm()

  const displayCardMachines = modal.type === 'tenant' && modal.id ? cardMachines : pendingCardMachines

  const loadCardMachines = async (tenantId) => {
    if (!tenantId) return
    try {
      const data = await cardMachineService.listByTenant(tenantId)
      setCardMachines(data || [])
    } catch {
      setCardMachines([])
    }
  }

  const loadTenants = async () => {
    if (!isRoot) return
    setLoading((l) => ({ ...l, tenants: true }))
    try {
      const data = await tenantService.listTenants()
      setTenants(data)
      setTenantOptions(data.map((t) => ({ value: t.id, label: t.name })))
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresas')
    } finally {
      setLoading((l) => ({ ...l, tenants: false }))
    }
  }

  const loadPermissions = async () => {
    setLoading((l) => ({ ...l, permissions: true }))
    try {
      const data = await permissionService.listPermissions()
      setPermissions(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar permissões')
    } finally {
      setLoading((l) => ({ ...l, permissions: false }))
    }
  }

  const loadProfiles = async () => {
    setLoading((l) => ({ ...l, profiles: true }))
    try {
      const data = await profileService.listProfiles()
      setProfiles(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar perfis')
    } finally {
      setLoading((l) => ({ ...l, profiles: false }))
    }
  }

  useEffect(() => {
    if (isRoot) loadTenants()
    loadPermissions()
    loadProfiles()
  }, [isRoot])

  useEffect(() => {
    if (isRoot && tenants.length) {
      setTenantOptions(tenants.map((t) => ({ value: t.id, label: t.name })))
    } else if (!isRoot && user?.tenantId) {
      tenantService.getCurrentTenant().then((t) => {
        if (t?.id && t?.name) setTenantOptions([{ value: t.id, label: t.name }])
      }).catch(() => setTenantOptions([]))
    } else {
      setTenantOptions([])
    }
  }, [isRoot, tenants, user?.tenantId])

  const openModal = (type, id = null) => {
    setModal({ open: true, type, id })
    form.resetFields()
    if (type === 'tenant' && id) {
      setEditingTenantData(null)
      tenantService.getTenantById(id).then((t) => {
        setEditingTenantData(t)
        form.setFieldsValue({
          name: t.name,
          tradeName: t.tradeName,
          document: t.document,
          email: t.email,
          phone: t.phone,
          active: t.active,
          logoUrl: t.logoUrl,
          stateRegistration: t.stateRegistration,
          municipalRegistration: t.municipalRegistration,
          codigoMunicipio: t.codigoMunicipio,
          addressStreet: t.addressStreet,
          addressNumber: t.addressNumber,
          addressComplement: t.addressComplement,
          addressNeighborhood: t.addressNeighborhood,
          addressZip: t.addressZip,
          addressState: t.addressState,
          addressCity: t.addressCity,
          crt: t.crt ?? 3,
          idCsc: t.idCsc ?? 0,
          csc: t.csc ?? undefined,
          ambienteFiscal: t.ambienteFiscal ?? 'homologacao',
          crtNfe: t.crtNfe != null ? t.crtNfe : undefined,
          ambienteNfe: t.ambienteNfe != null && t.ambienteNfe !== '' ? t.ambienteNfe : undefined,
          maxInstallments: t.maxInstallments ?? 12,
          maxInstallmentsNoInterest: t.maxInstallmentsNoInterest ?? 1,
          interestRatePercent: t.interestRatePercent ?? 0,
          cardFeeType: t.cardFeeType || undefined,
          cardFeeValue: t.cardFeeValue ?? undefined,
        })
        loadCardMachines(id)
      }).catch((e) => message.error(e?.message || 'Erro ao carregar empresa.'))
    }
    if (type === 'tenant' && !id) {
      setCardMachines([])
      setPendingCardMachines([])
    }
    if (type === 'permission' && id) {
      const p = permissions.find((x) => x.id === id)
      if (p) form.setFieldsValue({ code: p.code, name: p.name, description: p.description, module: p.module })
    }
    if (type === 'profile' && id) {
      profileService.getProfileById(id).then((pr) => {
        form.setFieldsValue({
          name: pr.name,
          description: pr.description,
          tenantId: pr.tenantId ?? undefined,
          permissionIds: pr.permissions?.map((x) => x.id) || [],
        })
      })
    }
    if (type === 'profile' && !id) {
      form.setFieldsValue({
        tenantId: isRoot ? undefined : user?.tenantId,
        permissionIds: [],
      })
    }
  }

  const closeModal = () => {
    setModal({ open: false, type: null, id: null })
    setSaving(false)
    setCertificadoPfxBase64(null)
    setEditingTenantData(null)
    setPendingCardMachines([])
    setCardMachineModal({ open: false, id: null })
    cardMachineForm.resetFields()
    form.resetFields()
  }

  const onFinishTenant = async (values) => {
    setSaving(true)
    try {
      const payload = {
        ...values,
        logoUrl: values.logoUrl || undefined,
        certificadoPfxBase64: certificadoPfxBase64 || undefined,
        certificadoPassword: values.certificadoPassword || undefined,
        crtNfe: values.crtNfe ?? null,
        ambienteNfe: values.ambienteNfe ?? null,
      }
      if (modal.id) {
        await tenantService.updateTenant(modal.id, payload)
        message.success('Empresa atualizada.')
      } else {
        const createPayload = {
          ...payload,
          maxInstallments: payload.maxInstallments ?? 12,
          maxInstallmentsNoInterest: payload.maxInstallmentsNoInterest ?? 1,
          interestRatePercent: payload.interestRatePercent ?? 0,
        }
        const created = await tenantService.createTenant(createPayload)
        message.success('Empresa cadastrada.')
        for (const m of pendingCardMachines) {
          const acq = m.acquirerCnpj?.replace?.(/\D/g, '')
          await cardMachineService.create(created.id, {
            name: m.name,
            feeType: m.feeType,
            feeValue: m.feeValue,
            acquirerCnpj: acq?.length === 14 ? acq : undefined,
            isDefault: m.isDefault,
            active: m.active,
          }).catch((err) => message.warning(`Maquininha "${m.name}" não foi criada: ${err?.message || err}`))
        }
        setPendingCardMachines([])
      }
      closeModal()
      loadTenants()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const onFinishPermission = async (values) => {
    setSaving(true)
    try {
      if (modal.id) {
        await permissionService.updatePermission(modal.id, values)
        message.success('Permissão atualizada.')
      } else {
        await permissionService.createPermission(values)
        message.success('Permissão cadastrada.')
      }
      closeModal()
      loadPermissions()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const onFinishProfile = async (values) => {
    setSaving(true)
    try {
      const tenantIdValue = isRoot
        ? (values.tenantId && values.tenantId !== '__system__' ? values.tenantId : null)
        : user?.tenantId
      const payload = {
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        tenantId: tenantIdValue,
        permissionIds: values.permissionIds || [],
      }
      if (modal.id) {
        await profileService.updateProfile(modal.id, payload)
        message.success('Perfil atualizado.')
      } else {
        await profileService.createProfile(payload)
        message.success('Perfil cadastrado.')
      }
      closeModal()
      loadProfiles()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const onDeleteTenant = async (id) => {
    try {
      await tenantService.deleteTenant(id)
      message.success('Empresa excluída.')
      loadTenants()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir')
    }
  }

  const onDeletePermission = async (id) => {
    try {
      await permissionService.deletePermission(id)
      message.success('Permissão excluída.')
      loadPermissions()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir')
    }
  }

  const onDeleteProfile = async (id) => {
    try {
      await profileService.deleteProfile(id)
      message.success('Perfil excluído.')
      loadProfiles()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir')
    }
  }

  const openCardMachineModal = (machineId = null) => {
    setCardMachineModal({ open: true, id: machineId })
    cardMachineForm.resetFields()
    const list = modal.id ? cardMachines : pendingCardMachines
    const m = machineId ? list.find((x) => x.id === machineId) : null
    if (m) {
      cardMachineForm.setFieldsValue({
        name: m.name,
        feeType: m.feeType,
        feeValue: m.feeValue,
        acquirerCnpj: m.acquirerCnpj ?? '',
        isDefault: m.isDefault,
        active: m.active,
      })
    } else {
      cardMachineForm.setFieldsValue({ isDefault: false, active: true })
    }
  }

  const closeCardMachineModal = () => {
    setCardMachineModal({ open: false, id: null })
    cardMachineForm.resetFields()
  }

  const onFinishCardMachine = async (values) => {
    const acquirerCnpj = values.acquirerCnpj?.replace(/\D/g, '')
    const payload = {
      name: values.name?.trim(),
      feeType: values.feeType,
      feeValue: values.feeValue,
      acquirerCnpj: acquirerCnpj?.length === 14 ? acquirerCnpj : undefined,
      isDefault: !!values.isDefault,
      active: values.active !== false,
    }
    if (modal.id) {
      setSaving(true)
      try {
        if (cardMachineModal.id) {
          await cardMachineService.update(modal.id, cardMachineModal.id, payload)
          message.success('Maquininha atualizada.')
        } else {
          await cardMachineService.create(modal.id, payload)
          message.success('Maquininha cadastrada.')
        }
        closeCardMachineModal()
        loadCardMachines(modal.id)
      } catch (e) {
        message.error(e?.message || 'Erro ao salvar')
      } finally {
        setSaving(false)
      }
    } else {
      if (cardMachineModal.id) {
        setPendingCardMachines((prev) =>
          prev.map((x) => {
            if (x.id === cardMachineModal.id) return { ...x, ...payload }
            if (payload.isDefault) return { ...x, isDefault: false }
            return x
          })
        )
        message.success('Maquininha alterada.')
      } else {
        const tempId = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2)
        setPendingCardMachines((prev) => {
          const next = prev.map((x) => (payload.isDefault ? { ...x, isDefault: false } : x))
          return [...next, { id: tempId, ...payload }]
        })
        message.success('Maquininha adicionada.')
      }
      closeCardMachineModal()
    }
  }

  const onDeleteCardMachine = async (id) => {
    if (modal.id) {
      try {
        await cardMachineService.remove(modal.id, id)
        message.success('Maquininha excluída.')
        loadCardMachines(modal.id)
      } catch (e) {
        message.error(e?.message || 'Erro ao excluir')
      }
    } else {
      setPendingCardMachines((prev) => prev.filter((x) => x.id !== id))
      message.success('Maquininha removida.')
    }
  }

  const tenantColumns = [
    {
      title: '',
      key: 'logo',
      width: 56,
      render: (_, r) =>
        r.logoUrl ? (
          <Avatar src={r.logoUrl} shape="square" size={40} alt={r.name} />
        ) : (
          <Avatar shape="square" size={40} style={{ background: '#e4e7ec' }}>{r?.name?.charAt(0)?.toUpperCase() || '?'}</Avatar>
        ),
    },
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Nome fantasia', dataIndex: 'tradeName', key: 'tradeName' },
    { title: 'Documento', dataIndex: 'document', key: 'document' },
    { title: 'E-mail', dataIndex: 'email', key: 'email' },
    { title: 'Ativo', dataIndex: 'active', key: 'active', render: (v) => (v ? 'Sim' : 'Não') },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal('tenant', r.id)} />
          <Popconfirm title="Excluir esta empresa?" onConfirm={() => onDeleteTenant(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const permissionColumns = [
    { title: 'Código', dataIndex: 'code', key: 'code' },
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Módulo', dataIndex: 'module', key: 'module' },
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal('permission', r.id)} />
          <Popconfirm title="Excluir esta permissão?" onConfirm={() => onDeletePermission(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const profileColumns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Empresa',
      dataIndex: 'tenantId',
      key: 'tenantId',
      render: (id) => (id ? tenantOptions.find((o) => o.value === id)?.label || id : 'Sistema'),
    },
    {
      title: 'Ações',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal('profile', r.id)} />
          <Popconfirm title="Excluir este perfil?" onConfirm={() => onDeleteProfile(r.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tabItems = [
    ...(isRoot
      ? [
          {
            key: 'tenants',
            label: (
              <span>
                <BankOutlined /> Empresas
              </span>
            ),
            children: (
              <div className="settings-tab">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('tenant')} className="settings-add-btn">
                  Nova empresa
                </Button>
                <Table
                  rowKey="id"
                  columns={tenantColumns}
                  dataSource={tenants}
                  loading={loading.tenants}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'profiles',
      label: (
        <span>
          <TeamOutlined /> Perfis
        </span>
      ),
      children: (
        <div className="settings-tab">
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('profile')} className="settings-add-btn">
            Novo perfil
          </Button>
          <Table
            rowKey="id"
            columns={profileColumns}
            dataSource={profiles}
            loading={loading.profiles}
            pagination={{ pageSize: 10 }}
          />
        </div>
      ),
    },
    ...(isRoot
      ? [
          {
            key: 'permissions',
            label: (
              <span>
                <SafetyOutlined /> Permissões
              </span>
            ),
            children: (
              <div className="settings-tab">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('permission')} className="settings-add-btn">
                  Nova permissão
                </Button>
                <Table
                  rowKey="id"
                  columns={permissionColumns}
                  dataSource={permissions}
                  loading={loading.permissions}
                  pagination={{ pageSize: 10 }}
                />
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="settings-page">
      <main className="settings-main">
        <div className="settings-container">
          <div className="settings-header-card">
            <div className="settings-header-card-icon">
              <SettingOutlined />
            </div>
            <div className="settings-header-card-content">
              <h2 className="settings-page-title">Permissões e empresas</h2>
              <p className="settings-page-subtitle">
                Gerencie empresas (tenants), perfis de acesso e permissões. Apenas usuário root vê Empresas e Permissões.
              </p>
            </div>
          </div>

          <Tabs defaultActiveKey={tabItems[0]?.key} items={tabItems} className="settings-tabs" />

          <Drawer
            title={modal.type === 'tenant' ? (modal.id ? 'Editar empresa' : 'Nova empresa') : modal.type === 'permission' ? (modal.id ? 'Editar permissão' : 'Nova permissão') : modal.id ? 'Editar perfil' : 'Novo perfil'}
            open={modal.open}
            onClose={closeModal}
            placement="right"
            width={modal.type === 'profile' ? 480 : modal.type === 'tenant' ? 520 : 400}
            destroyOnClose
            extra={
              <Space>
                <Button onClick={closeModal} disabled={saving}>Cancelar</Button>
                <Button type="primary" loading={saving} onClick={() => form.submit()}>Salvar</Button>
              </Space>
            }
          >
            {modal.type === 'tenant' && (
              <Form form={form} layout="vertical" onFinish={onFinishTenant}>
                <Form.Item name="logoUrl" label="Logo da empresa">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.logoUrl !== curr.logoUrl}>
                      {({ getFieldValue }) => (
                        <Space align="center">
                          <Avatar
                            src={getFieldValue('logoUrl')}
                            shape="square"
                            size={64}
                            style={!getFieldValue('logoUrl') ? { background: '#e4e7ec' } : {}}
                          >
                            {!getFieldValue('logoUrl') && 'Logo'}
                          </Avatar>
                          <Upload
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            showUploadList={false}
                            beforeUpload={(file) => {
                              if (file.size > 5 * 1024 * 1024) {
                                message.error('Imagem deve ter no máximo 5MB.')
                                return Upload.LIST_IGNORE
                              }
                              setUploadingLogo(true)
                              uploadTenantLogo(file)
                                .then((res) => {
                                  form.setFieldValue('logoUrl', res.url)
                                  message.success('Logo enviada!')
                                })
                                .catch((e) => message.error(e?.message || 'Erro no upload.'))
                                .finally(() => setUploadingLogo(false))
                              return false
                            }}
                          >
                            <Button icon={<UploadOutlined />} loading={uploadingLogo}>
                              Enviar logo
                            </Button>
                          </Upload>
                          {getFieldValue('logoUrl') && (
                            <Button
                              type="link"
                              danger
                              size="small"
                              onClick={() => form.setFieldValue('logoUrl', undefined)}
                            >
                              Remover
                            </Button>
                          )}
                        </Space>
                      )}
                    </Form.Item>
                  </Space>
                </Form.Item>
                <Form.Item name="name" label="Razão social" rules={[{ required: true }]}>
                  <Input placeholder="Nome da empresa" />
                </Form.Item>
                <Form.Item name="tradeName" label="Nome fantasia">
                  <Input placeholder="Nome fantasia" />
                </Form.Item>
                <Form.Item name="document" label="CNPJ/Documento">
                  <Input placeholder="Documento" />
                </Form.Item>
                <Form.Item name="email" label="E-mail">
                  <Input placeholder="E-mail" />
                </Form.Item>
                <Form.Item name="phone" label="Telefone">
                  <Input placeholder="Telefone" />
                </Form.Item>
                <Card size="small" title="Endereço da empresa" style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 12 }}>
                    Usado para calcular distância e tempo nas entregas (mapa). Preencha ao menos logradouro, número, cidade e estado.
                  </div>
                  <Form.Item name="addressStreet" label="Logradouro">
                    <Input placeholder="Rua, avenida, etc." maxLength={255} />
                  </Form.Item>
                  <Form.Item name="addressNumber" label="Número">
                    <Input placeholder="Nº" maxLength={20} />
                  </Form.Item>
                  <Form.Item name="addressComplement" label="Complemento">
                    <Input placeholder="Sala, andar, etc." maxLength={100} />
                  </Form.Item>
                  <Form.Item name="addressNeighborhood" label="Bairro">
                    <Input placeholder="Bairro" maxLength={100} />
                  </Form.Item>
                  <Form.Item name="addressZip" label="CEP">
                    <Input placeholder="00000-000" maxLength={10} />
                  </Form.Item>
                  <Form.Item name="addressCity" label="Cidade">
                    <Input placeholder="Ex: Fortaleza" maxLength={100} />
                  </Form.Item>
                  <Form.Item name="addressState" label="Estado (UF)">
                    <Select placeholder="UF" options={UF_OPTIONS} showSearch optionFilterProp="label" allowClear style={{ width: '100%' }} />
                  </Form.Item>
                </Card>
                <Divider orientation="left">Dados fiscais e Nuvem Fiscal</Divider>
                <div style={{ marginBottom: 20, color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
                  Configure IE/IM e dados fiscais para emissão de NFC-e e NF-e. A emissão é controlada por produto (em Produtos).
                </div>
                <Form.Item
                  name="stateRegistration"
                  label="Inscrição Estadual (IE)"
                >
                  <Input placeholder="IE ou ISENTO" />
                </Form.Item>
                <Form.Item
                  name="municipalRegistration"
                  label="Inscrição Municipal (IM)"
                >
                  <Input placeholder="IM ou ISENTO" />
                </Form.Item>
                <Card size="small" title="Dados do município (fiscal)" style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 8 }}>
                            Código IBGE do município. Cidade e estado vêm do endereço da empresa acima.
                          </div>
                          <Form.Item
                            name="codigoMunicipio"
                            label="Código Município IBGE (7 dígitos)"
                            extra="Ex: 2304400 (Fortaleza/CE), 3550308 (São Paulo/SP)"
                          >
                            <Input placeholder="Ex: 2304400" maxLength={7} />
                          </Form.Item>
                        </Card>

                        <Card size="small" title="NFC-e — Cupom fiscal" style={{ marginBottom: 20 }}>
                          <Form.Item name="crt" label="CRT — Regime Tributário">
                            <Select placeholder="Selecione o CRT" options={CRT_OPTIONS} allowClear />
                          </Form.Item>
                          <Form.Item name="idCsc" label="ID do CSC" initialValue={0}>
                            <Input type="number" min={0} placeholder="Geralmente 0" />
                          </Form.Item>
                          <Form.Item name="csc" label="Código CSC (SEFAZ)">
                            <Input.Password placeholder="Código obtido na SEFAZ do estado" allowClear />
                          </Form.Item>
                          <Form.Item name="ambienteFiscal" label="Ambiente" initialValue="homologacao">
                            <Select placeholder="Homologação ou Produção" options={AMBIENTE_OPTIONS} />
                          </Form.Item>
                        </Card>

                        <Card size="small" title="NF-e — Nota fiscal eletrônica" style={{ marginBottom: 20 }}>
                          <div style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12, marginBottom: 12 }}>
                            Informe CRT e Ambiente para a NF-e na Nuvem Fiscal. Ao salvar a empresa, esta configuração é enviada para a Nuvem Fiscal. Se não preencher, serão usados os mesmos da NFC-e.
                          </div>
                          <Form.Item name="crtNfe" label="CRT — Regime Tributário (NF-e)">
                            <Select placeholder="Mesmo da NFC-e ou selecione" options={CRT_OPTIONS} allowClear />
                          </Form.Item>
                          <Form.Item name="ambienteNfe" label="Ambiente (NF-e)">
                            <Select placeholder="Mesmo da NFC-e ou selecione" options={AMBIENTE_OPTIONS} allowClear />
                          </Form.Item>
                        </Card>

                        <Card size="small" title="Certificado digital (A1)" style={{ marginBottom: 8 }}>
                          {(() => {
                            const tenantBeingEdited = editingTenantData || (modal.id ? tenants.find((x) => x.id === modal.id) : null)
                            const temCertificado = tenantBeingEdited?.certificadoPfxUrl
                            const dataEnvio = tenantBeingEdited?.certificadoUploadedAt
                              ? new Date(tenantBeingEdited.certificadoUploadedAt).toLocaleDateString('pt-BR')
                              : null
                            return temCertificado ? (
                              <div style={{ marginBottom: 12, padding: 8, background: 'var(--ant-color-success-bg)', borderRadius: 6, fontSize: 12 }}>
                                Certificado enviado e salvo no Google Cloud{dataEnvio ? ` em ${dataEnvio}` : ''}. Selecione outro arquivo abaixo para substituir.
                              </div>
                            ) : null
                          })()}
                          <Form.Item label="Certificado PFX" extra="Arquivo .pfx ou .p12 — ao salvar, será enviado ao Fiscal Simplify e ao Google Cloud">
                            <Upload
                              accept=".pfx,.p12"
                              maxCount={1}
                              beforeUpload={(file) => {
                                const reader = new FileReader()
                                reader.onload = (e) => {
                                  const base64 = e.target?.result
                                  if (typeof base64 === 'string') setCertificadoPfxBase64(base64)
                                }
                                reader.readAsDataURL(file)
                                return false
                              }}
                              onRemove={() => setCertificadoPfxBase64(null)}
                            >
                              <Button icon={<UploadOutlined />}>Selecionar arquivo PFX</Button>
                            </Upload>
                          </Form.Item>
                          <Form.Item name="certificadoPassword" label="Senha do certificado">
                            <Input.Password placeholder="Senha do arquivo PFX" allowClear />
                          </Form.Item>
                        </Card>
                <Card size="small" title="Maquininhas" style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)', marginBottom: 12 }}>
                    Cadastre quantas maquininhas precisar. No PDV o atendente escolhe qual usar. Cada uma com nome e taxa própria.
                  </div>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openCardMachineModal()} style={{ marginBottom: 12 }}>
                    Adicionar maquininha
                  </Button>
                  <Table
                    size="small"
                    dataSource={displayCardMachines}
                    rowKey="id"
                    pagination={false}
                    locale={{ emptyText: 'Nenhuma maquininha cadastrada. Clique em Adicionar maquininha.' }}
                    columns={[
                      { title: 'Nome', dataIndex: 'name', key: 'name' },
                      {
                        title: 'Taxa',
                        key: 'fee',
                        render: (_, r) =>
                          r.feeType === 'PERCENTAGE'
                            ? `${r.feeValue}%`
                            : `R$ ${Number(r.feeValue).toFixed(2)}`,
                      },
                      { title: 'Padrão', dataIndex: 'isDefault', key: 'default', render: (v) => (v ? 'Sim' : '-') },
                      { title: 'Ativa', dataIndex: 'active', key: 'active', render: (v) => (v ? 'Sim' : 'Não') },
                      {
                        title: '',
                        key: 'actions',
                        width: 80,
                        render: (_, r) => (
                          <Space>
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openCardMachineModal(r.id)} />
                            <Popconfirm title="Excluir esta maquininha?" onConfirm={() => onDeleteCardMachine(r.id)}>
                              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </Card>
                <Form.Item name="active" label="Ativo" valuePropName="checked" initialValue={true}>
                  <Switch />
                </Form.Item>
              </Form>
            )}
            {modal.type === 'permission' && (
              <Form form={form} layout="vertical" onFinish={onFinishPermission}>
                <Form.Item name="code" label="Código" rules={[{ required: true }]}>
                  <Input placeholder="Ex: PRODUCT_VIEW" />
                </Form.Item>
                <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
                  <Input placeholder="Nome da permissão" />
                </Form.Item>
                <Form.Item name="module" label="Módulo">
                  <Input placeholder="Ex: PRODUCTS, SALES" />
                </Form.Item>
                <Form.Item name="description" label="Descrição">
                  <Input.TextArea rows={2} placeholder="Descrição" />
                </Form.Item>
              </Form>
            )}
            {modal.type === 'profile' && (
              <Form form={form} layout="vertical" onFinish={onFinishProfile}>
                <Form.Item name="name" label="Nome do perfil" rules={[{ required: true, message: 'Nome é obrigatório' }]}>
                  <Input placeholder="Ex: Vendedor" />
                </Form.Item>
                {isRoot && (
                  <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
                    <Select placeholder="Selecione a empresa" options={tenantOptions} />
                  </Form.Item>
                )}
                <Form.Item name="description" label="Descrição">
                  <Input.TextArea rows={2} placeholder="Descrição do perfil" />
                </Form.Item>
                <Form.Item name="permissionIds" label="Permissões">
                  <Select
                    mode="multiple"
                    placeholder="Selecione as permissões"
                    optionFilterProp="label"
                    options={permissions.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Form>
            )}
          </Drawer>

          <Modal
            title={cardMachineModal.id ? 'Editar maquininha' : 'Nova maquininha'}
            open={cardMachineModal.open}
            onCancel={closeCardMachineModal}
            footer={null}
            destroyOnClose
          >
            <Form form={cardMachineForm} layout="vertical" onFinish={onFinishCardMachine}>
              <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
                <Input placeholder="Ex: Cielo, Rede, Mercado Pago" maxLength={100} />
              </Form.Item>
              <Form.Item name="feeType" label="Tipo da taxa" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'PERCENTAGE', label: 'Percentual (%)' },
                    { value: 'FIXED_AMOUNT', label: 'Valor fixo (R$)' },
                  ]}
                  placeholder="Selecione"
                />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.feeType !== curr.feeType}
              >
                {({ getFieldValue }) =>
                  getFieldValue('feeType') === 'PERCENTAGE' ? (
                    <Form.Item name="feeValue" label="Taxa (%)" rules={[{ required: true }]}>
                      <Input type="number" min={0} step={0.01} placeholder="Ex: 2.5" addonAfter="%" />
                    </Form.Item>
                  ) : getFieldValue('feeType') === 'FIXED_AMOUNT' ? (
                    <Form.Item name="feeValue" label="Taxa (R$)" rules={[{ required: true }]}>
                      <Input type="number" min={0} step={0.01} placeholder="Ex: 0.50" prefix="R$" />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
              <Form.Item name="acquirerCnpj" label="CNPJ da adquirente" help="Para NFC-e com cartão: CNPJ da instituição de pagamento (somente números)">
                <Input placeholder="14 dígitos (ex: Cielo, Rede)" maxLength={18} />
              </Form.Item>
              <Form.Item name="isDefault" label="Maquininha padrão" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="active" label="Ativa" valuePropName="checked" initialValue={true}>
                <Switch />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button onClick={closeCardMachineModal}>Cancelar</Button>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    Salvar
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </main>
    </div>
  )
}
