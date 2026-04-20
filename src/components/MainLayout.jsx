import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { Layout, Menu, Button, Spin, Input, message, Grid } from 'antd'
import { LogoutOutlined, MenuUnfoldOutlined, MenuFoldOutlined, SearchOutlined } from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../contexts/ModulesContext'
import { getCurrentTenant } from '../services/tenantService'
import { getIcon } from '../config/iconRegistry'
import { MENU_GROUPS } from '../config/menuGroups'
import { confirmLogoutModal } from '../utils/confirmModal'
import './MainLayout.css'

const { Header, Sider, Content } = Layout

const SIDER_WIDTH = 268

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function buildNavSearchOptions(modulesByCode) {
  const out = []
  const seen = new Set()
  for (const group of MENU_GROUPS) {
    if (group.type === 'item') {
      const mod = modulesByCode[group.moduleCode]
      if (!mod) continue
      const path = group.route === '/' ? '/' : group.route
      if (seen.has(path)) continue
      seen.add(path)
      out.push({
        path,
        label: mod.name,
        section: 'Principal',
        sectionIconName: mod.icon,
        sectionIconKey: mod.code,
      })
    } else if (group.type === 'submenu') {
      for (const child of group.children || []) {
        const mod = modulesByCode[child.moduleCode]
        if (!mod) continue
        const path = child.route === '/' ? '/' : child.route
        if (seen.has(path)) continue
        seen.add(path)
        out.push({
          path,
          label: mod.name,
          section: group.label,
          sectionIconName: group.icon,
          sectionIconKey: group.key,
        })
      }
    }
  }
  return out
}

function SidebarBrand({ tenantLogo }) {
  return (
    <div className="main-layout-brand">
      <div className="main-layout-brand-mark">
        {tenantLogo ? (
          <img src={tenantLogo} alt="" className="main-layout-brand-mark-img" />
        ) : (
          <svg className="main-layout-brand-mark-svg" viewBox="0 0 32 32" aria-hidden>
            <defs>
              <linearGradient id="vl-brand-face" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="55%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#115e59" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="9" fill="url(#vl-brand-face)" />
            <path
              d="M11 9.5 L21 16 L11 22.5 V9.5 Z"
              fill="#ecfccb"
              style={{ filter: 'drop-shadow(0 0 6px rgba(190, 242, 100, 0.85))' }}
            />
          </svg>
        )}
      </div>
      <span className="main-layout-brand-name">VendaLume</span>
    </div>
  )
}

export default function MainLayout() {
  const screens = Grid.useBreakpoint()
  const isMobileDrawer = screens.md === false

  const { user, logout } = useAuth()
  const { modules, loading } = useModules()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [tenantLogo, setTenantLogo] = useState(null)
  const [menuOpenKeys, setMenuOpenKeys] = useState([])
  const [menuSearchQuery, setMenuSearchQuery] = useState('')
  const [menuSearchPanelOpen, setMenuSearchPanelOpen] = useState(false)
  const [navSearchInputKey, setNavSearchInputKey] = useState(0)
  const searchAnchorRef = useRef(null)
  const searchFocusOutTimer = useRef(null)

  const modulesByCode = useMemo(() => {
    const map = {}
    modules.forEach((m) => {
      if (m.code && m.route) map[m.code] = m
    })
    return map
  }, [modules])

  const navSearchOptions = useMemo(() => buildNavSearchOptions(modulesByCode), [modulesByCode])

  const filteredNavSearch = useMemo(() => {
    const raw = menuSearchQuery.trim()
    if (!raw) return []
    const q = stripAccents(raw.toLowerCase())
    return navSearchOptions
      .filter((item) => {
        const label = stripAccents(item.label.toLowerCase())
        const path = item.path.toLowerCase()
        const section = item.section ? stripAccents(item.section.toLowerCase()) : ''
        return label.includes(q) || path.includes(q) || (section && section.includes(q))
      })
      .slice(0, 12)
  }, [navSearchOptions, menuSearchQuery])

  const clearSearchFocusOutTimer = useCallback(() => {
    if (searchFocusOutTimer.current != null) {
      clearTimeout(searchFocusOutTimer.current)
      searchFocusOutTimer.current = null
    }
  }, [])

  const goToSearchResult = useCallback(
    (path) => {
      clearSearchFocusOutTimer()
      const root = searchAnchorRef.current
      const ae = document.activeElement
      if (root && ae instanceof HTMLElement && root.contains(ae)) {
        ae.blur()
      }
      flushSync(() => {
        setMenuSearchQuery('')
        setMenuSearchPanelOpen(false)
        setNavSearchInputKey((k) => k + 1)
      })
      navigate(path)
    },
    [navigate, clearSearchFocusOutTimer]
  )

  useEffect(() => () => clearSearchFocusOutTimer(), [clearSearchFocusOutTimer])

  useLayoutEffect(() => {
    if (loading) return
    const root = searchAnchorRef.current
    if (!root) return

    const onFocusIn = () => {
      clearSearchFocusOutTimer()
      setMenuSearchPanelOpen(true)
    }

    const onFocusOut = (e) => {
      const next = e.relatedTarget
      if (next instanceof Node && root.contains(next)) return
      clearSearchFocusOutTimer()
      searchFocusOutTimer.current = window.setTimeout(() => {
        searchFocusOutTimer.current = null
        if (!root.contains(document.activeElement)) {
          setMenuSearchPanelOpen(false)
        }
      }, 0)
    }

    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', onFocusOut)
    return () => {
      clearSearchFocusOutTimer()
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', onFocusOut)
    }
  }, [loading, clearSearchFocusOutTimer])

  useEffect(() => {
    clearSearchFocusOutTimer()
  }, [location.pathname, clearSearchFocusOutTimer])

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
    confirmLogoutModal({
      onOk: () => {
        logout()
        navigate('/login', { replace: true })
      },
    })
  }

  const { menuItems, selectedKey, openKeys } = useMemo(() => {
    const flatItems = []
    let selKey = '/'
    const open = []

    for (const group of MENU_GROUPS) {
      if (group.type === 'item') {
        const mod = modulesByCode[group.moduleCode]
        if (!mod) continue
        const path = group.route === '/' ? '/' : group.route
        const Icon = getIcon(mod.icon, mod.code)
        flatItems.push({
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
        flatItems.push({
          key: group.key,
          icon: <Icon />,
          label: group.label,
          children,
        })
      }
    }

    const currentPath = location.pathname || '/'
    for (const item of flatItems) {
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
    if (selKey === '/' && flatItems.length > 0 && !flatItems.some((i) => i.key === selKey)) {
      selKey = flatItems[0]?.children?.[0]?.key ?? flatItems[0]?.key ?? '/'
    }

    const dashboardIdx = flatItems.findIndex((i) => i.key === '/' && !i.children)
    let groupedMenu = flatItems
    if (dashboardIdx >= 0) {
      const dash = flatItems[dashboardIdx]
      const others = flatItems.filter((_, idx) => idx !== dashboardIdx)
      groupedMenu = [
        { type: 'group', label: 'Principal', children: [dash] },
        ...(others.length ? [{ type: 'group', label: 'Operação', children: others }] : []),
      ]
    } else if (flatItems.length > 0) {
      groupedMenu = [{ type: 'group', label: 'Menu', children: flatItems }]
    }

    return { menuItems: groupedMenu, selectedKey: selKey, openKeys: open }
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
    <>
    {sidebarOpen && isMobileDrawer && (
      <button
        type="button"
        className="main-layout-sider-backdrop"
        aria-label="Fechar menu lateral"
        onClick={() => setSidebarOpen(false)}
      />
    )}
    <Layout
      className={`main-layout${isMobileDrawer ? ' main-layout--mobile-drawer' : ''}${
        isMobileDrawer && sidebarOpen ? ' main-layout--mobile-drawer-open' : ''
      }`}
    >
      <Sider
        theme="light"
        width={SIDER_WIDTH}
        className={`main-layout-sider ${sidebarOpen ? 'main-layout-sider-open' : 'main-layout-sider-closed'}`}
      >
        <div className="main-layout-sider-inner">
          <div className="main-layout-sider-head">
            <SidebarBrand tenantLogo={tenantLogo} />
            <Button
              type="text"
              icon={<MenuFoldOutlined />}
              onClick={() => setSidebarOpen(false)}
              className="main-layout-toggle"
              title="Fechar menu"
            />
          </div>
          <div className="main-layout-sider-menu-scroll">
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
          </div>
        </div>
      </Sider>
      <Layout className={`main-layout-main ${!sidebarOpen ? 'main-layout-main-expanded' : ''}`}>
        <Header className="main-layout-header">
          <div className="main-layout-header-left">
            
            <div ref={searchAnchorRef} className="main-layout-search-anchor">
              <Input
                key={navSearchInputKey}
                className="main-layout-search"
                placeholder="Buscar página ou módulo…"
                prefix={<SearchOutlined className="main-layout-search-icon" />}
                allowClear
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    clearSearchFocusOutTimer()
                    flushSync(() => {
                      setMenuSearchQuery('')
                      setMenuSearchPanelOpen(false)
                      setNavSearchInputKey((k) => k + 1)
                    })
                    e.currentTarget.blur()
                    return
                  }
                  if (e.key !== 'Enter') return
                  const q = menuSearchQuery.trim()
                  if (filteredNavSearch.length > 0) {
                    e.preventDefault()
                    goToSearchResult(filteredNavSearch[0].path)
                    return
                  }
                  if (q) {
                    e.preventDefault()
                    message.info('Nenhuma página encontrada para essa busca')
                  }
                }}
                aria-autocomplete="list"
                aria-expanded={menuSearchPanelOpen && Boolean(menuSearchQuery.trim())}
                aria-controls="main-layout-search-results"
              />
              {menuSearchPanelOpen && menuSearchQuery.trim() && (
                <div
                  id="main-layout-search-results"
                  className="main-layout-search-results"
                  role="listbox"
                  aria-label="Resultados da busca"
                  onMouseDown={(ev) => ev.preventDefault()}
                >
                  {filteredNavSearch.length === 0 ? (
                    <div className="main-layout-search-empty">Nenhuma página encontrada</div>
                  ) : (
                    filteredNavSearch.map((item) => {
                      const SectionIcon = getIcon(item.sectionIconName, item.sectionIconKey)
                      return (
                        <button
                          key={item.path}
                          type="button"
                          role="option"
                          className="main-layout-search-result"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => goToSearchResult(item.path)}
                        >
                          <span className="main-layout-search-result-title">{item.label}</span>
                          {item.section ? (
                            <span className="main-layout-search-result-section">
                              <SectionIcon className="main-layout-search-result-section-icon" aria-hidden />
                              <span className="main-layout-search-result-section-label">{item.section}</span>
                            </span>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="main-layout-header-right">
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
          </div>
        </Header>
        <Content className={`main-layout-content ${location.pathname === '/sales' ? 'main-layout-content-no-scroll' : ''}`}>
          <div key={location.pathname} className="vl-page-transition">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
    {!sidebarOpen && (
      <button
        type="button"
        className="main-layout-menu-edge"
        onClick={() => setSidebarOpen(true)}
        title="Abrir menu"
        aria-label="Abrir menu de navegação"
      >
        <MenuUnfoldOutlined className="main-layout-menu-edge-icon" aria-hidden />
      </button>
    )}
    </>
  )
}
