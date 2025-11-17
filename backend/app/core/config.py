import os
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ValidationError, field_validator


class BaseSettings(BaseModel):
	app_env: Literal["development", "production"] = Field(default="development", alias="APP_ENV")
	gemini_api_key: Optional[str] = Field(default=None, alias="GEMINI_API_KEY")
	google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY")
	gemini_model_name: str = Field(default="gemini-1.5-flash", alias="GEMINI_MODEL_NAME")
	database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")
	cors_origins: List[str] = Field(default_factory=lambda: ["http://localhost:5173"], alias="CORS_ORIGINS")
	upload_file_size_limit_mb: int = Field(default=50, alias="UPLOAD_FILE_SIZE_LIMIT")  # MB

	@field_validator("cors_origins", mode="before")
	@classmethod
	def split_csv_origins(cls, v):
		if isinstance(v, str):
			return [o.strip() for o in v.split(",") if o.strip()]
		return v

	@property
	def resolved_api_key(self) -> Optional[str]:
		# Prefer GEMINI_API_KEY, fall back to GOOGLE_API_KEY
		return self.gemini_api_key or self.google_api_key


class DevSettings(BaseSettings):
	app_env: Literal["development"] = "development"


class ProdSettings(BaseSettings):
	app_env: Literal["production"] = "production"


def load_settings() -> BaseSettings:
	env = os.getenv("APP_ENV", "development").lower()
	settings_cls = ProdSettings if env == "production" else DevSettings
	try:
		return settings_cls.model_validate({k: v for k, v in os.environ.items()})
	except ValidationError as ve:
		# Re-raise with clear message
		raise RuntimeError(f"Invalid environment configuration: {ve}") from ve


