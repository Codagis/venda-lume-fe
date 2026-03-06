import { useRef, useEffect, useState, useCallback } from 'react'
import {
  Input,
  Select,
  Button,
  InputNumber,
  Space,
  Modal,
  Form,
  Divider,
  Collapse,
  Checkbox,
  Spin,
  Radio,
  Table,
  Card,
  Row,
  Col,
  Typography,
  Empty,
  Alert,
} from 'antd'
import {
  BarcodeOutlined,
  SearchOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  UserAddOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  CarOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import { useSalesPDV } from '../hooks/useSalesPDV'
import { SALE_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS_PDV } from '../services/salesService'
import './PdvScreen.css'

const { Title, Text } = Typography

function formatPrice(value) {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function PdvScreen() {
  const { user } = useAuth()
  const pdv = useSalesPDV()
  const searchInputRef = pdv.searchInputRef
  const [now, setNow] = useState(dayjs())

  useEffect(() => {
    searchInputRef.current?.focus?.()
  }, [searchInputRef])

  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000)
    return () => clearInterval(t)
  }, [])

  const handleKeyDown = useCallback((e) => {
    const target = e.target
    const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT'
    if (isInput && !['F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'].includes(e.key)) return

    switch (e.key) {
      case 'F5':
        e.preventDefault()
        pdv.setPaymentMethod('PIX')
        break
      case 'F6':
        e.preventDefault()
        pdv.setPaymentMethod('CASH')
        break
      case 'F7':
        e.preventDefault()
        pdv.setPaymentMethod('DEBIT_CARD')
        break
      case 'F8':
        e.preventDefault()
        pdv.setPaymentMethod('CREDIT_CARD')
        break
      case 'F9':
        e.preventDefault()
        if (pdv.cart.length > 0 && !pdv.submitting) pdv.handleFinish()
        break
      case 'F10':
        e.preventDefault()
        if (pdv.cart.length > 0) pdv.removeFromCart(pdv.cart[pdv.cart.length - 1].productId)
        break
      case 'F11':
        e.preventDefault()
        pdv.openCustomerModal()
        break
      default:
        break
    }
  }, [pdv])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="pdv-page">
      <div className="pdv-main">
        <div className="pdv-header">
          <div className="pdv-header-left">
            {pdv.tenantLogo ? (
              <img src={pdv.tenantLogo} alt="Logo" className="pdv-logo" />
            ) : (
              <Title level={4} style={{ margin: 0, color: '#34495e' }}>PDV</Title>
            )}
            {pdv.isRoot && (
              <Select
                placeholder="Empresa"
                options={pdv.tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={pdv.selectedTenantId}
                onChange={pdv.setSelectedTenantId}
                style={{ minWidth: 180 }}
              />
            )}
            <Select
              placeholder="Iniciar PDV (selecionar caixa)"
              allowClear
              options={pdv.registers.map((r) => ({ value: r.id, label: r.name }))}
              value={pdv.selectedRegisterId || undefined}
              onChange={pdv.handleRegisterChange}
              loading={pdv.loadingStartSession}
              style={{ minWidth: 200, marginLeft: pdv.isRoot ? 12 : 0 }}
            />
          </div>
          <div className="pdv-header-right">
            {pdv.selectedRegisterId && (
              <Button
                size="small"
                icon={<LogoutOutlined />}
                onClick={pdv.endSessionAndClear}
                loading={pdv.loadingEndSession}
                style={{ marginRight: 12 }}
              >
                Encerrar sessão
              </Button>
            )}
            <Text type="secondary">{user?.fullName || user?.name || 'Atendente'}</Text>
            <Text type="secondary" style={{ marginLeft: 16 }}>{now.format('DD/MM/YYYY HH:mm:ss')}</Text>
          </div>
        </div>

        <Row gutter={16} align="top">
          <Col xs={24} lg={10} xl={8}>
            <div className="pdv-search-wrap">
              <Input
                ref={searchInputRef}
                placeholder="Código de barras ou nome do produto"
                prefix={<BarcodeOutlined />}
                value={pdv.productSearch}
                onChange={(e) => pdv.setProductSearch(e.target.value)}
                onPressEnter={() => {
                  if (pdv.productResults.length > 0 && pdv.productResults[0]) {
                    pdv.addToCart(pdv.productResults[0])
                    pdv.setProductSearch('')
                    pdv.setProductResults([])
                  }
                }}
                allowClear
                size="large"
                autoComplete="off"
              />
              {pdv.productSearch?.trim() && (pdv.productResults.length > 0 || pdv.loadingProducts) && (
                <div className="pdv-product-dropdown">
                  {pdv.loadingProducts ? (
                    <div className="pdv-dropdown-loading"><Spin size="small" /> Buscando...</div>
                  ) : (
                    <div className="pdv-dropdown-list">
                      {pdv.productResults.map((p) => {
                        const price = p.discountPrice ?? p.unitPrice ?? 0
                        return (
                          <div
                            key={p.id}
                            className="pdv-dropdown-item"
                            onClick={() => {
                              pdv.addToCart(p)
                              pdv.setProductSearch('')
                              pdv.setProductResults([])
                              searchInputRef.current?.focus?.()
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <span className="pdv-dropdown-name">{p.name}</span>
                            <span className="pdv-dropdown-price">{formatPrice(price)}</span>
                            <PlusOutlined />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Card title="Pagamento" size="small" className="pdv-card pdv-payment-card" style={{ marginTop: 4 }}>
              <Form layout="vertical" size="small">
                <Form.Item label="Status da venda">
                  <Select
                    value={pdv.saleStatus}
                    onChange={pdv.setSaleStatus}
                    options={[
                      { value: 'COMPLETED', label: 'Concluída (padrão)' },
                      { value: 'OPEN', label: 'Pendente (adicionar pagamento depois em Consultar vendas)' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                {pdv.saleStatus === 'OPEN' && (
                  <Alert
                    type="info"
                    showIcon
                    message="Venda pendente"
                    description="A venda será registrada como pendente. O pagamento poderá ser adicionado depois em Consultar vendas → detalhe da venda → Adicionar pagamento."
                    style={{ marginBottom: 16 }}
                  />
                )}
                {pdv.saleStatus === 'COMPLETED' && (
                <>
                <Form.Item label="Forma de pagamento">
                  <Select
                    value={pdv.paymentMethod}
                    onChange={(v) => { pdv.setPaymentMethod(v); if (v !== 'CREDIT_CARD') pdv.setInstallmentsCount(1) }}
                    options={PAYMENT_METHOD_OPTIONS_PDV}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
                {(pdv.paymentMethod === 'CREDIT_CARD' || pdv.paymentMethod === 'DEBIT_CARD') && (
                  <>
                  <Form.Item label="Maquininha" required>
                    {pdv.cardMachines?.length > 0 ? (
                      <Select
                        value={pdv.selectedCardMachineId}
                        onChange={pdv.setSelectedCardMachineId}
                        options={pdv.cardMachines.map((m) => ({
                          value: m.id,
                          label: m.acquirerCnpj ? `${m.name} (CNPJ adq.)` : m.name,
                        }))}
                        placeholder="Selecione a maquininha (CNPJ adquirente para NFC-e)"
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: '#8c8c8c', padding: '8px 0' }}>
                        Nenhuma maquininha cadastrada. Cadastre em Configurações → Empresas → editar empresa → Maquininhas (informe CNPJ da adquirente).
                      </div>
                    )}
                  </Form.Item>
                  <Form.Item label="Bandeira do cartão" required>
                    <Select
                      value={pdv.cardBrand}
                      onChange={pdv.setCardBrand}
                      options={[
                        { value: '01', label: 'Visa' },
                        { value: '02', label: 'Mastercard' },
                        { value: '03', label: 'Amex' },
                        { value: '04', label: 'Sorocred' },
                        { value: '99', label: 'Outros' },
                      ]}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                  <Form.Item label="Número da autorização" extra="Opcional no PDV. Pode ser preenchido depois em Consultar vendas.">
                    <Input
                      value={pdv.cardAuthorization}
                      onChange={(e) => pdv.setCardAuthorization(e.target.value)}
                      placeholder="Código da transação (até 20 caracteres)"
                      maxLength={20}
                    />
                  </Form.Item>
                  {!pdv.cardAuthorization?.trim() && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Sem código de autorização não será possível emitir NFC-e"
                      description="Para gerar o cupom fiscal (NFC-e) desta venda depois, será necessário informar o código de autorização da maquininha. Você pode preencher em Consultar vendas → detalhe da venda → Código de autorização do cartão."
                      style={{ marginBottom: 16 }}
                    />
                  )}
                {pdv.paymentMethod === 'CREDIT_CARD' && (
                  <>
                  <Form.Item label="Parcelas">
                    <Select
                      value={pdv.installmentsCount}
                      onChange={pdv.setInstallmentsCount}
                      options={Array.from({ length: Math.max(1, pdv.tenantConfig.maxInstallments || 12) }, (_, i) => i + 1).map((n) => {
                              const maxNoInterest = pdv.tenantConfig.maxInstallmentsNoInterest || 1
                              const interestPercent = Number(pdv.tenantConfig.interestRatePercent) || 0
                              let totalWithInterest = pdv.total
                              if (n > maxNoInterest && interestPercent > 0) {
                                const i = interestPercent / 100
                                const periodosComJuros = n - maxNoInterest
                                totalWithInterest = pdv.total * Math.pow(1 + i, periodosComJuros)
                              }
                              const valorParcela = totalWithInterest / n
                              const semJuros = n <= maxNoInterest
                              return {
                                value: n,
                                label: semJuros
                                  ? `${n}x de ${formatPrice(valorParcela)} (sem juros)`
                                  : `${n}x de ${formatPrice(valorParcela)}`,
                              }
                            })
                      }
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                {pdv.installmentsCalc && (
                  <div style={{ fontSize: 12, color: '#667085', marginTop: -8, marginBottom: 8 }}>
                    Parcela: <strong>{formatPrice(pdv.installmentsCalc.installmentValue)}</strong>
                    {' · '}
                    Total a pagar: <strong>{formatPrice(pdv.totalAPagar)}</strong>
                  </div>
                )}
                  </>
                )}
                  </>
                )}
                <Form.Item label="Valor recebido">
                  <InputNumber
                    min={0}
                    value={pdv.amountReceived}
                    onChange={(v) => pdv.setAmountReceived(v)}
                    placeholder={formatPrice(pdv.totalAPagar ?? pdv.total)}
                    style={{ width: '100%' }}
                    prefix="R$"
                    disabled={['CREDIT_CARD', 'DEBIT_CARD', 'PIX'].includes(pdv.paymentMethod)}
                  />
                </Form.Item>
                </>
                )}
              </Form>

              <Divider style={{ margin: '12px 0' }} />

              <div className="pdv-total-row">
                <Text type="secondary">Subtotal</Text>
                <Text type="secondary">{formatPrice(pdv.subtotal)}</Text>
              </div>
              {pdv.saleDiscount > 0 && (
                <div className="pdv-total-row">
                  <Text type="secondary">Desconto</Text>
                  <Text type="secondary">- {formatPrice(pdv.saleDiscount)}</Text>
                </div>
              )}
              {pdv.deliveryFee > 0 && (
                <div className="pdv-total-row">
                  <Text type="secondary">Entrega</Text>
                  <Text type="secondary">{formatPrice(pdv.deliveryFee)}</Text>
                </div>
              )}
              {pdv.installmentsCalc && pdv.installmentsCalc.totalWithInterest > pdv.total && (
                <div className="pdv-total-row">
                  <Text type="secondary">Juros (parcelado)</Text>
                  <Text type="secondary">{formatPrice(pdv.installmentsCalc.totalWithInterest - pdv.total)}</Text>
                </div>
              )}
              {pdv.installmentsCalc && pdv.installmentsCalc.cardFee > 0 && (
                <div className="pdv-total-row">
                  <Text type="secondary">
                    {pdv.selectedCardMachineId && pdv.cardMachines?.find((m) => m.id === pdv.selectedCardMachineId)
                      ? `Taxa cartão (${pdv.cardMachines.find((m) => m.id === pdv.selectedCardMachineId).name})`
                      : 'Taxa cartão'}
                  </Text>
                  <Text type="secondary">{formatPrice(pdv.installmentsCalc.cardFee)}</Text>
                </div>
              )}
              <div className="pdv-total-row" style={{ marginTop: 8 }}>
                <Text strong>Total</Text>
                <Text strong style={{ fontSize: 18 }}>{formatPrice(pdv.totalAPagar ?? pdv.total)}</Text>
              </div>
              {pdv.amountReceived != null && pdv.amountReceived > (pdv.totalAPagar ?? pdv.total) && (
                <div className="pdv-total-row" style={{ marginTop: 8 }}>
                  <Text strong>Troco</Text>
                  <Text strong style={{ fontSize: 18, color: '#52c41a' }}>{formatPrice(pdv.amountReceived - (pdv.totalAPagar ?? pdv.total))}</Text>
                </div>
              )}

              <Button
                type="primary"
                size="large"
                block
                icon={<CheckCircleOutlined />}
                onClick={() => pdv.cart.length > 0 && !pdv.submitting && pdv.handleFinish()}
                loading={pdv.submitting}
                disabled={pdv.cart.length === 0}
                style={{ marginTop: 16 }}
              >
                {pdv.saleStatus === 'OPEN' ? 'Registrar como pendente' : 'Finalizar venda (F9)'}
              </Button>

              </Card>

            <Card title="Cliente, desconto e entrega" size="small" className="pdv-card" style={{ marginTop: 16 }}>
              <Form layout="vertical" size="small">
                <Form.Item label="Tipo de venda">
                  <Select value={pdv.saleType} onChange={pdv.setSaleType} options={SALE_TYPE_OPTIONS} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Cliente">
                  <Space.Compact block className="pdv-cliente-compact">
                    <Input
                      readOnly
                      value={pdv.customerName || ''}
                      placeholder="Nenhum cliente"
                      onClick={pdv.openCustomerModal}
                      style={{ cursor: 'pointer', backgroundColor: '#f5f5f5' }}
                    />
                    <Button type="primary" icon={<UserAddOutlined />} onClick={pdv.openCustomerModal}>
                      Adicionar
                    </Button>
                  </Space.Compact>
                </Form.Item>
                <Form.Item label="CPF/CNPJ do cliente" extra="Opcional. Para NF-e é necessário CPF ou CNPJ do destinatário.">
                  <Input
                    value={pdv.customerDocument || ''}
                    onChange={(e) => pdv.setCustomerDocument(e.target.value)}
                    placeholder="CPF ou CNPJ (pode digitar com ou sem formatação)"
                    maxLength={18}
                  />
                </Form.Item>
                <Form.Item>
                  <Checkbox checked={pdv.includeCpfOnNote} onChange={(e) => pdv.setIncludeCpfOnNote(e.target.checked)}>Incluir CPF/CNPJ na nota</Checkbox>
                </Form.Item>
                <Form.Item label="Desconto">
                  <Radio.Group value={pdv.discountType} onChange={(e) => { pdv.setDiscountType(e.target.value); if (e.target.value === 'amount') pdv.setDiscountPercent(0); else pdv.setDiscountAmount(0) }}>
                    <Radio value="amount">R$</Radio>
                    <Radio value="percent">%</Radio>
                  </Radio.Group>
                  {pdv.discountType === 'amount' ? (
                    <InputNumber min={0} value={pdv.discountAmount} onChange={(v) => { pdv.setDiscountAmount(v ?? 0); pdv.setDiscountPercent(0) }} style={{ width: '100%', marginTop: 8 }} prefix="R$" />
                  ) : (
                    <InputNumber min={0} max={100} value={pdv.discountPercent} onChange={(v) => { pdv.setDiscountPercent(v ?? 0); pdv.setDiscountAmount(0) }} style={{ width: '100%', marginTop: 8 }} addonAfter="%" />
                  )}
                </Form.Item>
                <Form.Item label="Taxa de entrega">
                  <InputNumber min={0} value={pdv.deliveryFee} onChange={(v) => pdv.setDeliveryFee(v ?? 0)} style={{ width: '100%' }} prefix="R$" />
                </Form.Item>
                {pdv.saleType === 'DELIVERY' && (
                  <Collapse
                    size="small"
                    items={[{
                      key: 'delivery',
                      label: 'Dados da entrega',
                      children: (
                        <Form layout="vertical" size="small">
                          <Form.Item label="Endereço"><Input value={pdv.deliveryAddress} onChange={(e) => pdv.setDeliveryAddress(e.target.value)} placeholder="Rua, número" /></Form.Item>
                          <Form.Item label="Complemento"><Input value={pdv.deliveryComplement} onChange={(e) => pdv.setDeliveryComplement(e.target.value)} placeholder="Apto" /></Form.Item>
                          <Row gutter={8}>
                            <Col span={8}><Form.Item label="CEP"><Input value={pdv.deliveryZipCode} onChange={(e) => pdv.setDeliveryZipCode(e.target.value)} placeholder="CEP" /></Form.Item></Col>
                            <Col span={16}><Form.Item label="Bairro"><Input value={pdv.deliveryNeighborhood} onChange={(e) => pdv.setDeliveryNeighborhood(e.target.value)} placeholder="Bairro" /></Form.Item></Col>
                          </Row>
                          <Row gutter={8}>
                            <Col span={18}><Form.Item label="Cidade"><Input value={pdv.deliveryCity} onChange={(e) => pdv.setDeliveryCity(e.target.value)} placeholder="Cidade" /></Form.Item></Col>
                            <Col span={6}><Form.Item label="UF"><Input value={pdv.deliveryState} onChange={(e) => pdv.setDeliveryState(e.target.value)} placeholder="UF" maxLength={2} /></Form.Item></Col>
                          </Row>
                          <Form.Item label="Instruções"><Input.TextArea value={pdv.deliveryInstructions} onChange={(e) => pdv.setDeliveryInstructions(e.target.value)} placeholder="Opcional" rows={2} /></Form.Item>
                          <Form.Item><Checkbox checked={pdv.createDeliveryWithSale} onChange={(e) => pdv.setCreateDeliveryWithSale(e.target.checked)}>Criar entrega automaticamente</Checkbox></Form.Item>
                        </Form>
                      ),
                    }]}
                  />
                )}
              </Form>
            </Card>

            <Card size="small" className="pdv-card" style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, color: '#667085', fontSize: 13 }}>Observações</div>
              <Input.TextArea value={pdv.notes} onChange={(e) => pdv.setNotes(e.target.value)} placeholder="Opcional" rows={2} />
            </Card>
          </Col>

          <Col xs={24} lg={14} xl={16} className="pdv-produtos-col">
            <Card title="Produtos" size="small" className="pdv-card pdv-cart-card">
              {pdv.cart.length === 0 ? (
                <Empty description="Carrinho vazio. Digite o código ou nome do produto para adicionar." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  dataSource={pdv.cart.map((c) => ({ ...c, key: c.productId }))}
                  columns={[
                    { title: '#', width: 40, align: 'center', render: (_, __, i) => i + 1 },
                    { title: 'Produto', dataIndex: 'productName', ellipsis: true },
                    {
                      title: 'Qtd',
                      width: 115,
                      align: 'center',
                      render: (_, record) => (
                        <Space.Compact size="small">
                          <Button size="small" icon={<MinusOutlined />} onClick={() => pdv.updateCartItem(record.productId, 'quantity', Math.max(0.1, (record.quantity || 1) - 1))} />
                          <InputNumber min={0.1} step={0.1} value={record.quantity} onChange={(v) => pdv.updateCartItem(record.productId, 'quantity', v ?? 1)} size="small" controls={false} className="pdv-qty-input" />
                          <Button size="small" icon={<PlusOutlined />} onClick={() => pdv.updateCartItem(record.productId, 'quantity', (record.quantity || 1) + 1)} />
                        </Space.Compact>
                      ),
                    },
                    { title: 'Unit.', width: 90, align: 'right', render: (_, r) => formatPrice(r.unitPrice) },
                    { title: 'Total', width: 100, align: 'right', render: (_, r) => <Text strong>{formatPrice(r.unitPrice * (r.quantity || 1) - (r.discountAmount || 0))}</Text> },
                    { title: '', width: 40, render: (_, r) => <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => pdv.removeFromCart(r.productId)} /> },
                  ]}
                  pagination={false}
                  size="small"
                  scroll={{ x: 400 }}
                />
              )}
              {pdv.cart.length > 0 && (
                <div className="pdv-cart-footer">
                  <Button type="link" onClick={pdv.openCustomerModal}>Cliente</Button>
                  <Button type="link" danger onClick={() => pdv.cart.length > 0 && pdv.removeFromCart(pdv.cart[pdv.cart.length - 1].productId)}>Cancelar último (F10)</Button>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      <Modal title="Cliente" open={pdv.customerModalOpen} onCancel={pdv.closeCustomerModal} footer={null} width={440} destroyOnClose>
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input placeholder="Buscar por nome, CPF ou CNPJ" value={pdv.customerSearch} onChange={(e) => pdv.setCustomerSearch(e.target.value)} onPressEnter={pdv.searchCustomer} allowClear />
            <Button type="primary" icon={<SearchOutlined />} onClick={pdv.searchCustomer} loading={pdv.loadingCustomerSearch}>Buscar</Button>
          </Space.Compact>
        </div>
        {pdv.customerResults.length > 0 ? (
          <div className="pdv-customer-list">
            {pdv.customerResults.map((c) => (
              <div key={c.id} className="pdv-customer-item" onClick={() => pdv.selectCustomer(c)} role="button" tabIndex={0}>
                <div>{c.name}</div>
                {(c.document || c.phone) && <Text type="secondary" style={{ fontSize: 12 }}>{[c.document, c.phone].filter(Boolean).join(' · ')}</Text>}
              </div>
            ))}
          </div>
        ) : pdv.customerSearched ? (
          <Form layout="vertical" onFinish={pdv.createCustomerAndSelect}>
            <Form.Item name="name" label="Nome" rules={[{ required: true }, { max: 255 }]}>
              <Input placeholder="Nome do cliente" />
            </Form.Item>
            <Form.Item name="document" label="CPF/CNPJ (opcional)">
              <Input placeholder="Documento" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={pdv.loadingCustomerCreate}>Cadastrar e selecionar</Button>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: 24 }}><Text type="secondary">Digite nome, CPF ou CNPJ para buscar.</Text></div>
        )}
      </Modal>

      <Modal title={<><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Venda registrada!</>} open={pdv.successModalOpen} onCancel={pdv.closeSuccessModal} footer={null} width={400} centered>
        {pdv.lastSale && (
          <div>
            <p><strong>Venda {pdv.lastSale.saleNumber}</strong></p>
            <p>{formatPrice(pdv.lastSale.total)}</p>
            {pdv.lastDelivery && <p style={{ color: '#52c41a' }}>Entrega {pdv.lastDelivery.deliveryNumber} criada.</p>}
            {pdv.lastSale?.status === 'OPEN' && (
              <Alert type="info" message="Venda pendente" description="Adicione o pagamento em Consultar vendas para concluir e gerar cupom, NF-e ou comprovante." style={{ marginBottom: 12 }} showIcon />
            )}
            <Divider />
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {pdv.lastSale.status !== 'OPEN' && pdv.lastSale.canEmitFiscalReceipt && <Button block icon={<FilePdfOutlined />} onClick={pdv.handleDownloadFiscal} loading={pdv.loadingFiscalReceipt}>Cupom fiscal (NFC-e)</Button>}
              {pdv.lastSale.status !== 'OPEN' && pdv.lastSale.canEmitNfe && <Button block icon={<FilePdfOutlined />} onClick={pdv.handleDownloadNfe} loading={pdv.loadingNfe}>NF-e (imprimir e salvar)</Button>}
              {pdv.lastSale.status !== 'OPEN' && pdv.lastSale.canEmitSimpleReceipt && <Button block icon={<FilePdfOutlined />} onClick={pdv.handleDownloadSimple} loading={pdv.loadingSimpleReceipt}>Comprovante</Button>}
              {pdv.lastDelivery && <Button block icon={<CarOutlined />} onClick={pdv.goToDeliveries}>Ir para Entregas</Button>}
              <Button block onClick={pdv.closeSuccessModal}>Nova venda</Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  )
}
