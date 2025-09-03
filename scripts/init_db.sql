-- 1) Extensión Timescale (si ya existe, no falla)
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2) Tabla de sensores (metadatos del dispositivo)
CREATE TABLE IF NOT EXISTS sensors (
  id SERIAL PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  name TEXT,
  location TEXT
);

-- 3) Tabla de mediciones (time-series)
CREATE TABLE IF NOT EXISTS measurements (
  id BIGSERIAL PRIMARY KEY,
  sensor_id INT NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  humidity DOUBLE PRECISION,
  temperature DOUBLE PRECISION
);

-- 4) Convertir a hypertable (clave de tiempo = ts)
SELECT create_hypertable('measurements', 'ts', if_not_exists => TRUE);

-- 5) Índice recomendado para consultas recientes por sensor
CREATE INDEX IF NOT EXISTS idx_measurements_sensor_ts
  ON measurements (sensor_id, ts DESC);