import { Alert, Card, Space, Typography } from 'antd'
import { CreditCardOutlined } from '@ant-design/icons'
import { useAuth } from '../../contexts/AuthContext'
import { canAccessSubscription } from './subscriptionUtils'
import SubscriptionRootView from './SubscriptionRootView'
import SubscriptionTenantView from './SubscriptionTenantView'
import './Subscription.css'

const { Title, Paragraph } = Typography

export default function Subscription() {
  const { user } = useAuth()
  const isRoot = user?.isRoot === true
  const canPay = canAccessSubscription(user)

  return (
    <div className="subscription-page">
      <Card className="subscription-header-card">
        <Space align="start">
          <CreditCardOutlined className="subscription-header-icon" />
          <div>
            <Title level={3} className="subscription-title">
              Mensalidades
            </Title>
            <Paragraph type="secondary" className="subscription-subtitle">
              {isRoot
                ? 'Visão geral: pagamentos por empresa, totais por mês e faturas de todas as empresas.'
                : 'Consulte mensalidades em aberto e pague via PIX para manter o acesso ao sistema.'}
            </Paragraph>
          </div>
        </Space>
      </Card>

      {isRoot && <SubscriptionRootView />}

      {!isRoot && canPay && <SubscriptionTenantView />}

      {!isRoot && !canPay && (
        <Alert
          type="warning"
          showIcon
          message="Sem permissão"
          description="Seu perfil não possui acesso à tela de mensalidades. Solicite a permissão SUBSCRIPTION_VIEW ou TENANT_MANAGE ao administrador."
        />
      )}
    </div>
  )
}
