from src.utils.settings import settings

def irrigation_recommendation(humidity: float | None) -> bool:
    """True = regar, False = no regar."""
    if humidity is None:
        return False
    return humidity < settings.HUMIDITY_THRESHOLD
