-- Perfiles de cultivo con umbrales demo (ajustables)
CREATE TABLE IF NOT EXISTS crop_profiles (
  crop_type TEXT PRIMARY KEY,
  humidity_threshold INT,          -- gatillo de riego (%)
  temp_high_c DOUBLE PRECISION,    -- alerta de calor (°C)
  ph_min DOUBLE PRECISION,
  ph_max DOUBLE PRECISION,
  ec_min DOUBLE PRECISION,
  ec_max DOUBLE PRECISION,
  n_min DOUBLE PRECISION,
  p_min DOUBLE PRECISION,
  k_min DOUBLE PRECISION
);

-- Asignación de cultivo por dispositivo
CREATE TABLE IF NOT EXISTS device_config (
  device_id TEXT PRIMARY KEY,
  crop_type TEXT REFERENCES crop_profiles(crop_type),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Semillas demo (puedes ajustarlas luego)
INSERT INTO crop_profiles (crop_type, humidity_threshold, temp_high_c, ph_min, ph_max, ec_min, ec_max, n_min, p_min, k_min)
VALUES
  ('cacao',   60, 34, 5.5, 6.5, 1.0, 2.5, 20, 10, 80),
  ('naranja', 55, 35, 6.0, 7.5, 1.0, 2.0, 18,  8, 70),
  ('banano',  65, 36, 5.5, 7.0, 1.2, 2.5, 25, 12, 90),
  ('arroz',   55, 38, 5.5, 7.0, 0.8, 1.8, 22, 10, 85),
  ('maiz',    45, 35, 5.8, 7.0, 1.0, 2.0, 20,  9, 70)
ON CONFLICT (crop_type) DO NOTHING;
