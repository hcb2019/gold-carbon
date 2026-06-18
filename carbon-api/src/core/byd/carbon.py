"""CarbonCalculator — calculates CO₂ savings and credit values from BYD trips.

Uses Brazilian grid emission factors and voluntary carbon market pricing.
All formulas are configurable via Config (config.yaml / env vars).
"""

from datetime import date
from src.core.config import config


class CarbonCalculator:
    """Calculates carbon credits from EV trip data."""

    def __init__(self):
        self.grid_factor = config.carbon.emission_factors.brazil_grid_kg_co2_per_kwh  # 0.062
        self.price_per_ton = config.carbon.price_per_ton_brl  # 45.0
        self.commission_pct = config.carbon.commission_pct  # 0.15
        self.ev_kwh_per_km = 0.15  # BYD Dolphin average

    def co2_from_kwh(self, kwh: float) -> float:
        """Calculate CO₂ saved from kWh consumed (vs gasoline).

        CO₂ avoided (kg) = kWh × grid_emission_factor
        """
        return round(kwh * self.grid_factor, 2)

    def co2_from_km(self, km: float) -> float:
        """Calculate CO₂ saved per km driven.

        Simplified: km × kwh_per_km × grid_factor
        """
        kwh = km * self.ev_kwh_per_km
        return self.co2_from_kwh(kwh)

    def credits_value(self, co2_kg: float) -> float:
        """Calculate credit value in BRL from CO₂ kg saved.

        Value = CO₂_kg / 1000 × price_per_ton
        """
        return round(co2_kg / 1000 * self.price_per_ton, 2)

    def net_value(self, co2_kg: float) -> float:
        """Value after Gold Carbon commission (15%)."""
        gross = self.credits_value(co2_kg)
        return round(gross * (1 - self.commission_pct), 2)

    def commission(self, co2_kg: float) -> float:
        """Commission amount in BRL."""
        gross = self.credits_value(co2_kg)
        return round(gross * self.commission_pct, 2)

    def process_trips(self, trips: list[dict]) -> dict:
        """Process a list of trip dicts and return aggregated metrics.

        Args:
            trips: list of dicts with 'distance_km', 'kwh_used', 'date'

        Returns:
            dict with total_co2_kg, total_credits_brl, net_brl, commission_brl,
            trip_count, total_km, this_month_co2_kg, this_month_brl
        """
        total_km = 0.0
        total_kwh = 0.0
        total_co2 = 0.0
        this_month_co2 = 0.0
        trip_count = 0

        today = date.today()
        current_month = today.month

        for trip in trips:
            distance = float(trip.get("distance_km", 0))
            kwh = float(trip.get("kwh_used", distance * self.ev_kwh_per_km))
            co2 = self.co2_from_kwh(kwh)

            total_km += distance
            total_kwh += kwh
            total_co2 += co2
            trip_count += 1

            # Check if trip is from current month
            trip_date = trip.get("date", "")
            try:
                trip_month = date.fromisoformat(trip_date[:10]).month if trip_date else 0
                if trip_month == current_month:
                    this_month_co2 += co2
            except (ValueError, IndexError):
                pass

        total_co2 = round(total_co2, 2)
        this_month_co2 = round(this_month_co2, 2)

        return {
            "total_co2_kg": total_co2,
            "total_credits_brl": self.credits_value(total_co2),
            "net_brl": self.net_value(total_co2),
            "commission_brl": self.commission(total_co2),
            "trip_count": trip_count,
            "total_km": round(total_km, 1),
            "total_kwh": round(total_kwh, 2),
            "this_month_co2_kg": this_month_co2,
            "this_month_brl": self.credits_value(this_month_co2),
        }
