function onlyDigits(v) {
  return (v ?? '').toString().replace(/\D/g, '')
}

export function maskCpf(v) {
  const d = onlyDigits(v).slice(0, 11)
  const p1 = d.slice(0, 3)
  const p2 = d.slice(3, 6)
  const p3 = d.slice(6, 9)
  const p4 = d.slice(9, 11)
  if (d.length <= 3) return p1
  if (d.length <= 6) return `${p1}.${p2}`
  if (d.length <= 9) return `${p1}.${p2}.${p3}`
  return `${p1}.${p2}.${p3}-${p4}`
}

export function maskCnpj(v) {
  const d = onlyDigits(v).slice(0, 14)
  const p1 = d.slice(0, 2)
  const p2 = d.slice(2, 5)
  const p3 = d.slice(5, 8)
  const p4 = d.slice(8, 12)
  const p5 = d.slice(12, 14)
  if (d.length <= 2) return p1
  if (d.length <= 5) return `${p1}.${p2}`
  if (d.length <= 8) return `${p1}.${p2}.${p3}`
  if (d.length <= 12) return `${p1}.${p2}.${p3}/${p4}`
  return `${p1}.${p2}.${p3}/${p4}-${p5}`
}

export function maskCpfCnpj(v) {
  const d = onlyDigits(v)
  if (!d) return ''
  return d.length <= 11 ? maskCpf(d) : maskCnpj(d)
}

export function maskPhoneBr(v) {
  // (11) 91234-5678 ou (11) 1234-5678
  const d = onlyDigits(v).slice(0, 11)
  if (!d) return ''
  const ddd = d.slice(0, 2)
  const rest = d.slice(2)
  if (d.length <= 2) return `(${ddd}`
  if (rest.length <= 4) return `(${ddd}) ${rest}`
  if (rest.length <= 8) {
    // fixo (8 dígitos) ou incompleto
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }
  // celular 9 dígitos
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

export function normalizeCpfCnpj(v) {
  return maskCpfCnpj(v)
}

export function normalizePhone(v) {
  return maskPhoneBr(v)
}

