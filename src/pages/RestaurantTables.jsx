import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Table,
  Drawer,
  DatePicker,
  InputNumber,
  message,
  Space,
  Popconfirm,
  Tag,
  Tabs,
  Switch,
  Checkbox,
  List,
  Divider,
  Radio,
  Typography,
  Alert,
} from 'antd'
import {
  TableOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  EditOutlined,
  CalendarOutlined,
  TeamOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  MinusOutlined,
  CloseOutlined,
  CloseCircleOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import * as restaurantTablesService from '../services/restaurantTablesService'
import * as tenantService from '../services/tenantService'
import * as tableOrdersService from '../services/tableOrdersService'
import { searchProducts } from '../services/productService'
import { PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_OPTIONS_PDV } from '../services/salesService'
import * as cardMachineService from '../services/cardMachineService'
import './RestaurantTables.css'

const { TextArea } = Input
const { Text } = Typography

const CARD_BRAND_OPTIONS = [
  { value: '01', label: 'Visa' },
  { value: '02', label: 'Mastercard' },
  { value: '03', label: 'Amex' },
  { value: '04', label: 'Sorocred' },
  { value: '99', label: 'Outros' },
]

const TABLE_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Disponível', color: 'green' },
  { value: 'OCCUPIED', label: 'Ocupada', color: 'orange' },
  { value: 'RESERVED', label: 'Reservada', color: 'blue' },
  { value: 'MAINTENANCE', label: 'Manutenção', color: 'red' },
]

const RESERVATION_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente', color: 'orange' },
  { value: 'CONFIRMED', label: 'Confirmada', color: 'blue' },
  { value: 'SEATED', label: 'Cliente sentado', color: 'cyan' },
  { value: 'COMPLETED', label: 'Concluída', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelada', color: 'red' },
  { value: 'NO_SHOW', label: 'Não compareceu', color: 'default' },
]

function formatDateTime(val) {
  if (!val) return '-'
  return dayjs(val).format('DD/MM/YYYY HH:mm')
}

function CloseOrderPayNowForm({ form, currentOrder, tenantConfig, cardMachines, formatPrice, onFinish, closingOrder }) {
  const paymentMethod = Form.useWatch('paymentMethod', form) ?? 'PIX'
  const discountType = Form.useWatch('discountType', form) ?? 'amount'
  const discountAmount = Form.useWatch('discountAmount', form) ?? 0
  const discountPercent = Form.useWatch('discountPercent', form) ?? 0
  const installmentsCount = Form.useWatch('installmentsCount', form) ?? 1
  const cardMachineId = Form.useWatch('cardMachineId', form)

  const subtotal = (currentOrder?.items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
  const saleDiscount = discountType === 'percent' ? subtotal * (Number(discountPercent) || 0) / 100 : (Number(discountAmount) || 0)
  const total = Math.max(0, subtotal - saleDiscount)
  const selectedCardMachine = cardMachineId ? (cardMachines || []).find((m) => m.id === cardMachineId) : null
  const maxNoInterest = tenantConfig?.maxInstallmentsNoInterest ?? 1
  const interestPercent = Number(tenantConfig?.interestRatePercent) || 0
  const installmentsCalc = paymentMethod === 'CREDIT_CARD' && installmentsCount > 0 ? (() => {
    const n = installmentsCount
    let totalWithInterest = total
    if (n > maxNoInterest && interestPercent > 0) {
      const i = interestPercent / 100
      const periodosComJuros = n - maxNoInterest
      totalWithInterest = total * Math.pow(1 + i, periodosComJuros)
    }
    let cardFee = 0
    const feeType = selectedCardMachine?.feeType ?? tenantConfig?.cardFeeType
    const feeValue = selectedCardMachine?.feeValue ?? tenantConfig?.cardFeeValue
    if (feeType === 'PERCENTAGE' && feeValue != null) cardFee = totalWithInterest * (Number(feeValue) / 100)
    else if (feeType === 'FIXED_AMOUNT' && feeValue != null) cardFee = Number(feeValue)
    return { totalWithInterest, installmentValue: totalWithInterest / n, cardFee }
  })() : null
  const totalAPagar = installmentsCalc ? installmentsCalc.totalWithInterest + (installmentsCalc.cardFee || 0) : total
  const amountReceived = Form.useWatch('amountReceived', form)

  return (
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ paymentMethod: 'PIX', discountType: 'amount', discountAmount: 0, discountPercent: 0, installmentsCount: 1, cardBrand: '99' }}>
      <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary">Subtotal</Text>
          <Text type="secondary">{formatPrice(subtotal)}</Text>
        </div>
        {saleDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">Desconto</Text>
            <Text type="secondary">- {formatPrice(saleDiscount)}</Text>
          </div>
        )}
        {installmentsCalc && installmentsCalc.totalWithInterest > total && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">Juros (parcelado)</Text>
            <Text type="secondary">{formatPrice(installmentsCalc.totalWithInterest - total)}</Text>
          </div>
        )}
        {installmentsCalc && installmentsCalc.cardFee > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">Taxa cartão</Text>
            <Text type="secondary">{formatPrice(installmentsCalc.cardFee)}</Text>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <Text strong>Total</Text>
          <Text strong style={{ fontSize: 18 }}>{formatPrice(totalAPagar)}</Text>
        </div>
        {amountReceived != null && amountReceived > totalAPagar && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Text strong>Troco</Text>
            <Text strong style={{ fontSize: 18, color: '#52c41a' }}>{formatPrice(amountReceived - totalAPagar)}</Text>
          </div>
        )}
      </div>

      <Form.Item name="paymentMethod" label="Forma de pagamento" rules={[{ required: true }]}>
        <Select options={PAYMENT_METHOD_OPTIONS_PDV} onChange={(v) => { if (v !== 'CREDIT_CARD') form.setFieldValue('installmentsCount', 1) }} />
      </Form.Item>

      <Form.Item label="Desconto">
        <Radio.Group
          value={discountType}
          onChange={(e) => { form.setFieldValue('discountType', e.target.value); if (e.target.value === 'amount') form.setFieldValue('discountPercent', 0); else form.setFieldValue('discountAmount', 0) }}
        >
          <Radio value="amount">Valor (R$)</Radio>
          <Radio value="percent">Percentual (%)</Radio>
        </Radio.Group>
      </Form.Item>
      <Form.Item name="discountType" hidden><Input /></Form.Item>
      {discountType === 'amount' ? (
        <Form.Item name="discountAmount">
          <InputNumber min={0} style={{ width: '100%' }} prefix="R$" />
        </Form.Item>
      ) : (
        <Form.Item name="discountPercent">
          <InputNumber min={0} max={100} style={{ width: '100%' }} addonAfter="%" />
        </Form.Item>
      )}

      {(paymentMethod === 'CREDIT_CARD' || paymentMethod === 'DEBIT_CARD') && (
        <>
          <Form.Item name="cardMachineId" label="Maquininha">
            <Select
              placeholder="Selecione"
              options={(cardMachines || []).map((m) => ({ value: m.id, label: m.acquirerCnpj ? `${m.name} (CNPJ adq.)` : m.name }))}
              allowClear
            />
          </Form.Item>
          <Form.Item name="cardBrand" label="Bandeira do cartão">
            <Select options={CARD_BRAND_OPTIONS} />
          </Form.Item>
          <Form.Item name="cardAuthorization" label="Número da autorização">
            <Input placeholder="Código (até 20 caracteres)" maxLength={20} />
          </Form.Item>
          {paymentMethod === 'CREDIT_CARD' && (
            <>
              <Form.Item name="installmentsCount" label="Parcelas">
                <Select
                  options={Array.from({ length: Math.max(1, tenantConfig?.maxInstallments || 12) }, (_, i) => i + 1).map((n) => {
                    const maxNo = tenantConfig?.maxInstallmentsNoInterest ?? 1
                    const rate = Number(tenantConfig?.interestRatePercent) || 0
                    let tw = total
                    if (n > maxNo && rate > 0) tw = total * Math.pow(1 + rate / 100, n - maxNo)
                    return { value: n, label: n <= maxNo ? `${n}x sem juros` : `${n}x de ${formatPrice(tw / n)}` }
                  })}
                />
              </Form.Item>
              {installmentsCalc && (
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 8 }}>
                  Total a pagar: <strong>{formatPrice(totalAPagar)}</strong>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Form.Item name="amountReceived" label="Valor recebido">
        <InputNumber
          min={0}
          step={0.01}
          style={{ width: '100%' }}
          placeholder={formatPrice(totalAPagar)}
          prefix="R$"
          disabled={['CREDIT_CARD', 'DEBIT_CARD', 'PIX'].includes(paymentMethod)}
        />
      </Form.Item>

      <Form.Item name="customerName" label="Nome do cliente">
        <Input placeholder="Opcional" />
      </Form.Item>
      <Form.Item name="customerPhone" label="Telefone">
        <Input placeholder="Opcional" />
      </Form.Item>
      <Form.Item name="customerEmail" label="E-mail" hidden><Input /></Form.Item>
      <Form.Item name="notes" label="Observações">
        <Input.TextArea rows={2} placeholder="Opcional" />
      </Form.Item>
    </Form>
  )
}

export default function RestaurantTables() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formSection] = Form.useForm()
  const [formTable] = Form.useForm()
  const [formReservation] = Form.useForm()

  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [activeTab, setActiveTab] = useState('sections')

  const [sections, setSections] = useState([])
  const [tables, setTables] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false)
  const [tableDrawerOpen, setTableDrawerOpen] = useState(false)
  const [reservationDrawerOpen, setReservationDrawerOpen] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState(null)
  const [editingTableId, setEditingTableId] = useState(null)
  const [editingReservationId, setEditingReservationId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [openOrders, setOpenOrders] = useState([])
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [orderLoading, setOrderLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productResults, setProductResults] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [formCloseOrder] = Form.useForm()
  const [closeOrderVisible, setCloseOrderVisible] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [closingOrder, setClosingOrder] = useState(false)
  const [loadingReservationPdf, setLoadingReservationPdf] = useState(null)
  const [orderNotes, setOrderNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [loadingKitchenPdf, setLoadingKitchenPdf] = useState(false)
  const [createPendingSale, setCreatePendingSale] = useState(false)
  const [loadingAccountPdf, setLoadingAccountPdf] = useState(false)
  const [closeOrderTenantConfig, setCloseOrderTenantConfig] = useState({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null })
  const [closeOrderCardMachines, setCloseOrderCardMachines] = useState([])
  const [mapSectionId, setMapSectionId] = useState(undefined)
  const [mapFilterSectionId, setMapFilterSectionId] = useState(undefined)
  const [mapFiltersExpanded, setMapFiltersExpanded] = useState(false)
  const [mapReservations, setMapReservations] = useState([])
  const [filters, setFilters] = useState({
    sectionSearch: '',
    sectionFiltersExpanded: false,
    tableSearch: '',
    tableSectionId: undefined,
    tableStatus: undefined,
    tableActive: undefined,
    reservationSearch: '',
    reservationStatus: undefined,
    reservationTableId: undefined,
    reservationDateFrom: null,
    reservationDateTo: null,
  })

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

  const loadSections = useCallback(async (useFilter = false) => {
    if (isRoot && !effectiveTenantId) return
    setLoading(true)
    try {
      const search = useFilter ? (filters.sectionSearch?.trim() || undefined) : undefined
      const res = await restaurantTablesService.searchSections({
        tenantId: effectiveTenantId || undefined,
        search: search || undefined,
        page: 0,
        size: 200,
        sortBy: 'displayOrder',
        sortDirection: 'asc',
      })
      setSections(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar seções.')
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot, filters.sectionSearch])

  const loadTables = useCallback(async () => {
    if (isRoot && !effectiveTenantId) return
    setLoading(true)
    try {
      const filter = { page: 0, size: 500, sortBy: 'name', sortDirection: 'asc' }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      if (filters.tableSectionId) filter.sectionId = filters.tableSectionId
      if (filters.tableStatus) filter.status = filters.tableStatus
      if (filters.tableActive !== undefined) filter.active = filters.tableActive
      if (filters.tableSearch?.trim()) filter.search = filters.tableSearch.trim()
      const res = await restaurantTablesService.searchTables(filter)
      setTables(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar mesas.')
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot, filters.tableSectionId, filters.tableStatus, filters.tableActive, filters.tableSearch])

  const loadReservationsForMap = useCallback(async () => {
    if (isRoot && !effectiveTenantId) return
    try {
      const filter = {
        page: 0,
        size: 500,
        sortBy: 'scheduledAt',
        sortDirection: 'asc',
        scheduledFrom: dayjs().startOf('day').toISOString(),
      }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      const res = await restaurantTablesService.searchReservations(filter)
      const list = res?.content ?? []
      setMapReservations(list.filter((r) => !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(r.status)))
    } catch {
      setMapReservations([])
    }
  }, [effectiveTenantId, isRoot])

  const loadOpenOrders = useCallback(async () => {
    if (isRoot && !effectiveTenantId) return
    try {
      const data = await tableOrdersService.listOpenOrders(isRoot ? effectiveTenantId : null)
      setOpenOrders(data || [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar comandas abertas.')
      setOpenOrders([])
    }
  }, [effectiveTenantId, isRoot])

  const loadReservations = useCallback(async () => {
    if (isRoot && !effectiveTenantId) return
    setLoading(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'scheduledAt', sortDirection: 'desc' }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      if (filters.reservationStatus) filter.status = filters.reservationStatus
      if (filters.reservationTableId) filter.tableId = filters.reservationTableId
      if (filters.reservationDateFrom) filter.scheduledFrom = filters.reservationDateFrom.toISOString()
      if (filters.reservationDateTo) filter.scheduledTo = dayjs(filters.reservationDateTo).endOf('day').toISOString()
      if (filters.reservationSearch?.trim()) filter.search = filters.reservationSearch.trim()
      const res = await restaurantTablesService.searchReservations(filter)
      setReservations(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar reservas.')
      setReservations([])
    } finally {
      setLoading(false)
    }
  }, [effectiveTenantId, isRoot, filters.reservationStatus, filters.reservationTableId, filters.reservationDateFrom, filters.reservationDateTo, filters.reservationSearch])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot])

  useEffect(() => {
    if (activeTab === 'sections') {
      // Seções: consulta só ao clicar em Filtrar (não auto-load)
    } else if (activeTab === 'map') {
      loadSections(false) // carrega todas para o dropdown da seção no mapa
      loadTables()
      loadOpenOrders()
      loadReservationsForMap()
    }
    // Mesas e Reservas: consulta só ao clicar em Filtrar (não auto-load)
  }, [activeTab, loadSections, loadTables, loadOpenOrders, loadReservationsForMap])

  const openSectionDrawer = (section = null) => {
    setEditingSectionId(section?.id ?? null)
    formSection.resetFields()
    if (section) {
      formSection.setFieldsValue({
        name: section.name,
        description: section.description || '',
        displayOrder: section.displayOrder ?? 0,
      })
    } else {
      formSection.setFieldsValue({ displayOrder: 0 })
    }
    setSectionDrawerOpen(true)
  }

  const openTableDrawer = (table = null) => {
    setEditingTableId(table?.id ?? null)
    formTable.resetFields()
    if (table) {
      formTable.setFieldsValue({
        sectionId: table.sectionId,
        name: table.name,
        capacity: table.capacity,
        status: table.status || 'AVAILABLE',
        active: table.active ?? true,
        positionX: table.positionX ?? null,
        positionY: table.positionY ?? null,
      })
    } else {
      formTable.setFieldsValue({
        status: 'AVAILABLE',
        active: true,
        capacity: 2,
      })
      if (sections.length > 0 && !formTable.getFieldValue('sectionId')) {
        formTable.setFieldsValue({ sectionId: sections[0].id })
      }
    }
    setTableDrawerOpen(true)
  }

  const openReservationDrawer = (reservation = null) => {
    setEditingReservationId(reservation?.id ?? null)
    formReservation.resetFields()
    if (reservation) {
      formReservation.setFieldsValue({
        tableId: reservation.tableId,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone || '',
        customerEmail: reservation.customerEmail || '',
        scheduledAt: reservation.scheduledAt ? dayjs(reservation.scheduledAt) : null,
        numberOfGuests: reservation.numberOfGuests ?? 1,
        status: reservation.status || 'PENDING',
        notes: reservation.notes || '',
      })
    } else {
      formReservation.setFieldsValue({
        numberOfGuests: 2,
        status: 'PENDING',
        scheduledAt: dayjs().add(1, 'hour'),
      })
      if (tables.length > 0 && !formReservation.getFieldValue('tableId')) {
        formReservation.setFieldsValue({ tableId: tables[0].id })
      }
    }
    setReservationDrawerOpen(true)
  }

  const handleSectionSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = {
        name: values.name?.trim(),
        description: values.description?.trim() || undefined,
        displayOrder: values.displayOrder ?? 0,
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      if (editingSectionId) {
        await restaurantTablesService.updateSection(editingSectionId, payload)
        message.success('Seção atualizada!')
      } else {
        await restaurantTablesService.createSection(payload)
        message.success('Seção criada!')
      }
      setSectionDrawerOpen(false)
      loadSections()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar seção.')
    } finally {
      setSaving(false)
    }
  }

  const handleTableSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = {
        sectionId: values.sectionId,
        name: values.name?.trim(),
        capacity: values.capacity ?? 2,
        status: values.status || 'AVAILABLE',
        active: values.active ?? true,
        positionX: values.positionX != null && values.positionX !== '' ? Number(values.positionX) : undefined,
        positionY: values.positionY != null && values.positionY !== '' ? Number(values.positionY) : undefined,
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      if (editingTableId) {
        await restaurantTablesService.updateTable(editingTableId, payload)
        message.success('Mesa atualizada!')
      } else {
        await restaurantTablesService.createTable(payload)
        message.success('Mesa criada!')
      }
      setTableDrawerOpen(false)
      loadTables()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar mesa.')
    } finally {
      setSaving(false)
    }
  }

  const handleReservationSubmit = async (values) => {
    setSaving(true)
    try {
      const payload = {
        tableId: values.tableId,
        customerName: values.customerName?.trim(),
        customerPhone: values.customerPhone?.trim() || undefined,
        customerEmail: values.customerEmail?.trim() || undefined,
        scheduledAt: values.scheduledAt?.toISOString(),
        numberOfGuests: values.numberOfGuests ?? 1,
        status: values.status || 'PENDING',
        notes: values.notes?.trim() || undefined,
      }
      if (isRoot && effectiveTenantId) payload.tenantId = effectiveTenantId
      if (editingReservationId) {
        await restaurantTablesService.updateReservation(editingReservationId, payload)
        message.success('Reserva atualizada!')
      } else {
        const created = await restaurantTablesService.createReservation(payload)
        message.success('Reserva criada!')
        if (created?.id) {
          setLoadingReservationPdf(created.id)
          try {
            await restaurantTablesService.downloadReservationReceiptPdf(created.id)
            message.success('Comprovante gerado e baixado!')
          } catch (e) {
            message.error(e?.message || 'Erro ao gerar comprovante.')
          } finally {
            setLoadingReservationPdf(null)
          }
        }
      }
      setReservationDrawerOpen(false)
      loadReservations()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar reserva.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSection = async (id) => {
    try {
      await restaurantTablesService.deleteSection(id)
      message.success('Seção excluída.')
      loadSections()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir.')
    }
  }

  const handleDeleteTable = async (id) => {
    try {
      await restaurantTablesService.deleteTable(id)
      message.success('Mesa excluída.')
      loadTables()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir.')
    }
  }

  const handleDeleteReservation = async (id) => {
    try {
      await restaurantTablesService.deleteReservation(id)
      message.success('Reserva excluída.')
      loadReservations()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir.')
    }
  }

  const getOrderForTable = (tableId) => openOrders.find((o) => o.tableId === tableId)
  const getReservationForTable = (tableId) => mapReservations.find((r) => r.tableId === tableId)

  const openOrderDrawer = async (table) => {
    const order = getOrderForTable(table.id)
    if (order) {
      setSelectedTable(null)
      setOrderLoading(true)
      try {
        const full = await tableOrdersService.getOrderById(order.id)
        setCurrentOrder(full)
        setOrderNotes(full?.notes || '')
        setOrderDrawerOpen(true)
        setProductSearch('')
        setProductResults([])
      } catch (e) {
        message.error(e?.message || 'Erro ao carregar comanda.')
      } finally {
        setOrderLoading(false)
      }
    } else {
      setCurrentOrder(null)
      setSelectedTable(table)
      setOrderDrawerOpen(true)
      setProductSearch('')
      setProductResults([])
    }
  }

  const handleLaunchComanda = async () => {
    if (!selectedTable?.id) return
    setOrderLoading(true)
    try {
      const created = await tableOrdersService.openOrder(selectedTable.id, isRoot ? effectiveTenantId : null)
      setCurrentOrder(created)
      setOrderNotes('')
      setSelectedTable(null)
      setOpenOrders((prev) => [...prev, created])
      setProductSearch('')
      setProductResults([])
      loadTables()
      loadOpenOrders()
      message.success('Comanda aberta!')
    } catch (e) {
      message.error(e?.message || 'Erro ao abrir comanda.')
    } finally {
      setOrderLoading(false)
    }
  }

  const refreshCurrentOrder = async () => {
    if (!currentOrder?.id) return
    try {
      const full = await tableOrdersService.getOrderById(currentOrder.id)
      setCurrentOrder(full)
      setOpenOrders((prev) => prev.map((o) => (o.id === full.id ? full : o)))
    } catch (e) {
      message.error(e?.message || 'Erro ao atualizar.')
    }
  }

  const handleAddItem = async (productId, quantity = 1) => {
    if (!currentOrder?.id) return
    try {
      await tableOrdersService.addOrderItem(currentOrder.id, productId, quantity)
      await refreshCurrentOrder()
      message.success('Item adicionado!')
    } catch (e) {
      message.error(e?.message || 'Erro ao adicionar item.')
    }
  }

  const handleRemoveItem = async (itemId) => {
    try {
      await tableOrdersService.removeOrderItem(itemId)
      await refreshCurrentOrder()
      loadOpenOrders()
      message.success('Item removido.')
    } catch (e) {
      message.error(e?.message || 'Erro ao remover.')
    }
  }

  const handleUpdateQuantity = async (itemId, quantity) => {
    if (quantity <= 0) return handleRemoveItem(itemId)
    try {
      await tableOrdersService.updateOrderItemQuantity(itemId, quantity)
      await refreshCurrentOrder()
    } catch (e) {
      message.error(e?.message || 'Erro ao atualizar.')
    }
  }

  const handleCancelComanda = async () => {
    if (!currentOrder?.id) return
    try {
      await tableOrdersService.cancelOrder(currentOrder.id)
      message.success('Comanda cancelada. Mesa liberada.')
      setOrderDrawerOpen(false)
      setCurrentOrder(null)
      setCloseOrderVisible(false)
      loadTables()
      loadOpenOrders()
    } catch (e) {
      message.error(e?.message || 'Erro ao cancelar comanda.')
    }
  }

  const handleSaveNotes = async () => {
    if (!currentOrder?.id) return
    const trimmed = (orderNotes || '').trim()
    if (trimmed === (currentOrder?.notes || '').trim()) return
    setSavingNotes(true)
    try {
      const updated = await tableOrdersService.updateOrderNotes(currentOrder.id, trimmed || null)
      setCurrentOrder(updated)
      message.success('Observação salva.')
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar observação.')
    } finally {
      setSavingNotes(false)
    }
  }

  const handlePrintComanda = async () => {
    if (!currentOrder?.id) return
    setLoadingKitchenPdf(true)
    try {
      await tableOrdersService.downloadComandaKitchenPdf(currentOrder.id)
      message.success('Comanda para cozinha gerada!')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar comanda.')
    } finally {
      setLoadingKitchenPdf(false)
    }
  }

  const handleGenerateAccount = async () => {
    if (!currentOrder?.id) return
    setLoadingAccountPdf(true)
    try {
      await tableOrdersService.downloadComandaAccountPdf(currentOrder.id)
      message.success('Conta gerada! Disponível para impressão.')
      if (createPendingSale) {
        const values = formCloseOrder.getFieldsValue()
        await tableOrdersService.closeOrderAsPending(currentOrder.id, {
          customerName: values?.customerName || undefined,
          customerPhone: values?.customerPhone || undefined,
          customerEmail: values?.customerEmail || undefined,
          notes: values?.notes || undefined,
        })
        message.success('Venda pendente criada! O pagamento poderá ser realizado na tela de vendas.')
        setCloseOrderVisible(false)
        setOrderDrawerOpen(false)
        setCurrentOrder(null)
        setCreatePendingSale(false)
        formCloseOrder.resetFields()
        loadTables()
        loadOpenOrders()
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar conta.')
    } finally {
      setLoadingAccountPdf(false)
    }
  }

  const handleCloseOrderSubmit = async (values) => {
    if (!currentOrder?.id) return
    const totalFromItems = (currentOrder?.items || []).reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0)
    const discountType = values.discountType ?? 'amount'
    const saleDiscount = discountType === 'percent' ? totalFromItems * (Number(values.discountPercent) || 0) / 100 : (Number(values.discountAmount) || 0)
    const total = Math.max(0, totalFromItems - saleDiscount)
    const amountToSend = values.amountReceived != null ? values.amountReceived : total
    setClosingOrder(true)
    try {
      const payload = {
        paymentMethod: values.paymentMethod,
        amountReceived: amountToSend,
        installmentsCount: (values.paymentMethod === 'CREDIT_CARD' && values.installmentsCount) ? values.installmentsCount : undefined,
        discountAmount: discountType === 'amount' && (Number(values.discountAmount) || 0) > 0 ? Number(values.discountAmount) : undefined,
        discountPercent: discountType === 'percent' && (Number(values.discountPercent) || 0) > 0 ? Number(values.discountPercent) : undefined,
        cardMachineId: (values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD') ? values.cardMachineId : undefined,
        cardBrand: (values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD') ? values.cardBrand : undefined,
        cardAuthorization: (values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD') && values.cardAuthorization?.trim() ? values.cardAuthorization.trim() : undefined,
        cardIntegrationType: (values.paymentMethod === 'CREDIT_CARD' || values.paymentMethod === 'DEBIT_CARD') ? 2 : undefined,
        customerName: values.customerName?.trim() || undefined,
        customerPhone: values.customerPhone?.trim() || undefined,
        customerEmail: values.customerEmail?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }
      await tableOrdersService.closeOrder(currentOrder.id, payload)
      message.success('Comanda fechada e venda gerada!')
      setCloseOrderVisible(false)
      setOrderDrawerOpen(false)
      setCurrentOrder(null)
      formCloseOrder.resetFields()
      loadTables()
      loadOpenOrders()
    } catch (e) {
      message.error(e?.message || 'Erro ao fechar comanda.')
    } finally {
      setClosingOrder(false)
    }
  }

  const doProductSearch = useCallback(async () => {
    if (!productSearch?.trim() || productSearch.length < 2) {
      setProductResults([])
      return
    }
    setLoadingProducts(true)
    try {
      const filter = { search: productSearch.trim(), page: 0, size: 30, active: true, availableForSale: true }
      if (effectiveTenantId) filter.tenantId = effectiveTenantId
      const res = await searchProducts(filter)
      setProductResults(res?.content ?? [])
    } catch (e) {
      setProductResults([])
    } finally {
      setLoadingProducts(false)
    }
  }, [productSearch, effectiveTenantId])

  useEffect(() => {
    const t = setTimeout(doProductSearch, 350)
    return () => clearTimeout(t)
  }, [productSearch, doProductSearch])

  useEffect(() => {
    if (currentOrder?.id) setOrderNotes(currentOrder?.notes || '')
  }, [currentOrder?.id, currentOrder?.notes])

  useEffect(() => {
    if (!closeOrderVisible) return
    const loadConfig = isRoot && effectiveTenantId ? tenantService.getTenantById(effectiveTenantId) : tenantService.getCurrentTenant()
    loadConfig.then((t) => {
      setCloseOrderTenantConfig({
        maxInstallments: t?.maxInstallments ?? 12,
        maxInstallmentsNoInterest: t?.maxInstallmentsNoInterest ?? 1,
        interestRatePercent: t?.interestRatePercent ?? 0,
        cardFeeType: t?.cardFeeType ?? null,
        cardFeeValue: t?.cardFeeValue ?? null,
      })
    }).catch(() => setCloseOrderTenantConfig({ maxInstallments: 12, maxInstallmentsNoInterest: 1, interestRatePercent: 0, cardFeeType: null, cardFeeValue: null }))
    const tid = effectiveTenantId
    if (tid) {
      cardMachineService.listByTenant(tid).then((data) => setCloseOrderCardMachines(data || [])).catch(() => setCloseOrderCardMachines([]))
    } else {
      cardMachineService.listCurrent().then((data) => setCloseOrderCardMachines(data || [])).catch(() => setCloseOrderCardMachines([]))
    }
  }, [closeOrderVisible, effectiveTenantId, isRoot])

  const formatPrice = (v) => (v != null ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : 'R$ 0,00')

  const sectionColumns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', width: 200 },
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Ordem', dataIndex: 'displayOrder', key: 'displayOrder', width: 80 },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openSectionDrawer(r)} />
          <Popconfirm title="Excluir esta seção?" onConfirm={() => handleDeleteSection(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const tableColumns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', width: 120 },
    { title: 'Seção', dataIndex: 'sectionName', key: 'sectionName', width: 150 },
    { title: 'Capacidade', dataIndex: 'capacity', key: 'capacity', width: 100, render: (v) => `${v} pessoa(s)` },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        const opt = TABLE_STATUS_OPTIONS.find((o) => o.value === v)
        return <Tag color={opt?.color}>{opt?.label ?? v}</Tag>
      },
    },
    { title: 'Ativo', dataIndex: 'active', key: 'active', width: 80, render: (v) => (v ? 'Sim' : 'Não') },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openTableDrawer(r)} />
          <Popconfirm title="Excluir esta mesa?" onConfirm={() => handleDeleteTable(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const reservationColumns = [
    { title: 'Cliente', dataIndex: 'customerName', key: 'customerName', width: 160 },
    { title: 'Mesa', dataIndex: 'tableName', key: 'tableName', width: 100 },
    { title: 'Data/Hora', dataIndex: 'scheduledAt', key: 'scheduledAt', width: 140, render: formatDateTime },
    { title: 'Pessoas', dataIndex: 'numberOfGuests', key: 'numberOfGuests', width: 80 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (v) => {
        const opt = RESERVATION_STATUS_OPTIONS.find((o) => o.value === v)
        return <Tag color={opt?.color}>{opt?.label ?? v}</Tag>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 140,
      render: (_, r) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<FilePdfOutlined />}
            onClick={async () => {
              setLoadingReservationPdf(r.id)
              try {
                await restaurantTablesService.downloadReservationReceiptPdf(r.id)
                message.success('Comprovante baixado!')
              } catch (e) {
                message.error(e?.message || 'Erro ao gerar comprovante.')
              } finally {
                setLoadingReservationPdf(null)
              }
            }}
            loading={loadingReservationPdf === r.id}
            title="Gerar comprovante PDF"
          />
          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openReservationDrawer(r)} />
          <Popconfirm title="Excluir esta reserva?" onConfirm={() => handleDeleteReservation(r.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="restaurant-tables-page">
      <main className="restaurant-tables-main">
        <div className="restaurant-tables-container">
          <div className="restaurant-tables-header-card">
            <div className="restaurant-tables-header-icon">
              <TableOutlined />
            </div>
            <div className="restaurant-tables-header-content">
              <h2 className="restaurant-tables-title">Mesas do Restaurante</h2>
              <p className="restaurant-tables-subtitle">
                Gerencie seções, mesas e reservas. Organize o salão e controle as reservas de forma profissional.
              </p>
            </div>
          </div>

          {isRoot && (
            <div className="restaurant-tables-tenant-card">
              <label>Empresa</label>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                style={{ width: 280 }}
                allowClear={false}
              />
            </div>
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            className="restaurant-tables-tabs"
            items={[
              {
                key: 'sections',
                label: (
                  <span>
                    <TeamOutlined style={{ marginRight: 8 }} />
                    Seções
                  </span>
                ),
                children: (
                  <>
                    <div className="restaurant-tables-toolbar">
                      <Card className="restaurant-tables-filters-card" style={{ width: '100%' }}>
                        <div className="restaurant-tables-filters-toggle">
                          <Button
                            icon={<FilterOutlined />}
                            onClick={() => setFilters((f) => ({ ...f, sectionFiltersExpanded: !f.sectionFiltersExpanded }))}
                          >
                            {filters.sectionFiltersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </Button>
                        </div>
                        {filters.sectionFiltersExpanded && (
                          <Row gutter={16} align="bottom" style={{ marginTop: 16 }}>
                            <Col xs={24} sm={12} md={8}>
                              <label>Buscar seção</label>
                              <Input
                                placeholder="Nome ou descrição"
                                value={filters.sectionSearch}
                                onChange={(e) => setFilters((f) => ({ ...f, sectionSearch: e.target.value }))}
                                onPressEnter={() => loadSections(true)}
                                allowClear
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col xs={24} md={6}>
                              <label style={{ visibility: 'hidden' }}>.</label>
                              <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={() => loadSections(true)}
                                loading={loading}
                                block
                              >
                                Filtrar
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Card>
                      <div className="restaurant-tables-toolbar-actions" style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => openSectionDrawer()}
                          disabled={isRoot && !effectiveTenantId}
                        >
                          Nova seção
                        </Button>
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      columns={sectionColumns}
                      dataSource={sections}
                      loading={loading}
                      pagination={{ pageSize: 20 }}
                      className="restaurant-tables-table"
                    />
                  </>
                ),
              },
              {
                key: 'map',
                label: (
                  <span>
                    <DashboardOutlined style={{ marginRight: 8 }} />
                    Mapa
                  </span>
                ),
                children: (
                  <>
                    <div className="restaurant-tables-toolbar" style={{ marginBottom: 16 }}>
                      <Card className="restaurant-tables-filters-card" style={{ width: '100%' }}>
                        <div className="restaurant-tables-filters-toggle">
                          <Button
                            icon={<FilterOutlined />}
                            onClick={() => {
                              if (!mapFiltersExpanded) setMapFilterSectionId(mapSectionId)
                              setMapFiltersExpanded((v) => !v)
                            }}
                          >
                            {mapFiltersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </Button>
                        </div>
                        {mapFiltersExpanded && (
                          <Row gutter={16} align="bottom" style={{ marginTop: 16 }}>
                            <Col xs={24} sm={12} md={6}>
                              <label>Seção</label>
                              <Select
                                placeholder="Todas"
                                options={sections.map((s) => ({ value: s.id, label: s.name }))}
                                value={mapFilterSectionId}
                                onChange={setMapFilterSectionId}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </Col>
                            <Col xs={24} md={6}>
                              <label style={{ visibility: 'hidden' }}>.</label>
                              <Button
                                type="primary"
                                icon={<SearchOutlined />}
                                onClick={() => setMapSectionId(mapFilterSectionId)}
                                block
                              >
                                Filtrar
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Card>
                    </div>
                    <div className="restaurant-tables-map-container">
                      {loading ? (
                        <div className="restaurant-tables-map-loading">Carregando mesas...</div>
                      ) : (
                        <div className="restaurant-tables-map-grid">
                          {(mapSectionId
                            ? tables.filter((t) => t.sectionId === mapSectionId)
                            : tables
                          )
                            .filter((t) => t.active !== false)
                            .sort((a, b) => {
                              const ap = a.positionY != null && a.positionX != null ? a.positionY * 100 + a.positionX : 9999
                              const bp = b.positionY != null && b.positionX != null ? b.positionY * 100 + b.positionX : 9999
                              return ap - bp
                            })
                            .map((t) => {
                              const order = getOrderForTable(t.id)
                              const reservation = getReservationForTable(t.id)
                              const isOccupied = order || t.status === 'OCCUPIED'
                              const isReserved = t.status === 'RESERVED' || reservation
                              return (
                                <div
                                  key={t.id}
                                  className={`restaurant-tables-map-card ${isOccupied ? 'occupied' : ''} ${isReserved ? 'reserved' : ''}`}
                                  onClick={() => openOrderDrawer(t)}
                                >
                                  <div className="restaurant-tables-map-card-inner">
                                    <span className="restaurant-tables-map-card-name">{t.name}</span>
                                    <span className="restaurant-tables-map-card-capacity">{t.capacity} lugares</span>
                                    {order && (
                                      <Tag color="orange" style={{ marginTop: 4 }}>
                                        Comanda #{String(order.id).slice(0, 8)}
                                      </Tag>
                                    )}
                                    {isReserved && !order && (
                                      <Tag color="blue" style={{ marginTop: 4 }}>
                                        Reservada{reservation ? ` · ${dayjs(reservation.scheduledAt).format('HH:mm')}` : ''}
                                      </Tag>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      )}
                    </div>
                  </>
                ),
              },
              {
                key: 'tables',
                label: (
                  <span>
                    <TableOutlined style={{ marginRight: 8 }} />
                    Mesas
                  </span>
                ),
                children: (
                  <>
                    <div className="restaurant-tables-toolbar">
                      <Card className="restaurant-tables-filters-card">
                        <div className="restaurant-tables-filters-toggle">
                          <Button icon={<FilterOutlined />} onClick={() => setFiltersExpanded((v) => !v)}>
                            {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </Button>
                        </div>
                        {filtersExpanded && (
                          <Row gutter={16} align="bottom" style={{ marginTop: 16 }}>
                            <Col xs={24} sm={12} md={6}>
                              <label>Seção</label>
                              <Select
                                placeholder="Todas"
                                options={sections.map((s) => ({ value: s.id, label: s.name }))}
                                value={filters.tableSectionId}
                                onChange={(v) => setFilters((f) => ({ ...f, tableSectionId: v }))}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>Status</label>
                              <Select
                                placeholder="Todos"
                                options={TABLE_STATUS_OPTIONS}
                                value={filters.tableStatus}
                                onChange={(v) => setFilters((f) => ({ ...f, tableStatus: v }))}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>Buscar</label>
                              <Input
                                placeholder="Nome da mesa"
                                value={filters.tableSearch}
                                onChange={(e) => setFilters((f) => ({ ...f, tableSearch: e.target.value }))}
                                onPressEnter={loadTables}
                                allowClear
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col xs={24} md={6}>
                              <label style={{ visibility: 'hidden' }}>.</label>
                              <Button type="primary" icon={<SearchOutlined />} onClick={loadTables} loading={loading} block>
                                Filtrar
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Card>
                      <div className="restaurant-tables-toolbar-actions" style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => openTableDrawer()}
                          disabled={(isRoot && !effectiveTenantId) || sections.length === 0}
                        >
                          Nova mesa
                        </Button>
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      columns={tableColumns}
                      dataSource={tables}
                      loading={loading}
                      pagination={{ pageSize: 20 }}
                      className="restaurant-tables-table"
                    />
                  </>
                ),
              },
              {
                key: 'reservations',
                label: (
                  <span>
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    Reservas
                  </span>
                ),
                children: (
                  <>
                    <div className="restaurant-tables-toolbar">
                      <Card className="restaurant-tables-filters-card">
                        <div className="restaurant-tables-filters-toggle">
                          <Button icon={<FilterOutlined />} onClick={() => setFiltersExpanded((v) => !v)}>
                            {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </Button>
                        </div>
                        {filtersExpanded && (
                          <Row gutter={16} align="bottom" style={{ marginTop: 16 }}>
                            <Col xs={24} sm={12} md={6}>
                              <label>Mesa</label>
                              <Select
                                placeholder="Todas"
                                options={tables.map((t) => ({ value: t.id, label: t.name }))}
                                value={filters.reservationTableId}
                                onChange={(v) => setFilters((f) => ({ ...f, reservationTableId: v }))}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>Status</label>
                              <Select
                                placeholder="Todos"
                                options={RESERVATION_STATUS_OPTIONS}
                                value={filters.reservationStatus}
                                onChange={(v) => setFilters((f) => ({ ...f, reservationStatus: v }))}
                                style={{ width: '100%' }}
                                allowClear
                              />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>De</label>
                              <DatePicker
                                value={filters.reservationDateFrom}
                                onChange={(v) => setFilters((f) => ({ ...f, reservationDateFrom: v }))}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col xs={24} sm={12} md={6}>
                              <label>Até</label>
                              <DatePicker
                                value={filters.reservationDateTo}
                                onChange={(v) => setFilters((f) => ({ ...f, reservationDateTo: v }))}
                                style={{ width: '100%' }}
                              />
                            </Col>
                            <Col xs={24} md={6}>
                              <label style={{ visibility: 'hidden' }}>.</label>
                              <Button type="primary" icon={<SearchOutlined />} onClick={loadReservations} loading={loading} block>
                                Filtrar
                              </Button>
                            </Col>
                          </Row>
                        )}
                      </Card>
                      <div className="restaurant-tables-toolbar-actions" style={{ marginTop: 16 }}>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => openReservationDrawer()}
                          disabled={(isRoot && !effectiveTenantId) || tables.length === 0}
                        >
                          Nova reserva
                        </Button>
                      </div>
                    </div>
                    <Table
                      rowKey="id"
                      columns={reservationColumns}
                      dataSource={reservations}
                      loading={loading}
                      pagination={{ pageSize: 20 }}
                      className="restaurant-tables-table"
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      </main>

      <Drawer
        title={editingSectionId ? 'Editar seção' : 'Nova seção'}
        open={sectionDrawerOpen}
        onClose={() => setSectionDrawerOpen(false)}
        width={420}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setSectionDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => formSection.submit()}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={formSection} layout="vertical" onFinish={handleSectionSubmit}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }, { max: 100 }]}>
            <Input placeholder="Ex: Salão principal, Varanda, VIP" />
          </Form.Item>
          <Form.Item name="description" label="Descrição" rules={[{ max: 500 }]}>
            <TextArea rows={3} placeholder="Descrição opcional" />
          </Form.Item>
          <Form.Item name="displayOrder" label="Ordem de exibição">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingTableId ? 'Editar mesa' : 'Nova mesa'}
        open={tableDrawerOpen}
        onClose={() => setTableDrawerOpen(false)}
        width={420}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setTableDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => formTable.submit()}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={formTable} layout="vertical" onFinish={handleTableSubmit}>
          <Form.Item name="sectionId" label="Seção" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione a seção"
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="name" label="Nome/Identificação" rules={[{ required: true }, { max: 50 }]}>
            <Input placeholder="Ex: Mesa 1, A1, Box 3" />
          </Form.Item>
          <Form.Item name="capacity" label="Capacidade (lugares)" rules={[{ required: true }, { type: 'number', min: 1 }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="positionX" label="Posição X (mapa)">
                <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="positionY" label="Posição Y (mapa)">
                <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Status">
            <Select options={TABLE_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="active" label="Ativa" valuePropName="checked">
            <Switch checkedChildren="Sim" unCheckedChildren="Não" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingReservationId ? 'Editar reserva' : 'Nova reserva'}
        open={reservationDrawerOpen}
        onClose={() => setReservationDrawerOpen(false)}
        width={480}
        destroyOnClose
        footer={
          <Space>
            <Button onClick={() => setReservationDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => formReservation.submit()}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={formReservation} layout="vertical" onFinish={handleReservationSubmit}>
          <Form.Item name="tableId" label="Mesa" rules={[{ required: true }]}>
            <Select
              placeholder="Selecione a mesa"
              options={tables.map((t) => ({ value: t.id, label: `${t.name} (${t.capacity} lugares)` }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="customerName" label="Nome do cliente" rules={[{ required: true }, { max: 255 }]}>
            <Input placeholder="Nome completo" />
          </Form.Item>
          <Form.Item name="customerPhone" label="Telefone" rules={[{ max: 20 }]}>
            <Input placeholder="(00) 00000-0000" />
          </Form.Item>
          <Form.Item name="customerEmail" label="E-mail" rules={[{ type: 'email', message: 'E-mail inválido' }, { max: 255 }]}>
            <Input placeholder="e-mail@exemplo.com" />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Data e hora" rules={[{ required: true }]}>
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="numberOfGuests" label="Número de pessoas" rules={[{ required: true }, { type: 'number', min: 1 }]}>
            <InputNumber min={1} max={50} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={RESERVATION_STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <TextArea rows={3} placeholder="Observações ou pedidos especiais" />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={
          currentOrder
            ? `Comanda - Mesa ${currentOrder?.tableName || '-'}`
            : selectedTable
              ? `Mesa ${selectedTable.name}`
              : 'Comanda'
        }
        open={orderDrawerOpen}
        onClose={() => {
          setOrderDrawerOpen(false)
          setCurrentOrder(null)
          setSelectedTable(null)
          setCloseOrderVisible(false)
          setProductSearch('')
          setProductResults([])
        }}
        width={520}
        destroyOnClose
        footer={
          currentOrder?.id && (
            <div className="restaurant-tables-comanda-footer">
              <Space size="middle" wrap>
                <Popconfirm
                  title="Cancelar comanda?"
                  description="A comanda será encerrada sem gerar venda e a mesa será liberada."
                  onConfirm={handleCancelComanda}
                  okText="Sim, cancelar"
                  cancelText="Não"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseCircleOutlined />}>
                    Cancelar comanda
                  </Button>
                </Popconfirm>
                <Button
                  icon={<PrinterOutlined />}
                  onClick={handlePrintComanda}
                  loading={loadingKitchenPdf}
                >
                  Imprimir comanda
                </Button>
                <Button
                  type="primary"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    formCloseOrder.resetFields()
                    formCloseOrder.setFieldsValue({ paymentMethod: 'PIX', discountType: 'amount', discountAmount: 0, discountPercent: 0, installmentsCount: 1, cardBrand: '99' })
                    setCloseOrderVisible(true)
                  }}
                  disabled={!currentOrder?.items?.length}
                >
                  Fechar comanda
                </Button>
              </Space>
            </div>
          )
        }
      >
        {orderLoading ? (
          <div style={{ padding: 24, textAlign: 'center' }}>Carregando...</div>
        ) : selectedTable && !currentOrder ? (
          <div className="restaurant-tables-table-select">
            <p className="restaurant-tables-table-select-info">
              Mesa <strong>{selectedTable.name}</strong> · {selectedTable.capacity} lugares
            </p>
            <p className="restaurant-tables-table-select-hint">
              Esta mesa não possui comanda aberta. Clique no botão abaixo para abrir uma comanda e registrar os pedidos.
            </p>
            <Button type="primary" size="large" icon={<ShoppingCartOutlined />} onClick={handleLaunchComanda} block>
              Abrir comanda
            </Button>
          </div>
        ) : currentOrder ? (
          <>
            <div className="restaurant-tables-order-add">
              <div className="restaurant-tables-order-search-wrapper">
                <Input
                  placeholder="Buscar produto para adicionar..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  prefix={<SearchOutlined className="restaurant-tables-order-search-icon" />}
                  allowClear
                  size="large"
                  className="restaurant-tables-order-search-input"
                />
              </div>
              {productResults.length > 0 && (
                <div className="restaurant-tables-order-products">
                  {productResults.map((p) => (
                    <div key={p.id} className="restaurant-tables-order-product-item">
                      <span className="name">{p.name}</span>
                      <span className="price">{formatPrice(p.unitPrice ?? p.salePrice ?? p.price)}</span>
                      <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => handleAddItem(p.id, 1)}>
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="restaurant-tables-order-notes">
              <label>Observação da comanda</label>
              <TextArea
                rows={2}
                placeholder="Ex.: Ponto da carne mal passado, sem cebola..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                onBlur={handleSaveNotes}
              />
              <Button
                type="link"
                size="small"
                loading={savingNotes}
                onClick={handleSaveNotes}
                style={{ padding: 0, marginTop: 4 }}
              >
                Salvar observação
              </Button>
            </div>
            <Divider>Itens da comanda</Divider>
            {currentOrder?.items?.length ? (
              <List
                dataSource={currentOrder.items}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <InputNumber
                        key="qty"
                        min={1}
                        value={item.quantity}
                        onChange={(q) => handleUpdateQuantity(item.id, q)}
                        size="small"
                        style={{ width: 70 }}
                      />,
                      <Popconfirm key="del" title="Remover item?" onConfirm={() => handleRemoveItem(item.id)}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.productName} x ${item.quantity}`}
                      description={formatPrice(item.unitPrice) + ' un'}
                    />
                    <span>{formatPrice(item.total)}</span>
                  </List.Item>
                )}
              />
            ) : (
              <p style={{ color: '#999' }}>Nenhum item. Busque e adicione produtos acima.</p>
            )}
            {currentOrder?.items?.length > 0 && (
              <div className="restaurant-tables-order-total">
                <strong>
                  Total:{' '}
                  {formatPrice(
                    currentOrder.items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0),
                  )}
                </strong>
              </div>
            )}
          </>
        ) : null}
      </Drawer>

      <Drawer
        title="Fechar comanda"
        open={closeOrderVisible}
        onClose={() => { setCloseOrderVisible(false); setCreatePendingSale(false) }}
        width={480}
        destroyOnClose
        footer={
          <Space wrap>
            <Button onClick={() => setCloseOrderVisible(false)}>Cancelar</Button>
            <Button type="primary" loading={closingOrder} onClick={() => formCloseOrder.submit()}>
              Fechar e gerar venda
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Button
                type="default"
                icon={<FilePdfOutlined />}
                loading={loadingAccountPdf}
                onClick={handleGenerateAccount}
                block
              >
                Gerar conta (para impressão)
              </Button>
              <div style={{ marginTop: 10 }}>
                <Checkbox
                  checked={createPendingSale}
                  onChange={(e) => setCreatePendingSale(e.target.checked)}
                >
                  Criar venda pendente (pagamento será realizado na tela de vendas)
                </Checkbox>
              </div>
            </div>
            <Divider>Ou pagar agora</Divider>
          </Space>
        </div>

        {closeOrderVisible && currentOrder?.items?.length > 0 && (
          <CloseOrderPayNowForm
            form={formCloseOrder}
            currentOrder={currentOrder}
            tenantConfig={closeOrderTenantConfig}
            cardMachines={closeOrderCardMachines}
            formatPrice={formatPrice}
            onFinish={handleCloseOrderSubmit}
            closingOrder={closingOrder}
          />
        )}
      </Drawer>
    </div>
  )
}
