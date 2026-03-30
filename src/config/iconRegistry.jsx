import {
  DashboardOutlined,
  FundOutlined,
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
  FundOutlined,
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
  if (moduleCode === 'DASHBOARD') return FundOutlined
  return icons[name] || AppstoreOutlined
}
