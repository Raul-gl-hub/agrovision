# Imagen base ligera con Python 3.11
FROM python:3.11-slim

# Evita prompts en apt y asegura locale
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependencias del sistema:
# - build-essential y libpq-dev para compilar/usar psycopg2
# - libglib2.0-0 y libsm6/libxext6/libxrender1 para OpenCV (evita errores al importar)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    libglib2.0-0 libsm6 libxext6 libxrender1 \
 && rm -rf /var/lib/apt/lists/*

# Directorio de trabajo
WORKDIR /app

# Copiamos SOLO requirements primero para aprovechar la cache de Docker
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código de la app
COPY src /app/src


# Exponemos el puerto de la API
EXPOSE 8000

# Comando por defecto (Docker Compose lo sobreescribirá para API/worker/simulator)
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
