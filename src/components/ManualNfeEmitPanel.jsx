import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import { emitManualNfe } from '../services/fiscalService'
import { getCurrentTenant, getTenantById } from '../services/tenantService'
import { maskCpfCnpj } from '../utils/masks'
import { UF_OPTIONS } from '../config/brazilUf'
import { useAuth } from '../contexts/AuthContext'
import './ManualNfeEmitPanel.css'

const { Text, Title } = Typography

const IND_IE_DEST_OPTIONS = [
  { value: 1, label: '1 - Contribuinte ICMS' },
  { value: 2, label: '2 - Isento' },
  { value: 9, label: '9 - Não contribuinte' },
]

const EMPTY_ITEM = {
  codigo: '',
  descricao: '',
  ncm: '',
  cfop: '5102',
  cst: '00',
  quantidade: 1,
  valorUnitario: 0,
  aliquotaTributos: null,
}

function onlyDigits(v) {
  return (v ?? '').toString().replace(/\D/g, '')
}

function formatDoc(doc) {
  const d = onlyDigits(doc)
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  return doc || '—'
}

function parseSerie(ecfSeries) {
  if (!ecfSeries) return 1
  const n = parseInt(String(ecfSeries).replace(/\D/g, ''), 10)
  return Number.isFinite(n) && n >= 1 && n <= 999 ? n : 1
}

function formatCep(v) {
  const d = onlyDigits(v)
  if (d.length !== 8) return v
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

function describeEmission(data) {
  const doc = data?.emissionResult || data
  if (!doc) return null
  const auth = doc.autorizacao || {}
  const status = String(doc.status || auth.status || '').trim()
  const codigo = auth.codigo_status ?? doc.codigo_status
  const motivo = auth.motivo_status || doc.motivo_status || doc.mensagem
  const chave = doc.chave || auth.chave_acesso || doc.chave_acesso
  const isRejected = /rejeit/i.test(status)
  const isOk = /autoriz|aprov|registrad/i.test(status)
  return { status, codigo, motivo, chave, isRejected, isOk }
}

export default function ManualNfeEmitPanel({ tenantId, isCompact, onEmitted }) {
  const { user } = useAuth()
  const [form] = Form.useForm()
  const [tenant, setTenant] = useState(null)
  const [loadingTenant, setLoadingTenant] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const needsTenantPick = Boolean(user?.isRoot) && !tenantId

  const loadTenant = useCallback(async () => {
    if (needsTenantPick) {
      setTenant(null)
      return
    }
    setLoadingTenant(true)
    try {
      const t =
        user?.isRoot && tenantId ? await getTenantById(tenantId) : await getCurrentTenant()
      setTenant(t)
      form.setFieldsValue({
        serie: parseSerie(t?.ecfSeries),
        naturezaOperacao: 'VENDA DE MERCADORIA',
        destinatario: {
          uf: t?.addressState || undefined,
          codigoMunicipio: t?.codigoMunicipio || undefined,
        },
        itens: [{ ...EMPTY_ITEM }],
      })
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresa.')
      setTenant(null)
    } finally {
      setLoadingTenant(false)
    }
  }, [form, needsTenantPick, tenantId, user?.isRoot])

  useEffect(() => {
    loadTenant()
  }, [loadTenant])

  const emitenteRows = useMemo(() => {
    if (!tenant) return []
    return [
      ['Razão social', tenant.name],
      ['Nome fantasia', tenant.tradeName || '—'],
      ['CNPJ', formatDoc(tenant.document)],
      ['Inscrição estadual', tenant.stateRegistration || '—'],
      ['Inscrição municipal', tenant.municipalRegistration || '—'],
      ['Cód. município (IBGE)', tenant.codigoMunicipio || '—'],
      [
        'Endereço',
        [
          tenant.addressStreet,
          tenant.addressNumber,
          tenant.addressNeighborhood,
          tenant.addressCity,
          tenant.addressState,
          tenant.addressZip ? formatCep(tenant.addressZip) : null,
        ]
          .filter(Boolean)
          .join(', ') || '—',
      ],
      ['Ambiente NF-e', tenant.ambienteNfe || tenant.ambienteFiscal || '—'],
    ]
  }, [tenant])

  const handleSubmit = async (values) => {
    if (needsTenantPick) {
      message.warning('Selecione a empresa nos filtros acima.')
      return
    }
    const cpf = onlyDigits(values.destinatario?.cpf)
    const cnpj = onlyDigits(values.destinatario?.cnpj)
    if (!cpf && !cnpj) {
      message.warning('Informe CPF ou CNPJ do destinatário.')
      return
    }
    setSubmitting(true)
    setLastResult(null)
    try {
      const payload = {
        tenantId: user?.isRoot ? tenantId : undefined,
        serie: values.serie,
        naturezaOperacao: values.naturezaOperacao?.trim(),
        destinatario: {
          ...values.destinatario,
          cpf: cpf || undefined,
          cnpj: cnpj || undefined,
          cep: onlyDigits(values.destinatario?.cep) || undefined,
          codigoMunicipio: onlyDigits(values.destinatario?.codigoMunicipio) || undefined,
        },
        itens: (values.itens || []).map((item) => ({
          codigo: item.codigo?.trim() || undefined,
          descricao: item.descricao?.trim(),
          ncm: onlyDigits(item.ncm),
          cfop: onlyDigits(item.cfop),
          cst: item.cst?.trim() || undefined,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          aliquotaTributos: item.aliquotaTributos ?? undefined,
        })),
      }
      const res = await emitManualNfe(payload, { tenantId: user?.isRoot ? tenantId : undefined })
      setLastResult(res)
      const fiscal = describeEmission(res)
      if (fiscal?.isOk) {
        message.success('NF-e autorizada na SEFAZ.')
        onEmitted?.(res)
      } else if (fiscal?.isRejected) {
        message.error(
          `NF-e rejeitada${fiscal.codigo != null ? ` (cód. ${fiscal.codigo})` : ''}: ${fiscal.motivo || 'Verifique os dados.'}`
        )
      } else {
        message.info('Emissão enviada. Consulte o retorno abaixo.')
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao emitir NF-e.')
    } finally {
      setSubmitting(false)
    }
  }

  const lastFiscal = describeEmission(lastResult)

  if (needsTenantPick) {
    return (
      <Alert
        type="info"
        showIcon
        message="Selecione a empresa"
        description="Usuários root devem escolher a empresa nos filtros para emitir NF-e manual."
        className="manual-nfe-alert"
      />
    )
  }

  return (
    <div className={`manual-nfe-panel${isCompact ? ' manual-nfe-panel--compact' : ''}`}>
      <Alert
        type="info"
        showIcon
        className="manual-nfe-alert"
        message="Emissão manual de NF-e"
        description="Preencha destinatário e itens como no XML da nota. Os dados do emitente vêm do cadastro da empresa e não são editáveis aqui."
      />

      <Card size="small" title="Emitente (cadastro da empresa)" loading={loadingTenant} className="manual-nfe-card">
        {tenant ? (
          <Descriptions size="small" column={isCompact ? 1 : 2} bordered>
            {emitenteRows.map(([label, value]) => (
              <Descriptions.Item key={label} label={label}>
                {value}
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <Text type="secondary">Carregando empresa…</Text>
        )}
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={!tenant || loadingTenant}
        className="manual-nfe-form"
        initialValues={{
          serie: 1,
          naturezaOperacao: 'VENDA DE MERCADORIA',
          itens: [{ ...EMPTY_ITEM }],
        }}
      >
        <Card size="small" title="Identificação da nota" className="manual-nfe-card">
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="serie"
                label="Série"
                rules={[{ required: true, message: 'Informe a série' }]}
              >
                <InputNumber min={1} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item
                name="naturezaOperacao"
                label="Natureza da operação (natOp)"
                rules={[{ required: true, message: 'Informe a natureza da operação' }]}
              >
                <Input maxLength={100} placeholder="Ex.: VENDA DE MERCADORIA" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card size="small" title="Destinatário" className="manual-nfe-card">
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name={['destinatario', 'nome']} label="Nome / razão social" rules={[{ required: true }]}>
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name={['destinatario', 'cpf']} label="CPF">
                <Input
                  maxLength={14}
                  placeholder="000.000.000-00"
                  onChange={(e) =>
                    form.setFieldValue(['destinatario', 'cpf'], maskCpfCnpj(e.target.value))
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item name={['destinatario', 'cnpj']} label="CNPJ">
                <Input
                  maxLength={18}
                  placeholder="00.000.000/0000-00"
                  onChange={(e) =>
                    form.setFieldValue(['destinatario', 'cnpj'], maskCpfCnpj(e.target.value))
                  }
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['destinatario', 'ie']} label="Inscrição estadual">
                <Input maxLength={14} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['destinatario', 'indIEDest']} label="Indicador IE (indIEDest)">
                <Select allowClear options={IND_IE_DEST_OPTIONS} placeholder="Opcional" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['destinatario', 'cep']} label="CEP">
                <Input maxLength={9} placeholder="00000-000" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name={['destinatario', 'logradouro']} label="Logradouro">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item name={['destinatario', 'numero']} label="Número">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={['destinatario', 'bairro']} label="Bairro">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item name={['destinatario', 'municipio']} label="Município">
                <Input maxLength={60} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={4}>
              <Form.Item name={['destinatario', 'uf']} label="UF">
                <Select options={UF_OPTIONS} showSearch optionFilterProp="label" placeholder="UF" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={10}>
              <Form.Item
                name={['destinatario', 'codigoMunicipio']}
                label="Código município (cMun)"
                rules={[{ pattern: /^\d{7}$/, message: '7 dígitos IBGE' }]}
              >
                <Input maxLength={7} placeholder="Ex.: 2304400" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card size="small" title="Itens (det / prod)" className="manual-nfe-card">
          <Form.List
            name="itens"
            rules={[
              {
                validator: async (_, itens) => {
                  if (!itens || itens.length < 1) {
                    throw new Error('Adicione ao menos um item')
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="manual-nfe-item-block">
                    <div className="manual-nfe-item-head">
                      <Title level={5} className="manual-nfe-item-title">
                        Item {name + 1}
                      </Title>
                      {fields.length > 1 && (
                        <Button
                          type="text"
                          danger
                          icon={<MinusCircleOutlined />}
                          onClick={() => remove(name)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                    <Row gutter={12}>
                      <Col xs={24} sm={6}>
                        <Form.Item {...rest} name={[name, 'codigo']} label="Código (cProd)">
                          <Input maxLength={60} placeholder="SKU" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={18}>
                        <Form.Item
                          {...rest}
                          name={[name, 'descricao']}
                          label="Descrição (xProd)"
                          rules={[{ required: true, message: 'Obrigatório' }]}
                        >
                          <Input maxLength={120} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...rest}
                          name={[name, 'ncm']}
                          label="NCM"
                          rules={[
                            { required: true, message: 'Obrigatório' },
                            { pattern: /^\d{8}$/, message: '8 dígitos' },
                          ]}
                        >
                          <Input maxLength={8} placeholder="00000000" />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Item
                          {...rest}
                          name={[name, 'cfop']}
                          label="CFOP"
                          rules={[
                            { required: true },
                            { pattern: /^\d{4}$/, message: '4 dígitos' },
                          ]}
                        >
                          <Input maxLength={4} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Item {...rest} name={[name, 'cst']} label="CST">
                          <Input maxLength={3} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={4}>
                        <Form.Item
                          {...rest}
                          name={[name, 'quantidade']}
                          label="Qtd (qCom)"
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={0.0001} step={1} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item
                          {...rest}
                          name={[name, 'valorUnitario']}
                          label="V. unit. (vUnCom)"
                          rules={[{ required: true }]}
                        >
                          <InputNumber min={0} step={0.01} prefix="R$" style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col xs={12} sm={6}>
                        <Form.Item {...rest} name={[name, 'aliquotaTributos']} label="Alíq. trib. (%)">
                          <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>
                    {name < fields.length - 1 && <Divider className="manual-nfe-item-divider" />}
                  </div>
                ))}
                <Button type="dashed" onClick={() => add({ ...EMPTY_ITEM })} block icon={<PlusOutlined />}>
                  Adicionar item
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        {lastResult && (
          <Alert
            className="manual-nfe-alert"
            type={lastFiscal?.isOk ? 'success' : lastFiscal?.isRejected ? 'error' : 'warning'}
            showIcon
            message={
              lastFiscal?.isOk
                ? 'NF-e autorizada'
                : lastFiscal?.isRejected
                  ? 'NF-e rejeitada'
                  : 'Retorno da emissão'
            }
            description={
              <Space direction="vertical" size={4}>
                {lastFiscal?.status && <Text>Status: {lastFiscal.status}</Text>}
                {lastFiscal?.codigo != null && <Text>Código: {lastFiscal.codigo}</Text>}
                {lastFiscal?.motivo && <Text>{lastFiscal.motivo}</Text>}
                {lastFiscal?.chave && <Text copyable>Chave: {lastFiscal.chave}</Text>}
              </Space>
            }
          />
        )}

        <div className="manual-nfe-actions">
          <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={submitting} size="large">
            Emitir NF-e
          </Button>
        </div>
      </Form>
    </div>
  )
}
