import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import Login from '../pages/Login'
import MainLayout from './MainLayout'
import ModuleRoute from './ModuleRoute'
import { useModules } from '../contexts/ModulesContext'
import { Spin } from 'antd'

const PdvScreen = lazy(() => import('../pages/PdvScreen'))

export default function DynamicAppRoutes() {
  const { modules, loading } = useModules()

  const defaultRoute = modules.length > 0 ? modules[0].route : '/'

  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/pdv"
        element={
          <ProtectedRoute>
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}><Spin size="large" /></div>}>
              <PdvScreen />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Spin size="large" />
              </div>
            ) : (
              <MainLayout />
            )}
          </ProtectedRoute>
        }
      >
        {modules.map((m) => {
          if (m.route === '/') {
            return (
              <Route
                key={m.code}
                index
                element={<ModuleRoute module={m} />}
              />
            )
          }
          const path = m.route.replace(/^\//, '')
          return (
            <Route
              key={m.code}
              path={path}
              element={<ModuleRoute module={m} />}
            />
          )
        })}
        <Route
          path="*"
          element={
            modules.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#667085' }}>
                Nenhum módulo disponível para seu perfil. Entre em contato com o administrador.
              </div>
            ) : (
              <Navigate to={defaultRoute} replace />
            )
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
