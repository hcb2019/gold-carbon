"""Pydantic models for BYD vehicle data and command requests."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class VehicleReal(BaseModel):
    """A real BYD vehicle from the cloud API."""
    vin: str
    model: str = ""
    year: Optional[int] = None
    plate: str = ""
    battery_capacity_kwh: float = 0.0
    # Real-time fields (populated on status endpoint)
    soc_pct: float = 0.0          # State of Charge %
    range_km: float = 0.0         # Estimated range
    odometer_km: float = 0.0      # Total odometer
    is_charging: bool = False
    is_locked: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_sync: Optional[datetime] = None


class TripReal(BaseModel):
    """A real trip from BYD cloud history."""
    id: str
    date: str                     # ISO date
    distance_km: float
    kwh_used: float
    co2_saved_kg: float
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    avg_speed_kmh: float = 0.0
    source: str = "byd_cloud"     # byd_cloud | demo


class VehicleStatusReal(BaseModel):
    """Real-time vehicle status snapshot."""
    vin: str
    model: str
    year: Optional[int] = None
    soc_pct: float
    range_km: float
    odometer_km: float
    is_charging: bool
    is_locked: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_trip_date: Optional[str] = None
    last_trip_km: float = 0.0
    last_sync: Optional[str] = None


class CommandRequest(BaseModel):
    """Request to execute a remote command on a BYD vehicle."""
    command: str = Field(..., description="lock | unlock | start_climate | stop_climate | find_car")
    temperature: Optional[float] = Field(None, ge=16.0, le=30.0, description="Target temp in °C (climate only)")
    duration_minutes: Optional[int] = Field(20, ge=5, le=60, description="Climate duration (climate only)")


class CommandResult(BaseModel):
    """Result of a remote command execution."""
    success: bool
    command: str
    message: str
    vin: str
    timestamp: str
