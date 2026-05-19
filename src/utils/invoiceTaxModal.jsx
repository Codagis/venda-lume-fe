import { Modal } from 'antd'

function formatBrl(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function row(label, value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n) || n <= 0) return null
  return { label, value: formatBrl(n) }
}

/**
 * Exibe modal com tributos extraídos do XML autorizado da NF-e.
 */
export function showInvoiceTaxModal(taxes) {
  if (!taxes) return

  const displayTotal = taxes.displayTotal ?? taxes.invoiceTaxTotal ?? taxes.approximate ?? taxes.invoiceTaxApprox
  const rows = [
    row('ICMS (vICMS)', taxes.icms ?? taxes.invoiceTaxIcms),
    row('PIS (vPIS)', taxes.pis ?? taxes.invoiceTaxPis),
    row('COFINS (vCOFINS)', taxes.cofins ?? taxes.invoiceTaxCofins),
    row('IPI (vIPI)', taxes.ipi ?? taxes.invoiceTaxIpi),
    row('ST (vST)', taxes.st ?? taxes.invoiceTaxSt),
    row('Tributos aproximados (vTotTrib)', taxes.approximate ?? taxes.invoiceTaxApprox),
    row('Total destacado (ICMS+PIS+COFINS+IPI+ST)', taxes.totalHighlighted ?? taxes.invoiceTaxTotal),
  ].filter(Boolean)

  Modal.info({
    title: 'Impostos da NF-e',
    width: 480,
    content: (
      <div>
        <p style={{ marginBottom: 12 }}>
          Valores lidos do <strong>XML autorizado</strong> pela SEFAZ (via Nuvem Fiscal).
        </p>
        {taxes.invoiceKey && (
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12, wordBreak: 'break-all' }}>
            Chave: {taxes.invoiceKey}
          </p>
        )}
        <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Valor de referência: {formatBrl(displayTotal)}
        </p>
        {rows.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {rows.map((r) => (
              <li key={r.label} style={{ marginBottom: 6 }}>
                <span>{r.label}: </span>
                <strong>{r.value}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#888' }}>
            Nenhum tributo destacado no XML. Cadastre <strong>Imposto (%)</strong> no produto para enviar vTotTrib
            (carga aproximada) ou configure CST/alíquotas fiscais completas.
          </p>
        )}
      </div>
    ),
    okText: 'Fechar',
  })
}
