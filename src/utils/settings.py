# src/utils/settings.py
import os

class Settings:
    # --- Base de datos ---
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "agrovision")
    DB_USER: str = os.getenv("DB_USER", "agrovision")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "change_me")

    # --- MQTT ---
    MQTT_BROKER_HOST: str = os.getenv("MQTT_BROKER_HOST", "mqtt")
    MQTT_BROKER_PORT: int = int(os.getenv("MQTT_BROKER_PORT", "1883"))
    MQTT_USERNAME: str | None = os.getenv("MQTT_USERNAME") or None
    MQTT_PASSWORD: str | None = os.getenv("MQTT_PASSWORD") or None
    MQTT_TOPIC: str = os.getenv("MQTT_TOPIC", "agrovision/sensors/+/telemetry")
    MQTT_TOPIC_ENV: str = "agrovision/dev/+/env"
    MQTT_TOPIC_NUTRIENTS: str = "agrovision/dev/+/nutrients"
    
    # --- App / Reglas ---
    HUMIDITY_THRESHOLD: float = float(os.getenv("HUMIDITY_THRESHOLD", "30"))

settings = Settings()


