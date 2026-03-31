function onlyDigits(v) {
  return (v ?? '').toString().replace(/\D/g, '')
}

export function isValidEmail(v) {
  const s = (v ?? '').toString().trim()
  if (!s) return true // campo opcional: valida só se preenchido
  // Usa validação simples + robusta (sem exagerar regras RFC)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isValidCpf(v) {
  const cpf = onlyDigits(v)
  if (!cpf) return true // opcional
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let d1 = (sum * 10) % 11
  if (d1 === 10) d1 = 0
  if (d1 !== Number(cpf[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  let d2 = (sum * 10) % 11
  if (d2 === 10) d2 = 0
  return d2 === Number(cpf[10])
}

export function isValidCnpj(v) {
  const cnpj = onlyDigits(v)
  if (!cnpj) return true // opcional
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const calc = (base, weights) => {
    let sum = 0
    for (let i = 0; i < weights.length; i++) sum += Number(base[i]) * weights[i]
    const mod = sum % 11
    return mod < 2 ? 0 : 11 - mod
  }

  const d1 = calc(cnpj, weights1)
  if (d1 !== Number(cnpj[12])) return false
  const d2 = calc(cnpj, weights2)
  return d2 === Number(cnpj[13])
}

export function isValidCpfCnpj(v) {
  const d = onlyDigits(v)
  if (!d) return true
  if (d.length <= 11) return isValidCpf(d)
  return isValidCnpj(d)
}

export function antdRuleCpfCnpj({ required = false, messageRequired = 'Documento é obrigatório.' } = {}) {
  return {
    validator: async (_, value) => {
      const s = (value ?? '').toString().trim()
      if (!s) {
        if (required) throw new Error(messageRequired)
        return
      }
      if (!isValidCpfCnpj(s)) throw new Error('CPF/CNPJ inválido.')
    },
  }
}

export function antdRuleEmail({ required = false, messageRequired = 'E-mail é obrigatório.' } = {}) {
  return {
    validator: async (_, value) => {
      const s = (value ?? '').toString().trim()
      if (!s) {
        if (required) throw new Error(messageRequired)
        return
      }
      if (!isValidEmail(s)) throw new Error('E-mail inválido.')
    },
  }
}

