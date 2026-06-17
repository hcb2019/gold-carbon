import os
import yaml
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


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
    name: str = "Gold Carbon"
    tagline: str = "Seu BYD vale dinheiro. Descubra quanto."
    currency: str = "BRL"
    locale: str = "pt-BR"


class Config(BaseSettings):
    byd: BYDConfig = BYDConfig()
    carbon: CarbonConfig = CarbonConfig()
    partner: PartnerConfig = PartnerConfig()
    app: AppConfig = AppConfig()

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    @classmethod
    def load(cls, path: str = "config.yaml") -> "Config":
        with open(path) as f:
            data = yaml.safe_load(f)
        cfg = cls(
            byd=BYDConfig(**data.get("byd", {})),
            carbon=CarbonConfig(**data.get("carbon", {})),
            partner=PartnerConfig(**data.get("partner", {})),
            app=AppConfig(**data.get("app", {})),
        )
        # Load Supabase from env
        cfg.supabase_url = os.getenv("SUPABASE_URL", "")
        cfg.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        cfg.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        return cfg


config = Config.load()
