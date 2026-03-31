import { useMemo, useState } from 'react'
import { Card, Tabs, Table, Space, Input, Button, message, Tag, Typography, Select, Modal, Upload } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
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
} from '../services/fiscalService'
import { useAuth } from '../contexts/AuthContext'
import RootTenantSelect from '../components/RootTenantSelect'
import { importSaleFromInvoice } from '../services/saleImportService'

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

      // fallback: mostra o conteúdo da linha retornada na listagem
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

  const baseColumns = [
    {
      title: 'Direção',
      dataIndex: 'direction',
      key: 'direction',
      width: 120,
      render: (v) => {
        const raw = fmtValue(v)
        if (raw === 'ISSUED') return <Tag color="blue">EMITIDA</Tag>
        if (raw === 'RECEIVED') return <Tag color="gold">RECEBIDA</Tag>
        return <Tag>{raw}</Tag>
      },
    },
    {
      title: 'Chave',
      dataIndex: 'chave',
      key: 'chave',
      width: 260,
      render: (v, row) => <Text code>{fmtValue(v || row?.chave_acesso || row?.chaveAcesso)}</Text>,
    },
    {
      title: 'Número',
      dataIndex: 'numero',
      key: 'numero',
      width: 110,
      render: (v, row) => fmtValue(v || row?.nfe_numero || row?.nfce_numero || row?.numero_nf || row?.numero_documento),
    },
    {
      title: 'Série',
      dataIndex: 'serie',
      key: 'serie',
      width: 90,
      render: (v) => fmtValue(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (v) => {
        const raw = fmtValue(v)
        const isOk = /autoriz|aprov|sucesso/i.test(raw)
        const isBad = /rejeit|erro|cancel/i.test(raw)
        return <Tag color={isOk ? 'green' : isBad ? 'red' : 'default'}>{raw}</Tag>
      },
    },
    {
      title: 'Referência',
      dataIndex: 'referencia',
      key: 'referencia',
      width: 180,
      render: (v) => fmtValue(v),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space>
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

  const receivedExtraColumns = [
    {
      title: 'NSU',
      dataIndex: 'nsu',
      key: 'nsu',
      width: 100,
      render: (v, row) => fmtValue(v || row?.dist_nsu),
    },
    {
      title: 'Forma',
      dataIndex: 'forma_distribuicao',
      key: 'forma_distribuicao',
      width: 120,
      render: (v) => fmtValue(v),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo_documento',
      key: 'tipo_documento',
      width: 110,
      render: (v) => fmtValue(v),
    },
  ]

  const columns = useMemo(() => {
    if (activeTab === 'nfe-received') return [...receivedExtraColumns, ...baseColumns]
    return baseColumns
  }, [activeTab])

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="Notas Fiscais (Nuvem Fiscal)"
        extra={
          <Space>
            <Button onClick={openImportModal}>Cadastrar venda</Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Atualizar
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setSkip(0)
            setData(null)
            setActiveTab(k)
          }}
          items={[
            { key: 'nfe-all', label: 'Todas NF-e (emitidas + recebidas)' },
            { key: 'nfe-issued', label: 'NF-e emitidas (beneficiária)' },
            { key: 'nfe-received', label: 'NF-e recebidas (a pagar)' },
            { key: 'nfce-issued', label: 'NFC-e emitidas' },
          ]}
        />

        <Space wrap style={{ marginBottom: 12 }}>
          <RootTenantSelect isRoot={Boolean(user?.isRoot)} value={tenantId} onChange={setTenantId} />
          <Input
            style={{ width: 220 }}
            value={String(top)}
            onChange={(e) => setTop(Number(e.target.value || 0) || 20)}
            placeholder="$top (1-100)"
          />
          <Input
            style={{ width: 220 }}
            value={String(skip)}
            onChange={(e) => setSkip(Number(e.target.value || 0) || 0)}
            placeholder="$skip"
          />
          <Select
            style={{ width: 210 }}
            value={String(inlinecount)}
            onChange={(v) => setInlinecount(v === 'true')}
            options={[
              { value: 'true', label: 'Contar total (inlinecount)' },
              { value: 'false', label: 'Sem total' },
            ]}
          />

          {activeTab === 'nfe-received' || activeTab === 'nfe-all' ? (
            <>
              <Input
                style={{ width: 220 }}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Número da nota (ex.: 879.861.681)"
              />
              <Input
                style={{ width: 220 }}
                value={distNsu}
                onChange={(e) => setDistNsu(e.target.value)}
                placeholder="NSU (opcional)"
              />
              <Select
                style={{ width: 220 }}
                value={formaDistribuicao}
                onChange={setFormaDistribuicao}
                options={[
                  { value: 'completa', label: 'Distribuição: completa' },
                  { value: 'resumida', label: 'Distribuição: resumida' },
                ]}
              />
              <Input
                style={{ width: 280 }}
                value={chaveAcesso}
                onChange={(e) => setChaveAcesso(e.target.value)}
                placeholder="Chave de acesso (opcional)"
              />
            </>
          ) : (
            <>
              <Input
                style={{ width: 220 }}
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Número da nota (ex.: 879.861.681)"
              />
              <Input
                style={{ width: 260 }}
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="Referência (opcional)"
              />
              <Input
                style={{ width: 280 }}
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder="Chave (opcional)"
              />
              <Input
                style={{ width: 180 }}
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="Série (opcional)"
              />
            </>
          )}

          <Button type="primary" icon={<SearchOutlined />} onClick={fetchData} loading={loading}>
            Consultar
          </Button>
        </Space>

        <div style={{ marginBottom: 10 }}>
          <Text type="secondary">
            {total != null ? (
              <>
                Total: <Text strong>{total}</Text>
              </>
            ) : (
              'Total: —'
            )}
          </Text>
        </div>

        <Table
          rowKey={(row, idx) => row?.id || row?.chave || row?.chave_acesso || row?.nsu || String(idx)}
          loading={loading}
          columns={columns}
          dataSource={filteredRows}
          pagination={false}
          size="middle"
          scroll={{ x: 980 }}
        />
      </Card>

      <Modal
        open={detailOpen}
        title={detailTitle || 'Detalhes'}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={980}
      >
        {detailLoading ? (
          <div style={{ padding: 12 }}>Carregando…</div>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(detailJson ?? {}, null, 2)}
          </pre>
        )}
      </Modal>

      <Modal
        open={importOpen}
        title="Cadastrar venda a partir de Nota Fiscal"
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="Cadastrar venda"
        confirmLoading={importLoading}
        width={720}
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
            <Button disabled>PDF não suportado</Button>
          </Upload>
          <Upload
            beforeUpload={(file) => {
              setImportXml(file)
              return false
            }}
            maxCount={1}
            accept=".xml,application/xml,text/xml"
          >
            <Button>Selecionar XML (obrigatório para enviar à SEFAZ)</Button>
          </Upload>
          <Upload
            beforeUpload={(file) => {
              setImportJson(file)
              return false
            }}
            maxCount={1}
            accept=".json,application/json,text/json"
          >
            <Button>Selecionar JSON (opcional)</Button>
          </Upload>
          <Text type="secondary">
            Dica: para o MVP, a venda será criada com 1 item “Venda importada de NF-e” no valor total da nota.
          </Text>
        </Space>
      </Modal>
    </div>
  )
}

