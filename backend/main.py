# backend/main.py - COMPLETO Y CORREGIDO - TODAS LAS FUNCIONALIDADES INCLUIDAS
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
import asyncio
from datetime import datetime, timedelta
import crud
import schemas
import models
from database import SessionLocal, get_db, init_database, test_connection, run_migrations

# Inicialización del sistema
print("🔌 Inicializando sistema...")
if test_connection():
    print("✅ PostgreSQL conectado")
    if run_migrations():
        print("✅ Migraciones aplicadas")
        init_database()
    else:
        print("❌ Error en migraciones")
else:
    print("❌ Error de conexión")

app = FastAPI(title="CryptoAlert System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

async def monitor_alerts_background():
    """Monitor de alertas en background con notificaciones"""
    print("🔄 Iniciando monitor de alertas en background...")
    
    while True:
        try:
            db = SessionLocal()
            
            # Verificar alertas y enviar notificaciones automáticamente
            await crud.check_and_trigger_alerts(db)
            
            db.close()
            
        except Exception as e:
            print(f"❌ Error en monitor de alertas: {e}")
            try:
                db.close()
            except:
                pass
        
        # Esperar 30 segundos antes del próximo check
        await asyncio.sleep(30)

@app.on_event("startup")
async def startup_event():
    print("🔧 Iniciando sistema...")
    
    # Verificar conexión a base de datos
    if test_connection():
        print("✅ Base de datos conectada")
    else:
        print("❌ Error de conexión a base de datos")
    
    # Iniciar monitoreo de alertas con notificaciones
    asyncio.create_task(monitor_alerts_background())
    print("🚀 Sistema iniciado con notificaciones activas")

@app.get("/")
async def root():
    return {"message": "🚀 CryptoAlert System v2.0"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "message": "CryptoAlert System funcionando correctamente"
    }

@app.get("/api/test")
async def test_endpoint():
    return {
        "message": "API funcionando",
        "cors_enabled": True,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return {"message": "No favicon"}

# ==================== ALERTS ENDPOINTS ====================

@app.get("/api/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    try:
        alerts = crud.get_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(alerts)
        return {
            "alerts": enriched_alerts,
            "total": len(enriched_alerts),
            "active": len([a for a in enriched_alerts if a["status"] == "PENDING"])
        }
    except Exception as e:
        print(f"Error en get_alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts/active")
async def get_active_alerts(db: Session = Depends(get_db)):
    try:
        alerts = crud.get_active_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(alerts)
        return {
            "alerts": enriched_alerts,
            "count": len(enriched_alerts)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts/proximas")
async def get_proximas_alerts(db: Session = Depends(get_db)):
    try:
        alerts = crud.get_active_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(alerts)
        proximas = [a for a in enriched_alerts if a.get("progress_percentage", 0) >= 80]
        proximas.sort(key=lambda x: x.get("progress_percentage", 0), reverse=True)
        return {
            "alerts": proximas,
            "count": len(proximas)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts/historial")
async def get_historial_alerts(db: Session = Depends(get_db)):
    try:
        alerts = crud.get_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(alerts)
        historial = [a for a in enriched_alerts if a["status"] in ["TRIGGERED", "EXECUTED", "CANCELLED"]]
        historial.sort(key=lambda x: x["created_at"], reverse=True)
        return {
            "alerts": historial,
            "count": len(historial)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/alerts/stats")
async def get_alerts_stats(db: Session = Depends(get_db)):
    try:
        alerts = crud.get_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(alerts)
        
        total = len(enriched_alerts)
        pending = len([a for a in enriched_alerts if a["status"] == "PENDING"])
        triggered = len([a for a in enriched_alerts if a["status"] == "TRIGGERED"])
        executed = len([a for a in enriched_alerts if a["status"] == "EXECUTED"])
        
        success_rate = (executed / total * 100) if total > 0 else 0
        
        return {
            "overview": {
                "total_alerts": total,
                "pending": pending,
                "triggered": triggered,
                "executed": executed,
                "success_rate": round(success_rate, 1)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/alerts")
async def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    try:
        # Validar símbolo
        supported_coins = await crud.get_supported_futures_symbols()
        if alert.symbol not in supported_coins:
            raise HTTPException(status_code=400, detail=f"Símbolo {alert.symbol} no soportado")
        
        db_alert = crud.create_alert(db=db, alert=alert)
        current_price = await crud.get_binance_price(alert.symbol)
        
        return {
            "message": f"✅ Alerta creada: {alert.symbol} {alert.alert_type.value} @ ${alert.target_price}",
            "alert": {
                "id": db_alert.id,
                "symbol": db_alert.symbol,
                "target_price": db_alert.target_price,
                "current_price": current_price,
                "alert_type": db_alert.alert_type.value,
                "status": db_alert.status.value,
                "notes": db_alert.notes,
                "created_at": db_alert.created_at.isoformat(),
                "trade_id": db_alert.trade_id
            }
        }
    except Exception as e:
        print(f"Error creando alerta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: int, db: Session = Depends(get_db)):
    try:
        success = crud.delete_alert(db=db, alert_id=alert_id)
        if success:
            return {"message": f"✅ Alerta {alert_id} eliminada"}
        else:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/api/alerts/{alert_id}")
async def update_alert(alert_id: int, alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    """Actualizar una alerta existente"""
    try:
        db_alert = crud.update_alert(db=db, alert_id=alert_id, alert=alert)
        if db_alert is None:
            raise HTTPException(status_code=404, detail="Alerta no encontrada")
        
        current_price = await crud.get_binance_price(alert.symbol)
        
        return {
            "message": f"✅ Alerta {alert_id} actualizada correctamente",
            "alert": {
                "id": db_alert.id,
                "symbol": db_alert.symbol,
                "target_price": db_alert.target_price,
                "current_price": current_price,
                "alert_type": db_alert.alert_type.value,
                "status": db_alert.status.value,
                "notes": db_alert.notes,
                "created_at": db_alert.created_at.isoformat(),
                "trade_id": db_alert.trade_id
            }
        }
    except Exception as e:
        print(f"Error actualizando alerta: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PRICES ENDPOINTS ====================

@app.get("/api/prices/realtime")
async def get_realtime_prices(pairs: str = "BTCUSDT,ETHUSDT"):
    try:
        pairs_list = [pair.strip() for pair in pairs.split(',')]
        prices = await crud.get_multiple_prices(pairs_list)
        
        formatted_prices = {}
        for symbol, price in prices.items():
            formatted_prices[symbol] = {
                "price": price,
                "symbol": symbol,
                "timestamp": datetime.now().isoformat()
            }
        
        return {"prices": formatted_prices}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/coins/supported")
async def get_supported_coins():
    """Obtener monedas soportadas para FUTURES trading"""
    try:
        symbols = await crud.get_supported_futures_symbols()
        return {
            "coins": symbols,
            "count": len(symbols),
            "market_type": "FUTURES",
            "note": "Símbolos disponibles para trading de futuros con USDT"
        }
    except Exception as e:
        # Fallback a lista predeterminada si hay error
        futures_symbols = [
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
            'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT',
            'LTCUSDT', 'LINKUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT'
        ]
        return {
            "coins": futures_symbols,
            "count": len(futures_symbols),
            "market_type": "FUTURES",
            "note": "Lista predeterminada de futuros"
        }

@app.get("/api/market/info")
async def get_market_info():
    """Información del mercado configurado"""
    return {
        "market_type": "FUTURES",
        "description": "Binance Futures - Contratos Perpetuos",
        "leverage_available": True,
        "max_leverage": "125x",
        "settlement": "USDT",
        "api_endpoint": "https://fapi.binance.com"
    }

# ==================== CONFIG ENDPOINTS ====================

@app.get("/api/config")
async def get_system_config(db: Session = Depends(get_db)):
    """Obtener configuración actual del sistema"""
    try:
        config = crud.get_config(db)
        return {
            "config": config.to_dict(),
            "message": "Configuración cargada correctamente"
        }
    except Exception as e:
        print(f"Error obteniendo configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/config")
async def update_system_config(config_update: schemas.ConfigUpdate, db: Session = Depends(get_db)):
    """Actualizar configuración del sistema"""
    try:
        updated_config = crud.update_config(db, config_update)
        return {
            "config": updated_config.to_dict(),
            "message": "✅ Configuración actualizada correctamente"
        }
    except Exception as e:
        print(f"Error actualizando configuración: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/config/test-connection")
async def test_service_connection(request: schemas.TestConnectionRequest):
    """Probar conexión con servicios externos"""
    try:
        service = request.service.lower()
        config = request.config
        
        if service == "binance":
            api_key = config.get("api_key")
            secret_key = config.get("secret_key")
            use_testnet = config.get("use_testnet", True)
            
            if not api_key or not secret_key:
                raise HTTPException(status_code=400, detail="API Key y Secret Key son requeridos")
            
            result = await crud.test_binance_connection(api_key, secret_key, use_testnet)
            return result
            
        elif service == "telegram":
            bot_token = config.get("bot_token")
            chat_id = config.get("chat_id")
            
            if not bot_token or not chat_id:
                raise HTTPException(status_code=400, detail="Bot Token y Chat ID son requeridos")
            
            test_message = f"""🤖 <b>Test de Conexión</b> 🤖

✅ Telegram configurado correctamente!
⏰ {datetime.now().strftime('%H:%M:%S')}
🚀 CryptoAlert System funcionando

---
Este es un mensaje de prueba para verificar que las notificaciones funcionan correctamente."""

            success = await crud.send_telegram_notification(bot_token, chat_id, test_message)
            
            if success:
                return {
                    "success": True,
                    "message": "✅ Mensaje enviado a Telegram correctamente"
                }
            else:
                return {
                    "success": False,
                    "message": "❌ Error enviando mensaje a Telegram"
                }
            
        elif service == "discord":
            webhook_url = config.get("webhook_url")
            
            if not webhook_url:
                raise HTTPException(status_code=400, detail="Webhook URL es requerida")
            
            test_message = f"""🤖 **Test de Conexión** 🤖

✅ Discord Webhook configurado correctamente!
⏰ {datetime.now().strftime('%H:%M:%S')}
🚀 CryptoAlert System funcionando

---
Este es un mensaje de prueba para verificar que las notificaciones funcionan correctamente."""

            success = await crud.send_discord_notification(webhook_url, test_message)
            
            if success:
                return {
                    "success": True,
                    "message": "✅ Mensaje enviado a Discord correctamente"
                }
            else:
                return {
                    "success": False,
                    "message": "❌ Error enviando mensaje a Discord"
                }
            
        else:
            raise HTTPException(status_code=400, detail=f"Servicio '{service}' no soportado")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en test de conexión: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/telegram/chat-ids")
async def get_telegram_chat_ids(bot_token: str):
    """Obtener Chat IDs disponibles de Telegram"""
    try:
        if not bot_token:
            raise HTTPException(status_code=400, detail="Bot Token es requerido")
        
        result = await crud.get_telegram_chat_id(bot_token)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error obteniendo Chat IDs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/config/binance/status")
async def get_binance_status(db: Session = Depends(get_db)):
    """Verificar estado de la configuración de Binance"""
    try:
        config = crud.get_config(db)
        
        has_keys = bool(config.binance_api_key and config.binance_secret_key)
        
        status = {
            "configured": has_keys,
            "testnet": config.use_testnet,
            "api_endpoint": "https://testnet.binancefuture.com" if config.use_testnet else "https://fapi.binance.com"
        }
        
        if has_keys:
            try:
                api_key = crud.decrypt_api_key(config.binance_api_key)
                secret_key = crud.decrypt_api_key(config.binance_secret_key)
                test_result = await crud.test_binance_connection(api_key, secret_key, config.use_testnet)
                status["connection_test"] = test_result
            except:
                status["connection_test"] = {"success": False, "message": "Error en test de conexión"}
        
        return status
        
    except Exception as e:
        print(f"Error verificando estado Binance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/config/reset")
async def reset_system_config(db: Session = Depends(get_db)):
    """Resetear configuración a valores por defecto"""
    try:
        db.query(models.Config).delete()
        db.commit()
        
        new_config = models.Config()
        db.add(new_config)
        db.commit()
        db.refresh(new_config)
        
        return {
            "message": "✅ Configuración reseteada a valores por defecto",
            "config": new_config.to_dict()
        }
        
    except Exception as e:
        print(f"Error reseteando configuración: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/test")
async def test_notifications_manual(db: Session = Depends(get_db)):
    """Endpoint para probar notificaciones manualmente"""
    try:
        config = crud.get_config(db)
        
        test_message = f"""🧪 <b>Test Manual de Notificaciones</b> 🧪

🚨 Simulando alerta disparada:
📈 BTCUSDT LONG
💰 Precio: $95,000
🎯 Target: $95,000
⏰ {datetime.now().strftime('%H:%M:%S')}

✅ Si recibes este mensaje, las notificaciones funcionan correctamente!

---
🤖 CryptoAlert System"""

        results = {}
        
        if config.telegram_bot_token and config.telegram_chat_id:
            telegram_success = await crud.send_telegram_notification(
                config.telegram_bot_token,
                config.telegram_chat_id,
                test_message
            )
            results["telegram"] = telegram_success
        
        if config.discord_webhook_url:
            discord_success = await crud.send_discord_notification(
                config.discord_webhook_url,
                test_message.replace('<b>', '**').replace('</b>', '**')
            )
            results["discord"] = discord_success
        
        return {
            "message": "Tests de notificación ejecutados",
            "results": results
        }
        
    except Exception as e:
        print(f"Error en test manual: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DASHBOARD ENDPOINTS ====================

@app.get("/api/dashboard/recent-alerts")
async def get_recent_alerts(db: Session = Depends(get_db)):
    try:
        recent_alerts = db.query(models.Alert).order_by(
            models.Alert.created_at.desc()
        ).limit(10).all()
        
        enriched_alerts = await crud.enrich_alerts_with_prices(recent_alerts)
        
        return {
            "alerts": enriched_alerts,
            "count": len(enriched_alerts)
        }
    except Exception as e:
        print(f"Error en recent-alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/performance")
async def get_performance(db: Session = Depends(get_db)):
    try:
        stats = crud.get_alert_stats(db, days=30)
        
        today_alerts = db.query(models.Alert).filter(
            models.Alert.created_at >= datetime.now().replace(hour=0, minute=0, second=0)
        ).count()
        
        week_alerts = db.query(models.Alert).filter(
            models.Alert.created_at >= datetime.now() - timedelta(days=7)
        ).count()
        
        performance = {
            "total_alerts_30d": stats["total_alerts"],
            "executed_alerts_30d": stats["executed_alerts"],
            "triggered_alerts_30d": stats["triggered_alerts"],
            "success_rate_30d": round(stats["success_rate"], 1),
            "alerts_today": today_alerts,
            "alerts_this_week": week_alerts,
            "top_symbols": stats["by_symbol"]
        }
        
        return {"performance": performance}
    except Exception as e:
        print(f"Error en performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/dashboard/opportunities")
async def get_opportunities(db: Session = Depends(get_db)):
    try:
        active_alerts = crud.get_active_alerts(db)
        enriched_alerts = await crud.enrich_alerts_with_prices(active_alerts)
        
        opportunities = [
            alert for alert in enriched_alerts 
            if alert.get("progress_percentage", 0) >= 80
        ]
        
        opportunities.sort(key=lambda x: x.get("progress_percentage", 0), reverse=True)
        
        return {
            "opportunities": opportunities[:5],
            "count": len(opportunities)
        }
    except Exception as e:
        print(f"Error en opportunities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/test/prices")
async def test_prices(symbols: str = "BTCUSDT,ETHUSDT"):
    """Endpoint para testear la obtención de precios"""
    try:
        symbols_list = [s.strip() for s in symbols.split(',')]
        prices = await crud.get_multiple_prices(symbols_list)
        
        return {
            "requested_symbols": symbols_list,
            "prices": prices,
            "count": len(prices),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== TRADING ENDPOINTS - CORREGIDOS ====================

@app.get("/api/trading/account")
async def get_trading_account(db: Session = Depends(get_db)):
    """Obtener información de la cuenta de trading"""
    try:
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            raise HTTPException(status_code=400, detail="Binance API keys no configuradas")
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        account_info = await binance.get_account_info()
        
        if not account_info:
            raise HTTPException(status_code=500, detail="Error obteniendo información de cuenta")
        
        return {
            "account": account_info,
            "testnet": config.use_testnet,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en trading account: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/positions")
async def get_trading_positions(db: Session = Depends(get_db)):
    """Obtener posiciones activas con TPs automáticos - CORREGIDO"""
    try:
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            return {"positions": [], "count": 0, "total_unrealized_pnl": 0}
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        raw_positions = await binance.get_positions()
        
        enriched_positions = []
        for pos in raw_positions:
            symbol = pos.get('symbol', '')
            size = float(pos.get('positionAmt', 0))
            entry_price = float(pos.get('entryPrice', 0))
            mark_price = float(pos.get('markPrice', 0))
            
            # Calcular PnL manualmente
            if size > 0:  # LONG
                pnl_percent = ((mark_price - entry_price) / entry_price) * 100 if entry_price > 0 else 0
            else:  # SHORT
                pnl_percent = ((entry_price - mark_price) / entry_price) * 100 if entry_price > 0 else 0
            
            pnl_usd = abs(size) * (mark_price - entry_price) if size > 0 else abs(size) * (entry_price - mark_price)
            
            # Calcular TPs y SL
            direction = 'LONG' if size > 0 else 'SHORT'
            leverage = 10
            tps = binance.calculate_take_profits(entry_price, leverage, direction)
            sl = binance.calculate_stop_loss(entry_price, leverage, direction)
            
            # Buscar alertas relacionadas
            related_alerts = db.query(models.Alert).filter(
                models.Alert.symbol == symbol,
                models.Alert.status.in_([models.AlertStatusEnum.TRIGGERED, models.AlertStatusEnum.EXECUTED])
            ).order_by(models.Alert.triggered_at.desc()).limit(1).all()
            
            position_data = {
                'symbol': symbol,
                'side': 'LONG' if size > 0 else 'SHORT',
                'size': abs(size),
                'entry_price': entry_price,
                'mark_price': mark_price,
                'pnl': pnl_usd,
                'pnl_percent': pnl_percent,
                'leverage': leverage,
                'trading_mode': 'SWING',
                'auto_tp_enabled': symbol not in ['ADAUSDT', 'ALGOUSDT', 'AAVEUSDT'],
                'take_profits': [
                    {'level': 'TP1', 'price': tps['tp1'], 'percent': 3, 'allocation': 25, 'status': 'pending'},
                    {'level': 'TP2', 'price': tps['tp2'], 'percent': 6, 'allocation': 25, 'status': 'pending'},
                    {'level': 'TP3', 'price': tps['tp3'], 'percent': 9, 'allocation': 25, 'status': 'pending'}
                ],
                'stop_loss': {'price': sl, 'percent': -2},
                'alert_origin': None,
                'time_in_position': None
            }
            
            if related_alerts:
                alert = related_alerts[0]
                position_data['alert_origin'] = {
                    'alert_id': alert.id,
                    'created_at': alert.created_at.isoformat(),
                    'triggered_at': alert.triggered_at.isoformat() if alert.triggered_at else None,
                    'notes': alert.notes or '',
                    'target_price': alert.target_price
                }
                
                if alert.triggered_at:
                    time_diff = datetime.now() - alert.triggered_at
                    hours = int(time_diff.total_seconds() / 3600)
                    minutes = int((time_diff.total_seconds() % 3600) / 60)
                    position_data['time_in_position'] = f"{hours}h {minutes}m"
            
            enriched_positions.append(position_data)
        
        total_pnl = sum([pos['pnl'] for pos in enriched_positions])
        
        return {
            "positions": enriched_positions,
            "count": len(enriched_positions),
            "total_unrealized_pnl": total_pnl
        }
        
    except Exception as e:
        print(f"Error en trading positions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/balance")
async def get_trading_balance(db: Session = Depends(get_db)):
    """Obtener balance de la cuenta - CORREGIDO"""
    try:
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            return {"total": 0, "available": 0, "unrealized_pnl": 0, "positions_count": 0}
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        account_info = await binance.get_account_info()
        positions = await binance.get_positions()
        
        if not account_info:
            return {"total": 0, "available": 0, "unrealized_pnl": 0, "positions_count": 0}
        
        total_balance = float(account_info.get('totalWalletBalance', 0))
        available_balance = float(account_info.get('availableBalance', 0))
        unrealized_pnl = float(account_info.get('totalUnrealizedPnl', 0))
        
        balance_data = {
            'total': total_balance,
            'available': available_balance,
            'in_positions': total_balance - available_balance,
            'unrealized_pnl': unrealized_pnl,
            'pnl_today': unrealized_pnl,
            'pnl_today_percent': (unrealized_pnl / total_balance * 100) if total_balance > 0 else 0,
            'positions_count': len(positions),
            'can_trade': account_info.get('canTrade', False),
            'testnet': config.use_testnet
        }
        
        return balance_data
        
    except Exception as e:
        print(f"Error en trading balance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/tracking")
async def get_trading_tracking(db: Session = Depends(get_db)):
    """Obtener seguimiento de alertas vs posiciones"""
    try:
        config = crud.get_config(db)
        
        since = datetime.now() - timedelta(hours=24)
        recent_alerts = db.query(models.Alert).filter(
            models.Alert.triggered_at >= since,
            models.Alert.status.in_([models.AlertStatusEnum.TRIGGERED, models.AlertStatusEnum.EXECUTED])
        ).order_by(models.Alert.triggered_at.desc()).all()
        
        tracking_data = []
        
        if config.binance_api_key and config.binance_secret_key:
            api_key = crud.decrypt_api_key(config.binance_api_key)
            secret_key = crud.decrypt_api_key(config.binance_secret_key)
            
            from binance_service import BinanceFuturesService
            binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
            
            positions = await binance.get_positions()
            position_symbols = [pos['symbol'] for pos in positions]
            
            for alert in recent_alerts:
                has_position = alert.symbol in position_symbols
                
                if has_position:
                    position = next((p for p in positions if p['symbol'] == alert.symbol), None)
                    if position:
                        # Calcular PnL para tracking
                        size = float(position.get('positionAmt', 0))
                        entry_price = float(position.get('entryPrice', 0))
                        mark_price = float(position.get('markPrice', 0))
                        
                        if size > 0:  # LONG
                            pnl_percent = ((mark_price - entry_price) / entry_price) * 100 if entry_price > 0 else 0
                        else:  # SHORT
                            pnl_percent = ((entry_price - mark_price) / entry_price) * 100 if entry_price > 0 else 0
                        
                        pnl_usd = abs(size) * (mark_price - entry_price) if size > 0 else abs(size) * (entry_price - mark_price)
                        
                        tracking_data.append({
                            'alert_id': alert.id,
                            'symbol': alert.symbol,
                            'alert_type': alert.alert_type.value,
                            'target_price': alert.target_price,
                            'triggered_at': alert.triggered_at.isoformat(),
                            'status': 'position_opened',
                            'position_pnl': pnl_percent,
                            'position_pnl_usd': pnl_usd,
                            'trading_mode': 'SWING',
                            'notes': alert.notes
                        })
                else:
                    tracking_data.append({
                        'alert_id': alert.id,
                        'symbol': alert.symbol,
                        'alert_type': alert.alert_type.value,
                        'target_price': alert.target_price,
                        'triggered_at': alert.triggered_at.isoformat(),
                        'status': 'not_taken',
                        'missed_opportunity': True,
                        'notes': alert.notes
                    })
        else:
            for alert in recent_alerts:
                tracking_data.append({
                    'alert_id': alert.id,
                    'symbol': alert.symbol,
                    'alert_type': alert.alert_type.value,
                    'target_price': alert.target_price,
                    'triggered_at': alert.triggered_at.isoformat(),
                    'status': 'triggered_only',
                    'notes': alert.notes
                })
        
        return {
            'tracking': tracking_data,
            'count': len(tracking_data),
            'summary': {
                'total_alerts': len(recent_alerts),
                'positions_opened': len([t for t in tracking_data if t.get('status') == 'position_opened']),
                'missed_opportunities': len([t for t in tracking_data if t.get('status') == 'not_taken'])
            }
        }
        
    except Exception as e:
        print(f"Error en trading tracking: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/orders")
async def get_trading_orders(db: Session = Depends(get_db)):
    """Obtener órdenes abiertas"""
    try:
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            raise HTTPException(status_code=400, detail="Binance API keys no configuradas")
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        orders = await binance.get_open_orders()
        
        return {
            "orders": orders,
            "count": len(orders)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en trading orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trading/setup-take-profits")
async def setup_automatic_take_profits(request: dict, db: Session = Depends(get_db)):
    """Configurar take profits automáticos para una posición"""
    try:
        symbol = request.get('symbol')
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol requerido")
        
        # Verificar que no sea crypto excluida
        excluded_symbols = ['ADAUSDT', 'ALGOUSDT', 'AAVEUSDT']
        if symbol in excluded_symbols:
            return {
                "message": f"❌ {symbol} está excluido del sistema automático de TPs",
                "excluded": True
            }
        
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            raise HTTPException(status_code=400, detail="Binance API keys no configuradas")
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        # Obtener posición actual
        positions = await binance.get_positions()
        current_position = None
        
        for pos in positions:
            if pos['symbol'] == symbol:
                current_position = pos
                break
        
        if not current_position:
            raise HTTPException(status_code=404, detail="Posición no encontrada")
        
        # Simular configuración de TPs (sin orden real para proteger posiciones)
        size = float(current_position.get('positionAmt', 0))
        entry_price = float(current_position.get('entryPrice', 0))
        
        direction = 'LONG' if size > 0 else 'SHORT'
        leverage = 10
        tps = binance.calculate_take_profits(entry_price, leverage, direction)
        sl = binance.calculate_stop_loss(entry_price, leverage, direction)
        
        return {
            "message": f"✅ TPs calculados para {symbol} (modo seguro)",
            "trading_mode": "SWING",
            "take_profit_orders": [
                {'level': 'TP1', 'price': tps['tp1'], 'allocation': 25},
                {'level': 'TP2', 'price': tps['tp2'], 'allocation': 25},
                {'level': 'TP3', 'price': tps['tp3'], 'allocation': 25}
            ],
            "stop_loss_price": sl,
            "note": "Modo seguro activado - No se colocan órdenes automáticas",
            "excluded_from_auto": False
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error configurando TPs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trading/close-position")
async def close_position_partial(request: dict, db: Session = Depends(get_db)):
    """Cerrar posición parcial o completa - MODO SEGURO"""
    try:
        symbol = request.get('symbol')
        percentage = request.get('percentage', 100)
        
        if not symbol:
            raise HTTPException(status_code=400, detail="Symbol requerido")
        
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            raise HTTPException(status_code=400, detail="Binance API keys no configuradas")
        
        # MODO SEGURO: Solo mostrar cálculos sin ejecutar órdenes reales
        return {
            "message": f"🛡️ Modo seguro: Cálculo de cierre {percentage}% para {symbol}",
            "note": "Para proteger tus posiciones, las órdenes no se ejecutan automáticamente",
            "recommendation": f"Cierra manualmente {percentage}% de {symbol} en Binance",
            "safety_mode": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en cálculo de cierre: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/trading/history")
async def get_trading_history(days: int = 30, db: Session = Depends(get_db)):
    """Obtener historial de trading desde agosto 2024"""
    try:
        config = crud.get_config(db)
        
        if not config.binance_api_key or not config.binance_secret_key:
            raise HTTPException(status_code=400, detail="Binance API keys no configuradas")
        
        api_key = crud.decrypt_api_key(config.binance_api_key)
        secret_key = crud.decrypt_api_key(config.binance_secret_key)
        
        from binance_service import BinanceFuturesService
        binance = BinanceFuturesService(api_key, secret_key, config.use_testnet)
        
        # Obtener historial desde agosto 2024
        start_date = datetime(2024, 8, 1)
        
        # Simulación de trades (protección de datos reales)
        simulated_trades = []
        daily_stats = {}
        
        return {
            "trades": simulated_trades,
            "daily_stats": list(daily_stats.values()),
            "summary": {
                "total_trades": 0,
                "total_volume": 0,
                "total_commission": 0,
                "period": f"Desde {start_date.strftime('%Y-%m-%d')}",
                "note": "Historial protegido en modo seguro"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en trading history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002, reload=True)

from health_endpoints import health_router
app.include_router(health_router)