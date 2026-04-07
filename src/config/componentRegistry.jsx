import { lazy, Suspense } from 'react'
import { Spin } from 'antd'

const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'))
const Products = lazy(() => import('../pages/Products/Products'))
const Stock = lazy(() => import('../pages/Stock/Stock'))
const Customers = lazy(() => import('../pages/Customers/Customers'))
const Suppliers = lazy(() => import('../pages/Suppliers/Suppliers'))
const CostControl = lazy(() => import('../pages/CostControl/CostControl'))
const Sales = lazy(() => import('../pages/Sales/Sales'))
const SalesConsult = lazy(() => import('../pages/SalesConsult/SalesConsult'))
const Modules = lazy(() => import('../pages/Modules/Modules'))
const Users = lazy(() => import('../pages/Users/Users'))
const Settings = lazy(() => import('../pages/Settings/Settings'))
const Deliveries = lazy(() => import('../pages/Deliveries/Deliveries'))
const DeliveryPersons = lazy(() => import('../pages/DeliveryPersons/DeliveryPersons'))
const MyDeliveries = lazy(() => import('../pages/MyDeliveries/MyDeliveries'))
const Registers = lazy(() => import('../pages/Registers/Registers'))
const Cashiers = lazy(() => import('../pages/Cashiers/Cashiers'))
const Employees = lazy(() => import('../pages/Employees/Employees'))
const FiscalNotes = lazy(() => import('../pages/FiscalNotes/FiscalNotes'))

const registry = {
  Dashboard,
  Products,
  Stock,
  Customers,
  Suppliers,
  CostControl,
  Sales,
  SalesConsult,
  Modules,
  Users,
  Settings,
  Deliveries,
  DeliveryPersons,
  MyDeliveries,
  Registers,
  Cashiers,
  Employees,
  FiscalNotes,
}

function LoadingFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
      <Spin size="large" />
    </div>
  )
}

export function getModuleComponent(componentName) {
  const Component = registry[componentName]
  if (!Component) {
    return null
  }
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component />
    </Suspense>
  )
}

export function getComponentNames() {
  return Object.keys(registry)
}
