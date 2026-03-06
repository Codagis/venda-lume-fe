import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin, fetchMe, logoutApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  const loadSession = useCallback(async () => {
    try {
      const me = await fetchMe()
      if (me) {
        setUser(me)
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch {
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const login = useCallback(async (credentials) => {
    const { username, password } = credentials
    if (!username?.trim() || !password?.trim()) {
      throw new Error('Usuário e senha são obrigatórios.')
    }

    const response = await apiLogin(username.trim(), password)
    if (response.user) {
      setUser(response.user)
    }
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } catch (_) {}
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    refreshUser: loadSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
