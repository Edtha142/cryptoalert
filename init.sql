-- init.sql - CORREGIDO Y SIMPLIFICADO

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear tabla de alertas básica (SQLAlchemy creará la estructura completa)
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    target_price DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8),
    alert_type VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    triggered_at TIMESTAMP,
    executed_at TIMESTAMP,
    trade_id VARCHAR(50)
);

-- Crear tabla de configuración básica (SQLAlchemy creará la estructura completa)
CREATE TABLE IF NOT EXISTS configs (
    id SERIAL PRIMARY KEY,
    binance_api_key VARCHAR(500),
    binance_secret_key VARCHAR(500),
    use_testnet BOOLEAN DEFAULT true,
    telegram_bot_token VARCHAR(200),
    telegram_chat_id VARCHAR(50),
    discord_webhook_url TEXT,
    max_positions INTEGER DEFAULT 5,
    max_daily_loss FLOAT DEFAULT -3.0,
    auto_close_profit FLOAT DEFAULT 10.0,
    default_expiry_hours INTEGER DEFAULT 24,
    auto_delete_expired BOOLEAN DEFAULT true,
    snooze_duration_minutes INTEGER DEFAULT 5,
    notify_on_trigger BOOLEAN DEFAULT true,
    notify_on_near_price BOOLEAN DEFAULT true,
    notify_on_expiry BOOLEAN DEFAULT true,
    notify_on_position_detected BOOLEAN DEFAULT true,
    enable_anti_greed BOOLEAN DEFAULT true,
    enable_post_tp1_lock BOOLEAN DEFAULT true,
    enable_psychological_alerts BOOLEAN DEFAULT true,
    enable_sound_notifications BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'light',
    animations VARCHAR(20) DEFAULT 'smooth',
    sounds_enabled BOOLEAN DEFAULT true,
    number_format VARCHAR(10) DEFAULT 'us',
    timezone VARCHAR(20) DEFAULT 'UTC-4',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices básicos
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para configs
DROP TRIGGER IF EXISTS update_configs_updated_at ON configs;
CREATE TRIGGER update_configs_updated_at 
    BEFORE UPDATE ON configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();