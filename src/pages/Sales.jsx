import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  InputNumber,
  Divider,
  Space,
  message,
  Modal,
  Form,
  Collapse,
  DatePicker,
  Checkbox,
} from 'antd'
import {
  ShoppingCartOutlined,
  BarcodeOutlined,
  SearchOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  UserAddOutlined,
  FilePdfOutlined,
  CheckCircleOutlined,
  CarOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { searchProducts } from '../services/productService'
import {
  createSale,
  downloadFiscalReceiptPdf,
  downloadSimpleReceiptPdf,
  downloadNfePdf,
  SALE_TYPE_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../services/salesService'
import * as tenantService from '../services/tenantService'
import * as customerService from '../services/customerService'
import * as deliveryService from '../services/deliveryService'
import dayjs from 'dayjs'
import './Sales.css'

function formatPrice(value) {
  if (value == null) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function Sales() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isRoot = user?.isRoot === true

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [cart, setCart] = useState([])
  const [saleType, setSaleType] = useState('PDV')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [installmentsCount, setInstallmentsCount] = useState(1)
  const [tenantConfig, setTenantConfig] = useState({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null })
  const [amountReceived, setAmountReceived] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryComplement, setDeliveryComplement] = useState('')
  const [deliveryZipCode, setDeliveryZipCode] = useState('')
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('')
  const [deliveryCity, setDeliveryCity] = useState('')
  const [deliveryState, setDeliveryState] = useState('')
  const [deliveryPriority, setDeliveryPriority] = useState('NORMAL')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [deliveryScheduledAt, setDeliveryScheduledAt] = useState(null)
  const [createDeliveryWithSale, setCreateDeliveryWithSale] = useState(true)

  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false)
  const [loadingCustomerCreate, setLoadingCustomerCreate] = useState(false)
  const [customerSearched, setCustomerSearched] = useState(false)
  const [customerForm] = Form.useForm()
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const pdvUrl = import.meta.env.VITE_PDV_URL || ''
  const [salesFormExpanded, setSalesFormExpanded] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [lastDelivery, setLastDelivery] = useState(null)
  const [loadingFiscalReceipt, setLoadingFiscalReceipt] = useState(false)
  const [loadingSimpleReceipt, setLoadingSimpleReceipt] = useState(false)
  const [loadingNfe, setLoadingNfe] = useState(false)

  const searchInputRef = useRef(null)

  const effectiveTenantId = isRoot ? selectedTenantId : user?.tenantId

  const loadTenants = useCallback(async () => {
    if (!isRoot) return
    try {
      const data = await tenantService.listTenants()
      setTenants(data || [])
      if (data?.length && !selectedTenantId) setSelectedTenantId(data[0].id)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar empresas.')
    }
  }, [isRoot])

  const searchProduct = useCallback(async () => {
    const q = productSearch?.trim()
    if (!q) {
      setProductResults([])
      return
    }
    if (!effectiveTenantId && isRoot) {
      message.warning('Selecione a empresa.')
      return
    }
    setLoadingProducts(true)
    try {
      const filter = { search: q, active: true, size: 20, page: 0 }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      const res = await searchProducts(filter)
      setProductResults(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao buscar produtos.')
      setProductResults([])
    } finally {
      setLoadingProducts(false)
    }
  }, [productSearch, effectiveTenantId, isRoot])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
    }
  }, [])

  useEffect(() => {
    if (!effectiveTenantId) {
      setTenantConfig({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null })
      return
    }
    if (isRoot) {
      const t = tenants.find((x) => x.id === effectiveTenantId)
      if (t) setTenantConfig({
        maxInstallments: t.maxInstallments ?? 12,
        maxInstallmentsNoInterest: t.maxInstallmentsNoInterest ?? 1,
        interestRatePercent: t.interestRatePercent ?? 0,
        cardFeeType: t.cardFeeType || null,
        cardFeeValue: t.cardFeeValue ?? null,
      })
      return
    }
    tenantService.getCurrentTenant().then((t) => {
      setTenantConfig({
        maxInstallments: t.maxInstallments ?? 12,
        maxInstallmentsNoInterest: t.maxInstallmentsNoInterest ?? 1,
        interestRatePercent: t.interestRatePercent ?? 0,
        cardFeeType: t.cardFeeType || null,
        cardFeeValue: t.cardFeeValue ?? null,
      })
    }).catch(() => setTenantConfig({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null }))
  }, [effectiveTenantId, isRoot, tenants])

  const searchCustomer = useCallback(async () => {
    const q = customerSearch?.trim()
    if (!q) {
      setCustomerResults([])
      setCustomerSearched(false)
      return
    }
    if (!effectiveTenantId && isRoot) {
      message.warning('Selecione a empresa.')
      return
    }
    setLoadingCustomerSearch(true)
    try {
      const filter = { search: q, active: true, size: 20, page: 0 }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      const res = await customerService.searchCustomers(filter)
      setCustomerResults(res?.content ?? [])
      setCustomerSearched(true)
    } catch (e) {
      message.error(e?.message || 'Erro ao buscar clientes.')
      setCustomerResults([])
      setCustomerSearched(true)
    } finally {
      setLoadingCustomerSearch(false)
    }
  }, [customerSearch, effectiveTenantId, isRoot])

  const openCustomerModal = () => {
    setCustomerModalOpen(true)
    setCustomerSearch('')
    setCustomerResults([])
    setCustomerSearched(false)
    customerForm.resetFields()
  }

  const closeCustomerModal = () => {
    setCustomerModalOpen(false)
    setCustomerSearch('')
    setCustomerResults([])
    setCustomerSearched(false)
    customerForm.resetFields()
  }

  const fillDeliveryFromCustomer = useCallback((customer) => {
    if (!customer) return
    const street = customer.addressStreet ?? customer.address_street ?? ''
    const number = customer.addressNumber ?? customer.address_number ?? ''
    const streetPart = [street, number].filter(Boolean).join(', ')
    setDeliveryAddress(streetPart || '')
    setDeliveryComplement(customer.addressComplement ?? customer.address_complement ?? '')
    setDeliveryNeighborhood(customer.addressNeighborhood ?? customer.address_neighborhood ?? '')
    setDeliveryZipCode(customer.addressZip ?? customer.address_zip ?? '')
    setDeliveryCity(customer.addressCity ?? customer.address_city ?? '')
    const state = customer.addressState ?? customer.address_state ?? ''
    setDeliveryState(state.toString().toUpperCase().slice(0, 2))
  }, [])

  useEffect(() => {
    if (saleType === 'DELIVERY' && selectedCustomer) fillDeliveryFromCustomer(selectedCustomer)
  }, [saleType, selectedCustomer, fillDeliveryFromCustomer])

  const selectCustomer = async (customer) => {
    closeCustomerModal()
    setCustomerName(customer.name)
    let customerToUse = customer
    if (saleType === 'DELIVERY' && customer?.id) {
      try {
        const full = await customerService.getCustomerById(customer.id)
        customerToUse = full
        setSelectedCustomer(full)
      } catch {
        setSelectedCustomer(customer)
      }
    } else {
      setSelectedCustomer(customer)
    }
    if (saleType === 'DELIVERY') fillDeliveryFromCustomer(customerToUse)
  }

  const createCustomerAndSelect = async () => {
    try {
      const values = await customerForm.validateFields()
      setLoadingCustomerCreate(true)
      const payload = {
        name: values.name?.trim(),
        document: values.document?.trim() || undefined,
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      const created = await customerService.createCustomer(payload)
      setCustomerName(created.name)
      setSelectedCustomer(created)
      if (saleType === 'DELIVERY') fillDeliveryFromCustomer(created)
      message.success('Cliente cadastrado!')
      closeCustomerModal()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.message || 'Erro ao cadastrar cliente.')
    } finally {
      setLoadingCustomerCreate(false)
    }
  }

  const addToCart = (product, qty = 1) => {
    const unitPrice = product.discountPrice ?? product.unitPrice ?? 0
    const existing = cart.find((c) => c.productId === product.id)
    if (existing) {
      setCart(cart.map((c) => (c.productId === product.id ? { ...c, quantity: (c.quantity || 1) + qty } : c)))
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          unitOfMeasure: product.unitOfMeasure || 'UN',
          unitPrice: Number(unitPrice),
          quantity: qty,
          discountAmount: 0,
          discountPercent: 0,
        },
      ])
    }
    setProductSearch('')
    setProductResults([])
    searchInputRef.current?.focus?.()
  }

  const updateCartItem = (productId, field, value) => {
    setCart(cart.map((c) => (c.productId === productId ? { ...c, [field]: value } : c)))
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter((c) => c.productId !== productId))
  }

  const subtotal = cart.reduce((acc, c) => acc + (c.unitPrice * (c.quantity || 1) - (c.discountAmount || 0)), 0)
  const saleDiscount = discountPercent > 0 ? subtotal * (discountPercent / 100) : (discountAmount || 0)
  const total = Math.max(0, subtotal - saleDiscount + (deliveryFee || 0))

  const installmentsCalc = paymentMethod === 'CREDIT_CARD' && installmentsCount > 0 ? (() => {
    const maxNoInterest = tenantConfig.maxInstallmentsNoInterest ?? 1
    const interestPercent = Number(tenantConfig.interestRatePercent) || 0
    const n = installmentsCount
    let totalWithInterest = total
    if (n > maxNoInterest && interestPercent > 0) {
      const i = interestPercent / 100
      const periodosComJuros = n - maxNoInterest
      totalWithInterest = total * Math.pow(1 + i, periodosComJuros)
    }
    const installmentValue = totalWithInterest / n
    let cardFee = 0
    if (tenantConfig.cardFeeType === 'PERCENTAGE' && tenantConfig.cardFeeValue != null) {
      cardFee = totalWithInterest * (Number(tenantConfig.cardFeeValue) / 100)
    } else if (tenantConfig.cardFeeType === 'FIXED_AMOUNT' && tenantConfig.cardFeeValue != null) {
      cardFee = Number(tenantConfig.cardFeeValue)
    }
    return { totalWithInterest, installmentValue, cardFee }
  })() : null

  const resetForm = () => {
    setCart([])
    setDiscountAmount(0)
    setDiscountPercent(0)
    setDeliveryFee(0)
    setInstallmentsCount(1)
    setAmountReceived(null)
    setCustomerName('')
    setSelectedCustomer(null)
    setNotes('')
    setPaymentMethod('PIX')
    setSaleType('PDV')
    setDeliveryAddress('')
    setDeliveryComplement('')
    setDeliveryZipCode('')
    setDeliveryNeighborhood('')
    setDeliveryCity('')
    setDeliveryState('')
    setDeliveryPriority('NORMAL')
    setDeliveryInstructions('')
    setDeliveryScheduledAt(null)
    setCreateDeliveryWithSale(true)
  }

  const handleFinish = async () => {
    if (cart.length === 0) {
      message.warning('Adicione pelo menos um produto ao carrinho.')
      return
    }
    if (!effectiveTenantId && isRoot) {
      message.warning('Selecione a empresa da venda.')
      return
    }
    const valorRecebido = amountReceived != null ? amountReceived : total
    if (valorRecebido < total) {
      message.warning('O valor recebido não pode ser menor que o total da venda. Informe um valor igual ou maior que o total.')
      return
    }
    setSubmitting(true)
    try {
      const items = cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity || 1,
        discountAmount: c.discountAmount || 0,
        discountPercent: c.discountPercent || 0,
      }))
      const payload = {
        saleType,
        items,
        discountAmount: saleDiscount > 0 && discountPercent === 0 ? saleDiscount : undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        paymentMethod,
        amountReceived: amountReceived != null ? amountReceived : total,
        customerName: customerName?.trim() || undefined,
        notes: notes?.trim() || undefined,
      }
      if (saleType === 'DELIVERY') {
        if (deliveryAddress?.trim()) payload.deliveryAddress = deliveryAddress.trim()
        if (deliveryComplement?.trim()) payload.deliveryComplement = deliveryComplement.trim()
        if (deliveryZipCode?.trim()) payload.deliveryZipCode = deliveryZipCode.trim()
        if (deliveryNeighborhood?.trim()) payload.deliveryNeighborhood = deliveryNeighborhood.trim()
        if (deliveryCity?.trim()) payload.deliveryCity = deliveryCity.trim()
        if (deliveryState?.trim()) payload.deliveryState = deliveryState.trim().toUpperCase().slice(0, 2)
      }
      if (paymentMethod === 'CREDIT_CARD' && installmentsCount > 0) payload.installmentsCount = installmentsCount
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      const sale = await createSale(payload)
      setLastSale(sale)
      setLastDelivery(null)
      if (saleType === 'DELIVERY' && sale?.id && createDeliveryWithSale) {
        try {
          const deliveryPayload = {
            saleId: sale.id,
            priority: deliveryPriority || 'NORMAL',
            ...(deliveryInstructions?.trim() ? { instructions: deliveryInstructions.trim() } : {}),
            ...(deliveryScheduledAt ? { scheduledAt: dayjs(deliveryScheduledAt).toISOString() } : {}),
            ...(isRoot && effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
          }
          const delivery = await deliveryService.createDelivery(deliveryPayload)
          setLastDelivery(delivery)
        } catch (e) {
          message.warning('Venda registrada, mas entrega não foi criada: ' + (e?.message || 'Erro'))
        }
      }
      resetForm()
      setSuccessModalOpen(true)
    } catch (e) {
      message.error(e?.message || 'Erro ao registrar venda.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadFiscal = async () => {
    if (!lastSale?.id) return
    setLoadingFiscalReceipt(true)
    try {
      await downloadFiscalReceiptPdf(lastSale.id, lastSale.saleNumber)
      message.success('Cupom fiscal gerado!')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar cupom fiscal.')
    } finally {
      setLoadingFiscalReceipt(false)
    }
  }

  const handleDownloadSimple = async () => {
    if (!lastSale?.id) return
    setLoadingSimpleReceipt(true)
    try {
      await downloadSimpleReceiptPdf(lastSale.id, lastSale.saleNumber)
      message.success('Comprovante gerado!')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar comprovante.')
    } finally {
      setLoadingSimpleReceipt(false)
    }
  }

  const handleDownloadNfe = async () => {
    if (!lastSale?.id) return
    setLoadingNfe(true)
    try {
      await downloadNfePdf(lastSale.id, lastSale.saleNumber)
      message.success('NF-e gerada!')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar NF-e.')
    } finally {
      setLoadingNfe(false)
    }
  }

  const closeSuccessModal = () => {
    setSuccessModalOpen(false)
    setLastSale(null)
    setLastDelivery(null)
    setLoadingFiscalReceipt(false)
    setLoadingSimpleReceipt(false)
    setLoadingNfe(false)
    searchInputRef.current?.focus?.()
  }

  const goToDeliveries = () => {
    closeSuccessModal()
    navigate('/delivery')
  }

  return (
    <div className="sales-page">
      <main className="sales-main">
        <div className="sales-container">
          {!salesFormExpanded ? (
            <Card className="sales-pdv-cta-card">
              <div className="sales-pdv-cta-content">
                <div className="sales-pdv-cta-icon">
                  <AppstoreOutlined />
                </div>
                <h2 className="sales-pdv-cta-title">Nova venda</h2>
                <p className="sales-pdv-cta-message">
                  Para registrar vendas com agilidade, use o sistema PDV. Clique no botão abaixo para abrir o PDV em nova guia.
                </p>
                <Button
                  type="primary"
                  size="large"
                  icon={<AppstoreOutlined />}
                  onClick={() => pdvUrl ? window.open(pdvUrl, '_blank') : message.warning('Configure VITE_PDV_URL para abrir o PDV em nova guia.')}
                  className="sales-pdv-cta-btn"
                >
                  Abrir PDV (nova guia)
                </Button>
              </div>
            </Card>
          ) : (
            <>
          <header className="sales-header">
            <div className="sales-header-top">
              <div className="sales-header-title">
                <h1>Nova venda</h1>
                <p>Registre vendas rapidamente. Pesquise produtos pelo código de barras ou nome.</p>
              </div>
              <Space wrap>
                <Button
                  type="primary"
                  ghost
                  icon={<AppstoreOutlined />}
                  onClick={() => pdvUrl ? window.open(pdvUrl, '_blank') : message.warning('Configure VITE_PDV_URL para abrir o PDV em nova guia.')}
                  size="large"
                >
                  Abrir PDV (nova guia)
                </Button>
                {isRoot && (
                <Select
                  placeholder="Empresa"
                  options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                  value={selectedTenantId}
                  onChange={setSelectedTenantId}
                  className="sales-tenant-select"
                />
                )}
              </Space>
            </div>

            <div className="sales-search-bar">
              <Input
                ref={searchInputRef}
                placeholder="Digite o código de barras ou nome do produto e pressione Enter"
                prefix={<BarcodeOutlined className="sales-search-icon" />}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onPressEnter={searchProduct}
                allowClear
                size="large"
                className="sales-search-input"
              />
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={searchProduct}
                loading={loadingProducts}
                className="sales-search-btn"
              >
                Buscar
              </Button>
            </div>
          </header>

          {productResults.length > 0 && (
            <Card className="sales-results-card" title={`Produtos encontrados (${productResults.length})`}>
              <div className="sales-results-grid">
                {productResults.map((p) => {
                  const price = p.discountPrice ?? p.unitPrice ?? 0
                  return (
                    <div
                      key={p.id}
                      className="sales-result-item"
                      onClick={() => addToCart(p)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && addToCart(p)}
                    >
                      <div className="sales-result-item-info">
                        <span className="sales-result-item-name">{p.name}</span>
                        <span className="sales-result-item-meta">
                          {p.barcode && `EAN: ${p.barcode}`}
                          <strong>{formatPrice(price)}</strong>
                        </span>
                      </div>
                      <Button type="primary" size="small" icon={<PlusOutlined />} className="sales-result-item-btn">
                        Adicionar
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {cart.length > 0 ? (
            <div className="sales-content">
              <Card className="sales-cart-card" title={<span><ShoppingCartOutlined /> Carrinho</span>}>
                <div className="sales-cart-list">
                  {cart.map((c) => {
                    const itemSubtotal = c.unitPrice * (c.quantity || 1) - (c.discountAmount || 0)
                    return (
                      <div key={c.productId} className="sales-cart-item">
                        <div className="sales-cart-item-main">
                          <span className="sales-cart-item-name">{c.productName}</span>
                          <div className="sales-cart-item-row">
                            <InputNumber
                              min={0.001}
                              step={0.1}
                              value={c.quantity}
                              onChange={(v) => updateCartItem(c.productId, 'quantity', v ?? 1)}
                              size="small"
                            />
                            <span>× {formatPrice(c.unitPrice)}</span>
                          </div>
                        </div>
                        <div className="sales-cart-item-right">
                          <span className="sales-cart-item-total">{formatPrice(itemSubtotal)}</span>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeFromCart(c.productId)} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Divider />

                <Collapse
                  defaultActiveKey={['payment']}
                  items={[
                    {
                      key: 'payment',
                      label: (
                        <span className="sales-collapse-label">
                          <DollarOutlined /> Dados do pagamento e finalização
                        </span>
                      ),
                      children: (
                        <div className="sales-payment-form">
                          <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12} md={6}>
                              <label>Tipo de venda</label>
                              <Select value={saleType} onChange={setSaleType} options={SALE_TYPE_OPTIONS} style={{ width: '100%' }} />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>Forma de pagamento</label>
                              <Select
                                value={paymentMethod}
                                onChange={(v) => { setPaymentMethod(v); if (v !== 'CREDIT_CARD') setInstallmentsCount(1) }}
                                options={PAYMENT_METHOD_OPTIONS}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            {paymentMethod === 'CREDIT_CARD' && (
                              <>
                                <Col xs={24} sm={12} md={6}>
                                  <label>Parcelas</label>
                                  <Select
                                    value={installmentsCount}
                                    onChange={setInstallmentsCount}
                                    style={{ width: '100%' }}
                                    options={Array.from({ length: Math.max(1, tenantConfig.maxInstallments || 12) }, (_, i) => i + 1).map((n) => ({
                                      value: n,
                                      label: n <= (tenantConfig.maxInstallmentsNoInterest || 1) ? `${n}x sem juros` : `${n}x`,
                                    }))}
                                  />
                                </Col>
                                {installmentsCalc && (
                                  <Col xs={24} sm={12} md={6}>
                                    <div className="sales-installment-info">
                                      <strong>Parcela:</strong> {formatPrice(installmentsCalc.installmentValue)}
                                      {installmentsCalc.totalWithInterest > total && (
                                        <span> (Total c/ juros: {formatPrice(installmentsCalc.totalWithInterest)})</span>
                                      )}
                                    </div>
                                  </Col>
                                )}
                              </>
                            )}
                          </Row>

                          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                            <Col xs={24} sm={8} md={6}>
                              <label>Desconto (R$)</label>
                              <InputNumber
                                min={0}
                                value={discountAmount}
                                onChange={(v) => { setDiscountAmount(v ?? 0); setDiscountPercent(0) }}
                                style={{ width: '100%' }}
                                prefix="R$"
                              />
                            </Col>
                            <Col xs={24} sm={8} md={6}>
                              <label>Desconto (%)</label>
                              <InputNumber
                                min={0}
                                max={100}
                                value={discountPercent}
                                onChange={(v) => { setDiscountPercent(v ?? 0); setDiscountAmount(0) }}
                                style={{ width: '100%' }}
                                addonAfter="%"
                              />
                            </Col>
                            <Col xs={24} sm={8} md={6}>
                              <label>Taxa de entrega</label>
                              <InputNumber min={0} value={deliveryFee} onChange={(v) => setDeliveryFee(v ?? 0)} style={{ width: '100%' }} prefix="R$" />
                            </Col>
                          </Row>

                          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                            <Col xs={24} sm={12} md={8}>
                              <label>Cliente</label>
                              <Space.Compact style={{ width: '100%' }}>
                                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome (opcional)" />
                                <Button type="default" icon={<UserAddOutlined />} onClick={openCustomerModal} title="Buscar ou cadastrar" />
                              </Space.Compact>
                            </Col>
                            {saleType === 'DELIVERY' && (
                              <Col xs={24}>
                                <Collapse
                                  size="small"
                                  defaultActiveKey={['address', 'config']}
                                  items={[
                                    {
                                      key: 'address',
                                      label: 'Endereço de entrega',
                                      children: (
                                        <Row gutter={[16, 16]}>
                                          <Col xs={24} sm={12}>
                                            <label>Endereço</label>
                                            <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Rua, nº, bairro" />
                                          </Col>
                                          <Col xs={24} sm={12}>
                                            <label>Complemento</label>
                                            <Input value={deliveryComplement} onChange={(e) => setDeliveryComplement(e.target.value)} placeholder="Apto, bloco, ref." />
                                          </Col>
                                          <Col xs={24} sm={12}>
                                            <label>Bairro</label>
                                            <Input value={deliveryNeighborhood} onChange={(e) => setDeliveryNeighborhood(e.target.value)} placeholder="Bairro" />
                                          </Col>
                                          <Col xs={24} sm={8}>
                                            <label>CEP</label>
                                            <Input value={deliveryZipCode} onChange={(e) => setDeliveryZipCode(e.target.value)} placeholder="00000-000" maxLength={10} />
                                          </Col>
                                          <Col xs={24} sm={8}>
                                            <label>Cidade</label>
                                            <Input value={deliveryCity} onChange={(e) => setDeliveryCity(e.target.value)} placeholder="Cidade" />
                                          </Col>
                                          <Col xs={24} sm={8}>
                                            <label>UF</label>
                                            <Input value={deliveryState} onChange={(e) => setDeliveryState(e.target.value)} placeholder="UF" maxLength={2} style={{ textTransform: 'uppercase' }} />
                                          </Col>
                                        </Row>
                                      ),
                                    },
                                    {
                                      key: 'config',
                                      label: 'Configuração da entrega',
                                      children: (
                                        <Row gutter={[16, 16]}>
                                          <Col xs={24} sm={12} md={8}>
                                            <label>Prioridade</label>
                                            <Select
                                              value={deliveryPriority}
                                              onChange={setDeliveryPriority}
                                              options={[
                                                { value: 'LOW', label: 'Baixa' },
                                                { value: 'NORMAL', label: 'Normal' },
                                                { value: 'HIGH', label: 'Alta' },
                                                { value: 'URGENT', label: 'Urgente' },
                                              ]}
                                              style={{ width: '100%' }}
                                            />
                                          </Col>
                                          <Col xs={24} sm={12} md={8}>
                                            <label>Data prevista</label>
                                            <DatePicker
                                              showTime
                                              value={deliveryScheduledAt ? dayjs(deliveryScheduledAt) : null}
                                              onChange={(d) => setDeliveryScheduledAt(d ? d.toDate() : null)}
                                              format="DD/MM/YYYY HH:mm"
                                              style={{ width: '100%' }}
                                              placeholder="Opcional"
                                            />
                                          </Col>
                                          <Col xs={24}>
                                            <label>Instruções para o entregador</label>
                                            <Input.TextArea
                                              value={deliveryInstructions}
                                              onChange={(e) => setDeliveryInstructions(e.target.value)}
                                              placeholder="Ex: tocar o interfone 2x, deixar com porteiro..."
                                              rows={2}
                                            />
                                          </Col>
                                          <Col xs={24}>
                                            <Checkbox
                                              checked={createDeliveryWithSale}
                                              onChange={(e) => setCreateDeliveryWithSale(e.target.checked)}
                                            >
                                              Criar entrega automaticamente ao finalizar a venda
                                            </Checkbox>
                                          </Col>
                                        </Row>
                                      ),
                                    },
                                  ]}
                                />
                              </Col>
                            )}
                            <Col xs={24} sm={12} md={8}>
                              <label>Valor recebido</label>
                              <InputNumber
                                min={0}
                                value={amountReceived}
                                onChange={setAmountReceived}
                                placeholder={formatPrice(total)}
                                style={{ width: '100%' }}
                                prefix="R$"
                              />
                            </Col>
                          </Row>

                          <div style={{ marginTop: 16 }}>
                            <label>Observações</label>
                            <Input.TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opcional" />
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />

                <div className="sales-totals-box">
                  <div className="sales-total-line">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {saleDiscount > 0 && (
                    <div className="sales-total-line sales-total-discount">
                      <span>Desconto</span>
                      <span>- {formatPrice(saleDiscount)}</span>
                    </div>
                  )}
                  {(deliveryFee || 0) > 0 && (
                    <div className="sales-total-line">
                      <span>Entrega</span>
                      <span>{formatPrice(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="sales-total-line sales-total-final">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {amountReceived != null && amountReceived > total && (
                    <div className="sales-total-line sales-total-change">
                      <span>Troco</span>
                      <span>{formatPrice(amountReceived - total)}</span>
                    </div>
                  )}
                </div>

                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleFinish}
                  loading={submitting}
                  className="sales-finish-btn"
                >
                  Finalizar venda
                </Button>
              </Card>
            </div>
          ) : (
            <Card className="sales-empty-state">
              <div className="sales-empty-icon">
                <ShoppingCartOutlined />
              </div>
              <h3>Nenhum produto no carrinho</h3>
              <p>Digite o código de barras ou nome do produto na barra de busca acima e pressione Enter para adicionar itens.</p>
            </Card>
          )}
            </>
          )}
        </div>
      </main>

      <Modal
        title="Cliente"
        open={customerModalOpen}
        onCancel={closeCustomerModal}
        footer={null}
        width={480}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Buscar por nome ou CPF"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onPressEnter={searchCustomer}
              allowClear
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={searchCustomer} loading={loadingCustomerSearch}>Buscar</Button>
          </Space.Compact>
        </div>
        {customerResults.length > 0 ? (
          <div className="sales-customer-results">
            {customerResults.map((c) => (
              <div key={c.id} className="sales-customer-item" onClick={() => selectCustomer(c)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && selectCustomer(c)}>
                <div className="sales-customer-item-name">{c.name}</div>
                {(c.document || c.phone) && (
                  <div className="sales-customer-item-meta">
                    {c.document && <span>CPF/CNPJ: {c.document}</span>}
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : customerSearched ? (
          <Form form={customerForm} layout="vertical" onFinish={createCustomerAndSelect}>
            <p style={{ marginBottom: 16, color: '#64748B' }}>Nenhum cliente encontrado. Cadastre um novo:</p>
            <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Nome é obrigatório' }, { max: 255 }]}>
              <Input placeholder="Nome do cliente" />
            </Form.Item>
            <Form.Item name="document" label="CPF/CNPJ (opcional)" rules={[{ max: 20 }]}>
              <Input placeholder="Documento" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loadingCustomerCreate}>Cadastrar e selecionar</Button>
            </Form.Item>
          </Form>
        ) : (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>Digite nome ou CPF para buscar.</p>
        )}
      </Modal>

      <Modal
        title={<><CheckCircleOutlined style={{ color: '#22c55e', marginRight: 8 }} />Venda registrada com sucesso!</>}
        open={successModalOpen}
        onCancel={closeSuccessModal}
        footer={null}
        width={420}
        centered
      >
        {lastSale && (
          <div className="sales-success-modal">
            <p className="sales-success-number">Venda <strong>{lastSale.saleNumber}</strong></p>
            <p className="sales-success-total">Total: {formatPrice(lastSale.total)}</p>
            {lastDelivery && (
              <p className="sales-success-delivery" style={{ marginTop: 8, color: '#22c55e' }}>
                Entrega <strong>{lastDelivery.deliveryNumber}</strong> criada automaticamente.
              </p>
            )}
            <Divider />
            <p style={{ marginBottom: 16, color: '#64748b', fontSize: 13 }}>Deseja gerar algum comprovante?</p>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              {lastSale.canEmitFiscalReceipt && (
                <Button
                  type="primary"
                  block
                  size="large"
                  icon={<FilePdfOutlined />}
                  onClick={handleDownloadFiscal}
                  loading={loadingFiscalReceipt}
                >
                  Gerar cupom fiscal (NFC-e)
                </Button>
              )}
              {lastSale.canEmitNfe && (
                <Button
                  block
                  size="large"
                  icon={<FilePdfOutlined />}
                  onClick={handleDownloadNfe}
                  loading={loadingNfe}
                >
                  Gerar NF-e
                </Button>
              )}
              {lastSale.canEmitSimpleReceipt && (
                <Button
                  block
                  size="large"
                  icon={<FilePdfOutlined />}
                  onClick={handleDownloadSimple}
                  loading={loadingSimpleReceipt}
                >
                  Gerar comprovante de venda
                </Button>
              )}
              {(!lastSale.canEmitFiscalReceipt && !lastSale.canEmitSimpleReceipt && !lastSale.canEmitNfe) && (
                <p style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum comprovante disponível para esta empresa.</p>
              )}
              {lastDelivery && (
                <Button
                  block
                  size="large"
                  icon={<CarOutlined />}
                  onClick={goToDeliveries}
                  style={{ marginBottom: 8 }}
                >
                  Ir para Entregas
                </Button>
              )}
              <Button block onClick={closeSuccessModal}>
                Fechar e iniciar nova venda
              </Button>
            </Space>
          </div>
        )}
      </Modal>

    </div>
  )
}
