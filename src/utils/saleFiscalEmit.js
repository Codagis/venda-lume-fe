import { isValidCpf } from './masks'

export function effectiveSaleCustomerDocument(sale, editDoc) {
  const doc = (editDoc != null && String(editDoc).trim() !== ''
    ? String(editDoc).trim()
    : sale?.customerDocument) || ''
  return doc.trim()
}

export function saleHasValidCustomerCpf(sale, editDoc) {
  return isValidCpf(effectiveSaleCustomerDocument(sale, editDoc))
}

export function saleHasCardAuthorization(sale, editAuth) {
  const auth =
    (editAuth != null && String(editAuth).trim() !== ''
      ? String(editAuth).trim()
      : sale?.cardAuthorization) || ''
  return auth.trim().length > 0
}

/** NFC-e exige autorização apenas para cartão de crédito ou débito (PIX, dinheiro, etc. não exigem). */
export function salePaymentRequiresCardAuthorization(sale) {
  const method = sale?.paymentMethod
  return method === 'CREDIT_CARD' || method === 'DEBIT_CARD'
}

const FISCAL_BLOCKED_STATUSES = ['DRAFT', 'OPEN', 'CANCELLED', 'REFUNDED']

export function saleHasPaymentMethod(sale) {
  return sale?.paymentMethod != null && String(sale.paymentMethod).trim() !== ''
}

export function saleStatusAllowsFiscalEmit(sale) {
  return Boolean(sale?.status && !FISCAL_BLOCKED_STATUSES.includes(sale.status))
}

export function isSaleReadyForFiscalEmit(sale) {
  return saleHasPaymentMethod(sale) && saleStatusAllowsFiscalEmit(sale)
}

export function showNfceEmitButton(sale) {
  return Boolean(
    sale?.canEmitFiscalReceipt || sale?.nfceRequiresCardAuthorization || sale?.nfceRequiresPayment
  )
}

export function isNfceEmitEnabled(sale, cardAuthValue) {
  if (!sale) return false
  if (sale.nfceRequiresPayment || !isSaleReadyForFiscalEmit(sale)) return false
  if (!sale.canEmitFiscalReceipt) return false

  if (salePaymentRequiresCardAuthorization(sale)) {
    if (!saleHasCardAuthorization(sale, cardAuthValue)) return false
    const editAuth = (cardAuthValue || '').trim()
    const savedAuth = (sale.cardAuthorization || '').trim()
    if (editAuth && editAuth !== savedAuth) return false
  }

  return true
}

export function nfceEmitDisabledReason(sale, cardAuthValue) {
  if (!sale) return ''

  if (sale.nfceRequiresPayment || !isSaleReadyForFiscalEmit(sale)) {
    if (!saleHasPaymentMethod(sale)) {
      return 'Registre a forma de pagamento da venda antes de emitir a NFC-e.'
    }
    if (sale.status === 'OPEN') {
      return 'Conclua o pagamento da venda (status aberta) antes de emitir a NFC-e.'
    }
    return 'A venda precisa estar concluída e com pagamento para emitir NFC-e.'
  }

  if (salePaymentRequiresCardAuthorization(sale) && !saleHasCardAuthorization(sale, cardAuthValue)) {
    return 'Informe e salve o código de autorização do cartão (pagamento em crédito ou débito).'
  }

  const editAuth = (cardAuthValue || '').trim()
  const savedAuth = (sale.cardAuthorization || '').trim()
  if (salePaymentRequiresCardAuthorization(sale) && editAuth && editAuth !== savedAuth) {
    return 'Salve o código de autorização antes de emitir a NFC-e.'
  }

  if (!sale.canEmitFiscalReceipt) {
    return 'Verifique a configuração fiscal da empresa e se há produtos configurados para NFC-e.'
  }

  return ''
}

export function showNfeEmitButton(sale) {
  return Boolean(sale?.canEmitNfe || sale?.nfeRequiresCustomerDocument || sale?.nfeRequiresPayment)
}

export function isNfeEmitEnabled(sale, customerEditDoc) {
  if (!isSaleReadyForFiscalEmit(sale)) return false
  if (!sale?.canEmitNfe) return false
  if (!saleHasValidCustomerCpf(sale, customerEditDoc)) return false
  const editDigits = (customerEditDoc || '').replace(/\D/g, '')
  const savedDigits = (sale.customerDocument || '').replace(/\D/g, '')
  if (editDigits && editDigits !== savedDigits) return false
  return true
}

export function nfeEmitDisabledReason(sale, customerEditDoc) {
  if (!sale) return ''
  if (!isSaleReadyForFiscalEmit(sale)) {
    if (!saleHasPaymentMethod(sale)) {
      return 'Registre a forma de pagamento da venda antes de emitir a NF-e.'
    }
    if (sale.status === 'OPEN') {
      return 'Conclua o pagamento da venda (status aberta) antes de emitir a NF-e.'
    }
    return 'A venda precisa estar concluída e com pagamento para emitir NF-e.'
  }
  if (!saleHasValidCustomerCpf(sale, customerEditDoc) || !sale.canEmitNfe) {
    return 'Informe e salve o CPF do cliente (11 dígitos).'
  }
  const editDigits = (customerEditDoc || '').replace(/\D/g, '')
  const savedDigits = (sale.customerDocument || '').replace(/\D/g, '')
  if (editDigits && editDigits !== savedDigits) {
    return 'Salve o CPF do cliente antes de emitir a NF-e.'
  }
  return ''
}
