import { useState, useEffect } from 'react'
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
