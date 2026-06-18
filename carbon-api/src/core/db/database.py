"""Supabase REST API client wrapper — replaces SQLAlchemy/asyncpg."""
import uuid
from datetime import datetime, date
from typing import Optional
from supabase import create_client, Client
from src.core.config import config

_supabase: Optional[Client] = None


def _get_client() -> Client:
    global _supabase
    if _supabase is None:
        if not config.supabase_url or not config.supabase_service_role_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required")
        _supabase = create_client(
            config.supabase_url,
            config.supabase_service_role_key,
        )
    return _supabase


def get_db():
    """Get the Supabase client. Replaces the async session dependency."""
    return _get_client()


def get_user_id(token: str) -> Optional[str]:
    """Extract user_id from a Supabase JWT token."""
    if not token:
        return None
    try:
        # Use service_role_key to create client, then verify the user's access_token
        admin_client = create_client(config.supabase_url, config.supabase_service_role_key)
        user = admin_client.auth.get_user(token)
        return str(user.user.id) if user and user.user else None
    except Exception as e:
        print(f"[AUTH] get_user_id failed: {e}")
        return None


def _row_to_dict(row) -> dict:
    if isinstance(row, dict):
        return row
    return dict(row) if row else {}


def _serialize(val):
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, uuid.UUID):
        return str(val)
    return val
