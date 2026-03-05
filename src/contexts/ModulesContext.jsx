import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { listModules } from '../services/moduleService'
import { useAuth } from './AuthContext'

const ModulesContext = createContext(null)

// Fallback para root quando API retorna vazio
const DEFAULT_MODULES = [
  { code: 'DASHBOARD', name: 'Dashboard', icon: 'DashboardOutlined', route: '/', component: 'Dashboard', displayOrder: 0 },
  { code: 'PRODUCTS', name: 'Produtos', icon: 'ShoppingOutlined', route: '/products', component: 'Products', displayOrder: 10 },
  { code: 'STOCK', name: 'Estoque', icon: 'InboxOutlined', route: '/stock', component: 'Stock', displayOrder: 11 },
  { code: 'SUPPLIERS', name: 'Fornecedores', icon: 'ShopOutlined', route: '/suppliers', component: 'Suppliers', displayOrder: 12 },
  { code: 'COST_CONTROL', name: 'Controle de Custos', icon: 'DollarOutlined', route: '/cost-control', component: 'CostControl', displayOrder: 13 },
  { code: 'DELIVERY', name: 'Entregas', icon: 'CarOutlined', route: '/delivery', component: 'Deliveries', displayOrder: 17 },
  { code: 'DELIVERY_PERSONS', name: 'Entregadores', icon: 'UserOutlined', route: '/delivery-persons', component: 'DeliveryPersons', displayOrder: 18 },
  { code: 'MY_DELIVERIES', name: 'Minhas Entregas', icon: 'CarOutlined', route: '/my-deliveries', component: 'MyDeliveries', displayOrder: 18 },
  { code: 'REGISTERS', name: 'Pontos de Venda', icon: 'DesktopOutlined', route: '/registers', component: 'Registers', displayOrder: 18 },
  { code: 'CASHIERS', name: 'Operadores de Caixa', icon: 'UserOutlined', route: '/cashiers', component: 'Cashiers', displayOrder: 18 },
  { code: 'RESTAURANT_TABLES', name: 'Mesas do Restaurante', icon: 'CoffeeOutlined', route: '/restaurant-tables', component: 'RestaurantTables', displayOrder: 19 },
  { code: 'MODULES', name: 'Módulos', icon: 'AppstoreOutlined', route: '/modules', component: 'Modules', displayOrder: 20 },
  { code: 'USERS', name: 'Usuários', icon: 'TeamOutlined', route: '/users', component: 'Users', displayOrder: 30 },
  { code: 'SETTINGS', name: 'Configurações', icon: 'SettingOutlined', route: '/settings', component: 'Settings', displayOrder: 100 },
]

export function ModulesProvider({ children }) {
  const { isAuthenticated, user } = useAuth()
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadModules = useCallback(async () => {
    if (!isAuthenticated) {
      setModules([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listModules()
      const list = data && data.length > 0 ? data : []
      // Root vê tudo: se API retornar vazio mas user é root, usar fallback
      if (list.length === 0 && user?.isRoot === true) {
        setModules(DEFAULT_MODULES)
      } else {
        setModules(list)
      }
    } catch (err) {
      setError(err.message)
      if (user?.isRoot === true) {
        setModules(DEFAULT_MODULES)
      } else {
        setModules([])
      }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user?.isRoot])

  useEffect(() => {
    loadModules()
  }, [loadModules])

  const getModuleByRoute = useCallback(
    (path) => {
      const normalized = path === '' || path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`
      return modules.find((m) => {
        const r = m.route === '/' ? '/' : `/${m.route.replace(/^\/+/, '')}`
        return r === normalized
      })
    },
    [modules]
  )

  const hasAccessToRoute = useCallback(
    (path) => {
      return Boolean(getModuleByRoute(path))
    },
    [getModuleByRoute]
  )

  return (
    <ModulesContext.Provider
      value={{
        modules,
        loading,
        error,
        reload: loadModules,
        getModuleByRoute,
        hasAccessToRoute,
      }}
    >
      {children}
    </ModulesContext.Provider>
  )
}

export function useModules() {
  const ctx = useContext(ModulesContext)
  if (!ctx) {
    throw new Error('useModules deve ser usado dentro de ModulesProvider')
  }
  return ctx
}
