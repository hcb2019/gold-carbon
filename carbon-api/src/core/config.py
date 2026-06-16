import os
import yaml
from pydantic_settings import BaseSettings


class BYDConfig(BaseSettings):
    api_timeout_seconds: int = 30
    sync_interval_hours: int = 24
    history_days_back: int = 90


class EmissionFactors(BaseSettings):
    gasoline_kg_co2_per_liter: float = 2.3
    brazil_grid_kg_co2_per_kwh: float = 0.062
    gasoline_km_per_liter: float = 12.0


class CarbonConfig(BaseSettings):
    emission_factors: EmissionFactors = EmissionFactors()
    price_per_ton_brl: float = 45.0
    commission_pct: float = 0.15


class PartnerConfig(BaseSettings):
    provider: str = "carbonext"
    min_payout_brl: float = 50.0
    payout_business_days: int = 5


class AppConfig(BaseSettings):
    name: str = "Carbon"
    tagline: str = "Seu BYD vale dinheiro. Descubra quanto."
    currency: str = "BRL"
    locale: str = "pt-BR"


class DatabaseConfig(BaseSettings):
    url: str = ""


class Config(BaseSettings):
    byd: BYDConfig = BYDConfig()
    carbon: CarbonConfig = CarbonConfig()
    partner: PartnerConfig = PartnerConfig()
    app: AppConfig = AppConfig()
    database: DatabaseConfig = DatabaseConfig()

    @classmethod
    def load(cls, path: str = "config.yaml") -> "Config":
        with open(path) as f:
            data = yaml.safe_load(f)
        db_url = data.get("database", {}).get("url", "")
        if db_url.startswith("${") and db_url.endswith("}"):
            env_var = db_url[2:-1]
            data["database"]["url"] = os.getenv(env_var, "")
        return cls(**data)

    @property
    def database_url(self) -> str:
        return self.database.url


config = Config.load()
