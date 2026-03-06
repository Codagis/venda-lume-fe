import { useState, useEffect, useRef } from 'react'
import { getDeliveryMapOsm } from '../services/deliveryService'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function DeliveryMap({ delivery }) {
  const [osmData, setOsmData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!delivery?.id) {
      setOsmData(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    getDeliveryMapOsm(delivery.id)
      .then((data) => setOsmData(data))
      .catch(() => {
        setOsmData(null)
        setError('Não foi possível carregar o mapa.')
      })
      .finally(() => setLoading(false))
  }, [delivery?.id])

  useEffect(() => {
    if (!osmData?.destLat || !osmData?.destLon || !mapRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L.map(mapRef.current).setView([osmData.destLat, osmData.destLon], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    L.marker([osmData.destLat, osmData.destLon])
      .addTo(map)
      .bindPopup('<b>Entrega</b><br>' + (osmData.destAddress || ''))

    mapInstanceRef.current = map
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [osmData])

  if (!delivery?.address) return null

  if (loading) {
    return (
      <div style={{ marginTop: 16, padding: 24, background: '#f5f5f5', borderRadius: 8, color: '#667085', fontSize: 13, textAlign: 'center' }}>
        Carregando mapa...
      </div>
    )
  }

  if (error || !osmData?.destLat) {
    return (
      <div style={{ marginTop: 16, padding: 16, background: '#fff8e6', borderRadius: 8, color: '#ad6800', fontSize: 13 }}>
        {error || 'Não foi possível localizar o endereço. Verifique se o endereço da empresa e da entrega estão completos.'}
      </div>
    )
  }

  const hasMetrics = osmData.distanceText || osmData.byFoot || osmData.byBike || osmData.byCar
  const searchUrl = 'https://www.openstreetmap.org/?mlat=' + osmData.destLat + '&mlon=' + osmData.destLon + '#map=16/' + osmData.destLat + '/' + osmData.destLon

  return (
    <div style={{ marginTop: 16 }}>
      {hasMetrics && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e4e7ec',
          }}
        >
          <div style={{ fontSize: 12, color: '#667085', marginBottom: 8, fontWeight: 500 }}>
            Distância e tempo (empresa → entrega)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13 }}>
            {osmData.distanceText && (
              <span style={{ padding: '4px 10px', background: '#e8f4fd', borderRadius: 6, color: '#0c4a6e', fontWeight: 600 }}>
                📍 {osmData.distanceText}
              </span>
            )}
            {osmData.byCar && <span style={{ color: '#334155' }}>🚗 Carro/moto: {osmData.byCar}</span>}
            {osmData.byBike && <span style={{ color: '#334155' }}>🚲 Bicicleta: {osmData.byBike}</span>}
            {osmData.byFoot && <span style={{ color: '#334155' }}>🚶 A pé: {osmData.byFoot}</span>}
          </div>
        </div>
      )}
      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e4e7ec' }}>
        <div style={{ padding: '8px 12px', background: '#f2f4f7', fontSize: 12, color: '#667085' }}>
          Localização no mapa (OpenStreetMap)
        </div>
        <div ref={mapRef} style={{ width: '100%', height: 240 }} />
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: '8px 12px',
            fontSize: 12,
            color: '#34495e',
            textDecoration: 'none',
            background: '#fafafa',
            borderTop: '1px solid #e4e7ec',
          }}
        >
          Abrir no OpenStreetMap →
        </a>
      </div>
    </div>
  )
}
