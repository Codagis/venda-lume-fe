import { Button, Tooltip } from 'antd'

/**
 * Botão de emissão fiscal com tooltip quando desabilitado por regra de negócio.
 */
export default function FiscalEmitButton({ disabled, disabledTitle, children, ...buttonProps }) {
  const isDisabled = disabled || buttonProps.loading

  const btn = (
    <Button {...buttonProps} disabled={isDisabled}>
      {children}
    </Button>
  )

  if (!disabled || !disabledTitle) return btn

  return (
    <Tooltip title={disabledTitle}>
      <span className="fiscal-emit-btn-wrap">{btn}</span>
    </Tooltip>
  )
}
