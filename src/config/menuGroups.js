/**
 * Grupos do menu lateral. Cada grupo pode ser:
 * - item único (route direto) ex: Dashboard
 * - submenu com children (módulos agrupados)
 *
 * A ordem dos grupos define a ordem no menu.
 * Cada moduleCode deve existir nos módulos retornados pela API (permissão do usuário).
 */
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
    children: [{ moduleCode: 'COST_CONTROL', route: '/cost-control' }],
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
    key: 'restaurante',
    label: 'Restaurante',
    icon: 'CoffeeOutlined',
    children: [{ moduleCode: 'RESTAURANT_TABLES', route: '/restaurant-tables' }],
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
