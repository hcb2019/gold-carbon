"""BYD Cloud API client wrapper using pyBYD."""

from pybyd import BydClient, BydConfig
from src.core.byd.models import BYDVehicle, BYDTrip, BYDRealtime
from src.core.config import config


class BYDService:
    """Async service for BYD vehicle data."""

    def __init__(self, username: str, password: str):
        self.username = username
        self.password = password
        self._client: BydClient | None = None

    async def _get_client(self) -> BydClient:
        if self._client is None:
            cfg = BydConfig(username=self.username, password=self.password)
            self._client = BydClient(cfg)
            await self._client.login()
        return self._client

    async def get_vehicles(self) -> list[BYDVehicle]:
        client = await self._get_client()
        vehicles = await client.get_vehicles()
        return [
            BYDVehicle(
                vin=v.vin,
                model=getattr(v, "model_name", None),
                year=getattr(v, "model_year", None),
                battery_kwh=getattr(v, "battery_capacity", None),
            )
            for v in vehicles
        ]

    async def get_trips(self, vin: str, days_back: int = 90) -> list[BYDTrip]:
        client = await self._get_client()
        raw_trips = await client.get_trip_list(vin, days=days_back)
        trips = []
        for t in raw_trips:
            distance = (t.distance or 0) / 1000.0  # meters → km
            if distance <= 0:
                continue
            trips.append(
                BYDTrip(
                    date=t.date,
                    distance_km=distance,
                    kwh_used=t.power_consumption or 0,
                    start_location=getattr(t, "start_address", None),
                    end_location=getattr(t, "end_address", None),
                )
            )
        return trips

    async def get_realtime(self, vin: str) -> BYDRealtime:
        client = await self._get_client()
        data = await client.get_vehicle_realtime(vin)
        return BYDRealtime(
            battery_percent=data.elec_percent or 0,
            range_km=data.remain_elec_range or 0,
            temperature_c=getattr(data, "inside_temp", None),
            is_charging=getattr(data, "charge_status", 0) == 1,
        )

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None
