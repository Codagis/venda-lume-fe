import { useMemo, useState } from 'react'
import {
  Card,
  Tabs,
  Table,
  Space,
  Input,
  Button,
  message,
  Tag,
  Typography,
  Select,
  Modal,
  Upload,
  Grid,
  Row,
  Col,
  Dropdown,
  Tooltip,
} from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  MoreOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FilterOutlined,
  DownOutlined,
} from '@ant-design/icons'
import './FiscalNotes.css'
import {
  listNfeAll,
  listNfeIssued,
  listNfeReceived,
  listNfceIssued,
  getNfeReceivedById,
  downloadNfeReceivedPdf,
  downloadNfeReceivedXml,
  getNfeIssuedById,
  downloadNfeIssuedPdf,
  downloadNfeIssuedXml,
  getNfceIssuedById,
  downloadNfceIssuedPdf,
  downloadNfceIssuedXml,
} from '../../services/fiscalService'
import { useAuth } from '../../contexts/AuthContext'
import RootTenantSelect from '../../components/RootTenantSelect'
import { importSaleFromInvoice } from '../../services/saleImportService'

const { Text } = Typography

function safeArray(v) {
  if (Array.isArray(v)) return v
  if (v && Array.isArray(v.data)) return v.data
  if (v && Array.isArray(v.items)) return v.items
  return []
}

function getCount(v) {
  if (!v) return null
  if (typeof v['@count'] === 'number') return v['@count']
  if (typeof v.count === 'number') return v.count
  if (typeof v.total === 'number') return v.total
  return null
}

function fmtValue(v) {
  if (v == null) return '-'
  if (typeof v === 'string' && !v.trim()) return '-'
  return String(v)
}

function onlyDigits(v) {
  return (v ?? '').toString().replace(/\D/g, '')
}

function getDocNumberDigits(row) {
  if (!row) return ''
  const raw =
    row.numero ||
    row.nfe_numero ||
    row.nfce_numero ||
    row.numero_nf ||
    row.numero_documento ||
    row.numeroDocumento ||
    row.numeroNota ||
    row.numero_nota
  return onlyDigits(raw)
}

export default function FiscalNotes() {
  const screens = Grid.useBreakpoint()
  const isCompact = screens.sm === false
  const isNarrow = screens.md === false
  const filterGutter = isCompact ? [12, 12] : isNarrow ? [14, 14] : [16, 16]

  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('nfe-all')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTitle, setDetailTitle] = useState('')
  const [detailJson, setDetailJson] = useState(null)

  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importPdf, setImportPdf] = useState(null)
  const [importXml, setImportXml] = useState(null)
  const [importJson, setImportJson] = useState(null)
  const [importNotes, setImportNotes] = useState('')

  const [tenantId, setTenantId] = useState('')
  const [top, setTop] = useState(20)
  const [skip, setSkip] = useState(0)
  const [inlinecount, setInlinecount] = useState(true)

  const [numero, setNumero] = useState('')
  const [ref, setRef] = useState('')
  const [chave, setChave] = useState('')
  const [serie, setSerie] = useState('')

  const [distNsu, setDistNsu] = useState('')
  const [formaDistribuicao, setFormaDistribuicao] = useState('completa')
  const [chaveAcesso, setChaveAcesso] = useState('')
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const rows = useMemo(() => safeArray(data), [data])
  const total = useMemo(() => getCount(data), [data])
  const filteredRows = useMemo(() => {
    const qNum = onlyDigits(numero)
    if (!qNum) return rows
    return rows.filter((r) => getDocNumberDigits(r).includes(qNum))
  }, [rows, numero])

  const effectiveTenantId = user?.isRoot && tenantId.trim() ? tenantId.trim() : undefined

  const saveBlob = async (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const openImportModal = () => {
    setImportPdf(null)
    setImportXml(null)
    setImportJson(null)
    setImportNotes('')
    setImportOpen(true)
  }

  const handleImport = async () => {
    try {
      setImportLoading(true)
      const res = await importSaleFromInvoice({
        tenantId: effectiveTenantId,
        saleType: 'PDV',
        pdf: importPdf,
        xml: importXml,
        json: importJson,
        notes: importNotes,
      })
      if (res?.createdType === 'PAYABLE') {
        message.success(`Conta a pagar criada: ${res?.payable?.description || res?.payable?.id || 'OK'}`)
      } else {
        message.success(`Venda cadastrada: ${res?.sale?.saleNumber || res?.sale?.id || 'OK'}`)
      }
      setImportOpen(false)
    } catch (e) {
      message.error(e?.message || 'Erro ao importar a partir da nota.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleDetails = async (row) => {
    try {
      setDetailOpen(true)
      setDetailLoading(true)
      setDetailJson(null)
      const id = row?.id
      const direction = row?.direction
      const isNfce = activeTab === 'nfce-issued'
      setDetailTitle(`Detalhes da nota${id ? ` (${id})` : ''}`)

      if (direction === 'RECEIVED' && id) {
        const json = await getNfeReceivedById(id, { tenantId: effectiveTenantId })
        setDetailJson(json)
        return
      }

      if (id && isNfce) {
        const json = await getNfceIssuedById(id, { tenantId: effectiveTenantId })
        setDetailJson(json)
        return
      }
      if (id) {
        const json = await getNfeIssuedById(id, { tenantId: effectiveTenantId })
        setDetailJson(json)
        return
      }

      setDetailJson(row || {})
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar detalhes.')
      setDetailJson(row || {})
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDownloadPdf = async (row) => {
    const id = row?.id
    const direction = row?.direction
    const isNfce = activeTab === 'nfce-issued'
    if (!id) {
      message.warning('ID não disponível para download.')
      return
    }
    try {
      if (direction === 'RECEIVED') {
        const blob = await downloadNfeReceivedPdf(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfe-recebida-${id}.pdf`)
        return
      }
      if (isNfce) {
        const blob = await downloadNfceIssuedPdf(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfce-${id}.pdf`)
        return
      }
      const blob = await downloadNfeIssuedPdf(id, { tenantId: effectiveTenantId })
      await saveBlob(blob, `nfe-${id}.pdf`)
    } catch (e) {
      message.error(e?.message || 'Erro ao baixar PDF.')
    }
  }

  const handleDownloadXml = async (row) => {
    const id = row?.id
    const direction = row?.direction
    const isNfce = activeTab === 'nfce-issued'
    if (!id) {
      message.warning('ID não disponível para download.')
      return
    }
    try {
      if (direction === 'RECEIVED') {
        const blob = await downloadNfeReceivedXml(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfe-recebida-${id}.xml`)
        return
      }
      if (isNfce) {
        const blob = await downloadNfceIssuedXml(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfce-${id}.xml`)
        return
      }
      const blob = await downloadNfeIssuedXml(id, { tenantId: effectiveTenantId })
      await saveBlob(blob, `nfe-${id}.xml`)
    } catch (e) {
      message.error(e?.message || 'Erro ao baixar XML.')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      let res
      if (activeTab === 'nfe-all') {
        res = await listNfeAll({
          tenantId: effectiveTenantId,
          top,
          skip,
          inlinecount,
          referencia: ref,
          chave,
          serie,
          distNsu: distNsu ? Number(distNsu) : undefined,
          formaDistribuicao,
          chaveAcesso,
        })
      } else if (activeTab === 'nfe-issued') {
        res = await listNfeIssued({
          tenantId: effectiveTenantId,
          top,
          skip,
          inlinecount,
          referencia: ref,
          chave,
          serie,
        })
      } else if (activeTab === 'nfe-received') {
        res = await listNfeReceived({
          tenantId: effectiveTenantId,
          top,
          skip,
          inlinecount,
          distNsu: distNsu ? Number(distNsu) : undefined,
          formaDistribuicao,
          chaveAcesso,
        })
      } else {
        res = await listNfceIssued({
          tenantId: effectiveTenantId,
          top,
          skip,
          inlinecount,
          referencia: ref,
          chave,
          serie,
        })
      }
      setData(res)
    } catch (e) {
      message.error(e?.message || 'Erro ao consultar notas fiscais.')
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(() => {
    const receivedExtraColumns = [
      {
        title: 'NSU',
        dataIndex: 'nsu',
        key: 'nsu',
        width: isCompact ? 88 : 100,
        responsive: isCompact ? ['sm'] : undefined,
        render: (v, row) => fmtValue(v || row?.dist_nsu),
      },
      {
        title: 'Forma',
        dataIndex: 'forma_distribuicao',
        key: 'forma_distribuicao',
        width: isCompact ? 100 : 120,
        responsive: isCompact ? ['md'] : undefined,
        render: (v) => fmtValue(v),
      },
      {
        title: 'Tipo',
        dataIndex: 'tipo_documento',
        key: 'tipo_documento',
        width: isCompact ? 96 : 110,
        responsive: isCompact ? ['md'] : undefined,
        render: (v) => fmtValue(v),
      },
    ]

    const baseColumns = [
      {
        title: 'Direção',
        dataIndex: 'direction',
        key: 'direction',
        width: isCompact ? 88 : 120,
        render: (v) => {
          const raw = fmtValue(v)
          if (raw === 'ISSUED') {
            return (
              <Tag color="blue" className="fiscal-notes-dir-tag">
                {isCompact ? 'Emit.' : 'EMITIDA'}
              </Tag>
            )
          }
          if (raw === 'RECEIVED') {
            return (
              <Tag color="gold" className="fiscal-notes-dir-tag">
                {isCompact ? 'Rec.' : 'RECEBIDA'}
              </Tag>
            )
          }
          return <Tag className="fiscal-notes-dir-tag">{raw}</Tag>
        },
      },
      {
        title: 'Chave',
        dataIndex: 'chave',
        key: 'chave',
        width: isCompact ? 200 : 260,
        ellipsis: true,
        responsive: isCompact ? ['md'] : undefined,
        render: (v, row) => <Text code>{fmtValue(v || row?.chave_acesso || row?.chaveAcesso)}</Text>,
      },
      {
        title: 'Número',
        dataIndex: 'numero',
        key: 'numero',
        width: isCompact ? 100 : 110,
        render: (v, row) => fmtValue(v || row?.nfe_numero || row?.nfce_numero || row?.numero_nf || row?.numero_documento),
      },
      {
        title: 'Série',
        dataIndex: 'serie',
        key: 'serie',
        width: isCompact ? 72 : 90,
        responsive: isCompact ? ['sm'] : undefined,
        render: (v) => fmtValue(v),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: isCompact ? 108 : 140,
        render: (v) => {
          const raw = fmtValue(v)
          const isOk = /autoriz|aprov|sucesso/i.test(raw)
          const isBad = /rejeit|erro|cancel/i.test(raw)
          const tag = <Tag color={isOk ? 'green' : isBad ? 'red' : 'default'} className="fiscal-notes-status-tag">{raw}</Tag>
          if (isCompact && raw.length > 14) {
            return <Tooltip title={raw}>{tag}</Tooltip>
          }
          return tag
        },
      },
      {
        title: 'Referência',
        dataIndex: 'referencia',
        key: 'referencia',
        width: isCompact ? 140 : 180,
        ellipsis: true,
        responsive: isCompact ? ['lg'] : undefined,
        render: (v) => fmtValue(v),
      },
      {
        title: 'Ações',
        key: 'actions',
        width: isCompact ? 52 : 220,
        align: 'center',
        ...(isCompact ? {} : { fixed: 'right' }),
        render: (_, row) =>
          isCompact ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'details',
                    label: 'Detalhes',
                    icon: <EyeOutlined />,
                    onClick: () => handleDetails(row),
                  },
                  {
                    key: 'pdf',
                    label: 'Baixar PDF',
                    icon: <FilePdfOutlined />,
                    onClick: () => handleDownloadPdf(row),
                  },
                  {
                    key: 'xml',
                    label: 'Baixar XML',
                    icon: <FileTextOutlined />,
                    onClick: () => handleDownloadXml(row),
                  },
                ],
              }}
              trigger={['click']}
              placement="bottomRight"
            >
              <Button type="default" size="small" icon={<MoreOutlined />} aria-label="Ações da nota" className="fiscal-notes-row-actions-btn" />
            </Dropdown>
          ) : (
            <Space size={8} wrap>
              <Button size="small" onClick={() => handleDetails(row)}>
                Detalhes
              </Button>
              <Button size="small" onClick={() => handleDownloadPdf(row)}>
                PDF
              </Button>
              <Button size="small" onClick={() => handleDownloadXml(row)}>
                XML
              </Button>
            </Space>
          ),
      },
    ]

    if (activeTab === 'nfe-received') return [...receivedExtraColumns, ...baseColumns]
    return baseColumns
  }, [activeTab, isCompact, effectiveTenantId])

  const detailModalWidth = isCompact ? 'min(100%, calc(100vw - 24px))' : 980
  const importModalWidth = isCompact ? '100%' : 720
  const showAdvancedFilters = !isCompact || filtersExpanded

  const tabItems = useMemo(
    () => [
      { key: 'nfe-all', label: isCompact ? 'Todas' : 'Todas NF-e (emitidas + recebidas)' },
      { key: 'nfe-issued', label: isCompact ? 'NF-e em.' : 'NF-e emitidas (beneficiária)' },
      { key: 'nfe-received', label: isCompact ? 'NF-e rec.' : 'NF-e recebidas (a pagar)' },
      { key: 'nfce-issued', label: isCompact ? 'NFC-e' : 'NFC-e emitidas' },
    ],
    [isCompact]
  )

  return (
    <div className={`fiscal-notes-page${isCompact ? ' fiscal-notes-page--compact' : ''}`}>
      <main className="fiscal-notes-main">
        <Card
          className="fiscal-notes-card"
          title={isCompact ? 'Notas fiscais' : 'Notas Fiscais (Nuvem Fiscal)'}
          extra={
            <Space direction={isCompact ? 'vertical' : 'horizontal'} size={isCompact ? 8 : 12} className="fiscal-notes-card-extra">
              <Button onClick={openImportModal} block={isCompact} className={isCompact ? 'fiscal-notes-header-btn' : undefined}>
                {isCompact ? 'Importar venda' : 'Cadastrar venda'}
              </Button>
              <Button type="primary" icon={<ReloadOutlined />} onClick={fetchData} loading={loading} block={isCompact} className="fiscal-notes-header-btn fiscal-notes-header-btn--primary">
                Atualizar
              </Button>
            </Space>
          }
        >
          {isCompact && (
            <p className="fiscal-notes-mobile-hint">Nuvem Fiscal · Toque em uma linha ou em ⋮ para detalhes e downloads.</p>
          )}
          <Tabs
            activeKey={activeTab}
            onChange={(k) => {
              setSkip(0)
              setData(null)
              setActiveTab(k)
            }}
            size={isCompact ? 'small' : 'middle'}
            className="fiscal-notes-tabs"
            tabBarGutter={isCompact ? 6 : 24}
            items={tabItems}
          />

          {isCompact && (
            <Button
              type="button"
              className={`fiscal-notes-filters-toggle vl-filters-toggle-btn${filtersExpanded ? ' vl-filters-toggle-btn--open' : ''}`}
              icon={<FilterOutlined />}
              onClick={() => setFiltersExpanded((v) => !v)}
              block
              aria-expanded={filtersExpanded}
            >
              <span className="vl-filters-toggle-label">
                {filtersExpanded ? 'Ocultar filtros da consulta' : 'Filtros da consulta (top, chave, NSU…)'}
              </span>
              <DownOutlined className="vl-filters-chevron" aria-hidden />
            </Button>
          )}

          <Row gutter={filterGutter} className="fiscal-notes-filters">
            {Boolean(user?.isRoot) && (
              <Col xs={24} sm={12} lg={8}>
                <label className="fiscal-notes-filter-label">Empresa</label>
                <RootTenantSelect
                  isRoot={Boolean(user?.isRoot)}
                  value={tenantId}
                  onChange={setTenantId}
                  style={{ width: '100%', maxWidth: isCompact ? '100%' : 520 }}
                />
              </Col>
            )}

            <Col xs={24} sm={12} lg={isCompact ? 24 : 6}>
              <label className="fiscal-notes-filter-label">Número da nota</label>
              <Input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Filtra na lista · ex.: 879861681"
                allowClear
              />
              {isCompact && (
                <span className="fiscal-notes-filter-hint">Só afeta as notas já carregadas abaixo.</span>
              )}
            </Col>

            {showAdvancedFilters && (
              <>
                <Col xs={24} sm={12} lg={4}>
                  <label className="fiscal-notes-filter-label">$top</label>
                  <Input
                    value={String(top)}
                    onChange={(e) => setTop(Number(e.target.value || 0) || 20)}
                    placeholder="1-100"
                    inputMode="numeric"
                  />
                </Col>
                <Col xs={24} sm={12} lg={4}>
                  <label className="fiscal-notes-filter-label">$skip</label>
                  <Input
                    value={String(skip)}
                    onChange={(e) => setSkip(Number(e.target.value || 0) || 0)}
                    placeholder="0"
                    inputMode="numeric"
                  />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                  <label className="fiscal-notes-filter-label">Contagem</label>
                  <Select
                    value={String(inlinecount)}
                    onChange={(v) => setInlinecount(v === 'true')}
                    options={[
                      { value: 'true', label: isCompact ? 'Com total' : 'Contar total (inlinecount)' },
                      { value: 'false', label: isCompact ? 'Sem total' : 'Sem total' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>

                {activeTab === 'nfe-received' || activeTab === 'nfe-all' ? (
                  <>
                    <Col xs={24} sm={12} lg={6}>
                      <label className="fiscal-notes-filter-label">NSU</label>
                      <Input
                        value={distNsu}
                        onChange={(e) => setDistNsu(e.target.value)}
                        placeholder="Opcional"
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                      <label className="fiscal-notes-filter-label">Distribuição</label>
                      <Select
                        value={formaDistribuicao}
                        onChange={setFormaDistribuicao}
                        options={[
                          { value: 'completa', label: 'Completa' },
                          { value: 'resumida', label: 'Resumida' },
                        ]}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col xs={24} sm={24} lg={10}>
                      <label className="fiscal-notes-filter-label">Chave de acesso</label>
                      <Input
                        value={chaveAcesso}
                        onChange={(e) => setChaveAcesso(e.target.value)}
                        placeholder="Opcional"
                      />
                    </Col>
                  </>
                ) : (
                  <>
                    <Col xs={24} sm={12} lg={8}>
                      <label className="fiscal-notes-filter-label">Referência</label>
                      <Input
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        placeholder="Opcional"
                      />
                    </Col>
                    <Col xs={24} sm={24} lg={10}>
                      <label className="fiscal-notes-filter-label">Chave</label>
                      <Input
                        value={chave}
                        onChange={(e) => setChave(e.target.value)}
                        placeholder="Opcional"
                      />
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                      <label className="fiscal-notes-filter-label">Série</label>
                      <Input
                        value={serie}
                        onChange={(e) => setSerie(e.target.value)}
                        placeholder="Opcional"
                      />
                    </Col>
                  </>
                )}
              </>
            )}

            <Col xs={24} className="fiscal-notes-filter-actions">
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={fetchData}
                loading={loading}
                block={isCompact}
                size={isCompact ? 'large' : 'middle'}
                className="fiscal-notes-consult-btn"
              >
                Consultar
              </Button>
            </Col>
          </Row>

          <div className={`fiscal-notes-total${isCompact ? ' fiscal-notes-total--compact' : ''}`}>
            <Text type="secondary">
              {total != null ? (
                <>
                  {isCompact ? 'Registros: ' : 'Total: '}
                  <Text strong>{total}</Text>
                  {isCompact && filteredRows.length !== rows.length && (
                    <span className="fiscal-notes-total-filtered"> · exibindo {filteredRows.length}</span>
                  )}
                </>
              ) : (
                'Total: —'
              )}
            </Text>
          </div>

          {!loading && data != null && filteredRows.length === 0 && (
            <div className="fiscal-notes-empty" role="status">
              Nenhuma nota nesta consulta. Ajuste os filtros ou toque em Consultar.
            </div>
          )}

          <Table
            rowKey={(row, idx) => row?.id || row?.chave || row?.chave_acesso || row?.nsu || String(idx)}
            loading={loading}
            columns={columns}
            dataSource={filteredRows}
            pagination={false}
            size={isCompact ? 'small' : 'middle'}
            scroll={{ x: isCompact ? (activeTab === 'nfe-received' ? 540 : 440) : 1280 }}
            className="fiscal-notes-table"
          />
        </Card>
      </main>

      <Modal
        open={detailOpen}
        title={detailTitle || 'Detalhes'}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)} block={isCompact} type="primary">
            Fechar
          </Button>,
        ]}
        width={detailModalWidth}
        centered
        className="fiscal-notes-detail-modal"
        wrapClassName="fiscal-notes-detail-modal-wrap"
        styles={
          isCompact
            ? {
                content: {
                  borderRadius: 12,
                  margin: '0 auto',
                  maxWidth: 'calc(100vw - 24px)',
                },
                body: {
                  maxHeight: 'min(72dvh, calc(100dvh - 220px))',
                  overflow: 'auto',
                  padding: '12px 14px',
                  paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
                },
                header: { padding: '12px 14px', margin: 0 },
                footer: {
                  padding: '12px 14px',
                  paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
                },
              }
            : {
                content: { margin: '0 auto' },
                body: { maxHeight: '70vh', overflow: 'auto' },
              }
        }
      >
        {detailLoading ? (
          <div className="fiscal-notes-detail-loading">Carregando…</div>
        ) : (
          <pre className="fiscal-notes-detail-pre">
            {JSON.stringify(detailJson ?? {}, null, 2)}
          </pre>
        )}
      </Modal>

      <Modal
        open={importOpen}
        title={isCompact ? 'Importar venda (NF)' : 'Cadastrar venda a partir de Nota Fiscal'}
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="Cadastrar venda"
        confirmLoading={importLoading}
        width={importModalWidth}
        centered={!isCompact}
        wrapClassName={isCompact ? 'fiscal-notes-modal-wrap--mobile' : undefined}
        className="fiscal-notes-import-modal"
        styles={
          isCompact
            ? {
                content: { margin: 0, maxWidth: '100vw' },
                body: { paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' },
                footer: { paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' },
              }
            : undefined
        }
        okButtonProps={{ block: isCompact, size: isCompact ? 'large' : 'middle' }}
        cancelButtonProps={{ block: isCompact }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <Input value={importNotes} onChange={(e) => setImportNotes(e.target.value)} placeholder="Observações (opcional)" />
          <Upload
            beforeUpload={(file) => {
              setImportPdf(file)
              return false
            }}
            maxCount={1}
            accept="application/pdf"
          >
            <Button block={isCompact}>Selecionar PDF (opcional)</Button>
          </Upload>
          <Upload
            beforeUpload={(file) => {
              setImportXml(file)
              return false
            }}
            maxCount={1}
            accept=".xml,application/xml,text/xml"
          >
            <Button block={isCompact}>Selecionar XML (obrigatório para enviar à SEFAZ)</Button>
          </Upload>
          <Upload
            beforeUpload={(file) => {
              setImportJson(file)
              return false
            }}
            maxCount={1}
            accept=".json,application/json,text/json"
          >
            <Button block={isCompact}>Selecionar JSON (opcional)</Button>
          </Upload>
          <Text type="secondary" className="fiscal-notes-import-hint">
            Dica: para o MVP, a venda será criada com 1 item “Venda importada de NF-e” no valor total da nota.
          </Text>
        </Space>
      </Modal>
    </div>
  )
}

