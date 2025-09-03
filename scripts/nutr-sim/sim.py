import os, json, time, random
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

HOST   = os.getenv("BROKER_HOST", "mqtt")
PORT   = int(os.getenv("BROKER_PORT", "1883"))
DEVICE = os.getenv("DEVICE_ID", "dev1")
TOPIC  = os.getenv("TOPIC", f"agrovision/dev/{DEVICE}/nutrients")
PERIOD = int(os.getenv("PERIOD_SECS", "20"))

# opcional: credenciales si tu broker las usa
MQTT_USER = os.getenv("MQTT_USERNAME")
MQTT_PASS = os.getenv("MQTT_PASSWORD")

BASE = {"n_ppm": 20.0, "p_ppm": 10.0, "k_ppm": 90.0, "ph": 6.2, "ec_ms": 1.5}

def jitter(v, pct=0.08):
    return round(v * (1 + random.uniform(-pct, pct)), 2)

client = mqtt.Client()
if MQTT_USER:
    client.username_pw_set(MQTT_USER, MQTT_PASS)
client.connect(HOST, PORT, 60)
client.loop_start()

try:
    while True:
        msg = {
            "device_id": DEVICE,
            "ts": datetime.now(timezone.utc).isoformat(),
            "n_ppm":  jitter(BASE["n_ppm"],  0.10),
            "p_ppm":  jitter(BASE["p_ppm"],  0.10),
            "k_ppm":  jitter(BASE["k_ppm"],  0.10),
            "ph":     round(jitter(BASE["ph"],   0.02), 2),
            "ec_ms":  round(jitter(BASE["ec_ms"],0.10), 2),
        }
        payload = json.dumps(msg)
        client.publish(TOPIC, payload, qos=0, retain=False)
        print("pub:", payload)
        time.sleep(PERIOD)
except KeyboardInterrupt:
    pass
finally:
    client.loop_stop()
