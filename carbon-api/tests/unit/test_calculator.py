"""Unit tests for carbon credit calculator."""

import pytest
from src.core.carbon.calculator import calculate_co2_saved, calculate_credit


class TestCalculateCO2Saved:
    def test_zero_distance_returns_zero(self):
        result = calculate_co2_saved(distance_km=0, kwh_used=0)
        assert result == pytest.approx(0.0)

    def test_seal_1000km_month(self):
        # BYD Seal: 1000 km, 15 kWh/100km = 150 kWh
        result = calculate_co2_saved(distance_km=1000, kwh_used=150)
        # Gasoline: 1000/12 * 2.3 = 191.67 kg
        # Electric: 150 * 0.062 = 9.3 kg
        # Saved: 191.67 - 9.3 = 182.37 kg
        assert result == pytest.approx(182.37, rel=0.01)

    def test_short_trip_rounds_correctly(self):
        result = calculate_co2_saved(distance_km=5, kwh_used=0.75)
        assert result > 0
        assert result == pytest.approx(0.91, rel=0.01)

    def test_gasoline_lower_than_electric_returns_zero(self):
        # If grid is super dirty (coal), electric might be worse
        # Force a case where distance is minimal
        result = calculate_co2_saved(distance_km=0.1, kwh_used=10)
        assert result >= 0  # Never negative


class TestCalculateCredit:
    def test_converts_co2_to_brl(self):
        result = calculate_credit(co2_kg=182.37)
        # 182.37 kg = 0.18237 t × R$45/t × 0.85 = R$6.97
        assert result == pytest.approx(6.97, rel=0.01)

    def test_zero_co2_returns_zero(self):
        result = calculate_credit(co2_kg=0)
        assert result == 0.0

    def test_commission_is_applied(self):
        result = calculate_credit(co2_kg=1000)
        # 1000 kg = 1 t × R$45 × 0.85 = R$38.25
        assert result == pytest.approx(38.25, rel=0.01)

    def test_small_values_round_correctly(self):
        result = calculate_credit(co2_kg=1)
        # 1 kg = 0.001 t × R$45 × 0.85 = R$0.03825
        # rounded to 2 decimals = 0.04
        assert result > 0
        assert result == round(0.001 * 45 * 0.85, 2)
