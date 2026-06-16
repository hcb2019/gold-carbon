"""BYD vehicle data models."""

from dataclasses import dataclass
from datetime import datetime


@dataclass
class BYDVehicle:
    vin: str
    model: str | None = None
    year: int | None = None
    battery_kwh: float | None = None


@dataclass
class BYDTrip:
    date: datetime
    distance_km: float
    kwh_used: float
    start_location: str | None = None
    end_location: str | None = None


@dataclass
class BYDRealtime:
    battery_percent: float
    range_km: float
    temperature_c: float | None = None
    is_charging: bool = False
