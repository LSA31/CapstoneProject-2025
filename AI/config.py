
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )
    
    openai_api_key: str
    firebase_credentials: str
    firebase_storage_bucket: str
    firebase_api_key: str
    
    
@lru_cache
def get_settings():
    return Settings()
