import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Select,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
  Popconfirm,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons'
import * as subscriptionService from '../../services/subscriptionService'
import { formatDate, formatMoney, STATUS_LABELS } from './subscriptionUtils'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'PAID', label: 'Pagos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'OVERDUE', label: 'Em atraso' },
]

export default function SubscriptionRootView() {
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dashboard, setDashboard] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await subscriptionService.getAdminSubscriptionDashboard(
        statusFilter || undefined
      )
      setDashboard(data)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar mensalidades.')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const summary = dashboard?.summary
  const paidByTenant = dashboard?.paidByTenant ?? []
  const paidByMonth = dashboard?.paidByMonth ?? []
  const invoices = dashboard?.invoices ?? []

  const handleCancel = useCallback(
    async (invoiceId) => {
      try {
        await subscriptionService.cancelAdminInvoice(invoiceId)
        message.success('Fatura isenta.')
        load()
      } catch (e) {
        message.error(e?.message || 'Erro ao cancelar fatura.')
      }
    },
    [load]
  )

  const tenantColumns = useMemo(
    () => [
      {
        title: 'Empresa',
        key: 'tenant',
        render: (_, r) => (
          <div>
            <div style={{ fontWeight: 500 }}>{r.tenantTradeName || r.tenantName}</div>
            {r.tenantDocument && (
              <div style={{ fontSize: 12, color: 'var(--ant-color-text-secondary)' }}>
                {r.tenantDocument}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Mensalidades pagas',
        key: 'paid',
        render: (_, r) => (
          <span>
            {r.paidInvoicesCount} — <strong>{formatMoney(r.paidAmountTotal)}</strong>
          </span>
        ),
      },
      {
        title: 'Em aberto',
        key: 'open',
        render: (_, r) => (
          <span>
            {r.openInvoicesCount} — {formatMoney(r.openAmountTotal)}
          </span>
        ),
      },
      {
        title: 'Acesso',
        key: 'access',
        render: (_, r) =>
          r.companyAccessBlocked ? (
            <Tag color="error" icon={<StopOutlined />}>
              Bloqueada
            </Tag>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Liberada
            </Tag>
          ),
      },
    ],
    []
  )

  const monthColumns = useMemo(
    () => [
      { title: 'Mês', dataIndex: 'referenceLabel', key: 'referenceLabel' },
      {
        title: 'Total pago no mês',
        key: 'paid',
        render: (_, r) => (
          <span>
            {r.paidInvoicesCount} pagamento(s) — <strong>{formatMoney(r.paidAmountTotal)}</strong>
          </span>
        ),
      },
      {
        title: 'Em aberto no mês',
        key: 'open',
        render: (_, r) => (
          <span>
            {r.openInvoicesCount} fatura(s) — {formatMoney(r.openAmountTotal)}
          </span>
        ),
      },
    ],
    []
  )

  const invoiceColumns = useMemo(
    () => [
      {
        title: 'Empresa',
        key: 'tenant',
        render: (_, r) => r.tenantTradeName || r.tenantName,
      },
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
      { title: 'Pago em', dataIndex: 'paidAt', key: 'paidAt', render: (v) => (v ? formatDate(v) : '-') },
      {
        title: '',
        key: 'cancel',
        render: (_, r) =>
          r.status !== 'PAID' && r.status !== 'CANCELLED' ? (
            <Popconfirm title="Isentar esta fatura?" onConfirm={() => handleCancel(r.id)}>
              <Button type="link" size="small" danger>
                Isentar
              </Button>
            </Popconfirm>
          ) : null,
      },
    ],
    [handleCancel]
  )

  const tabItems = [
    {
      key: 'by-tenant',
      label: 'Por empresa',
      children: (
        <Table
          rowKey="tenantId"
          columns={tenantColumns}
          dataSource={paidByTenant}
          loading={loading}
          pagination={{ pageSize: 12 }}
          locale={{ emptyText: 'Nenhuma empresa com cobrança ativa.' }}
        />
      ),
    },
    {
      key: 'by-month',
      label: 'Total por mês',
      children: (
        <Table
          rowKey={(r) => `${r.referenceYear}-${r.referenceMonth}`}
          columns={monthColumns}
          dataSource={paidByMonth}
          loading={loading}
          pagination={{ pageSize: 12 }}
          locale={{ emptyText: 'Sem dados por mês.' }}
        />
      ),
    },
    {
      key: 'invoices',
      label: 'Todas as faturas',
      children: (
        <>
          <div style={{ marginBottom: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
              style={{ minWidth: 200 }}
            />
          </div>
          <Table
            rowKey="id"
            columns={invoiceColumns}
            dataSource={invoices}
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            scroll={{ x: 800 }}
          />
        </>
      ),
    },
  ]

  return (
    <div className="subscription-root-view">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Visão administrativa (root)"
        description="Acompanhe mensalidades pagas por empresa, totais por mês e todas as faturas do sistema."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Total recebido (pagas)"
              value={formatMoney(summary?.paidAmountTotal)}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Pagamentos confirmados"
              value={summary?.paidCount ?? 0}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Pendentes"
              value={summary?.pendingCount ?? 0}
              prefix={<ClockCircleOutlined />}
              suffix={
                <span style={{ fontSize: 12 }}>{formatMoney(summary?.pendingAmountTotal)}</span>
              }
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Em atraso"
              value={summary?.overdueCount ?? 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              suffix={
                <span style={{ fontSize: 12 }}>{formatMoney(summary?.overdueAmountTotal)}</span>
              }
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Atualizar
        </Button>
      </div>

      <Tabs items={tabItems} />
    </div>
  )
}
