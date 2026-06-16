"""Carbon API router — vehicles, trips, credits, payouts."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.core.db.database import get_db
from src.core.db.models import Vehicle, Trip, Credit, Payout
from src.core.schemas import (
    VehicleOut, TripOut, CreditSummary, PayoutRequest, PayoutOut, SyncResponse
)

router = APIRouter()


@router.get("/ping")
async def ping():
    return {"ping": "pong"}


# ── Vehicles ──────────────────────────────────────────────

@router.get("/vehicles", response_model=list[VehicleOut])
async def list_vehicles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vehicle))
    return result.scalars().all()


@router.get("/vehicles/{vehicle_id}/trips", response_model=list[TripOut])
async def list_trips(
    vehicle_id: str,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip)
        .where(Trip.vehicle_id == vehicle_id)
        .order_by(Trip.date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/vehicles/{vehicle_id}/status")
async def vehicle_status(vehicle_id: str, db: AsyncSession = Depends(get_db)):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    # Get latest trip
    result = await db.execute(
        select(Trip)
        .where(Trip.vehicle_id == vehicle_id)
        .order_by(Trip.date.desc())
        .limit(1)
    )
    latest_trip = result.scalars().first()
    return {
        "vin": vehicle.vin,
        "model": vehicle.model,
        "year": vehicle.year,
        "last_trip_date": latest_trip.date.isoformat() if latest_trip else None,
        "last_trip_km": latest_trip.distance_km if latest_trip else 0,
    }


# ── Credits ────────────────────────────────────────────────

@router.get("/credits/summary", response_model=CreditSummary)
async def credit_summary(db: AsyncSession = Depends(get_db)):
    total_result = await db.execute(
        select(
            func.coalesce(func.sum(Credit.amount_brl), 0),
            func.coalesce(func.sum(Credit.co2_kg), 0),
        )
    )
    total_brl, total_co2 = total_result.first()

    return CreditSummary(
        total_brl=round(total_brl, 2),
        total_co2_kg=round(total_co2, 2),
        this_month_brl=0.0,          # TODO: current month filter
        projected_monthly_brl=0.0,   # TODO: projection logic
        commission_brl=round(total_brl * 0.15 / 0.85, 2) if total_brl > 0 else 0,
    )


# ── Payouts ────────────────────────────────────────────────

@router.get("/payouts/history")
async def payout_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Payout).order_by(Payout.created_at.desc()).limit(20)
    )
    payouts = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "amount_brl": p.amount_brl,
            "commission_brl": p.commission_brl,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
        }
        for p in payouts
    ]


@router.post("/payouts/request")
async def request_payout(body: PayoutRequest, db: AsyncSession = Depends(get_db)):
    # Simplified: single-user MVP
    result = await db.execute(select(func.sum(Credit.amount_brl)))
    total = result.scalar() or 0

    if total < 50.0:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo mínimo para resgate é R$ 50,00. Seu saldo: R$ {total:.2f}",
        )

    payout = Payout(
        user_id=None,  # TODO: get from auth
        amount_brl=total,
        commission_brl=round(total * 0.15, 2),
        pix_key=body.pix_key,
    )
    db.add(payout)
    await db.commit()

    return {"message": "Resgate solicitado com sucesso", "payout_id": str(payout.id)}


# ── Ranking ────────────────────────────────────────────────

@router.get("/ranking")
async def ranking(db: AsyncSession = Depends(get_db), limit: int = 50):
    result = await db.execute(
        select(
            func.sum(Credit.co2_kg).label("total_co2"),
            func.sum(Credit.amount_brl).label("total_brl"),
        )
        .group_by(Credit.user_id)
        .order_by(func.sum(Credit.co2_kg).desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        {"position": i + 1, "co2_saved_kg": round(r[0], 2), "credits_brl": round(r[1], 2)}
        for i, r in enumerate(rows)
        if r[0] and r[0] > 0
    ]
