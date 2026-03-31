export const MENU_GROUPS = [
  {
    type: 'item',
    moduleCode: 'DASHBOARD',
    route: '/',
  },
  {
    type: 'submenu',
    key: 'vendas',
    label: 'Vendas',
    icon: 'ShoppingCartOutlined',
    children: [
      { moduleCode: 'SALES', route: '/sales' },
      { moduleCode: 'SALES_CONSULT', route: '/sales-consult' },
    ],
  },
  {
    type: 'submenu',
    key: 'produtos',
    label: 'Produtos e Estoque',
    icon: 'InboxOutlined',
    children: [
      { moduleCode: 'PRODUCTS', route: '/products' },
      { moduleCode: 'STOCK', route: '/stock' },
    ],
  },
  {
    type: 'submenu',
    key: 'cadastros',
    label: 'Cadastros',
    icon: 'ShopOutlined',
    children: [
      { moduleCode: 'CUSTOMERS', route: '/customers' },
      { moduleCode: 'SUPPLIERS', route: '/suppliers' },
    ],
  },
  {
    type: 'submenu',
    key: 'financeiro',
    label: 'Financeiro',
    icon: 'DollarOutlined',
    children: [
      { moduleCode: 'COST_CONTROL', route: '/cost-control' },
      { moduleCode: 'EMPLOYEES', route: '/employees' },
      { moduleCode: 'FISCAL', route: '/fiscal-notes' },
    ],
  },
  {
    type: 'submenu',
    key: 'entregas',
    label: 'Entregas',
    icon: 'CarOutlined',
    children: [
      { moduleCode: 'DELIVERY', route: '/delivery' },
      { moduleCode: 'DELIVERY_PERSONS', route: '/delivery-persons' },
      { moduleCode: 'MY_DELIVERIES', route: '/my-deliveries' },
    ],
  },
  {
    type: 'submenu',
    key: 'pdv',
    label: 'Pontos de Venda',
    icon: 'DesktopOutlined',
    children: [
      { moduleCode: 'REGISTERS', route: '/registers' },
      { moduleCode: 'CASHIERS', route: '/cashiers' },
    ],
  },
  {
    type: 'submenu',
    key: 'sistema',
    label: 'Sistema',
    icon: 'SettingOutlined',
    children: [
      { moduleCode: 'MODULES', route: '/modules' },
      { moduleCode: 'USERS', route: '/users' },
      { moduleCode: 'SETTINGS', route: '/settings' },
    ],
  },
]
