import { Navigate, useLocation } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const subscriptionBlocked =
    user?.isRoot !== true && user?.subscriptionAccessAllowed === false
  if (subscriptionBlocked && !location.pathname.startsWith('/subscriptions')) {
    return <Navigate to="/subscriptions" replace />
  }

  return children
}
