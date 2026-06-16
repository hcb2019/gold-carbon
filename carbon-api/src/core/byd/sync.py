"""Vehicle trip synchronization service."""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.core.byd.client import BYDService
from src.core.db.models import Vehicle, Trip, SyncLog
from src.core.carbon.calculator import calculate_co2_saved
from src.core.config import config


async def sync_vehicle_trips(
    db: AsyncSession,
    byd_service: BYDService,
    vehicle: Vehicle,
    days_back: int | None = None,
) -> int:
    """Sync trips for a vehicle from BYD cloud.

    Returns:
        Number of new trips found and saved.
    """
    if days_back is None:
        days_back = config.byd.history_days_back

    # Create sync log
    sync_log = SyncLog(
        vehicle_id=vehicle.id,
        started_at=datetime.utcnow(),
    )
    db.add(sync_log)
    await db.commit()

    try:
        raw_trips = await byd_service.get_trips(vehicle.vin, days_back=days_back)
        new_count = 0

        for raw_trip in raw_trips:
            # Dedup: check if trip already exists by date + distance
            existing = await db.execute(
                select(Trip).where(
                    Trip.vehicle_id == vehicle.id,
                    Trip.date == raw_trip.date,
                )
            )
            if existing.scalars().first():
                continue

            co2 = calculate_co2_saved(raw_trip.distance_km, raw_trip.kwh_used)
            db_trip = Trip(
                vehicle_id=vehicle.id,
                date=raw_trip.date,
                distance_km=raw_trip.distance_km,
                kwh_used=raw_trip.kwh_used,
                co2_saved_kg=co2,
            )
            db.add(db_trip)
            new_count += 1

        await db.commit()

        # Update sync log
        sync_log.finished_at = datetime.utcnow()
        sync_log.trips_found = new_count
        sync_log.status = "done"
        await db.commit()

        return new_count

    except Exception as e:
        sync_log.status = "error"
        sync_log.finished_at = datetime.utcnow()
        await db.commit()
        raise
