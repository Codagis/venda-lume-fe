import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  message,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { CopyOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons'
import * as subscriptionService from '../../services/subscriptionService'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatMoney, STATUS_LABELS } from './subscriptionUtils'
import './Subscription.css'

const { Text } = Typography

export default function SubscriptionTenantView() {
  const { user, refreshUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [refreshingPix, setRefreshingPix] = useState(false)
  const [awaitingPayment, setAwaitingPayment] = useState(false)
  const selectedInvoiceIdRef = useRef(null)
  const pixPanelRef = useRef(null)

  const applyInvoiceList = useCallback((invoiceList, preferredId) => {
    const sorted = [...invoiceList].sort((a, b) => {
      if (a.blocksAccess && !b.blocksAccess) return -1
      if (!a.blocksAccess && b.blocksAccess) return 1
      return 0
    })
    setInvoices(sorted)
    const targetId = preferredId ?? selectedInvoiceIdRef.current
    const current = targetId ? sorted.find((i) => i.id === targetId) : null
    if (current) {
      setSelectedInvoice(current)
      return current
    }
    const payable = sorted.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE')
    const blocking = payable.find((i) => i.blocksAccess)
    const next = blocking || payable[0] || sorted[0] || null
    setSelectedInvoice(next)
    return next
  }, [])

  const loadSilent = useCallback(async (preferredId) => {
    const [accessData, invoiceList] = await Promise.all([
      subscriptionService.getSubscriptionAccess(),
      subscriptionService.listSubscriptionInvoices(),
    ])
    setAccess(accessData)
    return applyInvoiceList(invoiceList, preferredId)
  }, [applyInvoiceList])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      await loadSilent()
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar mensalidades.')
    } finally {
      setLoading(false)
    }
  }, [loadSilent])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    selectedInvoiceIdRef.current = selectedInvoice?.id ?? null
  }, [selectedInvoice?.id])

  useEffect(() => {
    const invoice = selectedInvoice
    const waitingPix =
      invoice &&
      invoice.status !== 'PAID' &&
      invoice.status !== 'CANCELLED' &&
      Boolean(invoice.pixCopyPaste || invoice.pixQrCodeBase64)

    if (!waitingPix) {
      setAwaitingPayment(false)
      return undefined
    }

    setAwaitingPayment(true)
    let cancelled = false
    let paidNotified = false

    const checkPayment = async () => {
      if (cancelled || !invoice.id) return
      try {
        const updated = await subscriptionService.syncInvoiceStatus(invoice.id)
        if (cancelled) return

        setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
        setSelectedInvoice(updated)

        if (updated.status === 'PAID' && !paidNotified) {
          paidNotified = true
          setAwaitingPayment(false)
          const accessData = await subscriptionService.getSubscriptionAccess()
          setAccess(accessData)
          await refreshUser()
          message.success('Pagamento confirmado! Mensalidade quitada.')
        }
      } catch {
        /* polling silencioso */
      }
    }

    const initial = setTimeout(checkPayment, 3000)
    const interval = setInterval(checkPayment, 5000)

    return () => {
      cancelled = true
      clearTimeout(initial)
      clearInterval(interval)
      setAwaitingPayment(false)
    }
  }, [
    selectedInvoice?.id,
    selectedInvoice?.status,
    selectedInvoice?.pixCopyPaste,
    selectedInvoice?.pixQrCodeBase64,
    refreshUser,
  ])

  const payableInvoices = useMemo(
    () => invoices.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE'),
    [invoices]
  )

  const paidInvoices = useMemo(() => invoices.filter((i) => i.status === 'PAID'), [invoices])

  const scrollToPixPanel = useCallback(() => {
    window.setTimeout(() => {
      pixPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [])

  const handleRefreshPix = useCallback(async (invoiceId, { silent = false } = {}) => {
    if (!invoiceId) return null
    setRefreshingPix(true)
    try {
      const updated = await subscriptionService.refreshInvoicePix(invoiceId)
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setSelectedInvoice(updated)
      if (!silent) {
        if (updated.pixCopyPaste || updated.pixQrCodeBase64) {
          message.success('PIX gerado. Escaneie o QR Code ou copie o código.')
        } else {
          message.warning(
            'A cobrança foi registrada, mas o PIX ainda não retornou. Aguarde alguns segundos e clique em Gerar PIX novamente.'
          )
        }
      }
      return updated
    } catch (e) {
      if (!silent) {
        message.error(e?.message || 'Erro ao gerar PIX. Verifique ASAAS_ENABLED e ASAAS_API_KEY no servidor.')
      }
      return null
    } finally {
      setRefreshingPix(false)
    }
  }, [])

  const handlePayPix = useCallback(
    async (record) => {
      if (!record?.id) return
      setSelectedInvoice(record)
      selectedInvoiceIdRef.current = record.id
      scrollToPixPanel()

      const hasPix = Boolean(record.pixCopyPaste || record.pixQrCodeBase64)
      if (!hasPix) {
        await handleRefreshPix(record.id)
        return
      }
      scrollToPixPanel()
      message.info('Use o QR Code ou copie o código PIX no painel ao lado.')
    },
    [handleRefreshPix, scrollToPixPanel]
  )

  const copyPix = async () => {
    if (!selectedInvoice?.pixCopyPaste) {
      message.warning('Clique em Gerar PIX primeiro.')
      return
    }
    try {
      await navigator.clipboard.writeText(selectedInvoice.pixCopyPaste)
      message.success('Código PIX copiado!')
    } catch {
      message.error('Não foi possível copiar.')
    }
  }

  const afterPaymentCheck = async () => {
    if (!selectedInvoice?.id) return
    try {
      const updated = await subscriptionService.syncInvoiceStatus(selectedInvoice.id)
      setInvoices((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setSelectedInvoice(updated)
      const accessData = await subscriptionService.getSubscriptionAccess()
      setAccess(accessData)
      await refreshUser()
      if (updated.status === 'PAID') {
        message.success('Pagamento confirmado!')
      } else {
        message.info('Pagamento ainda não identificado. Aguarde alguns segundos.')
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao verificar pagamento.')
    }
  }

  const columnsPayable = [
    { title: 'Referência', dataIndex: 'referenceLabel', key: 'referenceLabel' },
    { title: 'Vencimento', dataIndex: 'dueDate', key: 'dueDate', render: formatDate },
    { title: 'Valor', dataIndex: 'amount', key: 'amount', render: formatMoney },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const cfg = STATUS_LABELS[status] || { color: 'default', text: status }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: 'Bloqueia acesso?',
      key: 'blocksAccess',
      render: (_, r) =>
        r.blocksAccess ? <Tag color="error">Sim</Tag> : <Tag color="default">Não</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          loading={refreshingPix && selectedInvoice?.id === record.id}
          onClick={(e) => {
            e.stopPropagation()
            handlePayPix(record)
          }}
        >
          Pagar PIX
        </Button>
      ),
    },
  ]

  const columnsPaid = [
    { title: 'Referência', dataIndex: 'referenceLabel', key: 'referenceLabel' },
    { title: 'Pago em', dataIndex: 'paidAt', key: 'paidAt', render: formatDate },
    { title: 'Valor', dataIndex: 'amount', key: 'amount', render: formatMoney },
    {
      title: 'Status',
      key: 'status',
      render: () => <Tag color="success">Pago</Tag>,
    },
  ]

  const qrSrc = selectedInvoice?.pixQrCodeBase64
    ? `data:image/png;base64,${selectedInvoice.pixQrCodeBase64}`
    : null

  return (
    <>
      {access && !access.accessAllowed && (
        <Alert
          type="error"
          showIcon
          message="Acesso bloqueado — quite as mensalidades em atraso"
          description={access.message || user?.subscriptionBlockMessage}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Mensalidades a pagar" style={{ marginBottom: 16 }}>
            <Table
              rowKey="id"
              loading={loading}
              columns={columnsPayable}
              dataSource={payableInvoices}
              pagination={false}
              locale={{ emptyText: 'Nenhuma mensalidade pendente.' }}
              rowClassName={(record) => {
                if (selectedInvoice?.id === record.id) return 'subscription-row-selected'
                if (record.blocksAccess) return 'subscription-row-blocking'
                return ''
              }}
              onRow={(record) => ({ onClick: () => setSelectedInvoice(record) })}
            />
          </Card>
          {paidInvoices.length > 0 && (
            <Card title="Pagamentos realizados" size="small">
              <Table
                rowKey="id"
                size="small"
                columns={columnsPaid}
                dataSource={paidInvoices}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          )}
        </Col>
        <Col xs={24} lg={10}>
          <div ref={pixPanelRef} className="subscription-pix-panel">
          <Card
            className="subscription-pix-card"
            title={
              <Space>
                <QrcodeOutlined />
                Pagamento via PIX
              </Space>
            }
            extra={
              selectedInvoice &&
              selectedInvoice.status !== 'PAID' && (
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={refreshingPix}
                  disabled={refreshingPix}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRefreshPix(selectedInvoice.id)
                  }}
                >
                  Gerar PIX
                </Button>
              )
            }
          >
            {!selectedInvoice && !loading && (
              <Text type="secondary">Selecione uma mensalidade na lista para pagar.</Text>
            )}
            {selectedInvoice?.status === 'PAID' && (
              <Alert type="success" message="Esta mensalidade já está paga." showIcon />
            )}
            {selectedInvoice &&
              selectedInvoice.status !== 'PAID' &&
              selectedInvoice.status !== 'CANCELLED' && (
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Referência: </Text>
                    <Text>{selectedInvoice.referenceLabel}</Text>
                    <br />
                    <Text strong>Valor: </Text>
                    <Text>{formatMoney(selectedInvoice.amount)}</Text>
                    <br />
                    <Text strong>Vencimento: </Text>
                    <Text>{formatDate(selectedInvoice.dueDate)}</Text>
                  </div>
                  {qrSrc ? (
                    <div className="subscription-qr-wrap">
                      <img src={qrSrc} alt="QR Code PIX" className="subscription-qr" />
                    </div>
                  ) : (
                    <Alert
                      type="info"
                      message="Clique em Gerar PIX para exibir o QR Code e o código copia e cola."
                      showIcon
                    />
                  )}
                  <Input.TextArea
                    readOnly
                    rows={4}
                    value={selectedInvoice.pixCopyPaste || ''}
                    placeholder="Código PIX copia e cola"
                  />
                  {awaitingPayment && (
                    <Alert
                      type="info"
                      showIcon
                      message="Aguardando confirmação do pagamento"
                      description="Após pagar o PIX, o status será atualizado automaticamente em alguns segundos."
                    />
                  )}
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      loading={refreshingPix}
                      onClick={() => handleRefreshPix(selectedInvoice.id)}
                    >
                      Gerar PIX
                    </Button>
                    <Button
                      icon={<CopyOutlined />}
                      onClick={copyPix}
                      disabled={!selectedInvoice.pixCopyPaste}
                    >
                      Copiar PIX
                    </Button>
                    <Button onClick={afterPaymentCheck}>Já paguei — atualizar</Button>
                  </Space>
                </Space>
              )}
          </Card>
          </div>
        </Col>
      </Row>
    </>
  )
}
