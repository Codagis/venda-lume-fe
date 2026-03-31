import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { AuthProvider } from './contexts/AuthContext'
import { ModulesProvider } from './contexts/ModulesContext'
import App from './App.jsx'
import 'antd/dist/reset.css'
import './index.css'

const motionEase = 'cubic-bezier(0.33, 1, 0.68, 1)'

const theme = {
  token: {
    fontFamily: "'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    colorPrimary: '#0d9488',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
    colorBgContainer: '#FFFFFF',
    borderRadius: 12,
    borderRadiusLG: 20,
    motionDurationFast: '0.16s',
    motionDurationMid: '0.32s',
    motionDurationSlow: '0.42s',
    motionEaseInOut: motionEase,
    motionEaseOut: motionEase,
  },
  components: {
    Card: {
      paddingLG: 22,
      padding: 18,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#64748b',
      headerSplitColor: '#e2e8f0',
      headerSortActiveBg: '#ecfdf5',
      headerSortHoverBg: '#d1fae5',
      bodySortBg: '#f8fafc',
      rowHoverBg: '#f0fdfa',
      rowSelectedBg: '#ecfeff',
      rowSelectedHoverBg: '#cffafe',
      borderColor: '#f1f5f9',
      cellPaddingBlock: 14,
      cellPaddingInline: 18,
      cellFontSize: 14,
      cellFontSizeMD: 13,
      cellFontSizeSM: 12,
      footerBg: '#fafbfc',
      footerColor: '#64748b',
      headerBorderRadius: 0,
    },
    Pagination: {
      itemActiveBg: '#f0fdfa',
      borderRadius: 8,
    },
    Select: {
      optionActiveBg: '#f1f5f9',
      optionSelectedBg: '#e2e8f0',
      optionSelectedColor: '#0f172a',
      optionSelectedFontWeight: 600,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={ptBR} theme={theme}>
        <AuthProvider>
          <ModulesProvider>
            <App />
          </ModulesProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
