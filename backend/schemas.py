# backend/schemas.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, validator

class AlertType(str, Enum):
    LONG = "LONG"
    SHORT = "SHORT"

class AlertStatus(str, Enum):
    PENDING = "PENDING"
    TRIGGERED = "TRIGGERED"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"

class AlertBase(BaseModel):
    symbol: str
    target_price: float
    alert_type: AlertType
    notes: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertUpdate(BaseModel):
    target_price: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[AlertStatus] = None

# MODELO PARA RESPUESTA (incluye id)
class AlertResponse(AlertBase):
    id: int
    current_price: Optional[float] = None
    status: AlertStatus
    created_at: datetime
    triggered_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    progress_percentage: Optional[float] = None
    
    class Config:
        from_attributes = True

class ConfigBase(BaseModel):
    binance_api_key: Optional[str] = None
    binance_secret: Optional[str] = None
    telegram_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    discord_webhook: Optional[str] = None
    use_testnet: bool = False

class ConfigCreate(ConfigBase):
    pass

class ConfigUpdate(ConfigBase):
    pass

class Config(ConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SystemStatus(BaseModel):
    binance_connected: bool = False
    telegram_connected: bool = False
    discord_connected: bool = False
    database_connected: bool = False
    websocket_connected: bool = False
    price_feed_active: bool = False
    version: str = "v2.0.0"
    alerts_active: int = 0
    positions_open: int = 0

class Position(BaseModel):
    symbol: str
    side: str
    position_amt: float
    entry_price: float
    mark_price: float
    unrealized_pnl: float
    pnl_percentage: float
    leverage: int
    mode: str
    liquidation_price: Optional[float] = None
    alert_id: Optional[int] = None

class Balance(BaseModel):
    total_wallet: float
    available_balance: float
    total_unrealized_pnl: float
    total_margin_balance: float
    positions_count: int

class TradingStats(BaseModel):
    total_alerts: int
    executed_alerts: int
    success_rate: float
    average_profit: float
    best_performer: Optional[str] = None
    worst_performer: Optional[str] = None


class BinanceConfig(BaseModel):
    api_key: Optional[str] = None
    secret_key: Optional[str] = None
    use_testnet: bool = True

class TelegramConfig(BaseModel):
    bot_token: Optional[str] = None
    chat_id: Optional[str] = None

class DiscordConfig(BaseModel):
    webhook_url: Optional[str] = None

class TradingConfig(BaseModel):
    max_positions: int = 5
    max_daily_loss: float = -3.0
    auto_close_profit: float = 10.0
    enable_anti_greed: bool = True
    enable_post_tp1_lock: bool = True
    enable_psychological_alerts: bool = True
    enable_sound_notifications: bool = True
    
    @validator('max_positions')
    def validate_max_positions(cls, v):
        if v < 1 or v > 20:
            raise ValueError('Max positions debe estar entre 1 y 20')
        return v
    
    @validator('max_daily_loss')
    def validate_max_daily_loss(cls, v):
        if v > 0 or v < -50:
            raise ValueError('Max daily loss debe ser negativo y mayor a -50%')
        return v

class AlertsConfig(BaseModel):
    default_expiry_hours: int = 24
    auto_delete_expired: bool = True
    snooze_duration_minutes: int = 5
    notify_on_trigger: bool = True
    notify_on_near_price: bool = True
    notify_on_expiry: bool = True
    notify_on_position_detected: bool = True

class AppearanceConfig(BaseModel):
    theme: str = "light"
    animations: str = "smooth"
    sounds_enabled: bool = True
    number_format: str = "us"
    timezone: str = "UTC-4"
    
    @validator('theme')
    def validate_theme(cls, v):
        if v not in ['light', 'dark', 'auto']:
            raise ValueError('Theme debe ser light, dark o auto')
        return v

class ConfigUpdate(BaseModel):
    """Schema para actualizar configuración"""
    binance: Optional[BinanceConfig] = None
    telegram: Optional[TelegramConfig] = None
    discord: Optional[DiscordConfig] = None
    trading: Optional[TradingConfig] = None
    alerts: Optional[AlertsConfig] = None
    appearance: Optional[AppearanceConfig] = None

class ConfigResponse(BaseModel):
    """Schema para respuesta de configuración"""
    id: int
    binance: dict
    telegram: dict
    discord: dict
    trading: dict
    alerts: dict
    appearance: dict
    created_at: str
    updated_at: str

class TestConnectionRequest(BaseModel):
    """Schema para test de conexión"""
    service: str  # 'binance', 'telegram', 'discord'
    config: dict