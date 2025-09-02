# backend/crud.py - VERSIÓN CORREGIDA Y COMPLETA
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import models
import schemas
import httpx
import asyncio
import aiohttp
from cryptography.fernet import Fernet
import os
import hmac
import hashlib
import time

# Clave para encriptar API keys (generar una vez y guardar en .env)
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# ==================== ENCRYPTION FUNCTIONS ====================

def encrypt_api_key(api_key: str) -> str:
    """Encriptar API key para almacenamiento seguro"""
    if not api_key:
        return None
    return cipher_suite.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    """Desencriptar API key"""
    if not encrypted_key:
        return None
    try:
        return cipher_suite.decrypt(encrypted_key.encode()).decode()
    except:
        return None

# ==================== ALERTS CRUD ====================

def get_alert(db: Session, alert_id: int):
    return db.query(models.Alert).filter(models.Alert.id == alert_id).first()

def get_alerts(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Alert).offset(skip).limit(limit).all()

def get_active_alerts(db: Session):
    return db.query(models.Alert).filter(
        models.Alert.status == models.AlertStatusEnum.PENDING
    ).all()

def get_alerts_by_symbol(db: Session, symbol: str):
    return db.query(models.Alert).filter(
        models.Alert.symbol == symbol
    ).order_by(desc(models.Alert.created_at)).all()

def create_alert(db: Session, alert: schemas.AlertCreate):
    """Crear una nueva alerta"""
    # Convertir el tipo de alerta
    alert_type_enum = models.AlertTypeEnum.LONG if alert.alert_type.value == "LONG" else models.AlertTypeEnum.SHORT
    
    db_alert = models.Alert(
        symbol=alert.symbol,
        target_price=alert.target_price,
        alert_type=alert_type_enum,
        notes=alert.notes,
        status=models.AlertStatusEnum.PENDING,
        created_at=datetime.now(),
        trade_id=getattr(alert, 'trade_id', None)
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def update_alert(db: Session, alert_id: int, alert: schemas.AlertCreate):
    """Actualizar una alerta existente"""
    try:
        db_alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
        if db_alert:
            # Convertir el tipo de alerta
            alert_type_enum = models.AlertTypeEnum.LONG if alert.alert_type.value == "LONG" else models.AlertTypeEnum.SHORT
            
            db_alert.symbol = alert.symbol
            db_alert.target_price = alert.target_price
            db_alert.alert_type = alert_type_enum
            db_alert.notes = alert.notes
            db_alert.updated_at = datetime.now()
            
            db.commit()
            db.refresh(db_alert)
            return db_alert
        return None
    except Exception as e:
        print(f"Error en update_alert: {e}")
        db.rollback()
        return None

def delete_alert(db: Session, alert_id: int):
    db_alert = get_alert(db, alert_id)
    if db_alert:
        db.delete(db_alert)
        db.commit()
        return True
    return False

def get_triggered_alerts(db: Session):
    return db.query(models.Alert).filter(
        and_(
            models.Alert.status == models.AlertStatusEnum.TRIGGERED,
            models.Alert.triggered_at >= datetime.now() - timedelta(minutes=10)
        )
    ).all()

# ==================== CONFIG CRUD ====================

def get_config(db: Session) -> models.Config:
    """Obtener configuración actual del sistema"""
    config = db.query(models.Config).first()
    if not config:
        # Crear configuración por defecto
        config = models.Config()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

def update_config(db: Session, config_update: schemas.ConfigUpdate) -> models.Config:
    """Actualizar configuración del sistema"""
    try:
        config = get_config(db)
        
        # Actualizar Binance
        if config_update.binance:
            if config_update.binance.api_key:
                config.binance_api_key = encrypt_api_key(config_update.binance.api_key)
            if config_update.binance.secret_key:
                config.binance_secret_key = encrypt_api_key(config_update.binance.secret_key)
            config.use_testnet = config_update.binance.use_testnet
        
        # Actualizar Telegram
        if config_update.telegram:
            config.telegram_bot_token = config_update.telegram.bot_token
            config.telegram_chat_id = config_update.telegram.chat_id
        
        # Actualizar Discord
        if config_update.discord:
            config.discord_webhook_url = config_update.discord.webhook_url
        
        # Actualizar Trading
        if config_update.trading:
            config.max_positions = config_update.trading.max_positions
            config.max_daily_loss = config_update.trading.max_daily_loss
            config.auto_close_profit = config_update.trading.auto_close_profit
            config.enable_anti_greed = config_update.trading.enable_anti_greed
            config.enable_post_tp1_lock = config_update.trading.enable_post_tp1_lock
            config.enable_psychological_alerts = config_update.trading.enable_psychological_alerts
            config.enable_sound_notifications = config_update.trading.enable_sound_notifications
        
        # Actualizar Alertas
        if config_update.alerts:
            config.default_expiry_hours = config_update.alerts.default_expiry_hours
            config.auto_delete_expired = config_update.alerts.auto_delete_expired
            config.snooze_duration_minutes = config_update.alerts.snooze_duration_minutes
            config.notify_on_trigger = config_update.alerts.notify_on_trigger
            config.notify_on_near_price = config_update.alerts.notify_on_near_price
            config.notify_on_expiry = config_update.alerts.notify_on_expiry
            config.notify_on_position_detected = config_update.alerts.notify_on_position_detected
        
        # Actualizar Apariencia
        if config_update.appearance:
            config.theme = config_update.appearance.theme
            config.animations = config_update.appearance.animations
            config.sounds_enabled = config_update.appearance.sounds_enabled
            config.number_format = config_update.appearance.number_format
            config.timezone = config_update.appearance.timezone
        
        config.updated_at = datetime.now()
        db.commit()
        db.refresh(config)
        
        return config
    except Exception as e:
        print(f"Error updating config: {e}")
        db.rollback()
        raise

# ==================== BINANCE API FUNCTIONS ====================

async def get_binance_price(symbol: str) -> float:
    """Obtener precio de un solo símbolo desde SPOT"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                return float(data['price'])
            else:
                print(f"Error API Binance para {symbol}: {response.status_code}")
                return 0.0
    except Exception as e:
        print(f"Error obteniendo precio de {symbol}: {e}")
        return 0.0

async def get_multiple_prices(symbols: List[str]) -> Dict[str, float]:
    """Obtener precios de múltiples símbolos"""
    try:
        if not symbols:
            return {}
        
        prices = {}
        async with httpx.AsyncClient() as client:
            for symbol in symbols:
                try:
                    response = await client.get(
                        f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}",
                        timeout=5.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        prices[symbol] = float(data['price'])
                    else:
                        print(f"Error para {symbol}: {response.status_code}")
                        prices[symbol] = 0.0
                except Exception as e:
                    print(f"Error individual para {symbol}: {e}")
                    prices[symbol] = 0.0
        
        print(f"✅ Precios obtenidos exitosamente: {len(prices)} símbolos")
        return prices
                
    except Exception as e:
        print(f"Error obteniendo precios múltiples: {e}")
        return {}

async def get_supported_futures_symbols() -> List[str]:
    """Obtener símbolos soportados en FUTURES"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("https://fapi.binance.com/fapi/v1/exchangeInfo", timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                symbols = [s['symbol'] for s in data['symbols'] if s['status'] == 'TRADING' and s['symbol'].endswith('USDT')]
                
                # Filtrar solo los más populares para trading de futuros
                popular_futures = [
                    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
                    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT',
                    'LTCUSDT', 'LINKUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT',
                    'FILUSDT', 'AAVEUSDT', 'ALGOUSDT', 'SANDUSDT', 'MANAUSDT',
                    'APTUSDT', 'OPUSDT', 'ARBUSDT', 'INJUSDT', 'SUIUSDT',
                    'SHIBUSDT', 'TRXUSDT', 'NEARUSDT', 'FTMUSDT', 'ICPUSDT'
                ]
                
                # Retornar solo los que existen en futures
                available_symbols = [s for s in popular_futures if s in symbols]
                return available_symbols
    except Exception as e:
        print(f"Error obteniendo símbolos de futures: {e}")
    
    # Fallback lista
    return [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
        'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LTCUSDT', 'LINKUSDT',
        'MATICUSDT', 'DOTUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT'
    ]

async def enrich_alerts_with_prices(alerts):
    """Enriquecer alertas con precios actuales"""
    if not alerts:
        return []
    
    # Obtener símbolos únicos
    symbols = list(set([alert.symbol for alert in alerts]))
    print(f"Obteniendo precios para: {symbols}")
    
    # Obtener precios
    prices = await get_multiple_prices(symbols)
    print(f"Precios obtenidos: {len(prices)} símbolos")
    
    enriched_alerts = []
    for alert in alerts:
        current_price = prices.get(alert.symbol, 0.0)
        
        # Calcular progreso
        progress_percentage = 0.0
        if current_price > 0:
            if alert.alert_type == models.AlertTypeEnum.LONG:
                if current_price <= alert.target_price:
                    progress_percentage = (current_price / alert.target_price) * 100
                else:
                    progress_percentage = 100.0
            else:  # SHORT
                if current_price >= alert.target_price:
                    progress_percentage = (alert.target_price / current_price) * 100
                else:
                    progress_percentage = 100.0
        
        enriched_alert = {
            "id": alert.id,
            "symbol": alert.symbol,
            "target_price": alert.target_price,
            "current_price": current_price,
            "alert_type": alert.alert_type.value,
            "status": alert.status.value,
            "notes": alert.notes or "",
            "created_at": alert.created_at.isoformat(),
            "triggered_at": alert.triggered_at.isoformat() if alert.triggered_at else None,
            "executed_at": alert.executed_at.isoformat() if alert.executed_at else None,
            "progress_percentage": round(progress_percentage, 1),
            "trade_id": alert.trade_id
        }
        
        enriched_alerts.append(enriched_alert)
    
    return enriched_alerts

# ==================== CONNECTION TESTS ====================

async def test_binance_connection(api_key: str, secret_key: str, use_testnet: bool = True) -> dict:
    """Probar conexión con Binance"""
    try:
        base_url = "https://testnet.binancefuture.com" if use_testnet else "https://fapi.binance.com"
        endpoint = "/fapi/v2/account"
        
        timestamp = int(time.time() * 1000)
        query_string = f"timestamp={timestamp}"
        signature = hmac.new(
            secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            'X-MBX-APIKEY': api_key
        }
        
        url = f"{base_url}{endpoint}?{query_string}&signature={signature}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "success": True,
                        "message": "✅ Conexión exitosa con Binance Futures",
                        "balance": data.get("totalWalletBalance", "0"),
                        "testnet": use_testnet
                    }
                else:
                    error_text = await response.text()
                    return {
                        "success": False,
                        "message": f"❌ Error de conexión: {response.status}",
                        "error": error_text
                    }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error: {str(e)}"
        }

async def test_telegram_connection(bot_token: str, chat_id: str) -> dict:
    """Probar conexión con Telegram"""
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": "🤖 Test de conexión desde CryptoAlert System\n✅ Telegram configurado correctamente!"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    return {
                        "success": True,
                        "message": "✅ Mensaje enviado a Telegram correctamente"
                    }
                else:
                    error_data = await response.json()
                    return {
                        "success": False,
                        "message": f"❌ Error Telegram: {error_data.get('description', 'Error desconocido')}"
                    }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error: {str(e)}"
        }

async def test_discord_connection(webhook_url: str) -> dict:
    """Probar conexión con Discord"""
    try:
        payload = {
            "content": "🤖 **Test de conexión desde CryptoAlert System**\n✅ Discord Webhook configurado correctamente!"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as response:
                if response.status in [200, 204]:
                    return {
                        "success": True,
                        "message": "✅ Mensaje enviado a Discord correctamente"
                    }
                else:
                    return {
                        "success": False,
                        "message": f"❌ Error Discord: Status {response.status}"
                    }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error: {str(e)}"
        }

async def get_telegram_chat_id(bot_token: str) -> dict:
    """Obtener Chat ID de Telegram"""
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    if data["result"]:
                        chat_ids = []
                        for update in data["result"][-5:]:  # Últimas 5 actualizaciones
                            if "message" in update:
                                chat_id = update["message"]["chat"]["id"]
                                chat_type = update["message"]["chat"]["type"]
                                chat_title = update["message"]["chat"].get("title", "DM")
                                chat_ids.append({
                                    "chat_id": str(chat_id),
                                    "type": chat_type,
                                    "title": chat_title
                                })
                        
                        return {
                            "success": True,
                            "message": "✅ Chat IDs encontrados",
                            "chat_ids": chat_ids
                        }
                    else:
                        return {
                            "success": False,
                            "message": "❌ No hay mensajes recientes. Envía un mensaje al bot primero."
                        }
                else:
                    return {
                        "success": False,
                        "message": f"❌ Error obteniendo updates: {response.status}"
                    }
    except Exception as e:
        return {
            "success": False,
            "message": f"❌ Error: {str(e)}"
        }

# ==================== NOTIFICATIONS SYSTEM ====================

async def send_telegram_notification(bot_token: str, chat_id: str, message: str) -> bool:
    """Enviar notificación a Telegram"""
    try:
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    print(f"✅ Mensaje Telegram enviado: {message[:50]}...")
                    return True
                else:
                    error_data = await response.json()
                    print(f"❌ Error Telegram: {error_data}")
                    return False
    except Exception as e:
        print(f"❌ Error enviando a Telegram: {e}")
        return False

async def send_discord_notification(webhook_url: str, message: str) -> bool:
    """Enviar notificación a Discord"""
    try:
        payload = {
            "content": message,
            "username": "CryptoAlert Bot",
            "avatar_url": "https://i.imgur.com/4M34hi2.png"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(webhook_url, json=payload) as response:
                if response.status in [200, 204]:
                    print(f"✅ Mensaje Discord enviado: {message[:50]}...")
                    return True
                else:
                    print(f"❌ Error Discord: Status {response.status}")
                    return False
    except Exception as e:
        print(f"❌ Error enviando a Discord: {e}")
        return False

async def notify_alert_triggered(db: Session, alert, current_price: float):
    """Enviar notificaciones cuando una alerta se dispara"""
    try:
        # Obtener configuración de notificaciones
        config = get_config(db)
        
        if not config.notify_on_trigger:
            return
        
        # Crear mensaje
        alert_type_emoji = "🟢📈" if alert.alert_type.value == "LONG" else "🔴📉"
        direction = "subió" if alert.alert_type.value == "LONG" else "bajó"
        
        message = f"""🚨 <b>ALERTA DISPARADA</b> 🚨

{alert_type_emoji} <b>{alert.symbol}</b>
💰 Precio actual: <b>${current_price:,.4f}</b>
🎯 Target: <b>${alert.target_price:,.4f}</b>
📊 Tipo: <b>{alert.alert_type.value}</b>

💡 El precio {direction} hasta el nivel objetivo!
⏰ Hora: {datetime.now().strftime('%H:%M:%S')}

{alert.notes if alert.notes else ''}

---
🤖 CryptoAlert System"""

        # Enviar a Telegram si está configurado
        if config.telegram_bot_token and config.telegram_chat_id:
            await send_telegram_notification(
                config.telegram_bot_token,
                config.telegram_chat_id,
                message
            )
        
        # Enviar a Discord si está configurado
        if config.discord_webhook_url:
            await send_discord_notification(
                config.discord_webhook_url,
                message.replace('<b>', '**').replace('</b>', '**')  # Discord markdown
            )
            
    except Exception as e:
        print(f"❌ Error enviando notificaciones: {e}")

async def notify_price_near_target(db: Session, alert, current_price: float, percentage: float):
    """Notificar cuando el precio está cerca del target"""
    try:
        config = get_config(db)
        
        if not config.notify_on_near_price:
            return
        
        alert_type_emoji = "🟡📈" if alert.alert_type.value == "LONG" else "🟡📉"
        
        message = f"""⚠️ <b>PRECIO CERCA DEL TARGET</b> ⚠️

{alert_type_emoji} <b>{alert.symbol}</b>
💰 Precio actual: <b>${current_price:,.4f}</b>
🎯 Target: <b>${alert.target_price:,.4f}</b>
📊 Progreso: <b>{percentage:.1f}%</b>

🔥 ¡El precio está cerca de tu objetivo!
⏰ {datetime.now().strftime('%H:%M:%S')}

---
🤖 CryptoAlert System"""

        # Enviar notificaciones
        if config.telegram_bot_token and config.telegram_chat_id:
            await send_telegram_notification(
                config.telegram_bot_token,
                config.telegram_chat_id,
                message
            )
        
        if config.discord_webhook_url:
            await send_discord_notification(
                config.discord_webhook_url,
                message.replace('<b>', '**').replace('</b>', '**')
            )
            
    except Exception as e:
        print(f"❌ Error enviando notificación de proximidad: {e}")

# ==================== ALERT MONITORING ====================

async def check_and_trigger_alerts(db: Session):
    """Verificar y disparar alertas con notificaciones"""
    try:
        # Obtener alertas activas
        active_alerts = get_active_alerts(db)
        
        if not active_alerts:
            return
        
        print(f"Verificando {len(active_alerts)} alertas activas")
        
        # Obtener símbolos únicos
        symbols = list(set([alert.symbol for alert in active_alerts]))
        print(f"Símbolos a verificar: {symbols}")
        
        # Obtener precios actuales
        prices = await get_multiple_prices(symbols)
        print(f"Precios obtenidos para verificación: {len(prices)} símbolos")
        
        alerts_triggered = 0
        
        for alert in active_alerts:
            current_price = prices.get(alert.symbol, 0)
            
            if current_price <= 0:
                continue
            
            # Verificar si se debe disparar
            should_trigger = False
            
            if alert.alert_type == models.AlertTypeEnum.LONG:
                should_trigger = current_price >= alert.target_price
                print(f"LONG {alert.symbol}: ${current_price} >= ${alert.target_price} = {should_trigger}")
            else:  # SHORT
                should_trigger = current_price <= alert.target_price
                print(f"SHORT {alert.symbol}: ${current_price} <= ${alert.target_price} = {should_trigger}")
            
            if should_trigger:
                # Disparar alerta
                alert.status = models.AlertStatusEnum.TRIGGERED
                alert.triggered_at = datetime.now()
                
                print(f"🚨 ALERTA DISPARADA: {alert.symbol} {alert.alert_type.value} @ ${current_price}")
                
                # Enviar notificaciones
                await notify_alert_triggered(db, alert, current_price)
                
                alerts_triggered += 1
            else:
                # Verificar si está cerca (>95% del progreso)
                if alert.alert_type == models.AlertTypeEnum.LONG:
                    progress = (current_price / alert.target_price) * 100
                else:
                    progress = ((alert.target_price / current_price) if current_price > 0 else 0) * 100
                
                # Notificar si está cerca y no se ha notificado recientemente
                if progress >= 95 and not hasattr(alert, '_near_notified'):
                    await notify_price_near_target(db, alert, current_price, progress)
                    alert._near_notified = True  # Marcar como notificado
        
        # Guardar cambios
        db.commit()
        
        if alerts_triggered > 0:
            print(f"🎯 {alerts_triggered} alerta(s) disparada(s)")
        else:
            print("ℹ️ No se dispararon alertas en esta verificación")
            
    except Exception as e:
        print(f"❌ Error verificando alertas: {e}")
        db.rollback()

# ==================== STATS CRUD ====================

def get_alert_stats(db: Session, days: int = 7):
    since = datetime.now() - timedelta(days=days)
    
    alerts = db.query(models.Alert).filter(
        models.Alert.created_at >= since
    ).all()
    
    total = len(alerts)
    executed = len([a for a in alerts if a.status == models.AlertStatusEnum.EXECUTED])
    triggered = len([a for a in alerts if a.status == models.AlertStatusEnum.TRIGGERED])
    
    stats = {
        "total_alerts": total,
        "executed_alerts": executed,
        "triggered_alerts": triggered,
        "success_rate": (executed / total * 100) if total > 0 else 0,
        "by_symbol": {}
    }
    
    symbols = {}
    for alert in alerts:
        if alert.symbol not in symbols:
            symbols[alert.symbol] = {"total": 0, "executed": 0, "triggered": 0}
        symbols[alert.symbol]["total"] += 1
        if alert.status == models.AlertStatusEnum.EXECUTED:
            symbols[alert.symbol]["executed"] += 1
        elif alert.status == models.AlertStatusEnum.TRIGGERED:
            symbols[alert.symbol]["triggered"] += 1
    
    stats["by_symbol"] = symbols
    return stats

def get_top_performers(db: Session, limit: int = 5):
    stats = get_alert_stats(db, days=30)
    
    performers = []
    for symbol, data in stats["by_symbol"].items():
        if data["total"] >= 3:
            success_rate = (data["executed"] / data["total"]) * 100
            performers.append({
                "symbol": symbol,
                "total_alerts": data["total"],
                "success_rate": success_rate
            })
    
    performers.sort(key=lambda x: x["success_rate"], reverse=True)
    return performers[:limit]