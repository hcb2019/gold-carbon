from src.core.config import config


def calculate_co2_saved(distance_km: float, kwh_used: float) -> float:
    """Calculate CO₂ saved by driving electric vs gasoline.

    Args:
        distance_km: Distance driven in kilometers
        kwh_used: Electricity consumed in kWh

    Returns:
        CO₂ saved in kilograms
    """
    if distance_km <= 0:
        return 0.0

    ef = config.carbon.emission_factors

    # Gasoline CO₂ that WOULD have been emitted
    liters_gasoline = distance_km / ef.gasoline_km_per_liter
    gasoline_co2 = liters_gasoline * ef.gasoline_kg_co2_per_liter

    # Electric CO₂ that WAS emitted (Brazil grid)
    electric_co2 = kwh_used * ef.brazil_grid_kg_co2_per_kwh

    # Net saved
    return max(0.0, gasoline_co2 - electric_co2)


def calculate_credit(co2_kg: float) -> float:
    """Convert CO₂ saved to BRL credits after commission.

    Args:
        co2_kg: CO₂ saved in kilograms

    Returns:
        Credit value in BRL (after 15% commission)
    """
    if co2_kg <= 0:
        return 0.0

    tons = co2_kg / 1000.0
    gross = tons * config.carbon.price_per_ton_brl
    net = gross * (1.0 - config.carbon.commission_pct)
    return round(net, 2)
