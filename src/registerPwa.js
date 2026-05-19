/** Registra service worker em produção para permitir instalação PWA (desktop/atalho). */
function shouldRegisterPwa() {
  if (import.meta.env.PROD) return true
  const host = window.location.hostname
  return host === 'localhost' || host === '127.0.0.1'
}

export function registerPwa() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  if (!shouldRegisterPwa()) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
