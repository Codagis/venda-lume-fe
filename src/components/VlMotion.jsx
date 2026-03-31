import { useState, useEffect } from 'react'

/**
 * Conteúdo que só deve aparecer com animação depois de um pequeno atraso (ex.: após fetch).
 * Quando `ready` vira true, espera `delayMs` e aplica a entrada.
 */
export function RevealWhenReady({ ready, delayMs = 100, children, className = '' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!ready) {
      setShow(false)
      return undefined
    }
    const t = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(t)
  }, [ready, delayMs])

  if (!ready) return null

  return (
    <div
      className={show ? `vl-reveal ${className}`.trim() : `vl-reveal-pending ${className}`.trim()}
    >
      {children}
    </div>
  )
}

/**
 * Sempre renderiza `children`; após `delayMs` na montagem (ou quando `delayMs` muda), anima a entrada.
 * Útil para blocos que já existem no DOM mas devem “entrar” logo depois.
 */
export function DelayedReveal({ delayMs = 160, children, className = '' }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(false)
    const t = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(t)
  }, [delayMs])

  return (
    <div className={show ? `vl-reveal ${className}`.trim() : `vl-reveal-pending ${className}`.trim()}>
      {children}
    </div>
  )
}
