import { createContext, useContext, useState, useCallback } from 'react'
import { login as apiLogin } from '../services/api'

const AuthContext = createContext(null)

const ACCESS_TOKEN_KEY = 'commo_access_token'
const REFRESH_TOKEN_KEY = 'commo_refresh_token'
const USER_KEY = 'commo_user'

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return Boolean(sessionStorage.getItem(ACCESS_TOKEN_KEY))
  })

  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (credentials) => {
    const { username, password } = credentials
    if (!username?.trim() || !password?.trim()) {
      throw new Error('Usuário e senha são obrigatórios.')
    }

    const response = await apiLogin(username.trim(), password)

    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.access_token)
    sessionStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token)
    if (response.user) {
      sessionStorage.setItem(USER_KEY, JSON.stringify(response.user))
      setUser(response.user)
    }
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
