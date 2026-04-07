import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  Table,
  Drawer,
  message,
  Tag,
  Space,
  Steps,
  Descriptions,
  Statistic,
  Image,
  Select,
  Dropdown,
} from 'antd'
import {
  CarOutlined,
  CameraOutlined,
  UserOutlined,
  CheckCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import * as deliveryService from '../../services/deliveryService'
import { uploadDeliveryProofPhoto } from '../../services/uploadService'
import DeliveryMap from '../../components/DeliveryMap'
import '../Deliveries/Deliveries.css'

const { TextArea } = Input

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'ASSIGNED', label: 'Atribuída' },
  { value: 'ACCEPTED', label: 'Aceita' },
  { value: 'PICKING_UP', label: 'Coletando' },
  { value: 'PICKED_UP', label: 'Coletado' },
  { value: 'IN_TRANSIT', label: 'Em trânsito' },
  { value: 'ARRIVED', label: 'Chegou' },
  { value: 'DELIVERED', label: 'Entregue' },
  { value: 'FAILED', label: 'Falhou' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'RETURNED', label: 'Devolvido' },
]

const STATUS_COLORS = {
  PENDING: 'orange',
  ASSIGNED: 'blue',
  ACCEPTED: 'cyan',
  PICKING_UP: 'geekblue',
  PICKED_UP: 'purple',
  IN_TRANSIT: 'volcano',
  ARRIVED: 'gold',
  DELIVERED: 'green',
  FAILED: 'red',
  CANCELLED: 'default',
  RETURNED: 'magenta',
}

function formatMoney(val) {
  if (val == null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(d) {
  if (!d) return '-'
  return dayjs(d).format('DD/MM/YYYY HH:mm')
}

export default function MyDeliveries() {
  const [formStatus] = Form.useForm()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(false)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [deliveryPhotoFile, setDeliveryPhotoFile] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submittingStatus, setSubmittingStatus] = useState(false)

  const loadDeliveries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await deliveryService.listMyDeliveries()
      setDeliveries(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar minhas entregas.')
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDeliveries()
  }, [loadDeliveries])

  const openDetail = (d) => {
    setSelectedDelivery(d)
    setDetailDrawerOpen(true)
  }

  const openStatus = (d) => {
    setSelectedDelivery(d)
    setDeliveryPhotoFile(null)
    formStatus.resetFields()
    formStatus.setFieldsValue({
      status: d.status,
      failureReason: d.failureReason,
      returnReason: d.returnReason,
      deliveryNotes: d.deliveryNotes,
      receivedBy: d.receivedBy,
    })
    setStatusDrawerOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      message.warning('Selecione uma imagem (JPEG, PNG, WebP ou GIF).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      message.warning('A imagem deve ter no máximo 5MB.')
      return
    }
    setDeliveryPhotoFile(file)
  }

  const handleUpdateStatus = async () => {
    const values = await formStatus.validateFields().catch(() => null)
    if (!values || !selectedDelivery) return

    let proofOfDeliveryUrl = null
    if (values.status === 'DELIVERED' && deliveryPhotoFile) {
      setUploadingPhoto(true)
      try {
        const res = await uploadDeliveryProofPhoto(deliveryPhotoFile)
        proofOfDeliveryUrl = res?.url || null
      } catch (e) {
        message.error(e?.message || 'Erro ao enviar foto.')
        setUploadingPhoto(false)
        return
      }
      setUploadingPhoto(false)
    }

    setSubmittingStatus(true)
    try {
      const payload = {
        status: values.status,
        failureReason: values.failureReason?.trim() || undefined,
        returnReason: values.returnReason?.trim() || undefined,
        deliveryNotes: values.deliveryNotes?.trim() || undefined,
        receivedBy: values.receivedBy?.trim() || undefined,
      }
      if (proofOfDeliveryUrl) payload.proofOfDeliveryUrl = proofOfDeliveryUrl

      await deliveryService.updateDeliveryStatus(selectedDelivery.id, payload)
      message.success('Status atualizado!')
      setStatusDrawerOpen(false)
      loadDeliveries()
      const updated = await deliveryService.getDeliveryById(selectedDelivery.id)
      setSelectedDelivery(updated)
    } catch (e) {
      message.error(e?.message || 'Erro ao atualizar status.')
    } finally {
      setSubmittingStatus(false)
    }
  }

  const getStatusSteps = (d) => {
    const statusOrder = [
      'PENDING',
      'ASSIGNED',
      'ACCEPTED',
      'PICKING_UP',
      'PICKED_UP',
      'IN_TRANSIT',
      'ARRIVED',
      'DELIVERED',
    ]
    const idx = statusOrder.indexOf(d.status)
    const current = idx >= 0 ? idx : 0
    return statusOrder.slice(0, current + 1).map((s, i) => ({
      title: STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s,
      status: i < current ? 'finish' : i === current ? 'process' : 'wait',
    }))
  }

  const columns = [
    { title: 'Nº', dataIndex: 'deliveryNumber', key: 'deliveryNumber', width: 100 },
    { title: 'Venda', dataIndex: 'saleNumber', key: 'saleNumber', width: 90 },
    { title: 'Destinatário', dataIndex: 'recipientName', key: 'recipientName', ellipsis: true },
    { title: 'Telefone', dataIndex: 'recipientPhone', key: 'recipientPhone', width: 120 },
    {
      title: 'Endereço',
      key: 'address',
      ellipsis: true,
      render: (_, r) => (
        <span title={r.address}>
          {r.address?.length > 40 ? r.address.slice(0, 40) + '...' : r.address || '-'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag>,
    },
    {
      title: 'Valor',
      dataIndex: 'saleTotal',
      key: 'saleTotal',
      width: 100,
      render: (v) => formatMoney(v),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      className: 'my-deliveries-actions-col',
      render: (_, record) => {
        const items = [
          { key: 'detail', label: 'Ver detalhes', icon: <UserOutlined />, onClick: () => openDetail(record) },
          ...(!['DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'].includes(record.status)
            ? [{ key: 'status', label: 'Atualizar status', icon: <CheckCircleOutlined />, onClick: () => openStatus(record) }]
            : []),
        ]
        return (
          <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        )
      },
    },
  ]

  const stats = {
    pending: deliveries.filter((d) => ['PENDING', 'ASSIGNED'].includes(d.status)).length,
    inTransit: deliveries.filter((d) =>
      ['ACCEPTED', 'PICKING_UP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'].includes(d.status)
    ).length,
    deliveredToday: deliveries.filter(
      (d) => d.status === 'DELIVERED' && d.deliveredAt && dayjs(d.deliveredAt).isSame(dayjs(), 'day')
    ).length,
    total: deliveries.length,
  }

  return (
    <div className="deliveries-page">
      <main className="deliveries-main">
        <div className="deliveries-container">
          <div className="deliveries-header-card">
            <div className="deliveries-header-icon">
              <CarOutlined />
            </div>
            <div className="deliveries-header-content">
              <h2 className="deliveries-title">Minhas Entregas</h2>
              <p className="deliveries-subtitle">
                Visualize suas entregas e registre a conclusão com foto de comprovante, nome do destinatário e observações.
              </p>
            </div>
          </div>

          <div className="deliveries-stats-row">
            <Row gutter={16}>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Pendentes" value={stats.pending} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Em rota" value={stats.inTransit} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Entregues hoje" value={stats.deliveredToday} />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card className="deliveries-stat-card">
                  <Statistic title="Total" value={stats.total} />
                </Card>
              </Col>
            </Row>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={deliveries}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} entrega(s)` }}
            className="deliveries-table"
          />
        </div>
      </main>

      <Drawer
        title={`Entrega ${selectedDelivery?.deliveryNumber || ''}`}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={520}
        extra={
          selectedDelivery && !['DELIVERED', 'FAILED', 'CANCELLED', 'RETURNED'].includes(selectedDelivery.status) && (
            <Button type="primary" onClick={() => openStatus(selectedDelivery)}>
              Atualizar status
            </Button>
          )
        }
      >
        {selectedDelivery && (
          <>
            <Steps
              direction="vertical"
              size="small"
              current={Math.max(0, getStatusSteps(selectedDelivery).length - 1)}
              items={getStatusSteps(selectedDelivery).map((s) => ({
                title: s.title,
                status: s.status,
              }))}
            />
            <Descriptions column={1} bordered size="small" style={{ marginTop: 24 }}>
              <Descriptions.Item label="Venda">{selectedDelivery.saleNumber}</Descriptions.Item>
              <Descriptions.Item label="Destinatário">{selectedDelivery.recipientName}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{selectedDelivery.recipientPhone}</Descriptions.Item>
              <Descriptions.Item label="Endereço">{selectedDelivery.address}</Descriptions.Item>
              {selectedDelivery.complement && (
                <Descriptions.Item label="Complemento">{selectedDelivery.complement}</Descriptions.Item>
              )}
              <Descriptions.Item label="Taxa entrega">{formatMoney(selectedDelivery.deliveryFee)}</Descriptions.Item>
              <Descriptions.Item label="Valor total">{formatMoney(selectedDelivery.saleTotal)}</Descriptions.Item>
              <Descriptions.Item label="Criado em">{formatDate(selectedDelivery.createdAt)}</Descriptions.Item>
              {selectedDelivery.deliveredAt && (
                <Descriptions.Item label="Entregue em">{formatDate(selectedDelivery.deliveredAt)}</Descriptions.Item>
              )}
              {selectedDelivery.receivedBy && (
                <Descriptions.Item label="Recebido por">{selectedDelivery.receivedBy}</Descriptions.Item>
              )}
              {selectedDelivery.deliveryNotes && (
                <Descriptions.Item label="Observações">{selectedDelivery.deliveryNotes}</Descriptions.Item>
              )}
              {selectedDelivery.proofOfDeliveryUrl && (
                <Descriptions.Item label="Comprovante">
                  <Image
                    src={selectedDelivery.proofOfDeliveryUrl}
                    alt="Comprovante de entrega"
                    width={200}
                    style={{ borderRadius: 8 }}
                  />
                </Descriptions.Item>
              )}
            </Descriptions>
            <DeliveryMap delivery={selectedDelivery} />
          </>
        )}
      </Drawer>

      <Drawer title="Registrar entrega" open={statusDrawerOpen} onClose={() => setStatusDrawerOpen(false)} width={440}>
        <Form form={formStatus} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="Novo status" rules={[{ required: true }]}>
            <Select options={STATUS_OPTIONS} placeholder="Selecione o status" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'FAILED' ? (
                <Form.Item name="failureReason" label="Motivo da falha">
                  <TextArea rows={3} placeholder="Descreva o motivo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'RETURNED' ? (
                <Form.Item name="returnReason" label="Motivo da devolução">
                  <TextArea rows={3} placeholder="Descreva o motivo" />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.status !== curr.status}>
            {({ getFieldValue }) =>
              getFieldValue('status') === 'DELIVERED' ? (
                <>
                  <Form.Item
                    label="Foto do comprovante"
                    help="Tire ou selecione uma foto da entrega (JPEG, PNG, até 5MB). Será salva no Google Cloud."
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label
                        htmlFor="proof-photo"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '12px 16px',
                          border: '1px dashed #d9d9d9',
                          borderRadius: 8,
                          cursor: 'pointer',
                          background: '#fafafa',
                        }}
                      >
                        <CameraOutlined style={{ fontSize: 20, color: '#667085' }} />
                        {deliveryPhotoFile ? deliveryPhotoFile.name : 'Selecionar foto'}
                      </label>
                      <input
                        id="proof-photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      {deliveryPhotoFile && (
                        <span style={{ fontSize: 12, color: '#52c41a' }}>Foto selecionada ✓</span>
                      )}
                    </div>
                  </Form.Item>
                  <Form.Item name="receivedBy" label="Quem recebeu">
                    <Input placeholder="Nome de quem recebeu" prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item name="deliveryNotes" label="Observações">
                    <TextArea rows={2} placeholder="Observações da entrega" />
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploadingPhoto || submittingStatus}
              icon={<CheckCircleOutlined />}
            >
              Confirmar
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
