from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, field_validator
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    PROJECT_NAME: str = "SmartPOS"
    DATABASE_URL: str
    SECRET_KEY: str = Field(min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    APP_TIMEZONE: str = "Asia/Jakarta"
    AI_API_KEY: str | None = None
    AI_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    AI_MODEL: str = "deepseek/deepseek-chat"

    @field_validator("DATABASE_URL")
    @classmethod
    def require_postgresql(cls, value: str) -> str:
        if make_url(value).get_backend_name() != "postgresql":
            raise ValueError("DATABASE_URL harus menggunakan PostgreSQL")
        return value

    @field_validator("APP_TIMEZONE")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError) as error:
            raise ValueError(f"APP_TIMEZONE tidak valid: {value}") from error
        return value

    @field_validator("AI_API_KEY")
    @classmethod
    def normalize_ai_api_key(cls, value: str | None) -> str | None:
        return value.strip() if value and value.strip() else None


def load_settings() -> Settings:
    try:
        return Settings()
    except ValidationError as error:
        missing_fields = [
            str(issue["loc"][0])
            for issue in error.errors()
            if issue["type"] == "missing"
        ]
        if missing_fields:
            fields = ", ".join(missing_fields)
            raise RuntimeError(
                f"Konfigurasi backend belum lengkap ({fields}). "
                f"Salin {BACKEND_DIR / '.env.example'} menjadi "
                f"{BACKEND_DIR / '.env'}, lalu isi nilainya."
            ) from error
        raise


settings = load_settings()
