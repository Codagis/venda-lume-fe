import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()

  const from = location.state?.from?.pathname || '/'

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await login({
        username: values.username.trim(),
        password: values.password,
      })
      message.success('Login realizado com sucesso.')
      navigate(from, { replace: true })
    } catch (error) {
      message.error(error?.message || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-backdrop" aria-hidden="true" />
      <div className="login-container">
        <div className="login-card">
          <header className="login-header">
            <h1 className="login-title">VendaLume</h1>
            <p className="login-subtitle">Acesse sua conta</p>
          </header>

          <Form
            form={form}
            name="login"
            onFinish={onFinish}
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
            size="large"
            className="login-form"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Informe o usuário.' },
                { whitespace: true, message: 'Usuário inválido.' },
                { min: 2, message: 'Usuário deve ter pelo menos 2 caracteres.' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="login-input-icon" />}
                placeholder="Usuário"
                autoComplete="username"
                autoFocus
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Informe a senha.' },
                { min: 6, message: 'Senha deve ter pelo menos 6 caracteres.' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="login-input-icon" />}
                placeholder="Senha"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item className="login-submit-item">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="login-submit-btn"
              >
                Entrar
              </Button>
            </Form.Item>
          </Form>
        </div>
        <p className="login-footer">© VendaLume · Acesso restrito</p>
      </div>
    </div>
  )
}
