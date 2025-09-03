from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.database.db import get_db
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from src.utils.settings import settings 
import numpy as np
from pydantic import BaseModel
from typing import Optional




app = FastAPI(title="AgroVision API", version="0.1.0")

class DeviceCropIn(BaseModel):
    device_id: str
    crop_type: str

class CropProfileUpdate(BaseModel):
    humidity_threshold: Optional[int] = None     # 0..100
    temp_high_c: Optional[float] = None
    ph_min: Optional[float] = None
    ph_max: Optional[float] = None
    ec_min: Optional[float] = None
    ec_max: Optional[float] = None
    n_min: Optional[float] = None
    p_min: Optional[float] = None
    k_min: Optional[float] = None


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/sensors/latest")
def sensors_latest(device_id: str = Query(...), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT device_id, ts, humidity, temperature
        FROM sensor_readings
        WHERE device_id = :d
        ORDER BY ts DESC
        LIMIT 1
    """), {"d": device_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No data for device")
    return row

@app.get("/sensors/devices")
def list_devices(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT DISTINCT device_id
        FROM sensor_readings
        ORDER BY device_id
    """)).fetchall()
    return [r[0] for r in rows]

@app.get("/crops")
def list_crops(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT crop_type, humidity_threshold, temp_high_c,
               ph_min, ph_max, ec_min, ec_max, n_min, p_min, k_min
        FROM crop_profiles
        ORDER BY crop_type
    """)).mappings().all()
    return rows

@app.get("/crops/{crop_type}")
def get_crop(crop_type: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT crop_type, humidity_threshold, temp_high_c,
               ph_min, ph_max, ec_min, ec_max, n_min, p_min, k_min
        FROM crop_profiles
        WHERE crop_type = :c
        LIMIT 1
    """), {"c": crop_type}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Cultivo no encontrado")
    return row
@app.put("/crops/{crop_type}")
def update_crop(crop_type: str, payload: CropProfileUpdate, db: Session = Depends(get_db)):
    # 1) Asegura que el cultivo existe
    exists = db.execute(text("SELECT 1 FROM crop_profiles WHERE crop_type = :c LIMIT 1"),
                        {"c": crop_type}).scalar()
    if not exists:
        raise HTTPException(status_code=404, detail="Cultivo no encontrado")

    # 2) Construye dict de campos a actualizar (solo los que vienen)
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        # nada que cambiar, devuelve el actual
        return get_crop(crop_type, db)

    # 3) Validaciones básicas
    if "humidity_threshold" in updates:
        ht = updates["humidity_threshold"]
        if ht is not None and (ht < 0 or ht > 100):
            raise HTTPException(status_code=400, detail="humidity_threshold debe estar entre 0 y 100")

    ph_min = updates.get("ph_min", None)
    ph_max = updates.get("ph_max", None)
    # si solo viene uno, necesitamos el otro valor actual para validar
    if (ph_min is not None) or (ph_max is not None):
        current = db.execute(text("SELECT ph_min, ph_max FROM crop_profiles WHERE crop_type = :c"),
                             {"c": crop_type}).mappings().first()
        v_min = ph_min if ph_min is not None else current["ph_min"]
        v_max = ph_max if ph_max is not None else current["ph_max"]
        if v_min is not None and v_max is not None and v_min > v_max:
            raise HTTPException(status_code=400, detail="ph_min no puede ser mayor que ph_max")

    # 4) UPDATE dinámico
    set_clause = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    params = updates | {"c": crop_type}
    db.execute(text(f"UPDATE crop_profiles SET {set_clause} WHERE crop_type = :c"), params)
    db.commit()

    # 5) Devuelve el registro actualizado
    return get_crop(crop_type, db)

@app.get("/devices/crop")
def get_device_crop(device_id: str = Query(...), db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT dc.device_id, dc.crop_type, dc.updated_at
        FROM device_config dc WHERE dc.device_id = :d
    """), {"d": device_id}).mappings().first()
    return row or {"device_id": device_id, "crop_type": None}

@app.put("/devices/crop")
def set_device_crop(payload: DeviceCropIn, db: Session = Depends(get_db)):
    # valida existencia del cultivo
    exists = db.execute(text("SELECT 1 FROM crop_profiles WHERE crop_type = :c LIMIT 1"),
                        {"c": payload.crop_type}).scalar()
    if not exists:
        raise HTTPException(status_code=400, detail="crop_type no existe")
    db.execute(text("""
        INSERT INTO device_config (device_id, crop_type)
        VALUES (:d, :c)
        ON CONFLICT (device_id)
        DO UPDATE SET crop_type = EXCLUDED.crop_type, updated_at = now()
    """), {"d": payload.device_id, "c": payload.crop_type})
    db.commit()
    return {"ok": True, "device_id": payload.device_id, "crop_type": payload.crop_type}


@app.get("/sensors/history")
def history(
    device_id: str = Query(...),
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT ts, temperature, humidity
        FROM sensor_readings
        WHERE device_id = :d
          AND ts >= NOW() - (:h || ' hours')::interval
        ORDER BY ts
    """), {"d": device_id, "h": hours}).mappings().all()
    return rows

def get_crop_profile(db: Session, device_id: str):
    prof = db.execute(text("""
        SELECT cp.*
        FROM device_config dc
        JOIN crop_profiles cp ON cp.crop_type = dc.crop_type
        WHERE dc.device_id = :d
        LIMIT 1
    """), {"d": device_id}).mappings().first()
    return prof  # dict-like o None


@app.get("/recommendations")
def recommendations(
    device_id: str = Query(..., description="Device ID"),
    db: Session = Depends(get_db),
):
    try:
        row = db.execute(text("""
            SELECT device_id, ts, humidity, temperature
            FROM sensor_readings
            WHERE device_id = :d
            ORDER BY ts DESC
            LIMIT 1
        """), {"d": device_id}).mappings().first()

        if not row:
            return {"device_id": device_id, "status": "no_data",
                    "message": "No hay lecturas recientes para este dispositivo."}

        h = row["humidity"]
        t = row["temperature"]

        # Umbrales por cultivo si existen; si no, toma los defaults de settings
        prof = get_crop_profile(db, device_id)
        th = (prof["humidity_threshold"] if prof and prof["humidity_threshold"] is not None
              else settings.HUMIDITY_THRESHOLD)
        t_high = (prof["temp_high_c"] if prof and prof["temp_high_c"] is not None else 35.0)

        if h is None and t is None:
            status, msg = "unknown", "Lectura sin valores; verificar sensor."
        elif h is not None and h < th:
            status, msg = "irrigate_now", f"Humedad {h:.1f}% < {th:.0f}% ({prof['crop_type'] if prof else 'default'}). Regar ahora."
        elif h is not None and h < (th + 10):
            status, msg = "monitor", f"Humedad {h:.1f}%. Monitorear, posible riego pronto."
        elif t is not None and t > t_high:
            status, msg = "heat_alert", f"Temperatura {t:.1f}°C > {t_high:.0f}°C ({prof['crop_type'] if prof else 'default'}). Alerta de calor."
        else:
            status, msg = "ok", "Condiciones óptimas."

        return {
            "device_id": device_id,
            "ts": row["ts"],
            "humidity": h,
            "temperature": t,
            "status": status,
            "message": msg,
            "crop": (prof["crop_type"] if prof else None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NUTRIENTES ---

@app.get("/nutrients/latest")
def nutrients_latest(
    device_id: str = Query(...),
    db: Session = Depends(get_db),
):
    row = db.execute(text("""
        SELECT device_id, ts, n_ppm, p_ppm, k_ppm, ph, ec_ms
        FROM nutrient_readings
        WHERE device_id = :d
        ORDER BY ts DESC
        LIMIT 1
    """), {"d": device_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="No hay datos de nutrientes para este dispositivo.")
    return row


@app.get("/nutrients/history")
def nutrients_history(
    device_id: str = Query(...),
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    rows = db.execute(text("""
        SELECT ts, n_ppm, p_ppm, k_ppm, ph, ec_ms
        FROM nutrient_readings
        WHERE device_id = :d
          AND ts >= NOW() - (:h || ' hours')::interval
        ORDER BY ts
    """), {"d": device_id, "h": hours}).mappings().all()
    return rows


@app.get("/recommendations/nutrients")
def nutrients_recommendations(
    device_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """
    Reglas simples por umbral (GENÉRICAS, ajustar por cultivo):
    - N < 20 ppm  -> acción (N)
    - P < 10 ppm  -> acción (P)
    - K < 80 ppm  -> acción (K)
    - pH < 5.8 o > 7.2 -> monitor
    - EC > 2.5 mS/cm   -> monitor
    """
    row = db.execute(text("""
        SELECT ts, n_ppm, p_ppm, k_ppm, ph, ec_ms
        FROM nutrient_readings
        WHERE device_id = :d
        ORDER BY ts DESC
        LIMIT 1
    """), {"d": device_id}).mappings().first()

    if not row:
        return {
            "device_id": device_id,
            "status": "no_data",
            "message": "Sin datos de nutrientes."
        }

    n, p, k, ph, ec = row["n_ppm"], row["p_ppm"], row["k_ppm"], row["ph"], row["ec_ms"]
    msgs, status = [], "ok"

    if n is not None and n < 20:
        msgs.append(f"N bajo ({n:.1f} ppm): considerar fertilización nitrogenada.")
        status = "action"
    if p is not None and p < 10:
        msgs.append(f"P bajo ({p:.1f} ppm): fosfatado recomendado.")
        status = "action"
    if k is not None and k < 80:
        msgs.append(f"K bajo ({k:.1f} ppm): aplicar potasio.")
        status = "action"

    if ph is not None and (ph < 5.8 or ph > 7.2):
        msgs.append(f"pH subóptimo ({ph:.2f}). Ajustar con enmiendas.")
        if status == "ok":
            status = "monitor"

    if ec is not None and ec > 2.5:
        msgs.append(f"EC alta ({ec:.2f} mS/cm): riesgo de salinidad.")
        if status == "ok":
            status = "monitor"

    if not msgs:
        msgs.append("Nutrientes dentro de rangos generales.")

    return {
        "device_id": device_id,
        "ts": row["ts"],
        "status": status,
        "message": " | ".join(msgs),
        "latest": row
    }
@app.get("/nutrients/devices")
def nutrients_devices(db: Session = Depends(get_db)):
    """
    Lista los device_id que tienen lecturas en nutrient_readings.
    """
    rows = db.execute(text("""
        SELECT DISTINCT device_id
        FROM nutrient_readings
        ORDER BY device_id
    """)).fetchall()
    return [r[0] for r in rows]


@app.get("/ai/anomalies")
def ai_anomalies(
    device_id: str = Query(..., description="Device ID"),
    hours: int = Query(48, ge=2, le=168, description="Ventana en horas"),
    z: float = Query(2.5, description="Umbral de z-score"),
    db: Session = Depends(get_db),
):
    """
    Detecta anomalías por z-score simple en:
      - Ambiente: temperature, humidity
      - Nutrientes: ph, ec_ms
    Devuelve lista de puntos cuyo |z| >= umbral.
    Requiere al menos 8 puntos por serie (si no, devuelve [] para esa variable).
    """
    def z_anoms(vals, ts_list, thr):
        # Filtra None y evita sigma=0
        arr = [v for v in vals if v is not None]
        if len(arr) < 8:
            return []
        mu = float(np.mean(arr))
        sigma = float(np.std(arr)) or 1e-9
        out = []
        for v, t in zip(vals, ts_list):
            if v is None:
                continue
            zval = (v - mu) / sigma
            if abs(zval) >= thr:
                out.append({"ts": t, "value": v, "z": round(float(zval), 2)})
        return out

    # Ambiente (últimas N horas)
    env = db.execute(text("""
        SELECT ts, temperature, humidity
        FROM sensor_readings
        WHERE device_id = :d
          AND ts >= NOW() - (:h || ' hours')::interval
        ORDER BY ts
    """), {"d": device_id, "h": hours}).mappings().all()

    ts_env = [r["ts"] for r in env]
    temp   = [r["temperature"] for r in env]
    hum    = [r["humidity"] for r in env]

    # Nutrientes (últimas N horas)
    nut = db.execute(text("""
        SELECT ts, ph, ec_ms
        FROM nutrient_readings
        WHERE device_id = :d
          AND ts >= NOW() - (:h || ' hours')::interval
        ORDER BY ts
    """), {"d": device_id, "h": hours}).mappings().all()

    ts_nut = [r["ts"] for r in nut]
    ph     = [r["ph"] for r in nut]
    ec     = [r["ec_ms"] for r in nut]

    return {
        "device_id": device_id,
        "window_hours": hours,
        "z_threshold": z,
        "counts": {
            "env_points": len(env),
            "nut_points": len(nut),
        },
        "anomalies": {
            "temperature": z_anoms(temp, ts_env, z),
            "humidity":    z_anoms(hum,  ts_env, z),
            "ph":          z_anoms(ph,   ts_nut, z),
            "ec_ms":       z_anoms(ec,   ts_nut, z)
        }
    }    