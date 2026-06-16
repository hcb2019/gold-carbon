"""Pydantic schemas for API request/response validation."""

from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class VehicleOut(BaseModel):
    id: UUID
    vin: str
    model: str | None = None
    year: int | None = None
    battery_kwh: float | None = None

    class Config:
        from_attributes = True


class TripOut(BaseModel):
    id: UUID
    date: datetime
    distance_km: float
    kwh_used: float
    co2_saved_kg: float

    class Config:
        from_attributes = True


class CreditSummary(BaseModel):
    total_brl: float
    total_co2_kg: float
    this_month_brl: float
    projected_monthly_brl: float
    commission_brl: float


class PayoutRequest(BaseModel):
    pix_key: str


class PayoutOut(BaseModel):
    id: UUID
    amount_brl: float
    commission_brl: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SyncResponse(BaseModel):
    trips_found: int
    total_trips: int


class RankingEntry(BaseModel):
    position: int
    co2_saved_kg: float
    credits_brl: float
