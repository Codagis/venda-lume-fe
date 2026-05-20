import { useMemo, useState, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  Card,
  Table,
  Space,
  Input,
  Button,
  message,
  Tag,
  Typography,
  Modal,
  Upload,
  Grid,
  Row,
  Col,
  Dropdown,
  Tooltip,
  Alert,
  Descriptions,
  Collapse,
  Divider,
  Spin,
  DatePicker,
} from 'antd'
import {
  ReloadOutlined,
  SearchOutlined,
  MoreOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  ExportOutlined,
  InboxOutlined,
  ShoppingCartOutlined,
  FormOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import './FiscalNotes.css'
import {
  listNfeIssued,
  listNfeReceived,
  syncNfeReceived,
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
  getFiscalNfeIssuedTaxes,
  getFiscalNfeReceivedTaxes,
  getFiscalNfceIssuedTaxes,
} from '../../services/fiscalService'
import FiscalReconciliationPanel from '../../components/FiscalReconciliationPanel'
import ManualNfeEmitPanel from '../../components/ManualNfeEmitPanel'
import { useAuth } from '../../contexts/AuthContext'
import RootTenantSelect from '../../components/RootTenantSelect'
import { importSaleFromInvoice } from '../../services/saleImportService'

const { Text, Title } = Typography

const FISCAL_VIEWS = [
  {
    key: 'nfe-issued',
    label: 'NF-e emitidas',
    badge: 'Emitente',
    description: 'Notas que sua empresa emitiu (você é o fornecedor).',
    icon: ExportOutlined,
  },
  {
    key: 'nfe-received',
    label: 'NF-e recebidas',
    badge: 'Destinatário',
    description: 'Notas que outros emitiram para o CNPJ da sua empresa (você paga). Vindas da SEFAZ via distribuição DF-e.',
    icon: InboxOutlined,
  },
  {
    key: 'nfce-issued',
    label: 'NFC-e emitidas',
    badge: 'Cupom',
    description: 'Notas fiscais de consumidor emitidas no PDV ou vendas.',
    icon: ShoppingCartOutlined,
  },
  {
    key: 'nfe-manual',
    label: 'Emitir NF-e',
    badge: 'Manual',
    description: 'Preencha destinatário e itens (como no XML) e envie para autorização na SEFAZ.',
    icon: FormOutlined,
  },
]

function pickAntdFile(file) {
  if (!file) return null
  const raw = file instanceof File ? file : file.originFileObj
  if (raw instanceof Blob && raw.size > 0) return raw
  return null
}

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

function emissionFromChave(row) {
  const chave = row?.chave || row?.chave_acesso || row?.chaveAcesso
  const digits = (chave ?? '').toString().replace(/\D/g, '')
  if (digits.length < 6) return null
  const yy = Number(digits.slice(2, 4))
  const mm = Number(digits.slice(4, 6))
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null
  return dayjs(`${2000 + yy}-${String(mm).padStart(2, '0')}-01`)
}

function getEmissionResult(data) {
  if (!data) return null
  if (data.emissionResult && typeof data.emissionResult === 'object') return data.emissionResult
  if (data.nfeEmission?.emissionResult) return data.nfeEmission.emissionResult
  if (data.status || data.autorizacao) return data
  return null
}

function describeFiscalStatus(data) {
  const doc = getEmissionResult(data) || data
  if (!doc) return null
  const auth = doc.autorizacao || {}
  const status = String(doc.status || auth.status || '').trim()
  const codigo = auth.codigo_status ?? doc.codigo_status
  const motivo = auth.motivo_status || doc.motivo_status || doc.mensagem
  const chave = doc.chave || auth.chave_acesso || doc.chave_acesso
  const isRejected = /rejeit/i.test(status)
  const isOk = /autoriz|aprov|registrad/i.test(status)
  return { status, codigo, motivo, chave, auth, doc, isRejected, isOk }
}

function formatEmissionDate(row, compact) {
  const iso =
    row?.data_emissao ||
    row?.dataEmissao ||
    row?.dhEmi ||
    row?.autorizacao?.data_evento ||
    row?.data_evento
  if (iso) {
    const d = dayjs(iso)
    if (d.isValid()) {
      return compact ? d.format('DD/MM/YY HH:mm') : d.format('DD/MM/YYYY HH:mm')
    }
  }
  const fromChave = emissionFromChave(row)
  if (fromChave?.isValid()) {
    return fromChave.format(compact ? 'MM/YY' : 'MM/YYYY')
  }
  return '-'
}

function onlyDigits(v) {
  return (v ?? '').toString().replace(/\D/g, '')
}

function formatMoney(v) {
  if (v == null || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return fmtValue(v)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function isNoteAuthorized(row) {
  const fiscal = describeFiscalStatus(row)
  if (fiscal?.isOk) return true
  return /autoriz|aprovado|registrad/i.test(String(row?.status || ''))
}

function pickDisplayTaxTotal(taxes) {
  if (!taxes) return null
  const n = Number(taxes.displayTotal ?? taxes.totalHighlighted ?? taxes.approximate ?? 0)
  return Number.isFinite(n) ? n : null
}

async function fetchTaxesForRow(row, activeView, tenantId) {
  const id = row?.id
  if (!id || !isNoteAuthorized(row)) return null
  const params = { tenantId }
  if (activeView === 'nfe-received') return getFiscalNfeReceivedTaxes(id, params)
  if (activeView === 'nfce-issued') return getFiscalNfceIssuedTaxes(id, params)
  return getFiscalNfeIssuedTaxes(id, params)
}

function formatDoc(doc) {
  const d = onlyDigits(doc)
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return doc ? String(doc) : '-'
}

function getEmitenteLabel(row) {
  const name = row?.emitente_nome_razao_social || row?.emitenteNome || row?.xNomeEmitente
  const doc = row?.emitente_cpf_cnpj || row?.emitenteCpfCnpj
  if (!name && !doc) return '-'
  return (
    <span className="fiscal-notes-emit-cell">
      <span className="fiscal-notes-emit-name">{fmtValue(name)}</span>
      {doc && <span className="fiscal-notes-emit-doc">{formatDoc(doc)}</span>}
    </span>
  )
}

function fiscalDocumentLabel(documentKind) {
  if (documentKind === 'nfce') return 'NFC-e'
  if (documentKind === 'nfe-received') return 'NF-e recebida'
  if (documentKind === 'nfe') return 'NF-e'
  return 'Nota fiscal'
}

function FiscalNoteDetailPanel({ data, documentKind = 'nfe' }) {
  const info = describeFiscalStatus(data)
  const mensagens = data?.mensagens || info?.auth?.mensagens || info?.doc?.mensagens
  const msgList = Array.isArray(mensagens) ? mensagens : []
  const docLabel = fiscalDocumentLabel(documentKind)
  const motivoMencionaNfe =
    info?.motivo && /nf-?e/i.test(info.motivo) && documentKind === 'nfce'
  const jsonText = JSON.stringify(data ?? {}, null, 2)

  const copyDetailJson = async (e) => {
    e?.stopPropagation?.()
    try {
      await navigator.clipboard.writeText(jsonText)
      message.success('JSON copiado para a área de transferência.')
    } catch {
      message.error('Não foi possível copiar o JSON.')
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {info?.status && (
        <Alert
          type={info.isRejected ? 'error' : info.isOk ? 'success' : 'warning'}
          showIcon
          message={
            info.isRejected
              ? `${docLabel} rejeitada pela SEFAZ`
              : info.isOk
                ? `${docLabel} autorizada`
                : `Situação: ${info.status}`
          }
          description={
            <>
              {info.codigo != null && (
                <p className="fiscal-notes-detail-alert-body">
                  <strong>Código SEFAZ:</strong> {info.codigo}
                </p>
              )}
              {info.motivo && (
                <p className="fiscal-notes-detail-alert-body">
                  <strong>Motivo (texto oficial da SEFAZ):</strong> {info.motivo}
                </p>
              )}
              {motivoMencionaNfe && (
                <p className="fiscal-notes-detail-alert-body fiscal-notes-detail-sefaz-hint">
                  A SEFAZ usa a expressão &quot;NF-e&quot; no motivo do código 100 mesmo para NFC-e (modelo 65).
                  Isso não indica que o documento consultado seja NF-e de produto.
                </p>
              )}
              {!info.motivo && info.isRejected && (
                <p className="fiscal-notes-detail-alert-body">
                  Consulte o JSON completo abaixo ou a Nuvem Fiscal para o motivo detalhado.
                </p>
              )}
            </>
          }
        />
      )}

      {info && (
        <Descriptions bordered size="small" column={1} className="fiscal-notes-detail-desc">
          <Descriptions.Item label="Status">{fmtValue(info.status)}</Descriptions.Item>
          {info.chave && (
            <Descriptions.Item label="Chave de acesso">
              <Text code copyable={{ text: info.chave }}>
                {info.chave}
              </Text>
            </Descriptions.Item>
          )}
          {info.doc?.numero != null && (
            <Descriptions.Item label="Número">{fmtValue(info.doc.numero)}</Descriptions.Item>
          )}
          {info.doc?.serie != null && (
            <Descriptions.Item label="Série">{fmtValue(info.doc.serie)}</Descriptions.Item>
          )}
          {info.doc?.data_emissao && (
            <Descriptions.Item label="Data emissão">
              {formatEmissionDate({ data_emissao: info.doc.data_emissao }, false)}
            </Descriptions.Item>
          )}
          {info.doc?.ambiente && (
            <Descriptions.Item label="Ambiente">{fmtValue(info.doc.ambiente)}</Descriptions.Item>
          )}
          {info.doc?.id && <Descriptions.Item label="ID Nuvem Fiscal">{fmtValue(info.doc.id)}</Descriptions.Item>}
          {info.auth?.data_recebimento && (
            <Descriptions.Item label="Recebimento SEFAZ">
              {formatEmissionDate({ data_emissao: info.auth.data_recebimento }, false)}
            </Descriptions.Item>
          )}
          {info.auth?.numero_protocolo && (
            <Descriptions.Item label="Protocolo">{fmtValue(info.auth.numero_protocolo)}</Descriptions.Item>
          )}
          {info.auth?.digest_value && (
            <Descriptions.Item label="Digest">{fmtValue(info.auth.digest_value)}</Descriptions.Item>
          )}
        </Descriptions>
      )}

      {msgList.length > 0 && (
        <>
          <Divider orientation="left" plain>
            Mensagens da API
          </Divider>
          <ul className="fiscal-notes-detail-messages">
            {msgList.map((m, i) => (
              <li key={i}>
                {m?.codigo != null && <Tag>{m.codigo}</Tag>}{' '}
                {m?.descricao || m?.mensagem || m?.correcao || JSON.stringify(m)}
              </li>
            ))}
          </ul>
        </>
      )}

      <Collapse
        className="fiscal-notes-detail-json-collapse"
        defaultActiveKey={['json']}
        items={[
          {
            key: 'json',
            label: 'JSON completo (logs técnicos)',
            extra: (
              <Button
                type="link"
                size="small"
                icon={<CopyOutlined />}
                className="fiscal-notes-json-copy-btn"
                onClick={copyDetailJson}
              >
                Copiar JSON
              </Button>
            ),
            children: (
              <div className="fiscal-notes-detail-json-wrap">
                <pre className="fiscal-notes-detail-pre">{jsonText}</pre>
              </div>
            ),
          },
        ]}
      />
    </Space>
  )
}

function getRowChaveDigits(row) {
  return onlyDigits(row?.chave || row?.chave_acesso || row?.chaveAcesso)
}

function getRowEmissionDayjs(row) {
  const iso =
    row?.data_emissao ||
    row?.dataEmissao ||
    row?.dhEmi ||
    row?.autorizacao?.data_evento ||
    row?.data_evento
  if (iso) {
    const d = dayjs(iso)
    if (d.isValid()) return d
  }
  return emissionFromChave(row)
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
  const [activeView, setActiveView] = useState('nfe-issued')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTitle, setDetailTitle] = useState('')
  const [detailJson, setDetailJson] = useState(null)
  const [taxByDocId, setTaxByDocId] = useState({})
  const [taxesLoading, setTaxesLoading] = useState(false)

  const [importOpen, setImportOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importXmlList, setImportXmlList] = useState([])
  const [importJsonList, setImportJsonList] = useState([])
  const [importXmlFile, setImportXmlFile] = useState(null)
  const [importJsonFile, setImportJsonFile] = useState(null)
  const [importNotes, setImportNotes] = useState('')

  const [tenantId, setTenantId] = useState('')
  const [filterChave, setFilterChave] = useState('')
  const [filterNumero, setFilterNumero] = useState('')
  const [filterDataDe, setFilterDataDe] = useState(null)
  const [filterDataAte, setFilterDataAte] = useState(null)
  const [syncLoading, setSyncLoading] = useState(false)

  const listWarning = useMemo(() => {
    if (!data?.warning) return null
    return String(data.warning)
  }, [data])

  const rows = useMemo(() => safeArray(data), [data])
  const total = useMemo(() => getCount(data), [data])
  const filteredRows = useMemo(() => {
    let list = rows
    const qNum = onlyDigits(filterNumero)
    if (qNum) {
      list = list.filter((r) => getDocNumberDigits(r).includes(qNum))
    }
    const qChave = onlyDigits(filterChave)
    if (qChave) {
      list = list.filter((r) => getRowChaveDigits(r).includes(qChave))
    }
    if (filterDataDe || filterDataAte) {
      const start = filterDataDe?.isValid() ? filterDataDe.startOf('day') : null
      const end = filterDataAte?.isValid() ? filterDataAte.endOf('day') : null
      list = list.filter((r) => {
        const d = getRowEmissionDayjs(r)
        if (!d?.isValid()) return false
        if (start && d.isBefore(start)) return false
        if (end && d.isAfter(end)) return false
        return true
      })
    }
    return list
  }, [rows, filterNumero, filterChave, filterDataDe, filterDataAte])

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
    setImportXmlList([])
    setImportJsonList([])
    setImportXmlFile(null)
    setImportJsonFile(null)
    setImportNotes('')
    setImportOpen(true)
  }

  const handleImport = async () => {
    if (user?.isRoot && !tenantId.trim()) {
      message.warning('Selecione a empresa nos filtros antes de importar.')
      return
    }
    const xmlFile = importXmlFile
    const jsonFile = importJsonFile
    if (!xmlFile && !jsonFile) {
      message.warning('Selecione um arquivo XML ou JSON da NF-e.')
      return
    }
    try {
      setImportLoading(true)
      const res = await importSaleFromInvoice({
        tenantId: effectiveTenantId,
        saleType: 'PDV',
        xml: xmlFile,
        json: jsonFile,
        notes: importNotes,
      })
      if (res?.createdType === 'PAYABLE') {
        message.success(`Conta a pagar criada: ${res?.payable?.description || res?.payable?.id || 'OK'}`)
      } else {
        const emission = getEmissionResult(res?.nfeEmission)
        const fiscal = describeFiscalStatus(emission)
        const saleLabel = res?.sale?.saleNumber || res?.sale?.id || 'OK'
        if (fiscal?.isRejected) {
          message.error(
            `NF-e rejeitada${fiscal.codigo != null ? ` (cód. ${fiscal.codigo})` : ''}: ${fiscal.motivo || 'Consulte os detalhes da nota na lista.'}`
          )
          message.warning(`Venda ${saleLabel} foi criada, mas a nota não foi autorizada na SEFAZ.`)
        } else if (fiscal?.isOk) {
          message.success(`Venda ${saleLabel} cadastrada e NF-e autorizada.`)
        } else {
          message.success(`Venda cadastrada: ${saleLabel}`)
        }
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
      const isNfce = activeView === 'nfce-issued'
      setDetailTitle(`Detalhes da nota${id ? ` (${id})` : ''}`)

      if ((direction === 'RECEIVED' || activeView === 'nfe-received') && id) {
        const json = await getNfeReceivedById(id, { tenantId: effectiveTenantId })
        setDetailJson(json)
        return
      }

      if (id && (isNfce || activeView === 'nfce-issued')) {
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
    const isNfce = activeView === 'nfce-issued'
    if (!id) {
      message.warning('ID não disponível para download.')
      return
    }
    try {
      if (direction === 'RECEIVED' || activeView === 'nfe-received') {
        const blob = await downloadNfeReceivedPdf(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfe-recebida-${id}.pdf`)
        return
      }
      if (isNfce || activeView === 'nfce-issued') {
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

  const loadTaxesForRows = useCallback(
    async (list, view) => {
      const eligible = (list || []).filter((r) => r?.id && isNoteAuthorized(r))
      if (eligible.length === 0) return
      setTaxesLoading(true)
      const entries = await Promise.all(
        eligible.map(async (row) => {
          try {
            const taxes = await fetchTaxesForRow(row, view, effectiveTenantId)
            return taxes ? [row.id, taxes] : null
          } catch {
            return null
          }
        })
      )
      const next = {}
      entries.forEach((entry) => {
        if (entry) next[entry[0]] = entry[1]
      })
      setTaxByDocId((prev) => ({ ...prev, ...next }))
      setTaxesLoading(false)
    },
    [effectiveTenantId]
  )

  const handleDownloadXml = async (row) => {
    const id = row?.id
    const direction = row?.direction
    const isNfce = activeView === 'nfce-issued'
    if (!id) {
      message.warning('ID não disponível para download.')
      return
    }
    try {
      if (direction === 'RECEIVED' || activeView === 'nfe-received') {
        const blob = await downloadNfeReceivedXml(id, { tenantId: effectiveTenantId })
        await saveBlob(blob, `nfe-recebida-${id}.xml`)
        return
      }
      if (isNfce || activeView === 'nfce-issued') {
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

  const handleSyncReceived = async () => {
    try {
      setSyncLoading(true)
      const syncRes = await syncNfeReceived({
        tenantId: effectiveTenantId,
        distNsu: 0,
      })
      const motivo = syncRes?.motivo_status || syncRes?.status
      if (motivo) {
        message.info(typeof motivo === 'string' ? motivo : 'Consulta à SEFAZ concluída.')
      } else {
        message.success('Busca na SEFAZ concluída. Atualizando a lista…')
      }
      await fetchData()
    } catch (e) {
      message.error(e?.message || 'Erro ao buscar notas na SEFAZ.')
    } finally {
      setSyncLoading(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const chaveParam = filterChave.trim() || undefined
      const listParams = {
        tenantId: effectiveTenantId,
        top: 100,
        skip: 0,
        inlinecount: true,
      }
      let res
      if (activeView === 'nfe-issued') {
        res = await listNfeIssued({ ...listParams, chave: chaveParam })
      } else if (activeView === 'nfe-received') {
        res = await listNfeReceived({
          ...listParams,
          chaveAcesso: chaveParam,
        })
      } else {
        res = await listNfceIssued({ ...listParams, chave: chaveParam })
      }
      setData(res)
      setTaxByDocId({})
      const list = safeArray(res)
      loadTaxesForRows(list, activeView)
    } catch (e) {
      message.error(e?.message || 'Erro ao consultar notas fiscais.')
    } finally {
      setLoading(false)
    }
  }

  const columns = useMemo(() => {
    const receivedExtraColumns = [
      {
        title: 'Fornecedor',
        key: 'emitente',
        width: isCompact ? 160 : 220,
        ellipsis: true,
        render: (_, row) => getEmitenteLabel(row),
      },
      {
        title: 'Valor',
        dataIndex: 'valor_nfe',
        key: 'valor_nfe',
        width: isCompact ? 100 : 120,
        responsive: isCompact ? ['sm'] : undefined,
        render: (v) => formatMoney(v),
      },
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
        title: 'Emissão',
        dataIndex: 'data_emissao',
        key: 'data_emissao',
        width: isCompact ? 112 : 140,
        responsive: isCompact ? ['sm'] : undefined,
        render: (_, row) => {
          const label = formatEmissionDate(row, isCompact)
          const iso =
            row?.data_emissao ||
            row?.dataEmissao ||
            row?.dhEmi ||
            row?.autorizacao?.data_evento ||
            row?.data_evento
          if (label === '-' || !iso) return label
          const full = formatEmissionDate(row, false)
          return full !== label ? <Tooltip title={full}>{label}</Tooltip> : label
        },
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
        title: 'Imposto (ref.)',
        key: 'invoiceTax',
        width: isCompact ? 108 : 128,
        align: 'right',
        responsive: isCompact ? ['sm'] : undefined,
        render: (_, row) => {
          const id = row?.id
          if (!id || !isNoteAuthorized(row)) return <Text type="secondary">—</Text>
          const taxes = taxByDocId[id]
          if (taxesLoading && !taxes) return <Spin size="small" />
          const total = pickDisplayTaxTotal(taxes)
          if (total == null) return <Text type="secondary">—</Text>
          return (
            <Tooltip title="Tributos do XML autorizado (ICMS, PIS, COFINS, vTotTrib…)">
              <Text strong>{formatMoney(total)}</Text>
            </Tooltip>
          )
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: isCompact ? 108 : 140,
        render: (v, row) => {
          const raw = fmtValue(v)
          const fiscal = describeFiscalStatus(row)
          const isOk = fiscal?.isOk || /autoriz|aprov|sucesso/i.test(raw)
          const isBad = fiscal?.isRejected || /rejeit|erro|cancel/i.test(raw)
          const tip = fiscal?.motivo && fiscal.motivo !== raw ? fiscal.motivo : null
          const tag = (
            <Tag color={isOk ? 'green' : isBad ? 'red' : 'default'} className="fiscal-notes-status-tag">
              {raw}
            </Tag>
          )
          if (tip || (isCompact && raw.length > 14)) {
            return <Tooltip title={tip || raw}>{tag}</Tooltip>
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
        width: 56,
        align: 'center',
        fixed: 'right',
        className: 'fiscal-notes-col-actions',
        render: (_, row) => (
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
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              aria-label="Ações da nota"
              className="fiscal-notes-row-actions-btn"
            />
          </Dropdown>
        ),
      },
    ]

    if (activeView === 'nfe-received') return [...receivedExtraColumns, ...baseColumns]
    return baseColumns
  }, [activeView, isCompact, taxByDocId, taxesLoading])

  const activeViewMeta = useMemo(
    () => FISCAL_VIEWS.find((v) => v.key === activeView) || FISCAL_VIEWS[0],
    [activeView]
  )

  const detailModalWidth = isCompact ? 'min(100%, calc(100vw - 24px))' : 980
  const importModalWidth = isCompact ? '100%' : 720
  const hasActiveFilters =
    Boolean(filterChave.trim()) ||
    Boolean(onlyDigits(filterNumero)) ||
    Boolean(filterDataDe) ||
    Boolean(filterDataAte)

  const switchView = (key) => {
    setData(null)
    setTaxByDocId({})
    setActiveView(key)
  }

  const clearFilters = () => {
    setFilterChave('')
    setFilterNumero('')
    setFilterDataDe(null)
    setFilterDataAte(null)
  }

  return (
    <div className={`fiscal-notes-page${isCompact ? ' fiscal-notes-page--compact' : ''}`}>
      <main className="fiscal-notes-main">
        <Card
          className="fiscal-notes-card"
          title={isCompact ? 'Notas fiscais' : 'Notas Fiscais (Nuvem Fiscal)'}
          extra={
            <Space direction={isCompact ? 'vertical' : 'horizontal'} size={isCompact ? 8 : 12} className="fiscal-notes-card-extra">
              <Button onClick={openImportModal} block={isCompact} className={isCompact ? 'fiscal-notes-header-btn' : undefined}>
                Importar NF-e
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

          <FiscalReconciliationPanel tenantId={effectiveTenantId} isCompact={isCompact} />

          <nav className="fiscal-notes-view-nav" aria-label="Tipo de nota fiscal">
            {FISCAL_VIEWS.map((view) => {
              const Icon = view.icon
              const isActive = activeView === view.key
              return (
                <button
                  key={view.key}
                  type="button"
                  className={`fiscal-notes-view-nav-item${isActive ? ' fiscal-notes-view-nav-item--active' : ''}`}
                  onClick={() => switchView(view.key)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="fiscal-notes-view-nav-icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="fiscal-notes-view-nav-text">
                    <span className="fiscal-notes-view-nav-label">{view.label}</span>
                    <span className="fiscal-notes-view-nav-badge">{view.badge}</span>
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="fiscal-notes-view-panel">
            <div className="fiscal-notes-view-panel-head">
              <Title level={5} className="fiscal-notes-view-panel-title">
                {activeViewMeta.label}
                <Tag className="fiscal-notes-view-panel-tag">{activeViewMeta.badge}</Tag>
              </Title>
              <Text type="secondary" className="fiscal-notes-view-panel-desc">
                {activeViewMeta.description}
              </Text>
            </div>

          {activeView === 'nfe-manual' ? (
            <>
            {Boolean(user?.isRoot) && (
              <Row gutter={filterGutter} className="fiscal-notes-filters fiscal-notes-filters--simple" style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} lg={8}>
                  <label className="fiscal-notes-filter-label">Empresa</label>
                  <RootTenantSelect
                    isRoot={Boolean(user?.isRoot)}
                    value={tenantId}
                    onChange={setTenantId}
                    style={{ width: '100%', maxWidth: isCompact ? '100%' : 520 }}
                  />
                </Col>
              </Row>
            )}
            <ManualNfeEmitPanel
              tenantId={effectiveTenantId}
              isCompact={isCompact}
              onEmitted={async () => {
                setActiveView('nfe-issued')
                setData(null)
                setTaxByDocId({})
                setLoading(true)
                try {
                  const res = await listNfeIssued({
                    tenantId: effectiveTenantId,
                    top: 100,
                    skip: 0,
                    inlinecount: true,
                  })
                  setData(res)
                  loadTaxesForRows(safeArray(res), 'nfe-issued')
                } catch (e) {
                  message.error(e?.message || 'Erro ao atualizar lista de NF-e.')
                } finally {
                  setLoading(false)
                }
              }}
            />
            </>
          ) : (
            <>
          <Row gutter={filterGutter} className="fiscal-notes-filters fiscal-notes-filters--simple">
            {Boolean(user?.isRoot) && (
              <Col xs={24} sm={12} lg={6}>
                <label className="fiscal-notes-filter-label">Empresa</label>
                <RootTenantSelect
                  isRoot={Boolean(user?.isRoot)}
                  value={tenantId}
                  onChange={setTenantId}
                  style={{ width: '100%', maxWidth: isCompact ? '100%' : 520 }}
                />
              </Col>
            )}

            <Col xs={24} sm={12} lg={6}>
              <label className="fiscal-notes-filter-label">Chave da nota</label>
              <Input
                value={filterChave}
                onChange={(e) => setFilterChave(e.target.value)}
                placeholder="44 dígitos ou parte da chave"
                allowClear
                inputMode="numeric"
              />
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <label className="fiscal-notes-filter-label">Data inicial</label>
              <DatePicker
                value={filterDataDe}
                onChange={(d) => setFilterDataDe(d)}
                format="DD/MM/YYYY"
                placeholder="De"
                allowClear
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <label className="fiscal-notes-filter-label">Data final</label>
              <DatePicker
                value={filterDataAte}
                onChange={(d) => setFilterDataAte(d)}
                format="DD/MM/YYYY"
                placeholder="Até"
                allowClear
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} sm={12} lg={6}>
              <label className="fiscal-notes-filter-label">Número da nota</label>
              <Input
                value={filterNumero}
                onChange={(e) => setFilterNumero(e.target.value)}
                placeholder="Ex.: 123456"
                allowClear
                inputMode="numeric"
              />
            </Col>

            <Col xs={24} className="fiscal-notes-filter-actions">
              <Space direction={isCompact ? 'vertical' : 'horizontal'} wrap style={{ width: '100%' }} size={8}>
                {activeView === 'nfe-received' && (
                  <Button
                    onClick={handleSyncReceived}
                    loading={syncLoading}
                    block={isCompact}
                    size={isCompact ? 'large' : 'middle'}
                    className="fiscal-notes-sync-btn"
                  >
                    Buscar na SEFAZ
                  </Button>
                )}
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
                {hasActiveFilters && (
                  <Button onClick={clearFilters} block={isCompact}>
                    Limpar filtros
                  </Button>
                )}
              </Space>
              <Text type="secondary" className="fiscal-notes-filter-hint fiscal-notes-filter-hint--block">
                Chave completa é enviada à consulta na Nuvem Fiscal; número e datas (inicial/final) refinam a lista exibida.
              </Text>
            </Col>
          </Row>

          {activeView === 'nfe-received' && (
            <Alert
              type="info"
              showIcon
              className="fiscal-notes-received-hint"
              message="Notas em que sua empresa é destinatária"
              description="Quando outra empresa emite NF-e com o CNPJ da sua empresa, a SEFAZ disponibiliza o XML na distribuição DF-e. Use Buscar na SEFAZ e depois Consultar. Importar XML manual cria conta a pagar, mas não substitui esta lista."
            />
          )}

          {listWarning && (
            <Alert type="warning" showIcon className="fiscal-notes-list-warning" message={listWarning} />
          )}

          <div className={`fiscal-notes-total${isCompact ? ' fiscal-notes-total--compact' : ''}`}>
            <Text type="secondary">
              {total != null ? (
                <>
                  {isCompact ? 'Registros: ' : 'Total: '}
                  <Text strong>{total}</Text>
                  {filteredRows.length !== rows.length && (
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
            scroll={{ x: isCompact ? (activeView === 'nfe-received' ? 540 : 440) : 1280 }}
            className="fiscal-notes-table"
          />
            </>
          )}
          </div>
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
          <FiscalNoteDetailPanel
            data={detailJson}
            documentKind={
              activeView === 'nfce-issued'
                ? 'nfce'
                : activeView === 'nfe-received'
                  ? 'nfe-received'
                  : 'nfe'
            }
          />
        )}
      </Modal>

      <Modal
        open={importOpen}
        title="Importar NF-e"
        onCancel={() => setImportOpen(false)}
        onOk={handleImport}
        okText="Importar"
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
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Text type="secondary" className="fiscal-notes-import-hint">
            Envie o XML ou o JSON da NF-e. Se a nota for de fornecedor (sua empresa como destinatária), será criada uma conta a pagar; caso contrário, uma venda.
          </Text>
          <Input value={importNotes} onChange={(e) => setImportNotes(e.target.value)} placeholder="Observações (opcional)" />
          <Upload.Dragger
            fileList={importXmlList}
            maxCount={1}
            accept=".xml,application/xml,text/xml"
            className="fiscal-notes-import-dragger"
            beforeUpload={() => true}
            customRequest={({ file, onSuccess }) => {
              const raw = pickAntdFile(file)
              if (!raw) {
                message.error('Não foi possível ler o arquivo XML.')
                return
              }
              setImportXmlFile(raw)
              setImportJsonFile(null)
              setImportJsonList([])
              setImportXmlList([{ uid: file.uid, name: file.name, status: 'done' }])
              onSuccess?.('ok')
            }}
            onRemove={() => {
              setImportXmlList([])
              setImportXmlFile(null)
            }}
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined />
            </p>
            <p className="ant-upload-text">XML da NF-e</p>
            <p className="ant-upload-hint">Clique ou arraste o arquivo .xml</p>
          </Upload.Dragger>
          <Upload.Dragger
            fileList={importJsonList}
            maxCount={1}
            accept=".json,application/json,text/json"
            className="fiscal-notes-import-dragger"
            beforeUpload={() => true}
            customRequest={({ file, onSuccess }) => {
              const raw = pickAntdFile(file)
              if (!raw) {
                message.error('Não foi possível ler o arquivo JSON.')
                return
              }
              setImportJsonFile(raw)
              setImportXmlFile(null)
              setImportXmlList([])
              setImportJsonList([{ uid: file.uid, name: file.name, status: 'done' }])
              onSuccess?.('ok')
            }}
            onRemove={() => {
              setImportJsonList([])
              setImportJsonFile(null)
            }}
          >
            <p className="ant-upload-drag-icon">
              <FileTextOutlined />
            </p>
            <p className="ant-upload-text">JSON da NF-e</p>
            <p className="ant-upload-hint">Alternativa ao XML · apenas um arquivo por importação</p>
          </Upload.Dragger>
        </Space>
      </Modal>
    </div>
  )
}

