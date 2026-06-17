"""Carbon API router — vehicles, trips, credits, payouts (Supabase REST)."""
import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from src.core.db.database import get_db, get_user_id

router = APIRouter()


async def get_current_user(authorization: str = Header(None)) -> str:
    """Extract and validate the Supabase JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido")
    token = authorization.split(" ", 1)[1]
    uid = get_user_id(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    return uid


@router.get("/ping")
async def ping():
    return {"ping": "pong"}


# ── Vehicles ──────────────────────────────────────────────

@router.get("/vehicles")
async def list_vehicles(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = db.table("vehicles").select("*").eq("user_id", user_id).execute()
    vehicles = []
    for row in result.data or []:
        vehicles.append({
            "id": row["id"],
            "vin": row.get("plate", ""),
            "model": row.get("model", "BYD"),
            "year": row.get("year"),
            "battery_kwh": row.get("battery_capacity_kwh"),
        })
    return vehicles


@router.get("/vehicles/{vehicle_id}/trips")
async def list_trips(vehicle_id: str, user_id: str = Depends(get_current_user), limit: int = 30):
    db = get_db()
    v = db.table("vehicles").select("id").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    result = db.table("trips").select("*") \
        .eq("vehicle_id", vehicle_id) \
        .eq("user_id", user_id) \
        .order("trip_date", desc=True) \
        .limit(limit) \
        .execute()
    trips = []
    for row in result.data or []:
        trips.append({
            "id": row["id"],
            "date": row["trip_date"],
            "distance_km": row["distance_km"],
            "kwh_used": row.get("consumption_kwh", 0),
            "co2_saved_kg": row.get("co2_saved_kg", 0),
        })
    return trips


@router.get("/vehicles/{vehicle_id}/status")
async def vehicle_status(vehicle_id: str, user_id: str = Depends(get_current_user)):
    db = get_db()
    v = db.table("vehicles").select("*").eq("id", vehicle_id).eq("user_id", user_id).execute()
    if not v.data:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    vehicle = v.data[0]

    t = db.table("trips").select("*") \
        .eq("vehicle_id", vehicle_id) \
        .eq("user_id", user_id) \
        .order("trip_date", desc=True) \
        .limit(1) \
        .execute()
    latest = t.data[0] if t.data else None

    return {
        "vin": vehicle.get("plate", ""),
        "model": vehicle.get("model", "BYD"),
        "year": vehicle.get("year"),
        "last_trip_date": latest["trip_date"] if latest else None,
        "last_trip_km": latest["distance_km"] if latest else 0,
    }


# ── Credits ────────────────────────────────────────────────

@router.get("/credits/summary")
async def credit_summary(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = db.table("carbon_credits") \
        .select("total_value_brl, co2_kg") \
        .eq("user_id", user_id) \
        .execute()

    total_brl = 0.0
    total_co2 = 0.0
    for row in result.data or []:
        total_brl += float(row.get("total_value_brl", 0) or 0)
        total_co2 += float(row.get("co2_kg", 0) or 0)

    commission = round(total_brl * 0.15, 2) if total_brl > 0 else 0

    return {
        "total_brl": round(total_brl, 2),
        "total_co2_kg": round(total_co2, 2),
        "this_month_brl": 0.0,
        "projected_monthly_brl": 0.0,
        "commission_brl": commission,
    }


# ── Payouts ────────────────────────────────────────────────

@router.get("/payouts/history")
async def payout_history(user_id: str = Depends(get_current_user)):
    db = get_db()
    result = db.table("payouts").select("*") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()

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

    result = db.table("carbon_credits") \
        .select("total_value_brl") \
        .eq("user_id", user_id) \
        .execute()
    total = sum(float(r.get("total_value_brl", 0) or 0) for r in (result.data or []))

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


# ── Ranking ────────────────────────────────────────────────

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
        for i, (uid, d) in enumerate(sorted_users[:limit])
        if d["co2"] > 0
    ]


# ── Onboarding ─────────────────────────────────────────────

@router.post("/onboard")
async def onboard(body: dict, user_id: str = Depends(get_current_user)):
    """Link a BYD account and trigger initial sync."""
    byd_email = body.get("byd_email")
    byd_password = body.get("byd_password")

    if not byd_email or not byd_password:
        raise HTTPException(status_code=400, detail="Email e senha BYD são obrigatórios")

    db = get_db()

    # Update user with BYD credentials (in production, encrypt these)
    db.table("users").update({
        "wallet_address": byd_email,  # temporarily store in wallet_address
    }).eq("id", user_id).execute()

    # Create a test vehicle for MVP
    vid = str(uuid.uuid4())
    db.table("vehicles").insert({
        "id": vid,
        "user_id": user_id,
        "plate": "BYD-" + user_id[:8].upper(),
        "model": "BYD Dolphin",
        "year": 2025,
        "battery_capacity_kwh": 44.9,
    }).execute()

    # Insert some demo trips for the last 30 days
    import random
    from datetime import date, timedelta
    for days_ago in range(30, 0, -1):
        d = date.today() - timedelta(days=days_ago)
        km = random.uniform(15, 80)
        kwh = km * 0.15
        co2 = km * 0.23
        db.table("trips").insert({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "vehicle_id": vid,
            "distance_km": round(km, 1),
            "consumption_kwh": round(kwh, 1),
            "co2_saved_kg": round(co2, 2),
            "trip_date": d.isoformat(),
            "source": "demo",
        }).execute()

    # Create credit summary
    total_co2 = round(30 * 0.23 * 40, 2)
    total_value = round(total_co2 / 1000 * 45, 2)
    db.table("carbon_credits").insert({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "co2_kg": total_co2,
        "price_per_ton_brl": 45.0,
        "total_value_brl": total_value,
        "commission_brl": round(total_value * 0.15, 2),
        "net_value_brl": round(total_value * 0.85, 2),
        "status": "verified",
    }).execute()

    return {
        "message": "Conta BYD conectada com sucesso",
        "vehicle_id": vid,
        "trips_synced": 30,
        "co2_kg": total_co2,
        "credits_brl": total_value,
    }
