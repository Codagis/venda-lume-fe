# Mapa de entregas – Leaflet + OpenStreetMap

O módulo de entregas exibe o endereço no mapa usando **Leaflet + OpenStreetMap**. É **100% gratuito**, sem API key.

## O que precisa para funcionar

1. **Endereço da entrega completo** – Rua, número, bairro, cidade e estado (ex.: "Rua Exemplo, 100, Centro, São Paulo, SP")
2. **Backend em execução** – a API precisa conseguir acessar Nominatim (internet)
3. **Nada mais** – o endereço da empresa é opcional (só serve para mostrar os dois marcadores no mapa)

## Onde aparece

O mapa é exibido ao abrir os detalhes de uma entrega:
- **Minhas Entregas** – para entregadores
- **Entregas** – para gestores

## Tecnologias

- **Leaflet** – mapa no frontend
- **OpenStreetMap** – tiles
- **Nominatim** – geocoding (endereço → coordenadas)
