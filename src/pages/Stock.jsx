import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Input,
  Select,
  Button,
  DatePicker,
  Space,
  message,
  Statistic,
  Drawer,
  Form,
  InputNumber,
  Tag,
  Tooltip,
  Alert,
} from 'antd'
import {
  InboxOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  MinusOutlined,
  SwapOutlined,
  WarningOutlined,
  HistoryOutlined,
  BarcodeOutlined,
} from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { searchProducts } from '../services/productService'
import {
  searchStockMovements,
  registerMovement,
  getMovementsByProduct,
} from '../services/stockService'
import * as tenantService from '../services/tenantService'
import './Stock.css'

const { RangePicker } = DatePicker

function formatQty(value) {
  if (value == null) return '—'
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })
}

export default function Stock() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterLowStock, setFilterLowStock] = useState('__all__')
  const [filterTrackStock, setFilterTrackStock] = useState(true)
  const [movementDrawerOpen, setMovementDrawerOpen] = useState(false)
  const [movementProduct, setMovementProduct] = useState(null)
  const [movementType, setMovementType] = useState('MANUAL_ENTRY')
  const [movementLoading, setMovementLoading] = useState(false)
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
  const [historyProduct, setHistoryProduct] = useState(null)
  const [historyMovements, setHistoryMovements] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [form] = Form.useForm()
  const [filtersExpanded, setFiltersExpanded] = useState(false)

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

  const handleFilter = useCallback(async () => {
    if (isRoot && !selectedTenantId) {
      setProducts([])
      return
    }
    setLoadingList(true)
    try {
      const filter = {
        page: 0,
        size: 500,
        sortBy: 'name',
        sortDirection: 'asc',
      }
      if (filterSearch?.trim()) filter.search = filterSearch.trim()
      if (filterLowStock !== '__all__') filter.lowStock = filterLowStock === true
      const res = await searchProducts({
        ...filter,
        ...(isRoot && selectedTenantId ? { tenantId: selectedTenantId } : {}),
      })
      let list = res?.content ?? []
      if (filterTrackStock) {
        list = list.filter((p) => p.trackStock === true)
      }
      setProducts(list)
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar produtos.')
      setProducts([])
    } finally {
      setLoadingList(false)
    }
  }, [isRoot, selectedTenantId, filterSearch, filterLowStock, filterTrackStock])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])



  const openMovementDrawer = (product, type = 'MANUAL_ENTRY') => {
    setMovementProduct(product)
    setMovementType(type)
    form.resetFields()
    form.setFieldsValue({
      productId: product?.id,
      movementType: type,
      quantity: type === 'MANUAL_EXIT' ? undefined : 1,
      notes: '',
    })
    setMovementDrawerOpen(true)
  }

  const closeMovementDrawer = () => {
    setMovementDrawerOpen(false)
    setMovementProduct(null)
    form.resetFields()
  }

  const onMovementSubmit = async () => {
    try {
      const values = await form.validateFields()
      setMovementLoading(true)
      await registerMovement(isRoot ? selectedTenantId : null, {
        productId: values.productId,
        movementType: values.movementType,
        quantity: values.quantity,
        notes: values.notes?.trim() || undefined,
      })
      message.success('Movimentação registrada com sucesso!')
      closeMovementDrawer()
      handleFilter()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e?.message || 'Erro ao registrar movimentação.')
    } finally {
      setMovementLoading(false)
    }
  }

  const openHistoryDrawer = async (product) => {
    setHistoryProduct(product)
    setHistoryDrawerOpen(true)
    setHistoryLoading(true)
    try {
      const data = await getMovementsByProduct(isRoot ? selectedTenantId : null, product.id, 50)
      setHistoryMovements(data || [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar histórico.')
      setHistoryMovements([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const isLowStock = (p) => {
    if (!p?.trackStock || p.minStock == null) return false
    const qty = Number(p.stockQuantity ?? 0)
    return qty < Number(p.minStock)
  }

  const isOutOfStock = (p) => {
    if (!p?.trackStock) return false
    return Number(p.stockQuantity ?? 0) <= 0
  }

  const lowStockCount = products.filter(isLowStock).length
  const trackStockCount = products.filter((p) => p.trackStock).length

  const columns = [
    {
      title: 'Produto',
      key: 'product',
      render: (_, r) => (
        <div>
          <div className="stock-table-product-name">{r.name}</div>
          <div className="stock-table-product-sku">SKU: {r.sku}</div>
        </div>
      ),
    },
    {
      title: 'Estoque atual',
      key: 'stock',
      width: 130,
      render: (_, r) => {
        if (!r.trackStock) return <Tag color="default">Sem controle</Tag>
        const qty = Number(r.stockQuantity ?? 0)
        const min = r.minStock != null ? Number(r.minStock) : null
        const low = isLowStock(r)
        const out = isOutOfStock(r)
        return (
          <Tooltip
            title={
              min != null
                ? `Mínimo: ${formatQty(min)}`
                : low
                ? 'Estoque abaixo do mínimo'
                : out
                ? 'Estoque zerado'
                : null
            }
          >
            <span className={low || out ? 'stock-qty-low' : ''}>{formatQty(r.stockQuantity)}</span>
            {min != null && <span className="stock-qty-min"> / mín. {formatQty(min)}</span>}
          </Tooltip>
        )
      },
    },
    {
      title: 'Baixa na venda',
      key: 'deductStockOnSale',
      width: 120,
      render: (_, r) =>
        r.trackStock ? (
          r.deductStockOnSale !== false ? (
            <Tag color="green">Automática</Tag>
          ) : (
            <Tag color="orange">Manual</Tag>
          )
        ) : (
          '—'
        ),
    },
    {
      title: 'Un.',
      dataIndex: 'unitOfMeasure',
      width: 70,
      render: (u) => {
        const map = { UN: 'un', KG: 'kg', G: 'g', LT: 'L', ML: 'ml', CX: 'cx', PC: 'pç' }
        return map[u] || u || '—'
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 200,
      render: (_, record) =>
        record.trackStock ? (
          <Space wrap size={4}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openMovementDrawer(record, 'MANUAL_ENTRY')
              }}
            >
              Entrada
            </Button>
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openMovementDrawer(record, 'MANUAL_EXIT')
              }}
            >
              Saída
            </Button>
            <Button
              type="text"
              size="small"
              icon={<SwapOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openMovementDrawer(record, 'ADJUSTMENT')
              }}
            >
              Ajuste
            </Button>
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                openHistoryDrawer(record)
              }}
            >
              Histórico
            </Button>
          </Space>
        ) : (
          '—'
        ),
    },
  ]

  return (
    <div className="stock-page">
      <main className="stock-main">
        <div className="stock-container">
          <div className="stock-header-card">
            <div className="stock-header-card-icon">
              <InboxOutlined />
            </div>
            <div className="stock-header-card-content">
              <h2 className="stock-page-title">Gestão de Estoque</h2>
              <p className="stock-page-subtitle">
                Controle entradas, saídas e acompanhe o histórico de movimentações dos produtos.
              </p>
            </div>
          </div>

          {isRoot && tenants.length > 0 && (
            <div className="stock-tenant-row">
              <Select
                placeholder="Empresa"
                options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                value={selectedTenantId}
                onChange={setSelectedTenantId}
                style={{ minWidth: 220 }}
              />
            </div>
          )}

          <Row gutter={16} className="stock-kpis">
            <Col xs={24} sm={12} md={6}>
              <Card className="stock-kpi-card">
                <Statistic title="Produtos com controle de estoque" value={trackStockCount} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className={`stock-kpi-card ${lowStockCount > 0 ? 'stock-kpi-warning' : ''}`}>
                <Statistic
                  title="Produtos com estoque baixo"
                  value={lowStockCount}
                  prefix={lowStockCount > 0 ? <WarningOutlined /> : null}
                />
              </Card>
            </Col>
          </Row>

          {lowStockCount > 0 && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message={`${lowStockCount} produto(s) com estoque abaixo do mínimo`}
              style={{ marginBottom: 20 }}
            />
          )}

          <Card className="stock-filters-card sales-consult-filters-card">
            <div className="sales-consult-filters-toggle">
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFiltersExpanded((v) => !v)}
              >
                {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
              </Button>
            </div>
            {filtersExpanded && (
              <Row gutter={16} align="middle" style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} md={6}>
                  <label>Buscar produto</label>
                  <Input
                    placeholder="Nome, SKU..."
                    prefix={<SearchOutlined />}
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    onPressEnter={handleFilter}
                    allowClear
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label>Estoque baixo</label>
                  <Select
                    placeholder="Todos"
                    value={filterLowStock}
                    onChange={setFilterLowStock}
                    options={[
                      { value: '__all__', label: 'Todos' },
                      { value: true, label: 'Sim' },
                      { value: false, label: 'Não' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={6}>
                  <label>Controle estoque</label>
                  <Select
                    placeholder="Todos"
                    value={filterTrackStock}
                    onChange={setFilterTrackStock}
                    options={[
                      { value: true, label: 'Apenas com controle' },
                      { value: false, label: 'Todos' },
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} md={6} style={{ marginTop: 24 }}>
                  <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loadingList} block>
                    Filtrar
                  </Button>
                </Col>
              </Row>
            )}
          </Card>

          <Card className="stock-table-card">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={products}
              loading={loadingList}
              pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `${t} produto(s)` }}
              rowClassName={(r) => (isLowStock(r) ? 'stock-row-low' : '')}
            />
          </Card>
        </div>
      </main>

      <Drawer
        title={
          movementType === 'MANUAL_ENTRY'
            ? 'Registrar entrada'
            : movementType === 'MANUAL_EXIT'
            ? 'Registrar saída'
            : 'Ajuste de estoque'
        }
        open={movementDrawerOpen}
        onClose={closeMovementDrawer}
        width={400}
        extra={
          <Button type="primary" loading={movementLoading} onClick={onMovementSubmit}>
            Confirmar
          </Button>
        }
      >
        {movementProduct && (
          <div className="stock-movement-drawer">
            <div className="stock-movement-product">
              <strong>{movementProduct.name}</strong>
              <div className="stock-movement-product-sku">SKU: {movementProduct.sku}</div>
              <div className="stock-movement-product-qty">
                Estoque atual: <strong>{formatQty(movementProduct.stockQuantity)}</strong>
              </div>
            </div>
            <Form form={form} layout="vertical">
              <Form.Item name="productId" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="movementType" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item
                name="quantity"
                label={movementType === 'ADJUSTMENT' ? 'Variação (positivo=entrada, negativo=saída)' : 'Quantidade'}
                rules={[{ required: true, message: 'Informe a quantidade' }]}
              >
                <InputNumber
                  min={movementType === 'ADJUSTMENT' ? undefined : 0.0001}
                  step={1}
                  precision={4}
                  placeholder={movementType === 'ADJUSTMENT' ? 'Ex: 10 ou -5' : undefined}
                  style={{ width: '100%' }}
                />
              </Form.Item>
              <Form.Item name="notes" label="Observação">
                <Input.TextArea rows={3} placeholder="Motivo ou observação (opcional)" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Drawer>

      <Drawer
        title={`Histórico: ${historyProduct?.name || ''}`}
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        width={640}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Carregando...</div>
        ) : historyMovements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            Nenhuma movimentação registrada.
          </div>
        ) : (
          <Table
            size="small"
            rowKey="id"
            dataSource={historyMovements}
            columns={[
              {
                title: 'Data',
                key: 'createdAt',
                width: 160,
                render: (_, r) =>
                  r.createdAt ? new Date(r.createdAt).toLocaleString('pt-BR') : '—',
              },
              {
                title: 'Tipo',
                key: 'movementType',
                width: 130,
                render: (_, r) => {
                  const colors = { SALE: 'blue', MANUAL_ENTRY: 'green', MANUAL_EXIT: 'red', ADJUSTMENT: 'orange' }
                  return <Tag color={colors[r.movementType] || 'default'}>{r.movementTypeLabel || r.movementType}</Tag>
                },
              },
              {
                title: 'Variação',
                key: 'quantityDelta',
                width: 100,
                render: (_, r) => {
                  const d = Number(r.quantityDelta ?? 0)
                  return <span className={d >= 0 ? 'stock-delta-positive' : 'stock-delta-negative'}>{d >= 0 ? '+' : ''}{formatQty(d)}</span>
                },
              },
              {
                title: 'Antes',
                key: 'quantityBefore',
                width: 90,
                render: (_, r) => formatQty(r.quantityBefore),
              },
              {
                title: 'Depois',
                key: 'quantityAfter',
                width: 90,
                render: (_, r) => formatQty(r.quantityAfter),
              },
              {
                title: 'Referência',
                key: 'saleNumber',
                render: (_, r) => r.saleNumber || r.notes || '—',
              },
            ]}
            pagination={false}
          />
        )}
      </Drawer>
    </div>
  )
}
