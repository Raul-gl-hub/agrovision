# AgroVision

**AgroVision** es una plataforma integral de **agricultura inteligente** que combina **IA, drones e IoT** para monitorear cultivos, predecir plagas, optimizar riego y aumentar la productividad.

## 🎯 Objetivo del MVP
- Ingesta de datos IoT (humedad/temperatura).
- Dashboard web en tiempo real.
- Análisis básico de imágenes de dron (salud de hojas).
- Recomendación automática de riego.

## 🧱 Arquitectura
- **Backend:** Python (FastAPI) + PostgreSQL/TimescaleDB
- **IA/ML:** PyTorch/TensorFlow + OpenCV
- **IoT:** ESP32/Raspberry + MQTT
- **Drones:** DJI SDK + scripts Python
- **Frontend:** React/Next.js
- **Infra:** Docker / Kubernetes (futuro)

## 🗂️ Estructura inicial
AgroVision/
├─ docs/
├─ src/
│ ├─ api/
│ ├─ ai/
│ ├─ services/
│ ├─ database/
│ └─ utils/
├─ frontend/
├─ mobile/
├─ iot/
├─ drones/
├─ tests/
├─ data/
├─ scripts/
├─ requirements.txt
├─ docker-compose.yml
└─ .env.example

## 🚀 Roadmap por fases
- **Fase 1 (MVP):** IoT → ingesta → dashboard → recomendación básica → CV inicial.
- **Fase 2 (Beta):** IA de plagas, mapas georreferenciados, app móvil, multi-tenant.
- **Fase 3 (Escala):** predicción rendimiento, integración maquinaria, marketplace.

## 📜 Licencia
MIT