const STORAGE_KEY = 'venda_lume_pdv_device_imei'

function simpleHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i)
  }
  return (h >>> 0).toString(16)
}

function getFingerprintComponents() {
  const n = typeof navigator !== 'undefined' ? navigator : {}
  const s = typeof screen !== 'undefined' ? screen : {}
  const parts = [
    n.userAgent || '',
    n.language || '',
    n.languages ? Array.isArray(n.languages) ? n.languages.join(',') : String(n.languages) : '',
    s.width || 0,
    s.height || 0,
    s.colorDepth || 0,
    s.pixelDepth || 0,
    typeof new Date().getTimezoneOffset === 'function' ? new Date().getTimezoneOffset() : '',
    n.hardwareConcurrency || 0,
    n.deviceMemory || 0,
    n.platform || '',
    n.maxTouchPoints || 0,
  ]
  return parts.join('|')
}

/**
 * Define o IMEI/código do dispositivo manualmente (código gerado pelo PDV).
 * O operador informa o código do PDV para vincular o equipamento ao caixa.
 */
export function setDeviceImei(imei) {
  if (!imei || typeof imei !== 'string') return
  const trimmed = imei.trim()
  if (!trimmed) return
  try {
    localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {}
}

export function getDeviceImei() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored.trim()) return stored.trim()
  } catch {}
  try {
    const fingerprint = getFingerprintComponents()
    const hash1 = simpleHash(fingerprint)
    const hash2 = simpleHash(fingerprint + 'vl')
    const imei = (hash1 + hash2).slice(0, 32) || hash1 + '-' + (typeof screen !== 'undefined' ? screen.width + 'x' + screen.height : Date.now())
    try {
      localStorage.setItem(STORAGE_KEY, imei)
    } catch {}
    return imei
  } catch {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && stored.trim()) return stored.trim()
    } catch {}
    const fallback = simpleHash(String(Date.now()) + Math.random()) + simpleHash(String(Math.random()))
    return fallback.slice(0, 32)
  }
}
