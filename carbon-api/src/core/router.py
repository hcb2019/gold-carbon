"""Carbon API router — BYD Cloud integration (pyBYD) + Supabase cache."""

import json
import uuid
import logging
from datetime import date, datetime, timedelta
from fastapi import APIRouter, HTTPException, Header, Depends
from src.core.db.database import get_db, get_user_id
from src.core.byd import BydService, CarbonCalculator, CommandRequest

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Auth dependency ──────────────────────────────────────────


async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    token = authorization.split(" ", 1)[1]
    uid = get_user_id(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return uid


def _get_byd_credentials(user_id: str) -> tuple[str, str, str] | None:
    """Retrieve BYD credentials from the user's wallet_address JSON field."""
    db = get_db()
    result = db.table("users").select("wallet_address").eq("id", user_id).execute()
    if not result.data:
        return None
    wallet = result.data[0].get("wallet_address", "")
    if not wallet:
        return None
    try:
        creds = json.loads(wallet)
        return (
            creds.get("byd_email", ""),
            creds.get("byd_password", ""),
            creds.get("byd_control_pin", ""),
        )
    except (json.JSONDecodeError, TypeError):
        return None


async def _get_byd_service(user_id: str) -> BydService:
    """Create a BydService from stored user credentials."""
    creds = _get_byd_credentials(user_id)
    if not creds or not creds[0] or not creds[1]:
        raise HTTPException(
            status_code=400,
            detail="Conta BYD não conectada. Use /api/onboard primeiro.",
        )
    return BydService(username=creds[0], password=creds[1], control_pin=creds[2])


# ── Health ───────────────────────────────────────────────────


@router.get("/ping")
async def ping():
    return {"ping": "pong"}


# ── Onboarding ───────────────────────────────────────────────


@router.post("/onboard")
async def onboard(body: dict, user_id: str = Depends(get_current_user)):
    """Connect BYD account and sync vehicles + trips from the cloud."""
    byd_email = body.get("byd_email")
    byd_password = body.get("byd_password")
    byd_pin = body.get("byd_control_pin", "")

    if not byd_email or not byd_password:
        raise HTTPException(status_code=400, detail="Email e senha BYD são obrigatórios")

    db = get_db()
    calc = CarbonCalculator()

    # ── Step 1: Authenticate with BYD Cloud ──
    try:
        byd = BydService(username=byd_email, password=byd_password, control_pin=byd_pin)
        vehicles = await byd.list_vehicles()
    except Exception as e:
        logger.error(f"BYD auth failed for user {user_id}: {e}")
        raise HTTPException(
            status_code=401,
            detail=f"Falha ao conectar na BYD. Verifique email e senha. Erro: {e}",
        )

    if not vehicles:
        raise HTTPException(status_code=404, detail="Nenhum veículo BYD encontrado na sua conta")

    # ── Step 2: Save credentials (encrypted in production) ──
    credentials = json.dumps({
        "byd_email": byd_email,
        "byd_password": byd_password,
        "byd_control_pin": byd_pin,
    })
    db.table("users").update({"wallet_address": credentials}).eq("id", user_id).execute()

    # ── Step 3: Sync vehicles to Supabase ──
    total_co2 = 0.0
    total_trips = 0
    vehicle_ids = []

    for v in vehicles:
        existing = db.table("vehicles").select("id").eq("vin", v.vin).execute()
        if existing.data:
            vid = existing.data[0]["id"]
        else:
            vid = str(uuid.uuid4())
            db.table("vehicles").insert({
                "id": vid,
                "user_id": user_id,
                "vin": v.vin,
                "plate": v.plate or f"BYD-{v.vin[-6:]}",
                "model": v.model,
                "year": v.year,
                "battery_capacity_kwh": v.battery_capacity_kwh,
            }).execute()
        vehicle_ids.append(vid)

        # ── Step 4: Sync trip history ──
        try:
            trips = await byd.get_trip_history(v.vin, days_back=90)
        except Exception as e:
            logger.warning(f"Trip sync failed for VIN {v.vin}: {e}")
            trips = []

        for trip in trips:
            trip_id = str(uuid.uuid4())
            co2 = calc.co2_from_kwh(trip["kwh_used"])
            source = trip.get("source", "byd_cloud")

            # Deduplicate: skip if trip with same date + distance exists
            dup = db.table("trips").select("id") \
                .eq("vehicle_id", vid) \
                .eq("trip_date", trip["date"]) \
                .eq("distance_km", trip["distance_km"]) \
                .limit(1).execute()
            if dup.data:
                continue

            db.table("trips").insert({
                "id": trip_id,
                "user_id": user_id,
                "vehicle_id": vid,
                "distance_km": trip["distance_km"],
                "consumption_kwh": trip["kwh_used"],
                "co2_saved_kg": co2,
                "trip_date": trip["date"],
                "source": source,
            }).execute()
            total_co2 += co2
            total_trips += 1

    # ── Step 5: Upsert carbon credits ──
    metrics = calc.process_trips(
        db.table("trips").select("*").eq("user_id", user_id).execute().data or []
    )

    existing_credits = db.table("carbon_credits").select("id").eq("user_id", user_id).limit(1).execute()
    if existing_credits.data:
        db.table("carbon_credits").update({
            "co2_kg": metrics["total_co2_kg"],
            "total_value_brl": metrics["total_credits_brl"],
            "commission_brl": metrics["commission_brl"],
            "net_value_brl": metrics["net_brl"],
        }).eq("user_id", user_id).execute()
    elif metrics["total_co2_kg"] > 0:
        db.table("carbon_credits").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "co2_kg": metrics["total_co2_kg"],
            "price_per_ton_brl": calc.price_per_ton,
            "total_value_brl": metrics["total_credits_brl"],
            "commission_brl": metrics["commission_brl"],
            "net_value_brl": metrics["net_brl"],
            "status": "verified",
        }).execute()

    await byd.close()

    return {
        "message": f"{len(vehicles)} veículo(s) conectado(s) com sucesso",
        "vehicles": vehicle_ids,
        "trips_synced": total_trips,
        "co2_kg": round(total_co2, 2),
        "credits_brl": calc.credits_value(total_co2),
    }


# ── Vehicles ─────────────────────────────────────────────────


@router.get("/vehicles")
async def list_vehicles(user_id: str = Depends(get_current_user)):
    """List user's BYD vehicles from Supabase cache."""
    db = get_db()
    result = db.table("vehicles").select("*").eq("user_id", user_id).execute()
    vehicles = []
    for row in result.data or []:
        vehicles.append({
            "id": row["id"],
            "vin": row.get("vin", ""),
            "model": row.get("model", "BYD"),
            "year": row.get("year"),
            "plate": row.get("plate", ""),
            "battery_kwh": row.get("battery_capacity_kwh"),
        })
    return vehicles


@router.get("/vehicles/{vehicle_id}/status")
async def vehicle_status(vehicle_id: str, user_id: str = Depends(get_current_user)):
    """Real-time vehicle status from BYD Cloud (falls back to cache)."""
    db = get_db()
    v = db.table("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    vehicle = v.data[0]
    vin = vehicle.get("vin", "")

    # Try real-time from BYD Cloud
    try:
        byd = await _get_byd_service(user_id)
        status = await byd.get_vehicle_status(vin)
        await byd.close()
    except Exception as e:
        logger.warning(f"Real-time status fallback for VIN {vin}: {e}")
        # Fallback: return cached data + last trip
        t = db.table("trips").select("*") \
            .eq("vehicle_id", vehicle_id).eq("user_id", user_id) \
            .order("trip_date", desc=True).limit(1).execute()
        latest = t.data[0] if t.data else None
        return {
            "vin": vin,
            "model": vehicle.get("model", "BYD"),
            "year": vehicle.get("year"),
            "soc_pct": 0,
            "range_km": 0,
            "odometer_km": 0,
            "is_charging": False,
            "is_locked": True,
            "latitude": None,
            "longitude": None,
            "last_trip_date": latest["trip_date"] if latest else None,
            "last_trip_km": latest["distance_km"] if latest else 0,
            "last_sync": None,
            "cached": True,
        }

    return {
        "vin": vin,
        "model": status.model,
        "year": vehicle.get("year"),
        "soc_pct": status.soc_pct,
        "range_km": status.range_km,
        "odometer_km": status.odometer_km,
        "is_charging": status.is_charging,
        "is_locked": status.is_locked,
        "latitude": status.latitude,
        "longitude": status.longitude,
        "last_trip_date": None,
        "last_trip_km": 0,
        "last_sync": datetime.now().isoformat(),
        "cached": False,
    }


@router.get("/vehicles/{vehicle_id}/trips")
async def list_trips(
    vehicle_id: str,
    user_id: str = Depends(get_current_user),
    limit: int = 30,
):
    """Trip history from Supabase (synced from BYD Cloud)."""
    db = get_db()
    v = db.table("vehicles").select("id").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    result = db.table("trips").select("*") \
        .eq("vehicle_id", vehicle_id) \
        .order("trip_date", desc=True) \
        .limit(limit).execute()

    trips = []
    for row in result.data or []:
        trips.append({
            "id": row["id"],
            "date": row["trip_date"],
            "distance_km": row["distance_km"],
            "kwh_used": row.get("consumption_kwh", 0),
            "co2_saved_kg": row.get("co2_saved_kg", 0),
            "source": row.get("source", "byd_cloud"),
        })
    return trips


@router.post("/vehicles/{vehicle_id}/sync")
async def sync_vehicle(vehicle_id: str, user_id: str = Depends(get_current_user)):
    """Force re-sync trip history from BYD Cloud for a specific vehicle."""
    db = get_db()
    v = db.table("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    vehicle = v.data[0]
    vin = vehicle.get("vin", "")

    byd = await _get_byd_service(user_id)
    calc = CarbonCalculator()

    try:
        trips = await byd.get_trip_history(vin, days_back=90)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao sincronizar com BYD Cloud: {e}")
    finally:
        await byd.close()

    synced = 0
    for trip in trips:
        dup = db.table("trips").select("id") \
            .eq("vehicle_id", vehicle_id) \
            .eq("trip_date", trip["date"]) \
            .eq("distance_km", trip["distance_km"]) \
            .limit(1).execute()
        if dup.data:
            continue

        co2 = calc.co2_from_kwh(trip["kwh_used"])
        db.table("trips").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "vehicle_id": vehicle_id,
            "distance_km": trip["distance_km"],
            "consumption_kwh": trip["kwh_used"],
            "co2_saved_kg": co2,
            "trip_date": trip["date"],
            "source": trip.get("source", "byd_cloud"),
        }).execute()
        synced += 1

    return {"message": f"Sincronizado: {synced} novas viagens", "synced": synced}


# ── Remote Commands ──────────────────────────────────────────


@router.post("/vehicles/{vehicle_id}/commands")
async def vehicle_command(
    vehicle_id: str,
    body: CommandRequest,
    user_id: str = Depends(get_current_user),
):
    """Execute a remote command (lock, unlock, climate, find_car)."""
    db = get_db()
    v = db.table("vehicles").select("vin").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    vin = v.data[0]["vin"]

    byd = await _get_byd_service(user_id)
    try:
        result = await byd.execute_command(
            vin,
            command=body.command,
            temperature=body.temperature,
            duration_minutes=body.duration_minutes or 20,
        )
    finally:
        await byd.close()

    result["vin"] = vin
    result["timestamp"] = datetime.now().isoformat()
    return result


# ── Credits ──────────────────────────────────────────────────


@router.get("/credits/summary")
async def credit_summary(user_id: str = Depends(get_current_user)):
    """Carbon credit summary calculated from real trip data."""
    db = get_db()
    calc = CarbonCalculator()

    trips = db.table("trips").select("*").eq("user_id", user_id).execute().data or []
    metrics = calc.process_trips(trips)

    return {
        "total_brl": metrics["total_credits_brl"],
        "total_co2_kg": metrics["total_co2_kg"],
        "this_month_brl": metrics["this_month_brl"],
        "projected_monthly_brl": round(metrics["this_month_brl"] * 1.1, 2),
        "commission_brl": metrics["commission_brl"],
    }


# ── Payouts ──────────────────────────────────────────────────


@router.get("/payouts/history")
async def payout_history(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = db.table("payouts").select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20).execute()

    return [
        {
            "id": row["id"],
            "amount_brl": row["amount_brl"],
            "commission_brl": 0,
            "status": row["status"],
            "created_at": row["created_at"],
        }
        for row in (result.data or [])
    ]


@router.post("/payouts/request")
async def request_payout(body: dict, user_id: str = Depends(get_current_user)):
    db = get_db()
    calc = CarbonCalculator()

    trips = db.table("trips").select("*").eq("user_id", user_id).execute().data or []
    metrics = calc.process_trips(trips)
    total = metrics["net_brl"]

    if total < 50.0:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo mínimo para resgate é R$ 50,00. Seu saldo: R$ {total:.2f}",
        )

    payout_data = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "amount_brl": total,
        "pix_key": body.get("pix_key", ""),
        "status": "pending",
    }
    result = db.table("payouts").insert(payout_data).execute()
    pid = result.data[0]["id"] if result.data else payout_data["id"]

    return {"message": "Resgate solicitado com sucesso", "payout_id": pid}


# ── Ranking ──────────────────────────────────────────────────


@router.get("/ranking")
async def ranking(limit: int = 50):
    db = get_db()
    result = db.table("carbon_credits") \
        .select("user_id, co2_kg, total_value_brl") \
        .execute()

    user_totals = {}
    for row in result.data or []:
        uid = row.get("user_id", "anon")
        user_totals.setdefault(uid, {"co2": 0.0, "brl": 0.0})
        user_totals[uid]["co2"] += float(row.get("co2_kg", 0) or 0)
        user_totals[uid]["brl"] += float(row.get("total_value_brl", 0) or 0)

    sorted_users = sorted(user_totals.items(), key=lambda x: x[1]["co2"], reverse=True)
    return [
        {"position": i + 1, "co2_saved_kg": round(d["co2"], 2), "credits_brl": round(d["brl"], 2)}
        for i, (_, d) in enumerate(sorted_users[:limit])
        if d["co2"] > 0
    ]


# ── User Profile ─────────────────────────────────────────────


@router.get("/user/profile")
async def user_profile(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = db.table("users").select("*").eq("id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    user = result.data[0]
    creds = _get_byd_credentials(user_id)

    vehicles_result = db.table("vehicles").select("id").eq("user_id", user_id).execute()
    vehicle_count = len(vehicles_result.data or [])

    trips = db.table("trips").select("*").eq("user_id", user_id).execute().data or []
    calc = CarbonCalculator()
    metrics = calc.process_trips(trips)

    return {
        "id": user["id"],
        "email": user.get("email", ""),
        "full_name": user.get("full_name", ""),
        "avatar_url": user.get("avatar_url", ""),
        "byd_email": creds[0] if creds else "",
        "byd_connected": bool(creds and creds[0]),
        "vehicle_count": vehicle_count,
        "total_credits_brl": metrics["total_credits_brl"],
        "total_co2_kg": metrics["total_co2_kg"],
        "created_at": user.get("created_at", ""),
    }
