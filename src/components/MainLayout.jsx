import { useState, useEffect, useMemo } from 'react'
import { Layout, Menu, Button, Spin } from 'antd'
import { LogoutOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../contexts/ModulesContext'
import { getCurrentTenant } from '../services/tenantService'
import { getIcon } from '../config/iconRegistry'
import { MENU_GROUPS } from '../config/menuGroups'
import './MainLayout.css'

const { Header, Sider, Content } = Layout

export default function MainLayout() {
  const { user, logout } = useAuth()
  const { modules, loading } = useModules()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tenantLogo, setTenantLogo] = useState(null)
  const [menuOpenKeys, setMenuOpenKeys] = useState([])

  useEffect(() => {
    if (user?.tenantId && !user?.isRoot) {
      getCurrentTenant()
        .then((t) => setTenantLogo(t?.logoUrl || null))
        .catch(() => setTenantLogo(null))
    } else {
      setTenantLogo(null)
    }
  }, [user?.tenantId, user?.isRoot])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const modulesByCode = useMemo(() => {
    const map = {}
    modules.forEach((m) => {
      if (m.code && m.route) map[m.code] = m
    })
    return map
  }, [modules])

  const { menuItems, selectedKey, openKeys } = useMemo(() => {
    const items = []
    let selKey = '/'
    const open = []

    for (const group of MENU_GROUPS) {
      if (group.type === 'item') {
        const mod = modulesByCode[group.moduleCode]
        if (!mod) continue
        const path = group.route === '/' ? '/' : group.route
        const Icon = getIcon(mod.icon, mod.code)
        items.push({
          key: path,
          icon: <Icon />,
          label: mod.name,
        })
      } else if (group.type === 'submenu') {
        const children = []
        for (const child of group.children || []) {
          const mod = modulesByCode[child.moduleCode]
          if (!mod) continue
          const path = child.route === '/' ? '/' : child.route
          children.push({
            key: path,
            label: mod.name,
          })
        }
        if (children.length === 0) continue
        const Icon = getIcon(group.icon, group.key)
        items.push({
          key: group.key,
          icon: <Icon />,
          label: group.label,
          children,
        })
      }
    }

    const currentPath = location.pathname || '/'
    for (const item of items) {
      if (item.children) {
        const match = item.children.find(
          (c) => c.key === currentPath || (currentPath !== '/' && currentPath.startsWith(c.key + '/'))
        )
        if (match) {
          selKey = match.key
          open.push(item.key)
        }
      } else if (item.key === '/' ? currentPath === '/' : currentPath === item.key || currentPath.startsWith(item.key + '/')) {
        selKey = item.key
      }
    }
    if (selKey === '/' && items.length > 0 && !items.some((i) => i.key === selKey)) {
      selKey = items[0]?.children?.[0]?.key ?? items[0]?.key ?? '/'
    }

    return { menuItems: items, selectedKey: selKey, openKeys: open }
  }, [modulesByCode, location.pathname])

  useEffect(() => {
    if (openKeys?.length) {
      setMenuOpenKeys((prev) => [...new Set([...prev, ...openKeys])])
    }
  }, [openKeys])

  const handleMenuClick = ({ key }) => {
    if (key === '/' || (key.startsWith('/') && !key.includes(' '))) {
      navigate(key)
    }
  }

  if (loading) {
    return (
      <div className="main-layout-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Layout className="main-layout">
      <Sider
        theme="light"
        width={220}
        className={`main-layout-sider ${sidebarOpen ? 'main-layout-sider-open' : 'main-layout-sider-closed'}`}
      >
        <div className="main-layout-sider-head">
          <div className="main-layout-logo">
            {tenantLogo ? (
              <span className="main-layout-logo-with-img">
                <img src={tenantLogo} alt="" className="main-layout-logo-img" />
                <span>VendaLume</span>
              </span>
            ) : (
              'VendaLume'
            )}
          </div>
          <Button
            type="text"
            icon={<MenuFoldOutlined />}
            onClick={() => setSidebarOpen(false)}
            className="main-layout-toggle"
            title="Fechar menu"
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          openKeys={menuOpenKeys}
          onOpenChange={setMenuOpenKeys}
          items={menuItems}
          onClick={handleMenuClick}
          className="main-layout-menu"
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout
        className={`main-layout-main ${!sidebarOpen ? 'main-layout-main-expanded' : ''}`}
        style={{ marginLeft: sidebarOpen ? 220 : 0 }}
      >
        <Header className="main-layout-header">
          <div className="main-layout-header-left">
            {!sidebarOpen && (
              <Button
                type="button"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setSidebarOpen(true)}
                className="main-layout-open-btn"
                title="Abrir menu"
              >
                Menu
              </Button>
            )}
          </div>
          <span className="main-layout-welcome">
            {user?.fullName ? `Olá, ${user.fullName}` : 'Bem-vindo'}
          </span>
          <Button
            type="button"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            className="main-layout-open-btn main-layout-logout"
          >
            Sair
          </Button>
        </Header>
        <Content className={`main-layout-content ${location.pathname === '/sales' ? 'main-layout-content-no-scroll' : ''}`}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
