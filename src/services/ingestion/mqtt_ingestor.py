import json
from datetime import datetime, timezone
import paho.mqtt.client as mqtt
from sqlalchemy import text
from sqlalchemy.orm import Session
from src.database.db import SessionLocal
from src.utils.settings import settings

# Topics (compat + nuevos)
TOPIC_LEGACY = getattr(settings, "MQTT_TOPIC", None)  # ej: agrovision/sensors/+/telemetry
TOPIC_ENV = getattr(settings, "MQTT_TOPIC_ENV", "agrovision/dev/+/env")
TOPIC_NUT = getattr(settings, "MQTT_TOPIC_NUTRIENTS", "agrovision/dev/+/nutrients")

def on_connect(client, userdata, flags, reason_code, properties=None):
    print("MQTT connected:", reason_code)
    subs = []
    if TOPIC_LEGACY:
        subs.append((TOPIC_LEGACY, 0))
    subs.extend([(TOPIC_ENV, 0), (TOPIC_NUT, 0)])
    client.subscribe(subs)
    print("Subscribed to:", [t for t, _ in subs])

def parse_ts(ts_str: str | None):
    if not ts_str:
        return datetime.now(timezone.utc)
    try:
        # soporta ...Z y offsets
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)

def insert_env(db: Session, data: dict):
    device_id   = data.get("device_id")
    humidity    = data.get("humidity")
    temperature = data.get("temperature")
    ts          = parse_ts(data.get("ts"))
    if not device_id:
        print("[SKIP env] missing device_id:", data); return
    db.execute(text("""
        INSERT INTO sensor_readings (device_id, ts, humidity, temperature)
        VALUES (:d, :ts, :h, :t)
    """), {"d": device_id, "ts": ts, "h": humidity, "t": temperature})

def insert_nutrients(db: Session, data: dict):
    device_id = data.get("device_id")
    ts        = parse_ts(data.get("ts"))
    n_ppm     = data.get("n_ppm")
    p_ppm     = data.get("p_ppm")
    k_ppm     = data.get("k_ppm")
    ph        = data.get("ph")
    ec_ms     = data.get("ec_ms")
    if not device_id:
        print("[SKIP nutr] missing device_id:", data); return
    db.execute(text("""
        INSERT INTO nutrient_readings (device_id, ts, n_ppm, p_ppm, k_ppm, ph, ec_ms)
        VALUES (:d, :ts, :n, :p, :k, :ph, :ec)
    """), {"d": device_id, "ts": ts, "n": n_ppm, "p": p_ppm, "k": k_ppm, "ph": ph, "ec": ec_ms})

def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8")
    try:
        data = json.loads(payload)
    except Exception as e:
        print("[ERR json]", e, "payload:", payload)
        return

    topic = msg.topic or ""
    db: Session = SessionLocal()
    try:
        if topic.endswith("/env") or ("telemetry" in topic and ("humidity" in data or "temperature" in data)):
            insert_env(db, data)
            db.commit()
            print(f"[ENV OK] {data.get('device_id')} {data.get('ts')} h={data.get('humidity')} t={data.get('temperature')}")
        elif topic.endswith("/nutrients") or any(k in data for k in ("n_ppm","p_ppm","k_ppm","ph","ec_ms")):
            insert_nutrients(db, data)
            db.commit()
            print(f"[NUTR OK] {data.get('device_id')} {data.get('ts')} NPK={data.get('n_ppm')}/{data.get('p_ppm')}/{data.get('k_ppm')} pH={data.get('ph')} EC={data.get('ec_ms')}")
        else:
            print("[SKIP] topic no reconocido:", topic, "payload:", payload)
    except Exception as e:
        print("[ERR db]", e, "payload:", payload)
    finally:
        db.close()

def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    if getattr(settings, "MQTT_USERNAME", None):
        client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, 60)
    client.loop_forever()

if __name__ == "__main__":
    main()
