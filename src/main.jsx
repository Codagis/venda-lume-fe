import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ptBR from 'antd/locale/pt_BR'
import { AuthProvider } from './contexts/AuthContext'
import { ModulesProvider } from './contexts/ModulesContext'
import App from './App.jsx'
import { registerPwa } from './registerPwa'
import 'antd/dist/reset.css'
import './index.css'

registerPwa()

const motionEase = 'cubic-bezier(0.33, 1, 0.68, 1)'

const theme = {
  token: {
    fontFamily: "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: 300,
    fontWeightStrong: 700,
    colorPrimary: '#1a4a2f',
    colorSuccess: '#1a4a2f',
    colorSuccessBg: '#e6ede8',
    colorSuccessBorder: '#d1e0d6',
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
    Button: {
      primaryColor: '#ffffff',
      colorPrimary: '#1a4a2f',
      colorPrimaryHover: '#235a38',
      colorPrimaryActive: '#153f28',
    },
    Card: {
      paddingLG: 22,
      padding: 18,
    },
    Table: {
      headerBg: '#f8fafc',
      headerColor: '#64748b',
      headerSplitColor: '#e2e8f0',
      headerSortActiveBg: '#e6ede8',
      headerSortHoverBg: '#d1e0d6',
      bodySortBg: '#f8fafc',
      rowHoverBg: '#e6ede8',
      rowSelectedBg: '#e6ede8',
      rowSelectedHoverBg: '#d1e0d6',
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
      itemActiveBg: '#e6ede8',
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
