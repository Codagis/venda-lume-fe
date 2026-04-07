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
  Collapse,
  Divider,
  Drawer,
  Table,
  message,
  Space,
  Upload,
  Tooltip,
  Alert,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  BarcodeOutlined,
  DollarOutlined,
  InboxOutlined,
  AppstoreOutlined,
  BorderOuterOutlined,
  ExperimentOutlined,
  OrderedListOutlined,
  AppstoreAddOutlined,
  SearchOutlined,
  FilterOutlined,
  DownOutlined,
  UploadOutlined,
  DeleteOutlined,
  WarningOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  IdcardOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import {
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  UNIT_OF_MEASURE_OPTIONS,
} from '../../services/productService'
import * as tenantService from '../../services/tenantService'
import { uploadProductImage } from '../../services/uploadService'
import { confirmDeleteModal } from '../../utils/confirmModal'
import './Products.css'

const { TextArea } = Input

const initialFormValues = {
  tenantId: null,
  unitOfMeasure: 'UN',
  sellByWeight: false,
  trackStock: false,
  deductStockOnSale: true,
  allowNegativeStock: false,
  active: true,
  availableForSale: true,
  availableForDelivery: true,
  featured: false,
  emitsNfce: true,
  emitsNfe: false,
  emitsComprovanteSimples: true,
  stockQuantity: 0,
  minStock: 0,
  imageUrl: null,
}

function formatPrice(value) {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatUnit(uom) {
  const opt = UNIT_OF_MEASURE_OPTIONS.find((o) => o.value === uom)
  return opt ? opt.label.split(' ')[0] : uom || '-'
}

function isLowStock(r) {
  if (!r.trackStock || r.minStock == null) return false
  const qty = Number(r.stockQuantity ?? 0)
  const min = Number(r.minStock)
  return qty < min
}

function isOutOfStock(r) {
  if (!r.trackStock) return false
  return Number(r.stockQuantity ?? 0) <= 0
}

export default function Products() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const [form] = Form.useForm()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [tenants, setTenants] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState(null)
  const FILTER_ALL = '__all__'
  const [filterSearch, setFilterSearch] = useState('')
  const [filterActive, setFilterActive] = useState(FILTER_ALL)
  const [filterAvailableForSale, setFilterAvailableForSale] = useState(FILTER_ALL)
  const [filterFeatured, setFilterFeatured] = useState(FILTER_ALL)
  const [filterLowStock, setFilterLowStock] = useState(FILTER_ALL)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState(null)
  const [selectedImageFile, setSelectedImageFile] = useState(null)
  const [drawerFormInitialValues, setDrawerFormInitialValues] = useState(initialFormValues)

  const FILTER_OPTIONS = [
    { value: FILTER_ALL, label: 'Todos' },
    { value: true, label: 'Sim' },
    { value: false, label: 'Não' },
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

  const handleFilter = useCallback(async (overrides = {}) => {
    if (isRoot && !selectedTenantId) {
      setProducts([])
      return
    }
    setLoadingList(true)
    try {
      const filter = {
        page: 0,
        size: 200,
        sortBy: 'name',
        sortDirection: 'asc',
      }
      if (filterSearch?.trim()) filter.search = filterSearch.trim()
      if (filterActive !== FILTER_ALL) filter.active = filterActive
      if (filterAvailableForSale !== FILTER_ALL) filter.availableForSale = filterAvailableForSale
      if (filterFeatured !== FILTER_ALL) filter.featured = filterFeatured
      const lowStockVal = overrides.lowStock !== undefined ? overrides.lowStock : filterLowStock
      if (lowStockVal !== FILTER_ALL) filter.lowStock = lowStockVal
      if (isRoot && selectedTenantId != null && selectedTenantId !== '') {
        filter.tenantId = selectedTenantId
      }
      const res = await searchProducts(filter)
      setProducts(res?.content ?? [])
    } catch (e) {
      message.error(e?.message || 'Erro ao carregar produtos.')
      setProducts([])
    } finally {
      setLoadingList(false)
    }
  }, [
    isRoot,
    selectedTenantId,
    filterSearch,
    filterActive,
    filterAvailableForSale,
    filterFeatured,
    filterLowStock,
  ])

  useEffect(() => {
    if (isRoot) loadTenants()
  }, [isRoot, loadTenants])



  const openDrawer = (product = null) => {
    setEditingId(product?.id ?? null)
    setPreviewImageUrl(product?.imageUrl ?? null)
    setSelectedImageFile(null)
    const initial = product
      ? {
          ...initialFormValues,
          tenantId: product.tenantId ?? undefined,
          sku: product.sku,
          barcode: product.barcode,
          internalCode: product.internalCode,
          name: product.name,
          shortDescription: product.shortDescription,
          description: product.description,
          unitPrice: product.unitPrice,
          costPrice: product.costPrice,
          discountPrice: product.discountPrice,
          taxRate: product.taxRate,
          unitOfMeasure: product.unitOfMeasure ?? 'UN',
          sellByWeight: product.sellByWeight ?? false,
          trackStock: product.trackStock ?? false,
          deductStockOnSale: product.deductStockOnSale ?? true,
          stockQuantity: product.stockQuantity ?? 0,
          minStock: product.minStock ?? 0,
          allowNegativeStock: product.allowNegativeStock ?? false,
          brand: product.brand,
          ncm: product.ncm,
          cest: product.cest,
          displayOrder: product.displayOrder,
          active: product.active ?? true,
          availableForSale: product.availableForSale ?? true,
          availableForDelivery: product.availableForDelivery ?? true,
          featured: product.featured ?? false,
          emitsNfce: product.emitsNfce != null ? !!product.emitsNfce : true,
          emitsNfe: product.emitsNfe != null ? !!product.emitsNfe : false,
          emitsComprovanteSimples: product.emitsComprovanteSimples != null ? !!product.emitsComprovanteSimples : true,
          imageUrl: product.imageUrl,
          weight: product.weight,
          width: product.width,
          height: product.height,
          depth: product.depth,
          serveSize: product.serveSize,
          calories: product.calories,
          ingredients: product.ingredients,
          allergens: product.allergens,
          nutritionalInfo: product.nutritionalInfo,
          minOrderQuantity: product.minOrderQuantity,
          maxOrderQuantity: product.maxOrderQuantity,
          sellMultiple: product.sellMultiple,
          preparationTimeMinutes: product.preparationTimeMinutes,
        }
      : { ...initialFormValues, ...(isRoot && selectedTenantId && { tenantId: selectedTenantId }) }
    setDrawerFormInitialValues(initial)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setEditingId(null)
    setPreviewImageUrl(null)
    setSelectedImageFile(null)
    form.resetFields()
  }

  useEffect(() => {
    if (drawerOpen) {
      form.setFieldsValue(drawerFormInitialValues)
    }
  }, [drawerOpen, drawerFormInitialValues, form])

  const openDetailDrawer = (product) => {
    setSelectedProduct(product)
    setDetailDrawerOpen(true)
  }

  const closeDetailDrawer = () => {
    setDetailDrawerOpen(false)
    setSelectedProduct(null)
  }

  const openEditFromDetail = () => {
    const p = selectedProduct
    closeDetailDrawer()
    if (p) openDrawer(p)
  }

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id)
      message.success('Produto excluído.')
      handleFilter()
    } catch (e) {
      message.error(e?.message || 'Erro ao excluir produto.')
    }
  }

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const effectiveTenantId = isRoot ? values.tenantId : undefined
      let imageUrl = values.imageUrl?.trim() || null
      if (selectedImageFile) {
        const productName = values.name?.trim() || ''
        const { url } = await uploadProductImage(selectedImageFile, editingId || undefined, productName || undefined, effectiveTenantId)
        imageUrl = url
      }
      const payload = {
        ...(isRoot && !editingId && effectiveTenantId && { tenantId: effectiveTenantId }),
        sku: values.sku?.trim(),
        barcode: values.barcode?.trim() || undefined,
        internalCode: values.internalCode?.trim() || undefined,
        name: values.name?.trim(),
        shortDescription: values.shortDescription?.trim() || undefined,
        description: values.description?.trim() || undefined,
        unitPrice: values.unitPrice,
        costPrice: values.costPrice ?? undefined,
        discountPrice: values.discountPrice ?? undefined,
        taxRate: values.taxRate ?? undefined,
        unitOfMeasure: values.unitOfMeasure,
        sellByWeight: values.sellByWeight ?? false,
        trackStock: values.trackStock ?? false,
        deductStockOnSale: values.deductStockOnSale ?? true,
        stockQuantity: values.trackStock ? (values.stockQuantity ?? 0) : undefined,
        minStock: values.trackStock ? (values.minStock ?? undefined) : undefined,
        allowNegativeStock: values.allowNegativeStock ?? false,
        brand: values.brand?.trim() || undefined,
        ncm: values.ncm?.trim() || undefined,
        cest: values.cest?.trim() || undefined,
        weight: values.weight ?? undefined,
        width: values.width ?? undefined,
        height: values.height ?? undefined,
        depth: values.depth ?? undefined,
        preparationTimeMinutes: values.preparationTimeMinutes ?? undefined,
        serveSize: values.serveSize?.trim() || undefined,
        calories: values.calories ?? undefined,
        ingredients: values.ingredients?.trim() || undefined,
        allergens: values.allergens?.trim() || undefined,
        nutritionalInfo: values.nutritionalInfo?.trim() || undefined,
        minOrderQuantity: values.minOrderQuantity ?? undefined,
        maxOrderQuantity: values.maxOrderQuantity ?? undefined,
        sellMultiple: values.sellMultiple ?? undefined,
        active: values.active ?? true,
        availableForSale: values.availableForSale ?? true,
        availableForDelivery: values.availableForDelivery ?? true,
        featured: values.featured ?? false,
        emitsNfce: typeof values.emitsNfce === 'boolean' ? values.emitsNfce : true,
        emitsNfe: typeof values.emitsNfe === 'boolean' ? values.emitsNfe : false,
        emitsComprovanteSimples: typeof values.emitsComprovanteSimples === 'boolean' ? values.emitsComprovanteSimples : true,
        displayOrder: values.displayOrder ?? undefined,
        imageUrl,
      }
      if (editingId) {
        await updateProduct(editingId, payload)
        message.success('Produto atualizado com sucesso!')
      } else {
        await createProduct(payload)
        message.success('Produto cadastrado com sucesso!')
      }
      closeDrawer()
      handleFilter()
    } catch (error) {
      message.error(error?.message || 'Erro ao salvar produto.')
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: 'Foto',
      key: 'image',
      width: 88,
      align: 'center',
      fixed: 'left',
      render: (_, record) =>
        record.imageUrl ? (
          <img src={record.imageUrl} alt="" className="products-table-img" />
        ) : (
          <div className="products-table-img-placeholder">—</div>
        ),
    },
    {
      title: 'Códigos',
      key: 'codes',
      width: 200,
      render: (_, record) => (
        <div className="products-table-codes">
          <div className="products-table-sku">{record.sku || '—'}</div>
          {record.barcode && (
            <div className="products-table-barcode-value">
              <BarcodeOutlined style={{ marginRight: 4, fontSize: 12 }} />
              {record.barcode}
            </div>
          )}
          {record.internalCode && (
            <div className="products-table-internal">Cód. {record.internalCode}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Produto',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      minWidth: 180,
      render: (name, record) => (
        <div className="products-table-name-cell">
          <span className="products-table-name">{name || '—'}</span>
          {record.shortDescription && (
            <span className="products-table-short-desc">{record.shortDescription}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Marca',
      dataIndex: 'brand',
      key: 'brand',
      width: 110,
      ellipsis: true,
      render: (v) => v || '—',
    },
    {
      title: 'Preço',
      key: 'unitPrice',
      width: 100,
      align: 'right',
      render: (_, r) => (
        <div className="products-table-price">
          <span className="products-table-price-main">{formatPrice(r.unitPrice)}</span>
          {r.discountPrice != null && Number(r.discountPrice) > 0 && Number(r.discountPrice) !== Number(r.unitPrice) && (
            <span className="products-table-price-promo">{formatPrice(r.discountPrice)} promocional</span>
          )}
        </div>
      ),
    },
    {
      title: 'Custo',
      key: 'costPrice',
      width: 95,
      align: 'right',
      render: (_, r) => (
        <span className="products-table-cost">{r.costPrice != null ? formatPrice(r.costPrice) : '—'}</span>
      ),
    },
    {
      title: 'Unidade',
      dataIndex: 'unitOfMeasure',
      key: 'unitOfMeasure',
      width: 95,
      align: 'center',
      render: (u) => <span className="products-table-uom">{formatUnit(u)}</span>,
    },
    {
      title: 'Estoque',
      key: 'stock',
      width: 115,
      align: 'right',
      render: (_, r) => {
        if (!r.trackStock) return <span className="products-stock-none">—</span>
        const qty = Number(r.stockQuantity ?? 0)
        const min = r.minStock != null ? Number(r.minStock) : null
        const low = isLowStock(r)
        const out = isOutOfStock(r)
        const content = (
          <div className="products-stock-cell">
            <span className={low || out ? 'products-stock-low' : ''}>{qty.toLocaleString('pt-BR')}</span>
            {min != null && <span className="products-stock-min"> / mín. {min.toLocaleString('pt-BR')}</span>}
            {low && <WarningOutlined className="products-stock-warning-icon" />}
          </div>
        )
        return low ? (
          <Tooltip title={out ? 'Estoque zerado! Abaixo do mínimo.' : `Estoque baixo. Mínimo: ${min?.toLocaleString('pt-BR')}`}>
            {content}
          </Tooltip>
        ) : (
          content
        )
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, r) => (
        <div className="products-table-status">
          <Tag color={r.active ? 'green' : 'default'} className="products-tag">{r.active ? 'Ativo' : 'Inativo'}</Tag>
          {r.availableForSale && <Tag color="blue" className="products-tag">Venda</Tag>}
          {r.availableForDelivery && <Tag color="cyan" className="products-tag">Delivery</Tag>}
          {r.featured && <Tag color="gold" className="products-tag">Destaque</Tag>}
        </div>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 112,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} className="products-table-actions" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver detalhes">
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetailDrawer(record)} className="products-table-btn" />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openDrawer(record)} className="products-table-btn" />
          </Tooltip>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            className="products-table-btn"
            onClick={() =>
              confirmDeleteModal({
                title: 'Excluir este produto?',
                onOk: () => handleDelete(record.id),
              })
            }
          />
        </Space>
      ),
    },
  ]

  return (
    <div className="products-page">
      <main className="products-main">
        <div className="products-container">
          <div className="products-header-card">
            <div className="products-header-card-icon">
              <AppstoreAddOutlined />
            </div>
            <div className="products-header-card-content">
              <h2 className="products-page-title">Produtos</h2>
              <p className="products-page-subtitle">
                Liste e gerencie os produtos. Clique em um item para editar ou use o botão para cadastrar um novo.
              </p>
            </div>
          </div>

          <div className="products-toolbar">
            <Card className="products-filters-card sales-consult-filters-card" style={{ width: '100%' }}>
              <div className="vl-filters-toggle sales-consult-filters-toggle">
                <Button
                  type="button"
                  className={`vl-filters-toggle-btn${filtersExpanded ? ' vl-filters-toggle-btn--open' : ''}`}
                  icon={<FilterOutlined />}
                  onClick={() => setFiltersExpanded((v) => !v)}
                  aria-expanded={filtersExpanded}
                >
                  <span className="vl-filters-toggle-label">
                    {filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
                  </span>
                  <DownOutlined className="vl-filters-chevron" aria-hidden />
                </Button>
              </div>
              <div
                className={`vl-filters-expand${filtersExpanded ? ' vl-filters-expand--open' : ''}`}
                aria-hidden={!filtersExpanded}
              >
                <div className="vl-filters-expand-inner">
                <Row gutter={16} align="middle" className="vl-filters-row">
                  <Col xs={24} sm={12} md={4}>
                    <label>Buscar</label>
                    <Input
                      placeholder="Nome, SKU, código"
                      prefix={<SearchOutlined />}
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      onPressEnter={handleFilter}
                      allowClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <label>Ativo</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterActive}
                      onChange={setFilterActive}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <label>À venda</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterAvailableForSale}
                      onChange={setFilterAvailableForSale}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <label>Destaque</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterFeatured}
                      onChange={setFilterFeatured}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={3}>
                    <label>Estoque baixo</label>
                    <Select
                      placeholder="Todos"
                      options={FILTER_OPTIONS}
                      value={filterLowStock}
                      onChange={setFilterLowStock}
                      style={{ width: '100%' }}
                      allowClear
                    />
                  </Col>
                  {isRoot && (
                    <Col xs={24} sm={12} md={4}>
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
                  <Col xs={24} md={4} style={{ marginTop: 24 }}>
                    <Button type="primary" icon={<FilterOutlined />} onClick={handleFilter} loading={loadingList} block>
                      Filtrar
                    </Button>
                  </Col>
                </Row>
                </div>
              </div>
            </Card>
            <div className="products-toolbar-actions">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openDrawer()}
                className="products-add-btn"
              >
                Novo produto
              </Button>
            </div>
          </div>

          {(() => {
            const lowStockCount = products.filter(isLowStock).length
            if (lowStockCount > 0) {
              return (
                <Alert
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  message={`${lowStockCount} produto(s) com estoque baixo`}
                  description="Produtos com quantidade abaixo do estoque mínimo. Clique em Filtrar com 'Estoque baixo: Sim' para listar apenas esses itens."
                  style={{ marginBottom: 20 }}
                  action={
                    <Button
                      size="small"
                      onClick={() => {
                        setFiltersExpanded(true)
                        setFilterLowStock(true)
                        handleFilter({ lowStock: true })
                      }}
                    >
                      Ver apenas estoque baixo
                    </Button>
                  }
                />
              )
            }
            return null
          })()}

          <div className="products-summary-row">
            <div className="products-summary-card">
              <span className="products-summary-value">{products.length}</span>
              <span className="products-summary-label">Total de produtos</span>
            </div>
            <div className="products-summary-card">
              <span className="products-summary-value">{products.filter((p) => p.active).length}</span>
              <span className="products-summary-label">Ativos</span>
            </div>
            <div className="products-summary-card">
              <span className="products-summary-value">{products.filter(isLowStock).length}</span>
              <span className="products-summary-label">Estoque baixo</span>
            </div>
          </div>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={products}
            loading={loadingList}
            scroll={{ x: 1280 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (t) => `${t} produto(s)`,
              pageSizeOptions: ['10', '20', '50', '100'],
            }}
            className="products-table products-table-pro"
            rowClassName={(record) => (isLowStock(record) ? 'products-row-low-stock' : '')}
            onRow={(record) => ({
              onClick: () => openDetailDrawer(record),
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      </main>

      <Drawer
        title="Detalhes do produto"
        open={detailDrawerOpen}
        onClose={closeDetailDrawer}
        placement="right"
        width={520}
        destroyOnClose
        className="products-detail-drawer-wrapper"
        extra={
          <Space>
            <Button onClick={closeDetailDrawer}>Fechar</Button>
            <Button type="primary" icon={<EditOutlined />} onClick={openEditFromDetail}>
              Editar
            </Button>
          </Space>
        }
      >
        {selectedProduct && (
          <div className="products-detail-drawer">
            <div className="products-detail-hero">
              {selectedProduct.imageUrl ? (
                <div className="products-detail-image-wrap">
                  <img src={selectedProduct.imageUrl} alt="" className="products-detail-image" />
                </div>
              ) : (
                <div className="products-detail-image-placeholder">
                  <AppstoreOutlined />
                </div>
              )}
              <h3 className="products-detail-name">{selectedProduct.name || 'Sem nome'}</h3>
              <div className="products-detail-badges">
                <Tag color={selectedProduct.active ? 'green' : 'default'} className="products-detail-tag">{selectedProduct.active ? 'Ativo' : 'Inativo'}</Tag>
                {selectedProduct.availableForSale && <Tag color="blue" className="products-detail-tag">À venda</Tag>}
                {selectedProduct.availableForDelivery && <Tag color="cyan" className="products-detail-tag">Delivery</Tag>}
                {selectedProduct.featured && <Tag color="gold" className="products-detail-tag">Destaque</Tag>}
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <BarcodeOutlined /> Identificação
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Nome</span><span className="products-detail-value">{selectedProduct.name || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">SKU</span><span className="products-detail-value">{selectedProduct.sku || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Código de barras</span><span className="products-detail-value">{selectedProduct.barcode || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Código interno</span><span className="products-detail-value">{selectedProduct.internalCode || '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Descrição curta</span><span className="products-detail-value">{selectedProduct.shortDescription || '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Descrição</span><span className="products-detail-value products-detail-value-block">{selectedProduct.description || '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">URL da imagem</span><span className="products-detail-value products-detail-value-url">{selectedProduct.imageUrl || '—'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <DollarOutlined /> Preços e unidade
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Preço de venda</span><span className="products-detail-value products-detail-value-price">{formatPrice(selectedProduct.unitPrice)}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Custo</span><span className="products-detail-value">{formatPrice(selectedProduct.costPrice)}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Preço promocional</span><span className="products-detail-value">{formatPrice(selectedProduct.discountPrice)}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Unidade</span><span className="products-detail-value">{formatUnit(selectedProduct.unitOfMeasure)}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Imposto (%)</span><span className="products-detail-value">{selectedProduct.taxRate != null ? `${selectedProduct.taxRate}%` : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Vendido por peso</span><span className="products-detail-value">{selectedProduct.sellByWeight ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Ordem de exibição</span><span className="products-detail-value">{selectedProduct.displayOrder != null ? selectedProduct.displayOrder : '—'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <InboxOutlined /> Estoque
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Controlar estoque</span><span className="products-detail-value">{selectedProduct.trackStock ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Baixa automática nas vendas</span><span className="products-detail-value">{selectedProduct.trackStock ? (selectedProduct.deductStockOnSale !== false ? 'Sim' : 'Não') : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Quantidade em estoque</span><span className="products-detail-value products-detail-value-highlight">{selectedProduct.trackStock ? Number(selectedProduct.stockQuantity ?? 0).toLocaleString('pt-BR') : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Estoque mínimo</span><span className="products-detail-value">{selectedProduct.minStock != null ? Number(selectedProduct.minStock).toLocaleString('pt-BR') : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Permitir estoque negativo</span><span className="products-detail-value">{selectedProduct.allowNegativeStock ? 'Sim' : 'Não'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <FileTextOutlined /> Documentos fiscais
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Emite NFC-e</span><span className="products-detail-value">{selectedProduct.emitsNfce !== false ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Emite NF-e</span><span className="products-detail-value">{selectedProduct.emitsNfe ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Emite comprovante simples</span><span className="products-detail-value">{selectedProduct.emitsComprovanteSimples !== false ? 'Sim' : 'Não'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <BorderOuterOutlined /> Fiscal e dimensões
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Marca</span><span className="products-detail-value">{selectedProduct.brand || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">NCM</span><span className="products-detail-value">{selectedProduct.ncm || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">CEST</span><span className="products-detail-value">{selectedProduct.cest || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Peso (kg)</span><span className="products-detail-value">{selectedProduct.weight != null ? selectedProduct.weight : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Largura (cm)</span><span className="products-detail-value">{selectedProduct.width != null ? selectedProduct.width : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Altura (cm)</span><span className="products-detail-value">{selectedProduct.height != null ? selectedProduct.height : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Profundidade (cm)</span><span className="products-detail-value">{selectedProduct.depth != null ? selectedProduct.depth : '—'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <ClockCircleOutlined /> Pedido e preparo
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Quantidade mínima por pedido</span><span className="products-detail-value">{selectedProduct.minOrderQuantity != null ? selectedProduct.minOrderQuantity : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Quantidade máxima por pedido</span><span className="products-detail-value">{selectedProduct.maxOrderQuantity != null ? selectedProduct.maxOrderQuantity : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Múltiplo de venda</span><span className="products-detail-value">{selectedProduct.sellMultiple != null ? selectedProduct.sellMultiple : '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Tempo de preparo (min)</span><span className="products-detail-value">{selectedProduct.preparationTimeMinutes != null ? selectedProduct.preparationTimeMinutes : '—'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <ExperimentOutlined /> Nutricional
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Tamanho da porção</span><span className="products-detail-value">{selectedProduct.serveSize || '—'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Calorias (kcal)</span><span className="products-detail-value">{selectedProduct.calories != null ? selectedProduct.calories : '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Ingredientes</span><span className="products-detail-value products-detail-value-block" style={{ whiteSpace: 'pre-wrap' }}>{selectedProduct.ingredients || '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Alérgenos</span><span className="products-detail-value">{selectedProduct.allergens || '—'}</span></div>
                <div className="products-detail-row products-detail-row-full"><span className="products-detail-label">Info nutricional</span><span className="products-detail-value products-detail-value-block" style={{ whiteSpace: 'pre-wrap' }}>{selectedProduct.nutritionalInfo || '—'}</span></div>
              </div>
            </div>

            <div className="products-detail-section">
              <div className="products-detail-section-title">
                <OrderedListOutlined /> Status
              </div>
              <div className="products-detail-grid">
                <div className="products-detail-row"><span className="products-detail-label">Ativo</span><span className="products-detail-value">{selectedProduct.active ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">À venda</span><span className="products-detail-value">{selectedProduct.availableForSale ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Delivery</span><span className="products-detail-value">{selectedProduct.availableForDelivery ? 'Sim' : 'Não'}</span></div>
                <div className="products-detail-row"><span className="products-detail-label">Destaque</span><span className="products-detail-value">{selectedProduct.featured ? 'Sim' : 'Não'}</span></div>
              </div>
            </div>

            {(selectedProduct.id != null || selectedProduct.createdAt || selectedProduct.updatedAt) && (
              <div className="products-detail-section">
                <div className="products-detail-section-title">
                  <IdcardOutlined /> Registro
                </div>
                <div className="products-detail-grid">
                  {selectedProduct.id != null && <div className="products-detail-row"><span className="products-detail-label">ID</span><span className="products-detail-value products-detail-value-mono">{selectedProduct.id}</span></div>}
                  {selectedProduct.tenantId != null && <div className="products-detail-row"><span className="products-detail-label">Tenant ID</span><span className="products-detail-value products-detail-value-mono">{selectedProduct.tenantId}</span></div>}
                  {selectedProduct.createdAt && <div className="products-detail-row"><span className="products-detail-label">Criado em</span><span className="products-detail-value">{new Date(selectedProduct.createdAt).toLocaleString('pt-BR')}</span></div>}
                  {selectedProduct.updatedAt && <div className="products-detail-row"><span className="products-detail-label">Atualizado em</span><span className="products-detail-value">{new Date(selectedProduct.updatedAt).toLocaleString('pt-BR')}</span></div>}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        title={editingId ? 'Editar produto' : 'Novo produto'}
        open={drawerOpen}
        onClose={closeDrawer}
        placement="right"
        width={520}
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
          key={drawerOpen ? `form-${editingId ?? 'new'}` : 'form-closed'}
          layout="vertical"
          onFinish={onFinish}
          initialValues={drawerFormInitialValues}
          className="products-form products-drawer-form"
        >
          <div className="products-drawer-section">
            <div className="products-section-header">
              <span className="products-section-header-icon"><BarcodeOutlined /></span>
              <div>
                <h3 className="products-section-header-title">Identificação</h3>
                <p className="products-section-header-desc">Códigos e dados do produto</p>
              </div>
            </div>
            {isRoot && (
              <Form.Item
                name="tenantId"
                label="Empresa"
                rules={[{ required: true, message: 'Selecione a empresa do produto' }]}
              >
                <Select
                  placeholder="Selecione a empresa"
                  options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                  disabled={!!editingId}
                  showSearch
                  optionFilterProp="label"
                  allowClear={false}
                />
              </Form.Item>
            )}
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'Obrigatório' }, { max: 50 }]}>
                  <Input placeholder="Ex: PROD-001" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="barcode" label="Código de barras" rules={[{ max: 20 }]}>
                  <Input placeholder="EAN/GTIN" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="internalCode" label="Código interno" rules={[{ max: 50 }]}>
                  <Input placeholder="Opcional" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="name" label="Nome do produto" rules={[{ required: true, message: 'Obrigatório' }, { max: 255 }]}>
                  <Input placeholder="Nome comercial" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="shortDescription" label="Descrição curta" rules={[{ max: 500 }]}>
                  <Input placeholder="Resumo para listas" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Descrição completa">
                  <TextArea rows={2} placeholder="Descrição detalhada (opcional)" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="Foto do produto (opcional)" style={{ marginBottom: 0 }}>
                  <Form.Item name="imageUrl" noStyle>
                    <Input type="hidden" />
                  </Form.Item>
                  {previewImageUrl ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <img
                        src={previewImageUrl}
                        alt="Preview"
                        style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }}
                      />
                      <div>
                        <Button
                          type="text"
                          danger
                          onClick={() => {
                            if (previewImageUrl?.startsWith?.('blob:')) URL.revokeObjectURL(previewImageUrl)
                            setPreviewImageUrl(null)
                            setSelectedImageFile(null)
                            form.setFieldsValue({ imageUrl: null })
                          }}
                        >
                          Remover imagem
                        </Button>
                        <div style={{ marginTop: 8 }}>
                          <Upload
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            showUploadList={false}
                            customRequest={({ file, onSuccess, onError }) => {
                              const f = file instanceof File ? file : file?.originFileObj || file
                              if (!f || !(f instanceof File)) return
                              if (f.size > 5 * 1024 * 1024) {
                                onError(new Error('Máximo: 5 MB.'))
                                return
                              }
                              if (previewImageUrl?.startsWith?.('blob:')) URL.revokeObjectURL(previewImageUrl)
                              const blobUrl = URL.createObjectURL(f)
                              setPreviewImageUrl(blobUrl)
                              setSelectedImageFile(f)
                              onSuccess?.()
                            }}
                            beforeUpload={() => true}
                          >
                            <Button size="small">Trocar imagem</Button>
                          </Upload>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Upload.Dragger
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      showUploadList={false}
                      customRequest={({ file, onSuccess, onError }) => {
                        const f = file instanceof File ? file : file?.originFileObj || file
                        if (!f || !(f instanceof File)) return
                        if (f.size > 5 * 1024 * 1024) {
                          onError(new Error('Arquivo muito grande. Máximo: 5 MB.'))
                          return
                        }
                        const blobUrl = URL.createObjectURL(f)
                        setPreviewImageUrl(blobUrl)
                        setSelectedImageFile(f)
                        onSuccess?.()
                      }}
                      beforeUpload={() => true}
                    >
                      <p className="ant-upload-drag-icon">
                        <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                      </p>
                      <p className="ant-upload-text">
                        Clique ou arraste a imagem aqui
                      </p>
                      <p className="ant-upload-hint">JPEG, PNG, GIF ou WebP. Máx. 5 MB</p>
                    </Upload.Dragger>
                  )}
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="products-drawer-section">
            <div className="products-section-header">
              <span className="products-section-header-icon"><DollarOutlined /></span>
              <div>
                <h3 className="products-section-header-title">Preço e unidade</h3>
                <p className="products-section-header-desc">Valores e unidade de medida</p>
              </div>
            </div>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  name="unitPrice"
                  label="Preço de venda (R$)"
                  rules={[
                    { required: true, message: 'Obrigatório' },
                    { type: 'number', min: 0.0001, message: 'Maior que zero' },
                  ]}
                >
                  <InputNumber min={0} step={0.01} precision={2} placeholder="0,00" addonBefore="R$" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="costPrice" label="Custo (R$)">
                  <InputNumber min={0} step={0.01} precision={2} placeholder="0,00" addonBefore="R$" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="discountPrice" label="Promocional (R$)">
                  <InputNumber min={0} step={0.01} precision={2} placeholder="0,00" addonBefore="R$" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="unitOfMeasure" label="Unidade" rules={[{ required: true }]}>
                  <Select options={UNIT_OF_MEASURE_OPTIONS} placeholder="Selecione" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="taxRate" label="Imposto (%)">
                  <InputNumber min={0} max={100} step={0.01} placeholder="18" addonAfter="%" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="sellByWeight" valuePropName="checked" label="Vendido por peso">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <div className="products-drawer-section">
            <div className="products-section-header">
              <span className="products-section-header-icon"><InboxOutlined /></span>
              <div>
                <h3 className="products-section-header-title">Estoque</h3>
                <p className="products-section-header-desc">Controle de quantidade</p>
              </div>
            </div>
            {editingId && (() => {
              const p = products.find((x) => x.id === editingId) || { trackStock: false, stockQuantity: 0, minStock: null }
              if (p.trackStock && isLowStock(p)) {
                return (
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={isOutOfStock(p) ? 'Estoque zerado!' : 'Estoque abaixo do mínimo'}
                    description={`Quantidade atual: ${Number(p.stockQuantity ?? 0).toLocaleString('pt-BR')} | Mínimo: ${Number(p.minStock ?? 0).toLocaleString('pt-BR')}`}
                    style={{ marginBottom: 16 }}
                  />
                )
              }
              return null
            })()}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="trackStock" valuePropName="checked" label="Controlar estoque">
                  <Switch />
                </Form.Item>
              </Col>
              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.trackStock !== curr.trackStock}>
                {({ getFieldValue }) =>
                  getFieldValue('trackStock') && (
                    <Col span={24}>
                      <Form.Item
                        name="deductStockOnSale"
                        valuePropName="checked"
                        label="Dar baixa automática nas vendas"
                        extra="Se marcado, o estoque é reduzido automaticamente ao registrar uma venda. Caso contrário, a baixa deve ser feita manualmente na tela de Estoque."
                      >
                        <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                      </Form.Item>
                    </Col>
                  )
                }
              </Form.Item>
              <Col span={12}>
                <Form.Item name="allowNegativeStock" valuePropName="checked" label="Permitir negativo">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.trackStock !== curr.trackStock}>
              {({ getFieldValue }) =>
                getFieldValue('trackStock') && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="stockQuantity" label="Quantidade atual">
                        <InputNumber min={0} step={1} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="minStock" label="Estoque mínimo">
                        <InputNumber min={0} step={1} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                )
              }
            </Form.Item>
          </div>

          <div className="products-drawer-section">
            <div className="products-section-header">
              <span className="products-section-header-icon"><AppstoreOutlined /></span>
              <div>
                <h3 className="products-section-header-title">Categorização e status</h3>
                <p className="products-section-header-desc">Marca, fiscais e disponibilidade</p>
              </div>
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="brand" label="Marca" rules={[{ max: 100 }]}>
                  <Input placeholder="Marca" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ncm" label="NCM" rules={[{ max: 10 }]}>
                  <Input placeholder="NCM" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cest" label="CEST" rules={[{ max: 9 }]}>
                  <Input placeholder="CEST" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="displayOrder" label="Ordem exibição">
                  <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <div className="products-switches-row" style={{ marginTop: 8 }}>
              <div className="products-switch-item">
                <Form.Item name="active" valuePropName="checked" label="Ativo" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
              <div className="products-switch-item">
                <Form.Item name="availableForSale" valuePropName="checked" label="À venda" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
              <div className="products-switch-item">
                <Form.Item name="availableForDelivery" valuePropName="checked" label="Delivery" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
              <div className="products-switch-item">
                <Form.Item name="featured" valuePropName="checked" label="Destaque" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
            </div>
            <Divider orientation="left">Emissão de documentos</Divider>
            <div className="products-switches-row" style={{ marginTop: 8 }}>
              <div className="products-switch-item">
                <Form.Item name="emitsNfce" valuePropName="checked" label="Emite NFC-e" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
              <div className="products-switch-item">
                <Form.Item name="emitsNfe" valuePropName="checked" label="Emite NF-e" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
              <div className="products-switch-item">
                <Form.Item name="emitsComprovanteSimples" valuePropName="checked" label="Emite comprovante simples" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Sim" unCheckedChildren="Não" />
                </Form.Item>
              </div>
            </div>
          </div>

          <Collapse
            className="products-collapse"
            items={[
              {
                key: 'dims',
                label: (
                  <span className="products-collapse-label">
                    <BorderOuterOutlined /> Dimensões e peso
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="weight" label="Peso (kg)">
                        <InputNumber min={0} step={0.001} precision={4} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="width" label="Largura (cm)">
                        <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="height" label="Altura (cm)">
                        <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="depth" label="Profundidade (cm)">
                        <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'nutrition',
                label: (
                  <span className="products-collapse-label">
                    <ExperimentOutlined /> Informações nutricionais
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="serveSize" label="Tamanho da porção" rules={[{ max: 50 }]}>
                        <Input placeholder="Ex: 300g" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="calories" label="Calorias (kcal)">
                        <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="ingredients" label="Ingredientes">
                        <TextArea rows={2} />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="allergens" label="Alérgenos" rules={[{ max: 500 }]}>
                        <Input placeholder="Glúten, lactose, etc." />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item name="nutritionalInfo" label="Informações nutricionais">
                        <TextArea rows={2} placeholder="Tabela nutricional" />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'rules',
                label: (
                  <span className="products-collapse-label">
                    <OrderedListOutlined /> Regras de venda
                  </span>
                ),
                children: (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="minOrderQuantity" label="Quantidade mínima por pedido">
                        <InputNumber min={0} step={0.01} precision={4} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="maxOrderQuantity" label="Quantidade máxima por pedido">
                        <InputNumber min={0} step={0.01} precision={4} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="sellMultiple" label="Múltiplo de venda">
                        <InputNumber min={0} step={0.01} precision={4} placeholder="1" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="preparationTimeMinutes" label="Tempo de preparo (min)">
                        <InputNumber min={0} placeholder="Restaurantes" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>
    </div>
  )
}
