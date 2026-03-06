import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { searchProducts } from '../services/productService'
import {
  createSale,
  downloadFiscalReceiptPdf,
  downloadSimpleReceiptPdf,
  downloadNfePdf,
} from '../services/salesService'
import * as tenantService from '../services/tenantService'
import * as cardMachineService from '../services/cardMachineService'
import * as customerService from '../services/customerService'
import * as deliveryService from '../services/deliveryService'
import * as registerService from '../services/registerService'
import dayjs from 'dayjs'

export function useSalesPDV() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
  const [cardMachines, setCardMachines] = useState([])
  const [selectedCardMachineId, setSelectedCardMachineId] = useState(null)
  const [cardBrand, setCardBrand] = useState('99')
  const [cardAuthorization, setCardAuthorization] = useState('')
  const [cardIntegrationType, setCardIntegrationType] = useState(2)
  const [amountReceived, setAmountReceived] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerDocument, setCustomerDocument] = useState('')
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
  const [saleStatus, setSaleStatus] = useState('COMPLETED')
  const [discountType, setDiscountType] = useState('amount')
  const [includeCpfOnNote, setIncludeCpfOnNote] = useState(false)

  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerResults, setCustomerResults] = useState([])
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false)
  const [loadingCustomerCreate, setLoadingCustomerCreate] = useState(false)
  const [customerSearched, setCustomerSearched] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [lastDelivery, setLastDelivery] = useState(null)
  const [loadingFiscalReceipt, setLoadingFiscalReceipt] = useState(false)
  const [loadingSimpleReceipt, setLoadingSimpleReceipt] = useState(false)
  const [loadingNfe, setLoadingNfe] = useState(false)
  const [tenantLogo, setTenantLogo] = useState(null)
  const [registers, setRegisters] = useState([])
  const [selectedRegisterId, setSelectedRegisterId] = useState(null)
  const [loadingStartSession, setLoadingStartSession] = useState(false)
  const [loadingEndSession, setLoadingEndSession] = useState(false)

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
    if (!q) { setProductResults([]); return }
    if (!effectiveTenantId && isRoot) { message.warning('Selecione a empresa.'); return }
    setLoadingProducts(true)
    try {
      const filter = { search: q, active: true, size: 50, page: 0 }
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
    if (!productSearch?.trim()) {
      setProductResults([])
      return
    }
    const t = setTimeout(() => { searchProduct() }, 300)
    return () => clearTimeout(t)
  }, [productSearch, searchProduct])

  useEffect(() => { if (isRoot) loadTenants() }, [isRoot, loadTenants])

  const loadRegisters = useCallback(async () => {
    if (!effectiveTenantId) { setRegisters([]); return }
    try {
      const data = await registerService.listRegisters(isRoot ? effectiveTenantId : null, true)
      setRegisters(Array.isArray(data) ? data : [])
    } catch {
      setRegisters([])
    }
  }, [effectiveTenantId, isRoot])

  useEffect(() => { loadRegisters() }, [loadRegisters])

  const handleRegisterChange = useCallback(async (registerId) => {
    if (selectedRegisterId && selectedRegisterId !== registerId) {
      setLoadingEndSession(true)
      try {
        await registerService.endSession(selectedRegisterId, isRoot ? effectiveTenantId : null)
        message.success('Sessão encerrada.')
      } catch (e) {
        message.error(e?.message || 'Erro ao encerrar sessão.')
        setLoadingEndSession(false)
        return
      } finally {
        setLoadingEndSession(false)
      }
    }
    if (!registerId) {
      setSelectedRegisterId(null)
      return
    }
    setLoadingStartSession(true)
    try {
      await registerService.startSession(registerId, isRoot ? effectiveTenantId : null)
      message.success('Sessão do PDV iniciada.')
      setSelectedRegisterId(registerId)
    } catch (e) {
      message.error(e?.message || 'Erro ao iniciar sessão.')
      setSelectedRegisterId(null)
    } finally {
      setLoadingStartSession(false)
    }
  }, [selectedRegisterId, effectiveTenantId, isRoot])

  const endSessionAndClear = useCallback(async () => {
    if (!selectedRegisterId) return
    setLoadingEndSession(true)
    try {
      await registerService.endSession(selectedRegisterId, isRoot ? effectiveTenantId : null)
      message.success('Sessão encerrada.')
      setSelectedRegisterId(null)
    } catch (e) {
      message.error(e?.message || 'Erro ao encerrar sessão.')
    } finally {
      setLoadingEndSession(false)
    }
  }, [selectedRegisterId, effectiveTenantId, isRoot])

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
      setTenantLogo(t?.logoUrl ?? null)
    }).catch(() => {
      setTenantConfig({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null })
      setTenantLogo(null)
    })
  }, [effectiveTenantId, isRoot, tenants])

  useEffect(() => {
    if (!isRoot) return
    if (!effectiveTenantId) {
      setTenantLogo(null)
      return
    }
    const t = tenants.find((x) => x.id === effectiveTenantId)
    setTenantLogo(t?.logoUrl ?? null)
  }, [effectiveTenantId, isRoot, tenants])

  useEffect(() => {
    if (!effectiveTenantId) {
      setCardMachines([])
      setSelectedCardMachineId(null)
      return
    }
    const load = async () => {
      try {
        const list = isRoot
          ? await cardMachineService.listActiveByTenant(effectiveTenantId)
          : await cardMachineService.listCurrentActive()
        setCardMachines(list || [])
        const defaultM = (list || []).find((m) => m.isDefault)
        setSelectedCardMachineId(defaultM?.id ?? (list?.[0]?.id ?? null))
      } catch {
        setCardMachines([])
        setSelectedCardMachineId(null)
      }
    }
    load()
  }, [effectiveTenantId, isRoot])

  const searchCustomer = useCallback(async () => {
    const q = customerSearch?.trim()
    if (!q) { setCustomerResults([]); setCustomerSearched(false); return }
    if (!effectiveTenantId && isRoot) { message.warning('Selecione a empresa.'); return }
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
  }

  const closeCustomerModal = () => {
    setCustomerModalOpen(false)
    setCustomerSearch('')
    setCustomerResults([])
    setCustomerSearched(false)
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

  const selectCustomer = useCallback(async (customer) => {
    closeCustomerModal()
    setCustomerName(customer.name)
    setCustomerDocument(customer.document || '')
    let customerToUse = customer
    if (saleType === 'DELIVERY' && customer?.id) {
      try {
        const full = await customerService.getCustomerById(customer.id)
        customerToUse = full
        setSelectedCustomer(full)
        setCustomerDocument(full.document || '')
      } catch {
        setSelectedCustomer(customer)
      }
    } else {
      setSelectedCustomer(customer)
    }
    if (saleType === 'DELIVERY') fillDeliveryFromCustomer(customerToUse)
  }, [saleType, fillDeliveryFromCustomer, closeCustomerModal])

  const addToCart = useCallback((product, qty = 1) => {
    const unitPrice = product.discountPrice ?? product.unitPrice ?? 0
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id)
      if (existing) {
        return prev.map((c) => (c.productId === product.id ? { ...c, quantity: (c.quantity || 1) + qty } : c))
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unitOfMeasure: product.unitOfMeasure || 'UN',
        unitPrice: Number(unitPrice),
        quantity: qty,
        discountAmount: 0,
        discountPercent: 0,
      }]
    })
    setProductSearch('')
    setProductResults([])
    searchInputRef.current?.focus?.()
  }, [])

  const updateCartItem = useCallback((productId, field, value) => {
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, [field]: value } : c)))
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId))
  }, [])

  const subtotal = cart.reduce((acc, c) => acc + (c.unitPrice * (c.quantity || 1) - (c.discountAmount || 0)), 0)
  const saleDiscount = discountPercent > 0 ? subtotal * (discountPercent / 100) : (discountAmount || 0)
  const deliveryValue = Number(deliveryFee) || 0
  const total = Math.max(0, subtotal - saleDiscount + deliveryValue)

  const selectedCardMachine = selectedCardMachineId ? cardMachines.find((m) => m.id === selectedCardMachineId) : null
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
    const feeType = selectedCardMachine?.feeType ?? tenantConfig.cardFeeType
    const feeValue = selectedCardMachine?.feeValue ?? tenantConfig.cardFeeValue
    if (feeType === 'PERCENTAGE' && feeValue != null) {
      cardFee = totalWithInterest * (Number(feeValue) / 100)
    } else if (feeType === 'FIXED_AMOUNT' && feeValue != null) {
      cardFee = Number(feeValue)
    }
    return { totalWithInterest, installmentValue, cardFee }
  })() : null

  const totalAPagar = installmentsCalc
    ? installmentsCalc.totalWithInterest + (installmentsCalc.cardFee || 0)
    : total

  const resetForm = useCallback(() => {
    setCart([])
    setDiscountAmount(0)
    setDiscountPercent(0)
    setDeliveryFee(0)
    setInstallmentsCount(1)
    setAmountReceived(null)
    setCustomerName('')
    setSelectedCustomer(null)
    setCustomerDocument('')
    setNotes('')
    setPaymentMethod('PIX')
    setCardBrand('99')
    setCardAuthorization('')
    setCardIntegrationType(2)
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
    setSaleStatus('COMPLETED')
    setDiscountType('amount')
    setIncludeCpfOnNote(false)
  }, [])

  const handleFinish = useCallback(async () => {
    if (cart.length === 0) { message.warning('Adicione pelo menos um produto ao carrinho.'); return }
    if (!effectiveTenantId && isRoot) { message.warning('Selecione a empresa da venda.'); return }
    const isOpen = saleStatus === 'OPEN'
    if (!isOpen) {
      const valorRecebido = amountReceived != null ? amountReceived : totalAPagar
      if (valorRecebido < totalAPagar) {
        message.warning('O valor recebido não pode ser menor que o total a pagar. Informe um valor igual ou maior que o total.')
        return
      }
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
        status: isOpen ? 'OPEN' : 'COMPLETED',
        discountAmount: saleDiscount > 0 && discountPercent === 0 ? saleDiscount : undefined,
        discountPercent: discountPercent > 0 ? discountPercent : undefined,
        deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
        customerName: customerName?.trim() || (selectedCustomer?.name ?? undefined),
        notes: notes?.trim() || undefined,
      }
      if (!isOpen) {
        payload.paymentMethod = paymentMethod
        payload.amountReceived = amountReceived != null ? amountReceived : totalAPagar
      }
      if (selectedCustomer?.id) payload.customerId = selectedCustomer.id
      if (customerDocument?.trim()) {
        const doc = String(customerDocument).trim().replace(/\D/g, '')
        if (doc.length === 11 || doc.length === 14) payload.customerDocument = doc
        else payload.customerDocument = customerDocument.trim()
      }
      if (saleType === 'DELIVERY') {
        if (deliveryAddress?.trim()) payload.deliveryAddress = deliveryAddress.trim()
        if (deliveryComplement?.trim()) payload.deliveryComplement = deliveryComplement.trim()
        if (deliveryZipCode?.trim()) payload.deliveryZipCode = deliveryZipCode.trim()
        if (deliveryNeighborhood?.trim()) payload.deliveryNeighborhood = deliveryNeighborhood.trim()
        if (deliveryCity?.trim()) payload.deliveryCity = deliveryCity.trim()
        if (deliveryState?.trim()) payload.deliveryState = deliveryState.trim().toUpperCase().slice(0, 2)
      }
      if (!isOpen) {
        if (paymentMethod === 'CREDIT_CARD' && installmentsCount > 0) payload.installmentsCount = installmentsCount
        if ((paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && selectedCardMachineId) {
          payload.cardMachineId = selectedCardMachineId
          payload.cardBrand = cardBrand || '99'
          if (cardAuthorization?.trim()) payload.cardAuthorization = cardAuthorization.trim()
          payload.cardIntegrationType = 2
        }
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      if (selectedRegisterId) payload.registerId = selectedRegisterId
      const sale = await createSale(payload)
      setLastSale(sale)
      setLastDelivery(null)
      if (saleType === 'DELIVERY' && sale?.id && createDeliveryWithSale) {
        try {
          const delivery = await deliveryService.createDelivery({
            saleId: sale.id,
            priority: deliveryPriority || 'NORMAL',
            ...(deliveryInstructions?.trim() ? { instructions: deliveryInstructions.trim() } : {}),
            ...(deliveryScheduledAt ? { scheduledAt: dayjs(deliveryScheduledAt).toISOString() } : {}),
            ...(isRoot && effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
          })
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
  }, [cart, saleType, saleStatus, saleDiscount, discountPercent, discountAmount, deliveryFee, paymentMethod, amountReceived, totalAPagar, total, customerName, customerDocument, notes, includeCpfOnNote, selectedCustomer, deliveryAddress, deliveryComplement, deliveryZipCode, deliveryNeighborhood, deliveryCity, deliveryState, installmentsCount, selectedCardMachineId, cardBrand, cardAuthorization, cardIntegrationType, deliveryPriority, deliveryInstructions, deliveryScheduledAt, createDeliveryWithSale, effectiveTenantId, isRoot, resetForm, selectedRegisterId])

  const handleDownloadFiscal = useCallback(async () => {
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
  }, [lastSale])

  const handleDownloadSimple = useCallback(async () => {
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
  }, [lastSale])

  const handleDownloadNfe = useCallback(async () => {
    if (!lastSale?.id) return
    setLoadingNfe(true)
    try {
      await downloadNfePdf(lastSale.id, lastSale.saleNumber)
      message.success('NF-e gerada e salva!')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar NF-e.')
    } finally {
      setLoadingNfe(false)
    }
  }, [lastSale])

  const closeSuccessModal = useCallback(() => {
    setSuccessModalOpen(false)
    setLastSale(null)
    setLastDelivery(null)
    setLoadingFiscalReceipt(false)
    setLoadingSimpleReceipt(false)
    setLoadingNfe(false)
    searchInputRef.current?.focus?.()
  }, [])

  const goToDeliveries = useCallback(() => {
    closeSuccessModal()
    navigate('/delivery')
  }, [closeSuccessModal, navigate])

  const createCustomerAndSelect = useCallback(async (values) => {
    setLoadingCustomerCreate(true)
    try {
      const payload = { name: values.name?.trim(), document: values.document?.trim() || undefined }
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
  }, [effectiveTenantId, isRoot, closeCustomerModal, saleType, fillDeliveryFromCustomer])

  return {
    isRoot,
    tenants,
    tenantLogo,
    selectedTenantId,
    setSelectedTenantId,
    registers,
    selectedRegisterId,
    handleRegisterChange,
    endSessionAndClear,
    loadingStartSession,
    loadingEndSession,
    productSearch,
    setProductSearch,
    productResults,
    setProductResults,
    loadingProducts,
    searchProduct,
    searchInputRef,
    cart,
    addToCart,
    updateCartItem,
    removeFromCart,
    saleType,
    setSaleType,
    saleStatus,
    setSaleStatus,
    discountAmount,
    setDiscountAmount,
    discountPercent,
    setDiscountPercent,
    discountType,
    setDiscountType,
    includeCpfOnNote,
    setIncludeCpfOnNote,
    deliveryFee,
    setDeliveryFee,
    paymentMethod,
    setPaymentMethod,
    installmentsCount,
    setInstallmentsCount,
    tenantConfig,
    cardMachines,
    selectedCardMachineId,
    setSelectedCardMachineId,
    cardBrand,
    setCardBrand,
    cardAuthorization,
    setCardAuthorization,
    cardIntegrationType,
    setCardIntegrationType,
    amountReceived,
    setAmountReceived,
    customerName,
    setCustomerName,
    customerDocument,
    setCustomerDocument,
    notes,
    setNotes,
    deliveryAddress,
    setDeliveryAddress,
    deliveryComplement,
    setDeliveryComplement,
    deliveryZipCode,
    setDeliveryZipCode,
    deliveryNeighborhood,
    setDeliveryNeighborhood,
    deliveryCity,
    setDeliveryCity,
    deliveryState,
    setDeliveryState,
    deliveryPriority,
    setDeliveryPriority,
    deliveryInstructions,
    setDeliveryInstructions,
    deliveryScheduledAt,
    setDeliveryScheduledAt,
    createDeliveryWithSale,
    setCreateDeliveryWithSale,
    subtotal,
    saleDiscount,
    total,
    totalAPagar,
    installmentsCalc,
    resetForm,
    submitting,
    handleFinish,
    effectiveTenantId,
    customerModalOpen,
    setCustomerModalOpen,
    customerSearch,
    setCustomerSearch,
    customerResults,
    loadingCustomerSearch,
    loadingCustomerCreate,
    customerSearched,
    searchCustomer,
    openCustomerModal,
    closeCustomerModal,
    selectCustomer,
    createCustomerAndSelect,
    successModalOpen,
    lastSale,
    lastDelivery,
    loadingFiscalReceipt,
    loadingSimpleReceipt,
    loadingNfe,
    handleDownloadFiscal,
    handleDownloadSimple,
    handleDownloadNfe,
    closeSuccessModal,
    goToDeliveries,
  }
}
