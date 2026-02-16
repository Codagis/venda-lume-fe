import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from 'antd'
import { LogoutOutlined } from '@ant-design/icons'
import './Dashboard.css'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Commo</h1>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="dashboard-logout"
        >
          Sair
        </Button>
      </header>
      <main className="dashboard-main">
        <p className="dashboard-welcome">
        Bem-vindo{user?.fullName ? `, ${user.fullName}` : ''}. Você está autenticado.
      </p>
      </main>
    </div>
  )
}
