FROM python:3.11-slim
RUN pip install --no-cache-dir paho-mqtt tzdata
WORKDIR /app
COPY sim.py /app/sim.py
ENV PYTHONUNBUFFERED=1
CMD ["python", "/app/sim.py"]
