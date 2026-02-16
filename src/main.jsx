import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.jsx'
import 'antd/dist/reset.css'
import './index.css'

const theme = {
  token: {
    colorPrimary: '#34495E',
    colorText: '#1D2939',
    colorTextSecondary: '#667085',
    colorBorder: '#E4E7EC',
    colorBgContainer: '#FFFFFF',
    borderRadius: 6,
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={ptBR} theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
