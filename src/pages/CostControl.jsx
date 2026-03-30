import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Card,
  Row,
  Col,
  Tabs,
  Table,
  Drawer,
  DatePicker,
  Statistic,
  message,
  Space,
  Tag,
  Dropdown,
  Modal,
  Alert,
  AutoComplete,
} from 'antd'
import {
  DollarOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  BankOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  MoreOutlined,
  EditOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import * as costControlService from '../services/costControlService'
import * as supplierService from '../services/supplierService'
import * as customerService from '../services/customerService'
import * as employeeService from '../services/employeeService'
import * as tenantService from '../services/tenantService'
import CostAccountCategoriesPanel from '../components/CostAccountCategoriesPanel'
import './CostControl.css'

const { TextArea } = Input
const { RangePicker } = DatePicker

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PARTIAL', label: 'Parcialmente pago' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Em atraso' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de débito' },
  { value: 'BANK_TRANSFER', label: 'Transferência bancária' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Outro' },
]

const STATUS_COLORS = {
  PENDING: 'orange',
  PARTIAL: 'blue',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'default',
}

function formatMoney(val) {
  if (val == null) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(d) {
  if (!d) return '-'
  return dayjs(d).format('DD/MM/YYYY')
}

const CHART_COLORS = ['#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#6B7280']

export default function CostControl() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [formPayable] = Form.useForm()
  const [formReceivable] = Form.useForm()
  const [formPayment] = Form.useForm()
  const watchedPayableTenantId = Form.useWatch('tenantId', formPayable)
  const watchedReceivableTenantId = Form.useWatch('tenantId', formReceivable)
  const [activeTab, setActiveTab] = useState('payables')
  const [payables, setPayables] = useState([])
  const [receivables, setReceivables] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [loadingPayables, setLoadingPayables] = useState(false)
  const [loadingReceivables, setLoadingReceivables] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [drawerPayableOpen, setDrawerPayableOpen] = useState(false)
  const [drawerReceivableOpen, setDrawerReceivableOpen] = useState(false)
  const [editingPayableId, setEditingPayableId] = useState(null)
  const [editingReceivableId, setEditingReceivableId] = useState(null)
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [filtersPayable, setFiltersPayable] = useState({ search: '', status: undefined, supplierId: undefined, employeeId: undefined, dueDateRange: null })
  const [filtersReceivable, setFiltersReceivable] = useState({ search: '', status: undefined, customerId: undefined, dueDateRange: null })
  const [filtersPayableExpanded, setFiltersPayableExpanded] = useState(false)
  const [filtersReceivableExpanded, setFiltersReceivableExpanded] = useState(false)
  const [reportLoading, setReportLoading] = useState(null)
  const [generatedPayrolls, setGeneratedPayrolls] = useState([])
  const [loadingGeneratedPayrolls, setLoadingGeneratedPayrolls] = useState(false)
  const [receiptPayableLoadingId, setReceiptPayableLoadingId] = useState(null)
  const [payrollPdfLoadingKey, setPayrollPdfLoadingKey] = useState(null)
  const [payableCategoryNames, setPayableCategoryNames] = useState([])
  const [receivableCategoryNames, setReceivableCategoryNames] = useState([])
  // Prestadores PJ (extinto): removido do sistema

  const tenantForPayableCategories = useMemo(() => {
    if (!drawerPayableOpen) return null
    if (isRoot) {
      if (editingPayableId) return selectedTenantId
      return watchedPayableTenantId || selectedTenantId
    }
    return user?.tenantId ?? null
  }, [drawerPayableOpen, isRoot, editingPayableId, selectedTenantId, watchedPayableTenantId, user?.tenantId])

  useEffect(() => {
    if (!drawerPayableOpen) {
      setPayableCategoryNames([])
      return
    }
    if (!tenantForPayableCategories) {
      setPayableCategoryNames([])
      return
    }
    let cancelled = false
    costControlService
      .listCostCategories('PAYABLE', isRoot ? tenantForPayableCategories : undefined)
      .then((list) => {
        if (cancelled) return
        const names = (list || [])
          .filter((c) => c.active !== false)
          .map((c) => c.name)
          .filter(Boolean)
        setPayableCategoryNames(names)
      })
      .catch(() => {
        if (!cancelled) setPayableCategoryNames([])
      })
    return () => {
      cancelled = true
    }
  }, [drawerPayableOpen, tenantForPayableCategories, isRoot])

  const tenantForReceivableCategories = useMemo(() => {
    if (!drawerReceivableOpen) return null
    if (isRoot) {
      if (editingReceivableId) return selectedTenantId
      return watchedReceivableTenantId || selectedTenantId
    }
    return user?.tenantId ?? null
  }, [drawerReceivableOpen, isRoot, editingReceivableId, selectedTenantId, watchedReceivableTenantId, user?.tenantId])

  useEffect(() => {
    if (!drawerReceivableOpen) {
      setReceivableCategoryNames([])
      return
    }
    if (!tenantForReceivableCategories) {
      setReceivableCategoryNames([])
      return
    }
    let cancelled = false
    costControlService
      .listCostCategories('RECEIVABLE', isRoot ? tenantForReceivableCategories : undefined)
      .then((list) => {
        if (cancelled) return
        const names = (list || [])
          .filter((c) => c.active !== false)
          .map((c) => c.name)
          .filter(Boolean)
        setReceivableCategoryNames(names)
      })
      .catch(() => {
        if (!cancelled) setReceivableCategoryNames([])
      })
    return () => {
      cancelled = true
    }
  }, [drawerReceivableOpen, tenantForReceivableCategories, isRoot])

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

  const loadSuppliers = useCallback(async () => {
    try {
      const f = { page: 0, size: 500, active: true }
      if (isRoot && selectedTenantId) f.tenantId = selectedTenantId
      const res = await supplierService.searchSuppliers(f)
      setSuppliers(res?.content ?? [])
    } catch (e) {
      setSuppliers([])
    }
  }, [isRoot, selectedTenantId])

  const loadCustomers = useCallback(async () => {
    try {
      const f = { page: 0, size: 500, active: true }
      if (isRoot && selectedTenantId) f.tenantId = selectedTenantId
      const res = await customerService.searchCustomers(f)
      setCustomers(res?.content ?? [])
    } catch (e) {
      setCustomers([])
    }
  }, [isRoot, selectedTenantId])

  const loadEmployees = useCallback(async () => {
    try {
      const f = { page: 0, size: 500, active: true }
      if (isRoot && selectedTenantId) f.tenantId = selectedTenantId
      const res = await employeeService.searchEmployees(f)
      setEmployees(res?.content ?? [])
    } catch (e) {
      setEmployees([])
    }
  }, [isRoot, selectedTenantId])

  // Prestadores PJ (extinto): removido do sistema

  const loadGeneratedPayrolls = useCallback(async () => {
    if (isRoot && !selectedTenantId) {
      setGeneratedPayrolls([])
      return
    }
    setLoadingGeneratedPayrolls(true)
    try {
      const tenantId = isRoot ? selectedTenantId : undefined
      const data = await employeeService.getGeneratedPayrolls(tenantId)
      setGeneratedPayrolls(Array.isArray(data) ? data : [])
    } catch (e) {
      message.error(e?.message || 'Erro ao listar folhas geradas.')
      setGeneratedPayrolls([])
    } finally {
      setLoadingGeneratedPayrolls(false)
    }
  }, [isRoot, selectedTenantId])

  const loadPayables = useCallback(async () => {
    if (isRoot && !selectedTenantId) return
    setLoadingPayables(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'dueDate', sortDirection: 'asc' }
      if (filtersPayable.search?.trim()) filter.search = filtersPayable.search.trim()
      if (filtersPayable.status) filter.status = filtersPayable.status
    if (filtersPayable.supplierId) filter.supplierId = filtersPayable.supplierId
    if (filtersPayable.employeeId) filter.employeeId = filtersPayable.employeeId
      if (filtersPayable.dueDateRange?.[0]) filter.dueDateFrom = filtersPayable.dueDateRange[0].format('YYYY-MM-DD')
      if (filtersPayable.dueDateRange?.[1]) filter.dueDateTo = filtersPayable.dueDateRange[1].format('YYYY-MM-DD')
      const tenantId = isRoot ? selectedTenantId : undefined
      const res = await costControlService.searchPayables(filter, tenantId)
      setPayables(res?.content ?? [])
      loadGeneratedPayrolls()
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar contas a pagar.')
      setPayables([])
    } finally {
      setLoadingPayables(false)
    }
  }, [isRoot, selectedTenantId, filtersPayable, loadGeneratedPayrolls])

  const loadReceivables = useCallback(async () => {
    if (isRoot && !selectedTenantId) return
    setLoadingReceivables(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'dueDate', sortDirection: 'asc' }
      if (filtersReceivable.search?.trim()) filter.search = filtersReceivable.search.trim()
      if (filtersReceivable.status) filter.status = filtersReceivable.status
      if (filtersReceivable.customerId) filter.customerId = filtersReceivable.customerId
      if (filtersReceivable.dueDateRange?.[0]) filter.dueDateFrom = filtersReceivable.dueDateRange[0].format('YYYY-MM-DD')
      if (filtersReceivable.dueDateRange?.[1]) filter.dueDateTo = filtersReceivable.dueDateRange[1].format('YYYY-MM-DD')
      const tenantId = isRoot ? selectedTenantId : undefined
      const res = await costControlService.searchReceivables(filter, tenantId)
      setReceivables(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar contas a receber.')
      setReceivables([])
    } finally {
      setLoadingReceivables(false)
    }
  }, [isRoot, selectedTenantId, filtersReceivable])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    loadSuppliers()
    loadCustomers()
    loadEmployees()
  }, [loadSuppliers, loadCustomers, loadEmployees])

  useEffect(() => {
    if (activeTab === 'payables') loadGeneratedPayrolls()
  }, [activeTab, loadGeneratedPayrolls])



  const payablesStats = {
    total: payables.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    paid: payables.reduce((s, p) => s + Number(p.paidAmount ?? 0), 0),
    pending: payables.reduce((s, p) => {
      if (p.status === 'PAID' || p.status === 'CANCELLED') return s
      return s + (Number(p.amount ?? 0) - Number(p.paidAmount ?? 0))
    }, 0),
  }
  const payablesByStatus = Object.entries(
    payables.reduce((acc, p) => {
      const lbl = STATUS_OPTIONS.find((o) => o.value === p.status)?.label ?? p.status
      acc[lbl] = (acc[lbl] || 0) + 1
      return acc
    }, {})
  ).map(([name, count], i) => ({ name, value: count, fill: CHART_COLORS[i % CHART_COLORS.length] })).filter((d) => d.value > 0)

  const receivablesStats = {
    total: receivables.reduce((s, r) => s + Number(r.amount ?? 0), 0),
    received: receivables.reduce((s, r) => s + Number(r.receivedAmount ?? 0), 0),
    pending: receivables.reduce((s, r) => {
      if (r.status === 'PAID' || r.status === 'CANCELLED') return s
      return s + (Number(r.amount ?? 0) - Number(r.receivedAmount ?? 0))
    }, 0),
  }
  const receivablesByStatus = Object.entries(
    receivables.reduce((acc, r) => {
      const lbl = STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status
      acc[lbl] = (acc[lbl] || 0) + 1
      return acc
    }, {})
  ).map(([name, count], i) => ({ name, value: count, fill: CHART_COLORS[i % CHART_COLORS.length] })).filter((d) => d.value > 0)

  const openPayableDrawer = (item = null) => {
    setEditingPayableId(item?.id ?? null)
    formPayable.resetFields()
    if (item) {
      formPayable.setFieldsValue({
        description: item.description,
        reference: item.reference,
        category: item.category,
        dueDate: item.dueDate ? dayjs(item.dueDate) : null,
        amount: item.amount,
        supplierId: item.supplierId,
        employeeId: item.employeeId,
        payrollReference: item.payrollReference,
        notes: item.notes,
      })
    } else {
      formPayable.setFieldsValue({ dueDate: dayjs(), tenantId: isRoot ? selectedTenantId : undefined })
    }
    setDrawerPayableOpen(true)
  }

  const openReceivableDrawer = (item = null) => {
    setEditingReceivableId(item?.id ?? null)
    formReceivable.resetFields()
    if (item) {
      formReceivable.setFieldsValue({
        description: item.description,
        reference: item.reference,
        category: item.category,
        dueDate: item.dueDate ? dayjs(item.dueDate) : null,
        amount: item.amount,
        customerId: item.customerId,
        saleId: item.saleId,
        notes: item.notes,
      })
    } else {
      formReceivable.setFieldsValue({ dueDate: dayjs(), tenantId: isRoot ? selectedTenantId : undefined })
    }
    setDrawerReceivableOpen(true)
  }

  const openPaymentDrawer = (type, item) => {
    setPaymentTarget({ type, item })
    formPayment.resetFields()
    const remaining = type === 'payable'
      ? (Number(item?.amount ?? 0) - Number(item?.paidAmount ?? 0))
      : (Number(item?.amount ?? 0) - Number(item?.receivedAmount ?? 0))
    formPayment.setFieldsValue({
      amount: remaining > 0 ? remaining : undefined,
      paymentDate: dayjs(),
      paymentMethod: 'PIX',
    })
    setPaymentDrawerOpen(true)
  }

  const handlePayableSubmit = async (values) => {
    setLoadingSubmit(true)
    try {
      const payload = {
        description: values.description?.trim(),
        reference: values.reference?.trim() || undefined,
        category: values.category?.trim() || undefined,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        amount: values.amount,
        supplierId: values.supplierId || undefined,
        employeeId: values.employeeId || undefined,
        payrollReference: values.payrollReference?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      }
      if (isRoot && !editingPayableId) payload.tenantId = values.tenantId
      if (editingPayableId) {
        await costControlService.updatePayable(editingPayableId, payload)
        message.success('Conta atualizada.')
      } else {
        await costControlService.createPayable(payload)
        message.success('Conta cadastrada.')
      }
      setDrawerPayableOpen(false)
      loadPayables()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const handleReceivableSubmit = async (values) => {
    setLoadingSubmit(true)
    try {
      const payload = {
        description: values.description?.trim(),
        reference: values.reference?.trim() || undefined,
        category: values.category?.trim() || undefined,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        amount: values.amount,
        customerId: values.customerId || undefined,
        saleId: values.saleId || undefined,
        notes: values.notes?.trim() || undefined,
      }
      if (isRoot && !editingReceivableId) payload.tenantId = values.tenantId
      if (editingReceivableId) {
        await costControlService.updateReceivable(editingReceivableId, payload)
        message.success('Conta atualizada.')
      } else {
        await costControlService.createReceivable(payload)
        message.success('Conta cadastrada.')
      }
      setDrawerReceivableOpen(false)
      loadReceivables()
    } catch (e) {
      message.error(e?.message || 'Erro ao salvar.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const handlePaymentSubmit = async (values) => {
    if (!paymentTarget) return
    setLoadingSubmit(true)
    try {
      const payload = {
        amount: values.amount,
        paymentDate: values.paymentDate?.format('YYYY-MM-DD'),
        paymentMethod: values.paymentMethod,
      }
      if (paymentTarget.type === 'payable') {
        await costControlService.registerPayablePayment(paymentTarget.item.id, payload)
        message.success('Pagamento registrado.')
        loadPayables()
      } else {
        await costControlService.registerReceivablePayment(paymentTarget.item.id, payload)
        message.success('Recebimento registrado.')
        loadReceivables()
      }
      setPaymentDrawerOpen(false)
      setPaymentTarget(null)
    } catch (e) {
      message.error(e?.message || 'Erro ao registrar.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const handleDeletePayable = async (id) => {
    try {
      await costControlService.deletePayable(id)
      message.success('Conta excluída.')
      loadPayables()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir.')
    }
  }

  const handleDownloadSalaryReceiptFromPayable = async (payable) => {
    if (!payable?.employeeId || !payable?.payrollReference) return
    const ref = String(payable.payrollReference).trim()
    const match = ref.match(/^(\d{4})-(\d{2})$/)
    if (!match) {
      message.error('Referência da folha inválida para gerar recibo.')
      return
    }
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const tenantId = isRoot ? selectedTenantId : undefined
    setReceiptPayableLoadingId(payable.id)
    try {
      await employeeService.downloadSalaryReceiptPdf(tenantId, payable.employeeId, year, month)
      message.success('Recibo gerado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar recibo.')
    } finally {
      setReceiptPayableLoadingId(null)
    }
  }

  const handleDownloadPayrollPdf = async (row) => {
    const tenantId = isRoot ? selectedTenantId : undefined
    const key = `${row.year}-${row.month}`
    setPayrollPdfLoadingKey(key)
    try {
      await employeeService.downloadPayrollReportPdf(tenantId, row.year, row.month)
      message.success('PDF da folha gerado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar PDF.')
    } finally {
      setPayrollPdfLoadingKey(null)
    }
  }

  const handleDeleteReceivable = async (id) => {
    try {
      await costControlService.deleteReceivable(id)
      message.success('Conta excluída.')
      loadReceivables()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir.')
    }
  }

  const buildPayableReportFilter = () => {
    const f = { sortBy: 'dueDate', sortDirection: 'asc' }
    if (filtersPayable.search?.trim()) f.search = filtersPayable.search.trim()
    if (filtersPayable.status) f.status = filtersPayable.status
    if (filtersPayable.supplierId) f.supplierId = filtersPayable.supplierId
    if (filtersPayable.employeeId) f.employeeId = filtersPayable.employeeId
    if (filtersPayable.dueDateRange?.[0]) f.dueDateFrom = filtersPayable.dueDateRange[0].format('YYYY-MM-DD')
    if (filtersPayable.dueDateRange?.[1]) f.dueDateTo = filtersPayable.dueDateRange[1].format('YYYY-MM-DD')
    return f
  }

  const buildReceivableReportFilter = () => {
    const f = { sortBy: 'dueDate', sortDirection: 'asc' }
    if (filtersReceivable.search?.trim()) f.search = filtersReceivable.search.trim()
    if (filtersReceivable.status) f.status = filtersReceivable.status
    if (filtersReceivable.customerId) f.customerId = filtersReceivable.customerId
    if (filtersReceivable.dueDateRange?.[0]) f.dueDateFrom = filtersReceivable.dueDateRange[0].format('YYYY-MM-DD')
    if (filtersReceivable.dueDateRange?.[1]) f.dueDateTo = filtersReceivable.dueDateRange[1].format('YYYY-MM-DD')
    return f
  }

  const handleExportPayablesExcel = async () => {
    if (isRoot && !selectedTenantId) {
      message.warning('Selecione uma empresa.')
      return
    }
    setReportLoading('payables-excel')
    try {
      await costControlService.downloadPayablesReportExcel(buildPayableReportFilter(), isRoot ? selectedTenantId : undefined)
      message.success('Relatório Excel baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar relatório.')
    } finally {
      setReportLoading(null)
    }
  }

  const handleExportPayablesPdf = async () => {
    if (isRoot && !selectedTenantId) {
      message.warning('Selecione uma empresa.')
      return
    }
    setReportLoading('payables-pdf')
    try {
      await costControlService.downloadPayablesReportPdf(buildPayableReportFilter(), isRoot ? selectedTenantId : undefined)
      message.success('Relatório PDF baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar relatório.')
    } finally {
      setReportLoading(null)
    }
  }

  const handleExportReceivablesExcel = async () => {
    if (isRoot && !selectedTenantId) {
      message.warning('Selecione uma empresa.')
      return
    }
    setReportLoading('receivables-excel')
    try {
      await costControlService.downloadReceivablesReportExcel(buildReceivableReportFilter(), isRoot ? selectedTenantId : undefined)
      message.success('Relatório Excel baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar relatório.')
    } finally {
      setReportLoading(null)
    }
  }

  const handleExportReceivablesPdf = async () => {
    if (isRoot && !selectedTenantId) {
      message.warning('Selecione uma empresa.')
      return
    }
    setReportLoading('receivables-pdf')
    try {
      await costControlService.downloadReceivablesReportPdf(buildReceivableReportFilter(), isRoot ? selectedTenantId : undefined)
      message.success('Relatório PDF baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar relatório.')
    } finally {
      setReportLoading(null)
    }
  }

  const payableColumns = [
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Fornecedor', dataIndex: 'supplierName', key: 'supplierName', width: 140, ellipsis: true },
    { title: 'Funcionário', dataIndex: 'employeeName', key: 'employeeName', width: 140, ellipsis: true },
    { title: 'Categoria', dataIndex: 'category', key: 'category', width: 100 },
    { title: 'Vencimento', dataIndex: 'dueDate', key: 'dueDate', width: 110, render: (d) => formatDate(d) },
    { title: 'Valor', dataIndex: 'amount', key: 'amount', width: 110, render: (v) => formatMoney(v) },
    { title: 'Pago', dataIndex: 'paidAmount', key: 'paidAmount', width: 100, render: (v) => formatMoney(v) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</Tag>,
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 72,
      fixed: 'right',
      render: (_, r) => (
        <Dropdown
          menu={{
            items: [
              ...(r.status !== 'PAID' && r.status !== 'CANCELLED'
                ? [{
                  key: 'pay',
                  icon: <CreditCardOutlined />,
                  label: 'Pagar',
                  onClick: () => openPaymentDrawer('payable', r),
                }]
                : []),
              ...(r.status === 'PAID' || r.status === 'PARTIAL'
                ? [{ key: 'receipt', icon: <FilePdfOutlined />, label: 'Comprovante de pagamento', onClick: () => costControlService.downloadPaymentReceiptPdf(r.id) }]
                : []),
              ...(r.employeeId && r.payrollReference
                ? [{ key: 'salary-receipt', icon: <FilePdfOutlined />, label: 'Recibo de pagamento (funcionário)', onClick: () => handleDownloadSalaryReceiptFromPayable(r) }]
                : []),
              { key: 'edit', icon: <EditOutlined />, label: 'Editar', onClick: () => openPayableDrawer(r) },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Excluir',
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: 'Excluir conta a pagar?',
                    okText: 'Excluir',
                    cancelText: 'Cancelar',
                    okButtonProps: { danger: true },
                    onOk: () => handleDeletePayable(r.id),
                  })
                },
              },
            ],
            onClick: (e) => e.domEvent?.stopPropagation?.(),
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} className="cost-control-actions-btn" />
        </Dropdown>
      ),
    },
  ]

  const receivableColumns = [
    { title: 'Descrição', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Cliente', dataIndex: 'customerName', key: 'customerName', width: 160, ellipsis: true },
    { title: 'Categoria', dataIndex: 'category', key: 'category', width: 100 },
    { title: 'Vencimento', dataIndex: 'dueDate', key: 'dueDate', width: 110, render: (d) => formatDate(d) },
    { title: 'Valor', dataIndex: 'amount', key: 'amount', width: 110, render: (v) => formatMoney(v) },
    { title: 'Recebido', dataIndex: 'receivedAmount', key: 'receivedAmount', width: 100, render: (v) => formatMoney(v) },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s) => <Tag color={STATUS_COLORS[s] || 'default'}>{STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}</Tag>,
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 72,
      fixed: 'right',
      render: (_, r) => (
        <Dropdown
          menu={{
            items: [
              ...(r.status !== 'PAID' && r.status !== 'CANCELLED'
                ? [{ key: 'receive', icon: <BankOutlined />, label: 'Receber', onClick: () => openPaymentDrawer('receivable', r) }]
                : []),
              { key: 'edit', icon: <EditOutlined />, label: 'Editar', onClick: () => openReceivableDrawer(r) },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Excluir',
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: 'Excluir conta a receber?',
                    okText: 'Excluir',
                    cancelText: 'Cancelar',
                    okButtonProps: { danger: true },
                    onOk: () => handleDeleteReceivable(r.id),
                  })
                },
              },
            ],
            onClick: (e) => e.domEvent?.stopPropagation?.(),
          }}
          trigger={['click']}
        >
          <Button type="text" size="small" icon={<MoreOutlined />} onClick={(e) => e.stopPropagation()} className="cost-control-actions-btn" />
        </Dropdown>
      ),
    },
  ]

  return (
    <div className="cost-control-page">
      <main className="cost-control-main">
        <div className="cost-control-container">
          <div className="cost-control-header-card">
            <div className="cost-control-header-icon">
              <DollarOutlined />
            </div>
            <div className="cost-control-header-content">
              <h2 className="cost-control-title">Controle de Custos</h2>
              <p className="cost-control-subtitle">
                Gerencie contas a pagar e contas a receber em um único lugar.
              </p>
            </div>
          </div>

          {isRoot && (
            <Card className="cost-control-tenant-card">
              <label>Empresa</label>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                style={{ width: 280 }}
                showSearch
                optionFilterProp="label"
              />
            </Card>
          )}

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'payables',
                label: 'Contas a Pagar',
                children: (
                  <Card>
                    <Row gutter={[16, 16]} className="cost-control-stats-row">
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-total">
                          <Statistic
                            title="Total a pagar"
                            value={payablesStats.total}
                            prefix={<DollarOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-paid">
                          <Statistic
                            title="Já pago"
                            value={payablesStats.paid}
                            prefix={<ArrowDownOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-pending">
                          <Statistic
                            title="Pendente"
                            value={payablesStats.pending}
                            prefix={<CreditCardOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                    </Row>
                    <Card title="Folhas de pagamento geradas" className="cost-control-filters-card" style={{ marginBottom: 24 }}>
                      <p style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
                        Competências que possuem contas a pagar de folha. Gere o PDF da folha completa quando quiser.
                      </p>
                      <Table
                        rowKey="payrollReference"
                        size="small"
                        loading={loadingGeneratedPayrolls}
                        dataSource={generatedPayrolls}
                        pagination={false}
                        columns={[
                          { title: 'Competência', dataIndex: 'label', key: 'label' },
                          {
                            title: 'Ações',
                            key: 'actions',
                            width: 140,
                            render: (_, row) => (
                              <Button
                                type="primary"
                                size="small"
                                icon={<FilePdfOutlined />}
                                loading={payrollPdfLoadingKey === `${row.year}-${row.month}`}
                                onClick={() => handleDownloadPayrollPdf(row)}
                                disabled={isRoot && !selectedTenantId}
                                style={{ minWidth: 100 }}
                              >
                                Gerar PDF
                              </Button>
                            ),
                          },
                        ]}
                      />
                      {generatedPayrolls.length === 0 && !loadingGeneratedPayrolls && (
                        <div style={{ padding: '12px 0', color: '#999' }}>Nenhuma folha gerada ainda. Gere as contas do mês em Funcionários.</div>
                      )}
                    </Card>
                    {payablesByStatus.length > 0 && (
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={12}>
                          <Card title="Contas por status" className="cost-control-chart-card">
                            <ResponsiveContainer width="100%" height={240}>
                              <PieChart>
                                <Pie
                                  data={payablesByStatus}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={90}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {payablesByStatus.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v} conta(s)`, 'Quantidade']} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                      </Row>
                    )}
                    <Card className="cost-control-filters-card">
                      <div className="vl-filters-toggle cost-control-filters-toggle">
                        <Button
                          type="button"
                          className={`vl-filters-toggle-btn${filtersPayableExpanded ? ' vl-filters-toggle-btn--open' : ''}`}
                          icon={<FilterOutlined />}
                          onClick={() => setFiltersPayableExpanded((v) => !v)}
                          aria-expanded={filtersPayableExpanded}
                        >
                          <span className="vl-filters-toggle-label">
                            {filtersPayableExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </span>
                          <DownOutlined className="vl-filters-chevron" aria-hidden />
                        </Button>
                        <Space>
                          <Button
                            icon={<FileExcelOutlined />}
                            onClick={handleExportPayablesExcel}
                            loading={reportLoading === 'payables-excel'}
                            disabled={isRoot && !selectedTenantId}
                          >
                            Exportar Excel
                          </Button>
                          <Button
                            icon={<FilePdfOutlined />}
                            onClick={handleExportPayablesPdf}
                            loading={reportLoading === 'payables-pdf'}
                            disabled={isRoot && !selectedTenantId}
                          >
                            Exportar PDF
                          </Button>
                        </Space>
                      </div>
                      <div
                        className={`vl-filters-expand${filtersPayableExpanded ? ' vl-filters-expand--open' : ''}`}
                        aria-hidden={!filtersPayableExpanded}
                      >
                        <div className="vl-filters-expand-inner">
                        <Row gutter={16} align="middle" className="vl-filters-row">
                          <Col xs={24} sm={12} md={6}>
                            <label className="cost-control-filter-label">Buscar</label>
                            <Input
                              placeholder="Buscar..."
                              prefix={<SearchOutlined />}
                              value={filtersPayable.search}
                              onChange={(e) => setFiltersPayable((f) => ({ ...f, search: e.target.value }))}
                              onPressEnter={loadPayables}
                              allowClear
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col xs={24} sm={12} md={4}>
                            <label className="cost-control-filter-label">Status</label>
                            <Select
                              placeholder="Todos"
                              options={STATUS_OPTIONS}
                              value={filtersPayable.status}
                              onChange={(v) => setFiltersPayable((f) => ({ ...f, status: v }))}
                              style={{ width: '100%' }}
                              allowClear
                            />
                          </Col>
                          <Col xs={24} sm={12} md={4}>
                            <label className="cost-control-filter-label">Fornecedor</label>
                            <Select
                              placeholder="Todos"
                              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                              value={filtersPayable.supplierId}
                              onChange={(v) => setFiltersPayable((f) => ({ ...f, supplierId: v }))}
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </Col>
                          <Col xs={24} sm={12} md={4}>
                            <label className="cost-control-filter-label">Funcionário</label>
                            <Select
                              placeholder="Todos"
                              options={employees.map((e) => ({ value: e.id, label: e.name }))}
                              value={filtersPayable.employeeId}
                              onChange={(v) => setFiltersPayable((f) => ({ ...f, employeeId: v }))}
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <label className="cost-control-filter-label">Vencimento</label>
                            <RangePicker
                              placeholder={['De', 'Até']}
                              value={filtersPayable.dueDateRange}
                              onChange={(dates) => setFiltersPayable((f) => ({ ...f, dueDateRange: dates }))}
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col xs={24} md={4} style={{ marginTop: 24 }}>
                            <Button type="primary" icon={<FilterOutlined />} onClick={loadPayables} loading={loadingPayables} block>
                              Filtrar
                            </Button>
                          </Col>
                        </Row>
                        </div>
                      </div>
                    </Card>
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openPayableDrawer()} className="cost-control-add-btn">
                        Nova conta a pagar
                      </Button>
                    </div>
                    <Table
                      rowKey="id"
                      columns={payableColumns}
                      dataSource={payables}
                      loading={loadingPayables}
                      scroll={{ x: 860 }}
                      pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} conta(s)` }}
                      className="cost-control-table"
                    />
                  </Card>
                ),
              },
              {
                key: 'receivables',
                label: 'Contas a Receber',
                children: (
                  <Card>
                    <Row gutter={[16, 16]} className="cost-control-stats-row">
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-total">
                          <Statistic
                            title="Total a receber"
                            value={receivablesStats.total}
                            prefix={<DollarOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-paid">
                          <Statistic
                            title="Já recebido"
                            value={receivablesStats.received}
                            prefix={<ArrowUpOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card className="cost-control-stat-card cost-control-stat-pending">
                          <Statistic
                            title="Pendente"
                            value={receivablesStats.pending}
                            prefix={<BankOutlined />}
                            formatter={(v) => formatMoney(v)}
                          />
                        </Card>
                      </Col>
                    </Row>
                    {receivablesByStatus.length > 0 && (
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={12}>
                          <Card title="Contas por status" className="cost-control-chart-card">
                            <ResponsiveContainer width="100%" height={240}>
                              <PieChart>
                                <Pie
                                  data={receivablesByStatus}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={90}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {receivablesByStatus.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.fill} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v) => [`${v} conta(s)`, 'Quantidade']} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </Card>
                        </Col>
                      </Row>
                    )}
                    <Card className="cost-control-filters-card">
                      <div className="vl-filters-toggle cost-control-filters-toggle">
                        <Button
                          type="button"
                          className={`vl-filters-toggle-btn${filtersReceivableExpanded ? ' vl-filters-toggle-btn--open' : ''}`}
                          icon={<FilterOutlined />}
                          onClick={() => setFiltersReceivableExpanded((v) => !v)}
                          aria-expanded={filtersReceivableExpanded}
                        >
                          <span className="vl-filters-toggle-label">
                            {filtersReceivableExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                          </span>
                          <DownOutlined className="vl-filters-chevron" aria-hidden />
                        </Button>
                        <Space>
                          <Button
                            icon={<FileExcelOutlined />}
                            onClick={handleExportReceivablesExcel}
                            loading={reportLoading === 'receivables-excel'}
                            disabled={isRoot && !selectedTenantId}
                          >
                            Exportar Excel
                          </Button>
                          <Button
                            icon={<FilePdfOutlined />}
                            onClick={handleExportReceivablesPdf}
                            loading={reportLoading === 'receivables-pdf'}
                            disabled={isRoot && !selectedTenantId}
                          >
                            Exportar PDF
                          </Button>
                        </Space>
                      </div>
                      <div
                        className={`vl-filters-expand${filtersReceivableExpanded ? ' vl-filters-expand--open' : ''}`}
                        aria-hidden={!filtersReceivableExpanded}
                      >
                        <div className="vl-filters-expand-inner">
                        <Row gutter={16} align="middle" className="vl-filters-row">
                          <Col xs={24} sm={12} md={6}>
                            <label className="cost-control-filter-label">Buscar</label>
                            <Input
                              placeholder="Buscar..."
                              prefix={<SearchOutlined />}
                              value={filtersReceivable.search}
                              onChange={(e) => setFiltersReceivable((f) => ({ ...f, search: e.target.value }))}
                              onPressEnter={loadReceivables}
                              allowClear
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col xs={24} sm={12} md={4}>
                            <label className="cost-control-filter-label">Status</label>
                            <Select
                              placeholder="Todos"
                              options={STATUS_OPTIONS}
                              value={filtersReceivable.status}
                              onChange={(v) => setFiltersReceivable((f) => ({ ...f, status: v }))}
                              style={{ width: '100%' }}
                              allowClear
                            />
                          </Col>
                          <Col xs={24} sm={12} md={4}>
                            <label className="cost-control-filter-label">Cliente</label>
                            <Select
                              placeholder="Todos"
                              options={customers.map((c) => ({ value: c.id, label: c.name }))}
                              value={filtersReceivable.customerId}
                              onChange={(v) => setFiltersReceivable((f) => ({ ...f, customerId: v }))}
                              style={{ width: '100%' }}
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </Col>
                          <Col xs={24} sm={12} md={6}>
                            <label className="cost-control-filter-label">Vencimento</label>
                            <RangePicker
                              placeholder={['De', 'Até']}
                              value={filtersReceivable.dueDateRange}
                              onChange={(dates) => setFiltersReceivable((f) => ({ ...f, dueDateRange: dates }))}
                              style={{ width: '100%' }}
                            />
                          </Col>
                          <Col xs={24} md={4} style={{ marginTop: 24 }}>
                            <Button type="primary" icon={<FilterOutlined />} onClick={loadReceivables} loading={loadingReceivables} block>
                              Filtrar
                            </Button>
                          </Col>
                        </Row>
                        </div>
                      </div>
                    </Card>
                    <div style={{ marginTop: 16 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => openReceivableDrawer()} className="cost-control-add-btn">
                        Nova conta a receber
                      </Button>
                    </div>
                    <Table
                      rowKey="id"
                      columns={receivableColumns}
                      dataSource={receivables}
                      loading={loadingReceivables}
                      scroll={{ x: 860 }}
                      pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} conta(s)` }}
                      className="cost-control-table"
                    />
                  </Card>
                ),
              },
              {
                key: 'categories',
                label: 'Categorias',
                children: (
                  <CostAccountCategoriesPanel
                    tenantId={isRoot ? selectedTenantId : user?.tenantId}
                    isRoot={isRoot}
                  />
                ),
              },
            ]}
          />
        </div>
      </main>

      <Drawer
        title={editingPayableId ? 'Editar conta a pagar' : 'Nova conta a pagar'}
        open={drawerPayableOpen}
        onClose={() => setDrawerPayableOpen(false)}
        placement="right"
        width={520}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerPayableOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={loadingSubmit} onClick={() => formPayable.submit()}>
              {editingPayableId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={formPayable} layout="vertical" onFinish={handlePayableSubmit} className="cost-control-drawer-form">
          {isRoot && !editingPayableId && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
          <Form.Item name="description" label="Descrição" rules={[{ required: true }]}>
            <Input placeholder="Ex: Aluguel, Fornecedor X" />
          </Form.Item>
          <Form.Item name="reference" label="Referência">
            <Input placeholder="Nº documento, NF, etc." />
          </Form.Item>
          <Form.Item name="category" label="Categoria" tooltip="Digite para filtrar as categorias cadastradas na aba Categorias.">
            <AutoComplete
              allowClear
              placeholder="Digite ou escolha uma categoria"
              options={payableCategoryNames.map((name) => ({ value: name }))}
              filterOption={(input, option) => {
                const label = String(option?.value ?? '')
                return label.toLowerCase().includes(String(input ?? '').toLowerCase())
              }}
            />
          </Form.Item>
          <Form.Item name="dueDate" label="Vencimento" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} prefix="R$" />
          </Form.Item>
          <Form.Item name="supplierId" label="Fornecedor">
            <Select
              placeholder="Selecione o fornecedor"
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={editingReceivableId ? 'Editar conta a receber' : 'Nova conta a receber'}
        open={drawerReceivableOpen}
        onClose={() => setDrawerReceivableOpen(false)}
        placement="right"
        width={520}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => setDrawerReceivableOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={loadingSubmit} onClick={() => formReceivable.submit()}>
              {editingReceivableId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={formReceivable} layout="vertical" onFinish={handleReceivableSubmit} className="cost-control-drawer-form">
          {isRoot && !editingReceivableId && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
          <Form.Item name="description" label="Descrição" rules={[{ required: true }]}>
            <Input placeholder="Ex: Venda, parcela" />
          </Form.Item>
          <Form.Item name="reference" label="Referência">
            <Input placeholder="Nº venda, parcela" />
          </Form.Item>
          <Form.Item name="category" label="Categoria" tooltip="Digite para filtrar as categorias cadastradas (aba Categorias → Contas a receber).">
            <AutoComplete
              allowClear
              placeholder="Digite ou escolha uma categoria"
              options={receivableCategoryNames.map((name) => ({ value: name }))}
              filterOption={(input, option) => {
                const label = String(option?.value ?? '')
                return label.toLowerCase().includes(String(input ?? '').toLowerCase())
              }}
            />
          </Form.Item>
          <Form.Item name="dueDate" label="Vencimento" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} prefix="R$" />
          </Form.Item>
          <Form.Item name="customerId" label="Cliente">
            <Select
              placeholder="Selecione o cliente"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              showSearch
              optionFilterProp="label"
              allowClear
            />
          </Form.Item>
          <Form.Item name="notes" label="Observações">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={paymentTarget?.type === 'payable' ? 'Registrar pagamento' : 'Registrar recebimento'}
        open={paymentDrawerOpen}
        onClose={() => { setPaymentDrawerOpen(false); setPaymentTarget(null) }}
        placement="right"
        width={420}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={() => { setPaymentDrawerOpen(false); setPaymentTarget(null) }}>Cancelar</Button>
            <Button
              type="primary"
              loading={loadingSubmit}
              onClick={() => formPayment.submit()}
            >
              Confirmar
            </Button>
          </Space>
        }
      >
        <Form form={formPayment} layout="vertical" onFinish={handlePaymentSubmit} className="cost-control-drawer-form">
          <Form.Item name="amount" label="Valor (R$)" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} prefix="R$" />
          </Form.Item>
          <Form.Item name="paymentDate" label="Data" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Forma de pagamento" rules={[{ required: true }]}>
            <Select options={PAYMENT_METHOD_OPTIONS} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}
