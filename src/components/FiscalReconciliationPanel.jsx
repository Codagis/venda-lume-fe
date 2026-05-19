import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import { Alert, Button, Card, Col, DatePicker, Row, Space, Table, Tag, Typography, message } from 'antd'
import { AuditOutlined } from '@ant-design/icons'
import { runFiscalReconciliation } from '../services/fiscalService'
import './FiscalReconciliationPanel.css'

const { Text } = Typography

const ISSUE_TYPE_LABELS = {
  SALE_WITHOUT_INVOICE: 'Venda sem nota',
  INVOICE_WITHOUT_SALE: 'Nota sem venda',
  AMOUNT_MISMATCH: 'Divergência de valor',
  SUSPICIOUS_CANCELLATION: 'Cancelamento suspeito',
  FISCAL_GAP: 'Quebra fiscal',
}

function alertType(severity) {
  if (severity === 'error') return 'error'
  if (severity === 'success') return 'success'
  return 'warning'
}

function formatMoney(v) {
  if (v == null) return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function FiscalReconciliationPanel({ tenantId, isCompact }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day'))
  const [endDate, setEndDate] = useState(dayjs())

  const runReconciliation = useCallback(async () => {
    if (!startDate || !endDate) {
      message.warning('Selecione a data inicial e a data final.')
      return
    }
    if (startDate.isAfter(endDate, 'day')) {
      message.warning('A data inicial não pode ser posterior à data final.')
      return
    }
    setLoading(true)
    try {
      const data = await runFiscalReconciliation({
        tenantId,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        includeNfe: true,
      })
      setResult(data)
      if (data?.totalIssues === 0) {
        message.success('Conciliação concluída sem divergências.')
      } else {
        message.warning(`Conciliação encontrou ${data.totalIssues} divergência(s).`)
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao executar conciliação fiscal.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, tenantId])

  const issueColumns = [
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 140,
      render: (t) => <Tag>{ISSUE_TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Gravidade',
      dataIndex: 'severity',
      key: 'severity',
      width: 88,
      render: (s) => (
        <Tag color={s === 'error' ? 'red' : s === 'success' ? 'green' : 'gold'}>
          {s === 'error' ? 'Alta' : s === 'success' ? 'OK' : 'Média'}
        </Tag>
      ),
    },
    {
      title: 'Descrição',
      key: 'desc',
      render: (_, r) => (
        <div className="fiscal-recon-issue-desc">
          <Text strong className="fiscal-recon-issue-message">
            {r.message}
          </Text>
          {r.detail && (
            <Text type="secondary" className="fiscal-recon-issue-detail">
              {r.detail}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Venda / Nota',
      key: 'refs',
      width: 130,
      render: (_, r) => (
        <div className="fiscal-recon-refs">
          {r.saleNumber && <span>Venda: {r.saleNumber}</span>}
          {r.invoiceNumber && <span>Nota: {r.invoiceNumber}</span>}
          {!r.saleNumber && !r.invoiceNumber && '—'}
        </div>
      ),
    },
    {
      title: 'Valores',
      key: 'amounts',
      width: 180,
      align: 'right',
      render: (_, r) => {
        if (r.saleAmount == null && r.invoiceAmount == null) return '—'
        return (
          <span className="fiscal-recon-amounts">
            {r.saleAmount != null && <span>Venda: {formatMoney(r.saleAmount)}</span>}
            {r.invoiceAmount != null && <span>Nota: {formatMoney(r.invoiceAmount)}</span>}
          </span>
        )
      },
    },
  ]

  return (
    <Card className="fiscal-recon-card" size="small">
      <div className="fiscal-recon-head">
        <div className="fiscal-recon-head-title">
          <AuditOutlined className="fiscal-recon-head-icon" />
          <div>
            <Text strong>Conciliador fiscal automático</Text>
            <div>
              <Text type="secondary" className="fiscal-recon-head-sub">
                Cruza vendas do sistema com NFC-e/NF-e emitidas e aponta divergências.
              </Text>
            </div>
          </div>
        </div>
        <div className="fiscal-recon-actions">
          <div className={`fiscal-recon-dates${isCompact ? ' fiscal-recon-dates--stack' : ''}`}>
            <div className="fiscal-recon-date-field">
              <label className="fiscal-recon-date-label">Data inicial</label>
              <DatePicker
                value={startDate}
                onChange={(d) => {
                  const next = d || dayjs().subtract(30, 'day')
                  setStartDate(next)
                  if (endDate && next.isAfter(endDate, 'day')) setEndDate(next)
                }}
                disabledDate={(d) => (endDate ? d.isAfter(endDate, 'day') : false)}
                format="DD/MM/YYYY"
                allowClear={false}
                style={{ width: '100%' }}
                inputReadOnly={isCompact}
              />
            </div>
            <div className="fiscal-recon-date-field">
              <label className="fiscal-recon-date-label">Data final</label>
              <DatePicker
                value={endDate}
                onChange={(d) => {
                  const next = d || dayjs()
                  setEndDate(next)
                  if (startDate && next.isBefore(startDate, 'day')) setStartDate(next)
                }}
                disabledDate={(d) => (startDate ? d.isBefore(startDate, 'day') : false)}
                format="DD/MM/YYYY"
                allowClear={false}
                style={{ width: '100%' }}
                inputReadOnly={isCompact}
              />
            </div>
          </div>
          <Button
            type="primary"
            icon={<AuditOutlined />}
            loading={loading}
            onClick={runReconciliation}
            block={isCompact}
            className="fiscal-recon-run-btn"
          >
            Conciliar agora
          </Button>
        </div>
      </div>

      {result?.fiscalApiWarning && (
        <Alert type="info" showIcon message={result.fiscalApiWarning} style={{ marginTop: 12 }} />
      )}

      {result && (
        <div className="fiscal-recon-body">
          <Row gutter={[12, 12]} className="fiscal-recon-stats">
            <Col xs={12} sm={6}>
              <div className="fiscal-recon-stat">
                <span className="fiscal-recon-stat-label">Período</span>
                <span className="fiscal-recon-stat-value">{result.periodo}</span>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="fiscal-recon-stat">
                <span className="fiscal-recon-stat-label">Vendas analisadas</span>
                <span className="fiscal-recon-stat-value">{result.salesAnalyzed ?? 0}</span>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="fiscal-recon-stat">
                <span className="fiscal-recon-stat-label">Notas analisadas</span>
                <span className="fiscal-recon-stat-value">{result.invoicesAnalyzed ?? 0}</span>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="fiscal-recon-stat fiscal-recon-stat--highlight">
                <span className="fiscal-recon-stat-label">Divergências</span>
                <span className="fiscal-recon-stat-value">{result.totalIssues ?? 0}</span>
              </div>
            </Col>
          </Row>

          {result.alerts?.length > 0 && (
            <div className="fiscal-recon-alerts">
              {result.alerts.map((a, i) => (
                <Alert
                  key={`${a.type || 'alert'}-${i}`}
                  type={alertType(a.severity)}
                  showIcon
                  message={a.message}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          )}

          {result.issues?.length > 0 && (
            <div className="fiscal-recon-table-wrap">
              <Table
                rowKey={(r, i) => `${r.type}-${r.saleId || r.invoiceKey || i}`}
                size="small"
                columns={issueColumns}
                dataSource={result.issues}
                pagination={{
                  pageSize: 25,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '25', '50', '100'],
                  showTotal: (total) => `${total} divergência(s)`,
                  simple: isCompact,
                }}
                scroll={{ x: 900 }}
                className="fiscal-recon-table"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
