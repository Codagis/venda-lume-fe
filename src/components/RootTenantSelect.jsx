import { useEffect, useMemo, useState } from 'react'
import { Select } from 'antd'
import { listTenants } from '../services/tenantService'

export default function RootTenantSelect({ isRoot, value, onChange, style }) {
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState([])

  useEffect(() => {
    if (!isRoot) return
    setLoading(true)
    listTenants()
      .then((t) => setTenants(Array.isArray(t) ? t : []))
      .catch(() => setTenants([]))
      .finally(() => setLoading(false))
  }, [isRoot])

  const options = useMemo(() => {
    const base = [{ value: '', label: 'Empresa atual (padrão)' }]
    const rest = tenants.map((t) => ({
      value: t.id,
      label: `${t.tradeName || t.name || 'Empresa'} — ${t.document || 'sem CNPJ'} (${t.id})`,
    }))
    return base.concat(rest)
  }, [tenants])

  if (!isRoot) return null

  return (
    <Select
      showSearch
      allowClear={false}
      loading={loading}
      value={value || ''}
      onChange={(v) => onChange?.(v)}
      placeholder="Escolha a empresa"
      options={options}
      filterOption={(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())}
      style={style || { width: 520 }}
    />
  )
}

