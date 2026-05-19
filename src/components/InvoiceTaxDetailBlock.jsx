import { Spin } from 'antd'

function formatBrl(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function taxRow(label, value) {
  const n = Number(value ?? 0)
  if (Number.isNaN(n) || n <= 0) return null
  return { label, value: formatBrl(n) }
}

export default function InvoiceTaxDetailBlock({ taxes, loading }) {
  if (loading) {
    return (
      <div style={{ padding: '8px 0' }}>
        <Spin size="small" /> Carregando tributos do XML…
      </div>
    )
  }
  if (!taxes) return null

  const displayTotal = taxes.displayTotal ?? taxes.totalHighlighted ?? taxes.approximate ?? 0
  const rows = [
    taxRow('ICMS (vICMS)', taxes.icms),
    taxRow('PIS (vPIS)', taxes.pis),
    taxRow('COFINS (vCOFINS)', taxes.cofins),
    taxRow('IPI (vIPI)', taxes.ipi),
    taxRow('ST (vST)', taxes.st),
    taxRow('Tributos aproximados (vTotTrib)', taxes.approximate),
    taxRow('Total destacado', taxes.totalHighlighted),
  ].filter(Boolean)

  return (
    <div className="fiscal-notes-tax-block">
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#666' }}>
        Valores do XML autorizado (referência de tributos incidentes na nota).
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>
        Imposto (referência): {formatBrl(displayTotal)}
      </p>
      {rows.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {rows.map((r) => (
            <li key={r.label} style={{ marginBottom: 4 }}>
              {r.label}: <strong>{r.value}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
          Nenhum tributo destacado no XML desta nota.
        </p>
      )}
    </div>
  )
}
