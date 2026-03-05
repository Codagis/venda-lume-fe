import {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  InboxOutlined,
  FileSearchOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  ShopOutlined,
  DollarOutlined,
  TableOutlined,
  CoffeeOutlined,
  BarChartOutlined,
  DesktopOutlined,
} from '@ant-design/icons'

const icons = {
  DashboardOutlined,
  ShoppingOutlined,
  UserOutlined,
  SettingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  InboxOutlined,
  FileSearchOutlined,
  ShoppingCartOutlined,
  CarOutlined,
  ShopOutlined,
  DollarOutlined,
  TableOutlined,
  CoffeeOutlined,
  BarChartOutlined,
  DesktopOutlined,
}

export function getIcon(name, moduleCode) {
  if (moduleCode === 'RESTAURANT_TABLES') return CoffeeOutlined
  return icons[name] || AppstoreOutlined
}
