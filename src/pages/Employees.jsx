import { useState, useEffect, useCallback } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Button,
  Card,
  Row,
  Col,
  Drawer,
  Table,
  message,
  Space,
  Popconfirm,
  Tag,
  Checkbox,
  DatePicker,
} from 'antd'
import {
  TeamOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  DeleteOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  AccountBookOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuth } from '../contexts/AuthContext'
import * as employeeService from '../services/employeeService'
import * as tenantService from '../services/tenantService'
import * as contractorService from '../services/contractorService'
import './Employees.css'

const { TextArea } = Input
const { RangePicker } = DatePicker

const FILTER_ALL = '__all__'
const CONTRACT_TYPE_OPTIONS = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
]
const initialFormValues = { active: true, paymentDay: 5, salary: 0, contractType: 'CLT' }

const MONTHS = [
  { value: 1, label: 'Janeiro' }, { value: 2, label: 'Fevereiro' }, { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Maio' }, { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' }, { value: 11, label: 'Novembro' }, { value: 12, label: 'Dezembro' },
]

export default function Employees() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActive, setFilterActive] = useState(FILTER_ALL)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear())
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1)
  const [payrollLoading, setPayrollLoading] = useState(null)
  const [receiptLoadingId, setReceiptLoadingId] = useState(null)
  const [drawerReceiptYear, setDrawerReceiptYear] = useState(new Date().getFullYear())
  const [drawerReceiptMonth, setDrawerReceiptMonth] = useState(new Date().getMonth() + 1)
  const [contractors, setContractors] = useState([])
  const [generateDrawerOpen, setGenerateDrawerOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [generateMonthRange, setGenerateMonthRange] = useState(null)
  const [generateBatchLoading, setGenerateBatchLoading] = useState(false)

  const FILTER_OPTIONS = [
    { value: FILTER_ALL, label: 'Todos' },
    { value: true, label: 'Ativos' },
    { value: false, label: 'Inativos' },
  ]

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

  const loadContractors = useCallback(async () => {
    try {
      const tenantId = isRoot ? selectedTenantId : undefined
      const data = await contractorService.listContractorsOptions(tenantId)
      setContractors(Array.isArray(data) ? data : [])
    } catch (e) {
      setContractors([])
    }
  }, [isRoot, selectedTenantId])

  const handleFilter = useCallback(async () => {
    if (isRoot && !selectedTenantId) {
      setEmployees([])
      return
    }
    setLoadingList(true)
    try {
      const filter = { page: 0, size: 200, sortBy: 'name', sortDirection: 'asc' }
      if (filterSearch?.trim()) filter.search = filterSearch.trim()
      if (filterActive !== FILTER_ALL) filter.active = filterActive
      if (isRoot && selectedTenantId != null && selectedTenantId !== '') filter.tenantId = selectedTenantId
      const res = await employeeService.searchEmployees(filter)
      setEmployees(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar funcionários.')
      setEmployees([])
    } finally {
      setLoadingList(false)
    }
  }, [isRoot, selectedTenantId, filterSearch, filterActive])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])

  useEffect(() => {
    if (drawerOpen) loadContractors()
  }, [drawerOpen, loadContractors])

  useEffect(() => {
    if (generateDrawerOpen && employees.length === 0) handleFilter()
  }, [generateDrawerOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDrawer = (employee = null) => {
    setEditingId(employee?.id ?? null)
    form.resetFields()
    form.setFieldsValue(initialFormValues)
    if (employee) {
      form.setFieldsValue({
        name: employee.name,
        document: employee.document,
        email: employee.email,
        phone: employee.phone,
        phoneAlt: employee.phoneAlt,
        addressStreet: employee.addressStreet,
        addressNumber: employee.addressNumber,
        addressComplement: employee.addressComplement,
        addressNeighborhood: employee.addressNeighborhood,
        addressCity: employee.addressCity,
        addressState: employee.addressState,
        addressZip: employee.addressZip,
        role: employee.role,
        cbo: employee.cbo,
        salary: employee.salary != null ? Number(employee.salary) : 0,
        paymentDay: employee.paymentDay ?? 5,
        hazardousPayPercent: employee.hazardousPayPercent != null ? Number(employee.hazardousPayPercent) : undefined,
        overtimeHours: employee.overtimeHours != null ? Number(employee.overtimeHours) : undefined,
        overtimeValue: employee.overtimeValue != null ? Number(employee.overtimeValue) : undefined,
        dsrValue: employee.dsrValue != null ? Number(employee.dsrValue) : undefined,
        healthPlanDeduction: employee.healthPlanDeduction != null ? Number(employee.healthPlanDeduction) : undefined,
        inssPercent: employee.inssPercent != null ? Number(employee.inssPercent) : undefined,
        irrfValue: employee.irrfValue != null ? Number(employee.irrfValue) : undefined,
        dependentes: employee.dependentes != null ? employee.dependentes : 0,
        bankName: employee.bankName,
        bankAgency: employee.bankAgency,
        bankAccount: employee.bankAccount,
        bankPix: employee.bankPix,
        hireDate: employee.hireDate || undefined,
        notes: employee.notes,
        active: employee.active ?? true,
        contractType: employee.contractType ?? 'CLT',
        contractorId: employee.contractorId ?? undefined,
      })
    } else if (isRoot) {
      form.setFieldsValue({ tenantId: selectedTenantId ?? undefined })
    }
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    form.resetFields()
  }

  const handleDelete = async (id) => {
    try {
      await employeeService.deleteEmployee(id)
      message.success('Funcionário excluído.')
      handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir funcionário.')
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const payload = {
        name: values.name?.trim(),
        document: values.document?.trim() || undefined,
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        phoneAlt: values.phoneAlt?.trim() || undefined,
        addressStreet: values.addressStreet?.trim() || undefined,
        addressNumber: values.addressNumber?.trim() || undefined,
        addressComplement: values.addressComplement?.trim() || undefined,
        addressNeighborhood: values.addressNeighborhood?.trim() || undefined,
        addressCity: values.addressCity?.trim() || undefined,
        addressState: values.addressState?.trim()?.toUpperCase() || undefined,
        addressZip: values.addressZip?.trim() || undefined,
        role: values.role?.trim() || undefined,
        cbo: values.cbo?.trim() || undefined,
        salary: values.salary != null ? Number(values.salary) : 0,
        paymentDay: values.paymentDay != null ? Number(values.paymentDay) : 5,
        hazardousPayPercent: values.hazardousPayPercent != null && values.hazardousPayPercent !== '' ? Number(values.hazardousPayPercent) : undefined,
        overtimeHours: values.overtimeHours != null && values.overtimeHours !== '' ? Number(values.overtimeHours) : undefined,
        overtimeValue: values.overtimeValue != null && values.overtimeValue !== '' ? Number(values.overtimeValue) : undefined,
        dsrValue: values.dsrValue != null && values.dsrValue !== '' ? Number(values.dsrValue) : undefined,
        healthPlanDeduction: values.healthPlanDeduction != null && values.healthPlanDeduction !== '' ? Number(values.healthPlanDeduction) : undefined,
        inssPercent: values.inssPercent != null && values.inssPercent !== '' ? Number(values.inssPercent) : undefined,
        irrfValue: values.irrfValue != null && values.irrfValue !== '' ? Number(values.irrfValue) : undefined,
        dependentes: values.dependentes != null && values.dependentes !== '' ? Number(values.dependentes) : 0,
        bankName: values.bankName?.trim() || undefined,
        bankAgency: values.bankAgency?.trim() || undefined,
        bankAccount: values.bankAccount?.trim() || undefined,
        bankPix: values.bankPix?.trim() || undefined,
        hireDate: values.hireDate || undefined,
        notes: values.notes?.trim() || undefined,
        active: values.active ?? true,
        contractType: values.contractType === 'PJ' ? 'PJ' : 'CLT',
        contractorId: values.contractType === 'PJ' && values.contractorId ? values.contractorId : undefined,
      }
      if (editingId) {
        await employeeService.updateEmployee(editingId, payload)
        message.success('Funcionário atualizado com sucesso!')
      } else {
        if (isRoot) payload.tenantId = values.tenantId
        await employeeService.createEmployee(payload)
        message.success('Funcionário cadastrado com sucesso!')
      }
      closeDrawer()
      handleFilter()
    } catch (error) {
      message.error(error?.message || 'Erro ao salvar funcionário.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (v) => {
    if (v == null) return '—'
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatAddress = (r) => {
    const parts = []
    if (r.addressStreet) parts.push(r.addressStreet)
    if (r.addressNumber) parts.push(r.addressNumber)
    if (r.addressNeighborhood) parts.push(r.addressNeighborhood)
    if (r.addressCity) parts.push(r.addressCity)
    if (r.addressState) parts.push(r.addressState)
    return parts.length ? parts.join(', ') : '—'
  }

  const effectiveTenantId = isRoot ? selectedTenantId : undefined

  const handleGeneratePayroll = async () => {
    if (isRoot && !effectiveTenantId) {
      message.warning('Selecione a empresa acima para gerar as contas a pagar do mês.')
      return
    }
    setPayrollLoading('generate')
    try {
      const created = await employeeService.generatePayroll(effectiveTenantId, payrollYear, payrollMonth)
      message.success(created?.length ? `Foram criadas ${created.length} conta(s) a pagar.` : 'Nenhuma conta nova criada (já existem para este mês).')
      if (created?.length) handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar folha.')
    } finally {
      setPayrollLoading(null)
    }
  }

  const eligibleEmployees = employees.filter(
    (e) => e.active && Number(e.salary || 0) > 0 && (e.contractType || 'CLT') !== 'PJ'
  )

  const handleGenerateBatch = async () => {
    if (isRoot && !effectiveTenantId) {
      message.warning('Selecione a empresa para gerar as contas.')
      return
    }
    if (!generateMonthRange || !generateMonthRange[0] || !generateMonthRange[1]) {
      message.warning('Selecione o período de meses.')
      return
    }
    if (selectedEmployeeIds.length === 0) {
      message.warning('Selecione pelo menos um funcionário.')
      return
    }
    const start = generateMonthRange[0]
    const end = generateMonthRange[1]
    const months = []
    let current = dayjs(start).startOf('month')
    const endDate = dayjs(end).endOf('month')
    const endYear = endDate.year()
    const endMonth = endDate.month()
    while (current.year() < endYear || (current.year() === endYear && current.month() <= endMonth)) {
      months.push({ year: current.year(), month: current.month() + 1 })
      current = current.add(1, 'month')
    }
    setGenerateBatchLoading(true)
    try {
      const payload = {
        employeeIds: selectedEmployeeIds.map((id) => String(id)),
        months,
      }
      const created = await employeeService.generatePayrollBatch(effectiveTenantId, payload)
      if (created?.length) {
        message.success(`Foram criadas ${created.length} conta(s) a pagar. Confira em Contas a Pagar.`)
        setGenerateDrawerOpen(false)
        handleFilter()
      } else {
        message.info(
          'Nenhuma conta nova criada. As contas podem já existir para esses funcionários e meses. Verifique em Contas a Pagar.'
        )
      }
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar contas.')
    } finally {
      setGenerateBatchLoading(false)
    }
  }

  const handleDownloadPayrollPdf = async () => {
    if (isRoot && !effectiveTenantId) {
      message.warning('Selecione a empresa para exportar a folha.')
      return
    }
    setPayrollLoading('pdf')
    try {
      await employeeService.downloadPayrollReportPdf(effectiveTenantId, payrollYear, payrollMonth)
      message.success('PDF da folha baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar PDF.')
    } finally {
      setPayrollLoading(null)
    }
  }

  const handleDownloadPayrollExcel = async () => {
    if (isRoot && !effectiveTenantId) {
      message.warning('Selecione a empresa para exportar a folha.')
      return
    }
    setPayrollLoading('excel')
    try {
      await employeeService.downloadPayrollReportExcel(effectiveTenantId, payrollYear, payrollMonth)
      message.success('Excel da folha baixado.')
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar Excel.')
    } finally {
      setPayrollLoading(null)
    }
  }

  const handleDownloadReceipt = async (employee) => {
    if (isRoot && !effectiveTenantId) {
      message.warning('Selecione a empresa para gerar o recibo.')
      return
    }
    setReceiptLoadingId(employee.id)
    try {
      await employeeService.downloadSalaryReceiptPdf(effectiveTenantId, employee.id, payrollYear, payrollMonth)
      message.success(`Recibo de ${employee.name} baixado.`)
    } catch (e) {
      message.error(e?.message || 'Erro ao gerar recibo.')
    } finally {
      setReceiptLoadingId(null)
    }
  }

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'CPF/CNPJ', dataIndex: 'document', key: 'document', width: 130, ellipsis: true },
    { title: 'Modalidade', dataIndex: 'contractType', key: 'contractType', width: 90, render: (v) => (v === 'PJ' ? 'PJ' : 'CLT') },
    { title: 'Função', dataIndex: 'role', key: 'role', width: 140, ellipsis: true },
    {
      title: 'Salário',
      dataIndex: 'salary',
      key: 'salary',
      width: 120,
      align: 'right',
      render: (v) => formatCurrency(v),
    },
    {
      title: 'Dia pag.',
      dataIndex: 'paymentDay',
      key: 'paymentDay',
      width: 90,
      align: 'center',
    },
    {
      title: 'Endereço',
      key: 'address',
      ellipsis: true,
      render: (_, r) => formatAddress(r),
    },
    {
      title: 'Status',
      key: 'status',
      width: 90,
      render: (_, r) => (
        <Tag color={r.active ? 'green' : 'default'}>{r.active ? 'Ativo' : 'Inativo'}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Popconfirm
          title="Excluir este funcionário?"
          description="Esta ação não pode ser desfeita."
          onConfirm={(e) => { e?.stopPropagation?.(); handleDelete(record.id) }}
          okText="Excluir"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="employees-page">
      <main className="employees-main">
        <div className="employees-container">
          <div className="employees-header-card">
            <div className="employees-header-card-icon">
              <TeamOutlined />
            </div>
            <div className="employees-header-card-content">
              <h2 className="employees-page-title">Funcionários</h2>
              <p className="employees-page-subtitle">
                Cadastre funcionários com salário e dia de vencimento. Gere contas a pagar recorrentes mensais e exporte a folha de pagamento.
              </p>
            </div>
          </div>

          <Card className="employees-payroll-card employees-payroll-card-generate" title={<><CalendarOutlined /> Gerar contas a pagar do mês</>}>
            <p className="employees-payroll-desc">Cria uma conta a pagar para cada funcionário ativo (com salário &gt; 0) no mês selecionado. A descrição será &quot;Pagamento [Nome]&quot; e o vencimento no dia configurado de cada um. Não gera duplicatas para o mesmo mês.</p>
            <Row gutter={16} align="bottom" className="employees-payroll-row">
              {isRoot && (
                <Col xs={24} sm={12} md={6}>
                  <label className="employees-payroll-label">Empresa</label>
                  <Select
                    placeholder="Selecione a empresa"
                    value={selectedTenantId}
                    onChange={setSelectedTenantId}
                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                  />
                </Col>
              )}
              <Col xs={24} sm={8} md={4}>
                <label className="employees-payroll-label">Ano</label>
                <Select
                  value={payrollYear}
                  onChange={setPayrollYear}
                  options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => ({ value: y, label: String(y) }))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <label className="employees-payroll-label">Mês</label>
                <Select
                  value={payrollMonth}
                  onChange={setPayrollMonth}
                  options={MONTHS}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={8} md={6}>
                <label className="employees-payroll-label employees-payroll-label-invisible">Ação</label>
                <Space wrap>
                  <Button
                    type="primary"
                    size="large"
                    loading={payrollLoading === 'generate'}
                    onClick={handleGeneratePayroll}
                    className="employees-payroll-btn-generate"
                  >
                    Gerar contas do mês
                  </Button>
                  <Button
                    type="default"
                    size="large"
                    icon={<AccountBookOutlined />}
                    onClick={() => {
                      setSelectedEmployeeIds([])
                      setGenerateMonthRange(null)
                      setGenerateDrawerOpen(true)
                    }}
                  >
                    Gerar contas (selecionar)
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          <Card className="employees-payroll-card employees-payroll-card-receipt" title="Recibo de Pagamento de Salário (folha profissional)">
            <p className="employees-payroll-desc">Exporte a folha em PDF/Excel ou gere o recibo de pagamento de salário (modelo profissional) por funcionário para o mês/ano selecionado.</p>
            <Row gutter={16} align="bottom" className="employees-payroll-row" style={{ marginBottom: 16 }}>
              {isRoot && (
                <Col xs={24} sm={12} md={6}>
                  <label className="employees-payroll-label">Empresa</label>
                  <Select
                    placeholder="Selecione a empresa"
                    value={selectedTenantId}
                    onChange={setSelectedTenantId}
                    options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="label"
                  />
                </Col>
              )}
              <Col xs={24} sm={8} md={4}>
                <label className="employees-payroll-label">Ano</label>
                <Select
                  value={payrollYear}
                  onChange={setPayrollYear}
                  options={Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => ({ value: y, label: String(y) }))}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={8} md={4}>
                <label className="employees-payroll-label">Mês</label>
                <Select
                  value={payrollMonth}
                  onChange={setPayrollMonth}
                  options={MONTHS}
                  style={{ width: '100%' }}
                />
              </Col>
              <Col xs={24} sm={8} md={6}>
                <label className="employees-payroll-label employees-payroll-label-invisible">Exportar</label>
                <Space wrap>
                  <Button icon={<FilePdfOutlined />} loading={payrollLoading === 'pdf'} onClick={handleDownloadPayrollPdf}>Folha PDF</Button>
                  <Button icon={<FileExcelOutlined />} loading={payrollLoading === 'excel'} onClick={handleDownloadPayrollExcel}>Folha Excel</Button>
                </Space>
              </Col>
            </Row>
            <div className="employees-receipt-list">
              <div className="employees-receipt-list-title">Gerar recibo por funcionário</div>
              {employees.filter((e) => e.active).length === 0 ? (
                <p className="employees-receipt-empty">Nenhum funcionário ativo. Cadastre e filtre por ativos.</p>
              ) : (
                <div className="employees-receipt-grid">
                  {employees.filter((e) => e.active).map((emp) => (
                    <div key={emp.id} className="employees-receipt-item">
                      <span className="employees-receipt-item-name">{emp.name}</span>
                      <span className="employees-receipt-item-salary">{formatCurrency(emp.salary)}</span>
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<FilePdfOutlined />}
                        loading={receiptLoadingId === emp.id}
                        onClick={(ev) => { ev.stopPropagation(); handleDownloadReceipt(emp) }}
                      >
                        Recibo
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="employees-toolbar">
            <Card className="employees-filters-card sales-consult-filters-card" style={{ width: '100%' }}>
              <div className="sales-consult-filters-toggle">
                <Button icon={<FilterOutlined />} onClick={() => setFiltersExpanded((v) => !v)}>
                  {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                </Button>
              </div>
              {filtersExpanded && (
                <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
                  <Col xs={24} sm={12} md={6}>
                    <label>Buscar</label>
                    <Input
                      placeholder="Nome, documento, função"
                      prefix={<SearchOutlined />}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      onPressEnter={handleFilter}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <label>Status</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterActive}
                      onChange={setFilterActive}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  {isRoot && (
                    <Col xs={24} sm={12} md={6}>
                      <label>Empresa</label>
                      <Select
                        placeholder="Empresa"
                        options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                        value={selectedTenantId}
                        onChange={setSelectedTenantId}
                        style={{ width: '100%' }}
                        allowClear={false}
                      />
                    </Col>
                  )}
                  <Col xs={24} md={6} style={{ marginTop: 24 }}>
                    <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loadingList} block>
                      Filtrar
                    </Button>
                  </Col>
                </Row>
              )}
            </Card>
            <div className="employees-toolbar-actions">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openDrawer()} className="employees-add-btn">
                Novo funcionário
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={employees}
            loading={loadingList}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} funcionário(s)` }}
            className="employees-table"
            onRow={(record) => ({
              onClick: () => openDrawer(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </main>

      <Drawer
        title={editingId ? 'Editar funcionário' : 'Novo funcionário'}
        open={drawerOpen}
        onClose={closeDrawer}
        placement="right"
        width={540}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={loading} onClick={() => form.submit()}>
              {editingId ? 'Salvar' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={initialFormValues}
          className="employees-form employees-drawer-form"
        >
          {isRoot && !editingId && (
            <Form.Item name="tenantId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Modalidade de contratação</h3>
            <Form.Item name="contractType" label="Tipo" rules={[{ required: true }]}>
              <Select options={CONTRACT_TYPE_OPTIONS} placeholder="CLT ou PJ" />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.contractType !== curr.contractType}>
              {({ getFieldValue }) =>
                getFieldValue('contractType') === 'PJ' ? (
                  <Form.Item name="contractorId" label="Prestador PJ vinculado">
                    <Select
                      placeholder="Selecione o prestador (opcional)"
                      options={contractors.map((c) => ({ value: c.id, label: c.name || c.tradeName || c.cnpj || c.id }))}
                      showSearch
                      optionFilterProp="label"
                      allowClear
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </div>

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Dados básicos</h3>
            <Form.Item name="name" label="Nome completo" rules={[{ required: true, message: 'Obrigatório' }, { max: 255 }]}>
              <Input placeholder="Nome completo" />
            </Form.Item>
            <Form.Item name="document" label="CPF/CNPJ" rules={[{ max: 20 }]}>
              <Input placeholder="CPF ou CNPJ" />
            </Form.Item>
            <Form.Item name="email" label="E-mail" rules={[{ max: 255 }]}>
              <Input placeholder="E-mail" type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Telefone" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone principal" />
            </Form.Item>
            <Form.Item name="phoneAlt" label="Telefone alternativo" rules={[{ max: 20 }]}>
              <Input placeholder="Telefone alternativo" />
            </Form.Item>
          </div>

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Cargo e remuneração</h3>
            <Form.Item name="role" label="Função/cargo" rules={[{ max: 100 }]}>
              <Input placeholder="Ex: Vendedor, Entregador" />
            </Form.Item>
            <Form.Item name="cbo" label="CBO" rules={[{ max: 20 }]} tooltip="Classificação Brasileira de Ocupações">
              <Input placeholder="Ex: 1234-56" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="salary" label="Salário base (R$)" rules={[{ required: true, message: 'Informe o salário' }]}>
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="0,00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="paymentDay" label="Dia do vencimento" rules={[{ required: true }]} tooltip="Dia do mês (1 a 28) em que vence a conta a pagar do salário">
                  <InputNumber min={1} max={28} integer style={{ width: '100%' }} placeholder="5" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Proventos e descontos (folha)</h3>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="hazardousPayPercent" label="Adicional periculosidade (%)">
                  <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} placeholder="Ex: 30" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="overtimeHours" label="Horas extras (50%)">
                  <InputNumber min={0} step={0.5} style={{ width: '100%' }} placeholder="Quantidade" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="overtimeValue" label="Valor horas extras (R$)">
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="0,00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="dsrValue" label="DSR (R$)">
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="Descanso semanal remunerado" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="healthPlanDeduction" label="Desconto plano de saúde (R$)">
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="0,00" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="inssPercent" label="Alíquota INSS (%)">
                  <InputNumber min={0} max={100} step={0.01} style={{ width: '100%' }} placeholder="Ex: 11,68" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dependentes" label="Dependentes (IRRF)" tooltip="Número de dependentes para dedução na base do IRRF (R$ 189,59/dependente). O IRRF é calculado automaticamente pela tabela vigente.">
                  <InputNumber min={0} integer style={{ width: '100%' }} placeholder="0" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="irrfValue" label="IRRF manual (R$)" tooltip="Deixe em branco para usar o cálculo automático pela lei. Preencha apenas para valor informado manualmente.">
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="Cálculo automático" />
                </Form.Item>
              </Col>
            </Row>
          </div>

          {editingId && (
            <div className="employees-drawer-section employees-drawer-receipt">
              <h3 className="employees-section-title">Folha de pagamento</h3>
              <p className="employees-receipt-hint">Gerar recibo de pagamento de salário deste funcionário (PDF com dados reais).</p>
              <Row gutter={12} align="middle">
                <Col flex="none">
                  <Select
                    value={drawerReceiptMonth}
                    onChange={setDrawerReceiptMonth}
                    options={MONTHS}
                    style={{ width: 120 }}
                  />
                </Col>
                <Col flex="none">
                  <Select
                    value={drawerReceiptYear}
                    onChange={setDrawerReceiptYear}
                    options={Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => ({ value: y, label: String(y) }))}
                    style={{ width: 90 }}
                  />
                </Col>
                <Col flex="auto">
                  <Button
                    type="primary"
                    icon={<FilePdfOutlined />}
                    loading={receiptLoadingId === editingId}
                    onClick={async () => {
                      const emp = employees.find((e) => e.id === editingId)
                      if (!emp?.tenantId) {
                        message.error('Empresa do funcionário não identificada.')
                        return
                      }
                      setReceiptLoadingId(editingId)
                      try {
                        await employeeService.downloadSalaryReceiptPdf(emp.tenantId, editingId, drawerReceiptYear, drawerReceiptMonth)
                        message.success('Recibo gerado com sucesso.')
                      } catch (err) {
                        message.error(err?.message || 'Erro ao gerar recibo.')
                      } finally {
                        setReceiptLoadingId(null)
                      }
                    }}
                  >
                    Gerar recibo (PDF)
                  </Button>
                </Col>
              </Row>
            </div>
          )}

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Endereço</h3>
            <Form.Item name="addressStreet" label="Logradouro" rules={[{ max: 255 }]}>
              <Input placeholder="Rua, avenida, etc." />
            </Form.Item>
            <Form.Item name="addressNumber" label="Número" rules={[{ max: 20 }]}>
              <Input placeholder="Nº" />
            </Form.Item>
            <Form.Item name="addressComplement" label="Complemento" rules={[{ max: 100 }]}>
              <Input placeholder="Apto, bloco, etc." />
            </Form.Item>
            <Form.Item name="addressNeighborhood" label="Bairro" rules={[{ max: 100 }]}>
              <Input placeholder="Bairro" />
            </Form.Item>
            <Form.Item name="addressCity" label="Cidade" rules={[{ max: 100 }]}>
              <Input placeholder="Cidade" />
            </Form.Item>
            <Form.Item name="addressState" label="UF" rules={[{ max: 2 }]}>
              <Input placeholder="UF" maxLength={2} />
            </Form.Item>
            <Form.Item name="addressZip" label="CEP" rules={[{ max: 10 }]}>
              <Input placeholder="CEP" />
            </Form.Item>
          </div>

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Dados bancários</h3>
            <Form.Item name="bankName" label="Banco" rules={[{ max: 100 }]}>
              <Input placeholder="Nome do banco" />
            </Form.Item>
            <Form.Item name="bankAgency" label="Agência" rules={[{ max: 20 }]}>
              <Input placeholder="Agência" />
            </Form.Item>
            <Form.Item name="bankAccount" label="Conta" rules={[{ max: 30 }]}>
              <Input placeholder="Conta bancária" />
            </Form.Item>
            <Form.Item name="bankPix" label="Chave PIX" rules={[{ max: 100 }]}>
              <Input placeholder="Chave PIX" />
            </Form.Item>
          </div>

          <div className="employees-drawer-section">
            <h3 className="employees-section-title">Admissão e observações</h3>
            <Form.Item name="hireDate" label="Data de admissão">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="notes" label="Observações">
              <TextArea rows={2} placeholder="Observações (opcional)" />
            </Form.Item>
            <Form.Item name="active" valuePropName="checked" label="Ativo">
              <Switch checkedChildren="Sim" unCheckedChildren="Não" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>

      <Drawer
        title={<><AccountBookOutlined /> Gerar contas a pagar</>}
        open={generateDrawerOpen}
        onClose={() => setGenerateDrawerOpen(false)}
        placement="right"
        width={480}
        destroyOnClose
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button htmlType="button" onClick={() => setGenerateDrawerOpen(false)}>Cancelar</Button>
            <Button htmlType="button" type="primary" loading={generateBatchLoading} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleGenerateBatch(); }}>
              Gerar
            </Button>
          </Space>
        }
      >
        <p className="employees-payroll-desc">
          Selecione os funcionários e o período de meses. Serão criadas contas a pagar com o valor do salário em <strong>Contas a Pagar</strong>.
        </p>
        {isRoot && (
          <div style={{ marginBottom: 16 }}>
            <label className="employees-payroll-label">Empresa</label>
            <Select
              placeholder="Selecione a empresa"
              value={selectedTenantId}
              onChange={setSelectedTenantId}
              options={tenants.map((t) => ({ value: t.id, label: t.name }))}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
            />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label className="employees-payroll-label">Período (meses)</label>
          <RangePicker
            picker="month"
            value={generateMonthRange}
            onChange={setGenerateMonthRange}
            style={{ width: '100%' }}
            format="MM/YYYY"
          />
        </div>
        <div>
          <label className="employees-payroll-label">Funcionários</label>
          <Checkbox.Group
            value={selectedEmployeeIds}
            onChange={(vals) => setSelectedEmployeeIds(vals)}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {eligibleEmployees.length === 0 ? (
              <p className="employees-receipt-empty">Nenhum funcionário elegível (ativos, CLT, com salário &gt; 0). Cadastre e filtre.</p>
            ) : (
              eligibleEmployees.map((emp) => (
                <Checkbox key={emp.id} value={emp.id}>
                  <span>{emp.name}</span>
                  <span style={{ marginLeft: 8, color: '#667085', fontSize: 13 }}>{formatCurrency(emp.salary)}</span>
                </Checkbox>
              ))
            )}
          </Checkbox.Group>
          {eligibleEmployees.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Button
                type="link"
                size="small"
                onClick={() => setSelectedEmployeeIds(eligibleEmployees.map((e) => e.id))}
              >
                Selecionar todos
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => setSelectedEmployeeIds([])}
                style={{ marginLeft: 8 }}
              >
                Limpar
              </Button>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  )
}
