"""BydService — wrapper around pyBYD for Gold Carbon.

Handles authentication, vehicle listing, trip sync, real-time status,
and remote commands. All operations are async and error-resilient.
"""

import asyncio
import logging
from datetime import date, timedelta
from typing import Optional

from pybyd import BydClient, BydConfig
from pybyd import BydApiError, BydAuthenticationError, BydRemoteControlError
from pybyd.models import ClimateStartParams, minutes_to_time_span

from src.core.byd.models import VehicleReal, VehicleStatusReal

logger = logging.getLogger(__name__)

# ── Public API ────────────────────────────────────────────────


class BydService:
    """Async service for BYD Cloud API operations."""

    def __init__(self, username: str, password: str, control_pin: str = ""):
        self._config = BydConfig(
            username=username,
            password=password,
            control_pin=control_pin if control_pin else None,
        )
        self._client: Optional[BydClient] = None

    async def _get_client(self) -> BydClient:
        """Lazy-init the BYD client. Reuses existing connection if valid."""
        if self._client is None:
            self._client = BydClient(self._config)
        return self._client

    async def close(self):
        """Close the BYD client connection."""
        if self._client is not None:
            await self._client.close()
            self._client = None

    # ── Vehicles ───────────────────────────────────────────

    async def list_vehicles(self) -> list[VehicleReal]:
        """Fetch all vehicles from BYD Cloud and return normalized models."""
        client = await self._get_client()
        try:
            async with client:
                vehicles = await client.get_vehicles()
        except BydAuthenticationError:
            raise
        except Exception as e:
            logger.error(f"list_vehicles failed: {e}")
            raise

        results = []
        for v in vehicles:
            results.append(VehicleReal(
                vin=v.vin,
                model=v.model_name or v.series or "BYD",
                year=getattr(v, "year", None),
                plate=v.license_plate or "",
                battery_capacity_kwh=getattr(v, "battery_capacity", 0.0) or 0.0,
            ))
        return results

    # ── Real-time Status ───────────────────────────────────

    async def get_vehicle_status(self, vin: str) -> VehicleStatusReal:
        """Fetch real-time telemetry for a specific VIN."""
        client = await self._get_client()
        try:
            async with client:
                realtime = await client.get_vehicle_realtime(vin)
                gps = await client.get_gps_info(vin)
        except Exception as e:
            logger.error(f"get_vehicle_status({vin}) failed: {e}")
            raise

        return VehicleStatusReal(
            vin=vin,
            model=getattr(realtime, "model", "") or "BYD",
            soc_pct=float(realtime.elec_percent or 0),
            range_km=float(getattr(realtime, "range_elec", 0) or 0),
            odometer_km=float(getattr(realtime, "odo", 0) or 0),
            is_charging=bool(getattr(realtime, "is_charging", False)),
            is_locked=bool(getattr(realtime, "is_locked", True)),
            latitude=float(gps.latitude) if gps and gps.latitude else None,
            longitude=float(gps.longitude) if gps and gps.longitude else None,
            last_sync=None,
        )

    # ── Trip History ───────────────────────────────────────

    async def get_trip_history(
        self, vin: str, days_back: int = 90
    ) -> list[dict]:
        """Fetch trip history from BYD Cloud.

        Returns raw trip data dicts for CarbonCalculator to process.
        """
        client = await self._get_client()
        try:
            async with client:
                trip_list = await client.get_trip_list(vin)
        except Exception as e:
            logger.error(f"get_trip_history({vin}) failed: {e}")
            raise

        if not trip_list:
            return []

        cutoff = date.today() - timedelta(days=days_back)
        trips = []
        for trip in trip_list:
            trip_date = getattr(trip, "date", None) or getattr(trip, "start_time", None)
            if trip_date:
                if isinstance(trip_date, str):
                    trip_date = date.fromisoformat(trip_date[:10])
                if trip_date < cutoff:
                    continue

            distance = float(getattr(trip, "distance", 0) or 0) / 1000.0  # m → km
            if distance <= 0:
                continue

            trips.append({
                "date": str(trip_date),
                "distance_km": round(distance, 1),
                "kwh_used": round(distance * 0.15, 2),  # estimativa Dolphin
                "start_time": str(getattr(trip, "start_time", "")),
                "end_time": str(getattr(trip, "end_time", "")),
                "avg_speed_kmh": float(getattr(trip, "avg_speed", 0) or 0),
            })

        return trips

    # ── Remote Commands ────────────────────────────────────

    async def execute_command(
        self, vin: str, command: str,
        temperature: Optional[float] = None,
        duration_minutes: int = 20,
    ) -> dict:
        """Execute a remote command on a BYD vehicle.

        Supported commands: lock, unlock, start_climate, stop_climate, find_car.
        """
        client = await self._get_client()
        try:
            async with client:
                # Verify PIN for remote commands
                await client.verify_command_access(vin)

                if command == "lock":
                    await client.lock(vin)
                    msg = "Veículo travado com sucesso"
                elif command == "unlock":
                    await client.unlock(vin)
                    msg = "Veículo destravado com sucesso"
                elif command == "start_climate":
                    temp = temperature or 21.0
                    params = ClimateStartParams(
                        temperature=temp,
                        time_span=minutes_to_time_span(min(duration_minutes, 60)),
                    )
                    await client.start_climate(vin, params=params)
                    msg = f"Climatização iniciada a {temp}°C por {duration_minutes}min"
                elif command == "stop_climate":
                    await client.stop_climate(vin)
                    msg = "Climatização desligada"
                elif command == "find_car":
                    await client.find_car(vin)
                    msg = "Buzina e luzes ativadas"
                else:
                    return {"success": False, "command": command,
                            "message": f"Comando desconhecido: {command}"}

                return {"success": True, "command": command, "message": msg}

        except BydRemoteControlError as e:
            logger.error(f"Command '{command}' failed: {e}")
            return {"success": False, "command": command,
                    "message": f"Erro ao executar comando: {e}"}
        except BydAuthenticationError:
            return {"success": False, "command": command,
                    "message": "PIN de controle inválido. Verifique sua senha BYD."}
        except Exception as e:
            logger.error(f"Command '{command}' unexpected error: {e}")
            return {"success": False, "command": command,
                    "message": f"Erro inesperado: {e}"}
