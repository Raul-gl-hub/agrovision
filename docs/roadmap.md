# Roadmap AgroVision

## Fase 0 – Preparación
- [x] Crear repositorio y estructura de carpetas
- [x] Configurar `.gitignore`
- [x] Escribir README inicial
- [x] Crear tablero de proyecto en GitHub
- [ ] Documentar roadmap
- [ ] Documentar investigación inicial

## Fase 1 – MVP (3-4 meses)
- [ ] IoT: simulador de sensores (MQTT) con humedad/temperatura
- [ ] Backend: FastAPI con endpoints `/health`, `/sensors`, `/recommendations`
- [ ] Ingesta: servicio que reciba datos MQTT y los guarde en PostgreSQL/TimescaleDB
- [ ] Frontend: dashboard con gráfico en tiempo real
- [ ] CV: script con OpenCV para detectar color de hojas
- [ ] Reglas básicas de riego por umbrales

### Criterios de aceptación MVP
- Los datos IoT aparecen en el dashboard en menos de 5 segundos.
- Los datos se almacenan correctamente en DB (TimescaleDB).
- El sistema recomienda riego cuando la humedad baja del umbral.
- El script de OpenCV devuelve un % de hojas sanas/amarillas.

## Fase 2 – Beta (6-9 meses)
- IA para predicción de plagas con CNN o LSTM
- Mapas georreferenciados (Leaflet/Mapbox)
- App móvil en Flutter con alertas
- Multi-tenant (usuarios: agricultor, consultor, admin)

## Fase 3 – Escalamiento (12-18 meses)
- Red neuronal predictiva para rendimiento de cosecha
- Integración con maquinaria agrícola autónoma
- Marketplace de insumos agrícolas
- Alianzas con gobiernos/exportadores
