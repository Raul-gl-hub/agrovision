from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import Integer, Text, TIMESTAMP, ForeignKey, Double, BigInteger

Base = declarative_base()

class Sensor(Base):
    __tablename__ = "sensors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(Text)

class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    sensor_id: Mapped[int] = mapped_column(ForeignKey("sensors.id"), nullable=False)
    ts: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    humidity: Mapped[float | None] = mapped_column(Double)
    temperature: Mapped[float | None] = mapped_column(Double)
