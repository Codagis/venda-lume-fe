import { lazy, Suspense } from 'react'
import { Spin } from 'antd'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const Products = lazy(() => import('../pages/Products'))
const Stock = lazy(() => import('../pages/Stock'))
const Customers = lazy(() => import('../pages/Customers'))
const Suppliers = lazy(() => import('../pages/Suppliers'))
const CostControl = lazy(() => import('../pages/CostControl'))
const Sales = lazy(() => import('../pages/Sales'))
const SalesConsult = lazy(() => import('../pages/SalesConsult'))
const Modules = lazy(() => import('../pages/Modules'))
const Users = lazy(() => import('../pages/Users'))
const Settings = lazy(() => import('../pages/Settings'))
const Deliveries = lazy(() => import('../pages/Deliveries'))
const DeliveryPersons = lazy(() => import('../pages/DeliveryPersons'))
const MyDeliveries = lazy(() => import('../pages/MyDeliveries'))
const RestaurantTables = lazy(() => import('../pages/RestaurantTables'))
const Registers = lazy(() => import('../pages/Registers'))
const Cashiers = lazy(() => import('../pages/Cashiers'))
const Employees = lazy(() => import('../pages/Employees'))
const Contractors = lazy(() => import('../pages/Contractors'))

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
  RestaurantTables,
  Registers,
  Cashiers,
  Employees,
  Contractors,
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
