# backend/models.py - CORREGIDO FINAL
from datetime import datetime
import enum
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base

# Crear Base aquí (no importar de database para evitar import circular)
Base = declarative_base()

class AlertTypeEnum(enum.Enum):
    LONG = "LONG"
    SHORT = "SHORT"

class AlertStatusEnum(enum.Enum):
    PENDING = "PENDING"
    TRIGGERED = "TRIGGERED"
    EXECUTED = "EXECUTED"
    CANCELLED = "CANCELLED"

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True, nullable=False)
    target_price = Column(Float, nullable=False)
    current_price = Column(Float, nullable=True)
    alert_type = Column(SQLEnum(AlertTypeEnum), nullable=False)  # ← USAR SQLEnum
    status = Column(SQLEnum(AlertStatusEnum), default=AlertStatusEnum.PENDING)  # ← USAR SQLEnum
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.now)  # ← USAR datetime.now
    triggered_at = Column(DateTime, nullable=True)
    executed_at = Column(DateTime, nullable=True)
    trade_id = Column(String, nullable=True)

class Config(Base):
    """Tabla de configuración del sistema"""
    __tablename__ = "configs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # API Keys Binance
    binance_api_key = Column(String, nullable=True)
    binance_secret_key = Column(String, nullable=True)
    use_testnet = Column(Boolean, default=True)
    
    # Notificaciones Telegram
    telegram_bot_token = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    
    # Notificaciones Discord
    discord_webhook_url = Column(Text, nullable=True)
    
    # Configuración de Trading
    max_positions = Column(Integer, default=5)
    max_daily_loss = Column(Float, default=-3.0)
    auto_close_profit = Column(Float, default=10.0)
    
    # Configuración de Alertas
    default_expiry_hours = Column(Integer, default=24)
    auto_delete_expired = Column(Boolean, default=True)
    snooze_duration_minutes = Column(Integer, default=5)
    
    # Configuración de Notificaciones
    notify_on_trigger = Column(Boolean, default=True)
    notify_on_near_price = Column(Boolean, default=True)
    notify_on_expiry = Column(Boolean, default=True)
    notify_on_position_detected = Column(Boolean, default=True)
    
    # Configuración de Trading Automático
    enable_anti_greed = Column(Boolean, default=True)
    enable_post_tp1_lock = Column(Boolean, default=True)
    enable_psychological_alerts = Column(Boolean, default=True)
    enable_sound_notifications = Column(Boolean, default=True)
    
    # Configuración de Apariencia
    theme = Column(String, default="light")
    animations = Column(String, default="smooth")
    sounds_enabled = Column(Boolean, default=True)
    number_format = Column(String, default="us")
    timezone = Column(String, default="UTC-4")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def to_dict(self):
        """Convertir a diccionario para API response"""
        return {
            "id": self.id,
            "binance": {
                "has_api_key": bool(self.binance_api_key),
                "has_secret_key": bool(self.binance_secret_key),
                "use_testnet": self.use_testnet
            },
            "telegram": {
                "bot_token": self.telegram_bot_token,
                "chat_id": self.telegram_chat_id
            },
            "discord": {
                "webhook_url": self.discord_webhook_url
            },
            "trading": {
                "max_positions": self.max_positions,
                "max_daily_loss": self.max_daily_loss,
                "auto_close_profit": self.auto_close_profit,
                "enable_anti_greed": self.enable_anti_greed,
                "enable_post_tp1_lock": self.enable_post_tp1_lock,
                "enable_psychological_alerts": self.enable_psychological_alerts,
                "enable_sound_notifications": self.enable_sound_notifications
            },
            "alerts": {
                "default_expiry_hours": self.default_expiry_hours,
                "auto_delete_expired": self.auto_delete_expired,
                "snooze_duration_minutes": self.snooze_duration_minutes,
                "notify_on_trigger": self.notify_on_trigger,
                "notify_on_near_price": self.notify_on_near_price,
                "notify_on_expiry": self.notify_on_expiry,
                "notify_on_position_detected": self.notify_on_position_detected
            },
            "appearance": {
                "theme": self.theme,
                "animations": self.animations,
                "sounds_enabled": self.sounds_enabled,
                "number_format": self.number_format,
                "timezone": self.timezone
            },
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }