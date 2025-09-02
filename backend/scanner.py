"""
Scanner de precios y detector de posiciones
Este archivo se ejecuta como un proceso separado
"""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import crud
import schemas
from binance_service import BinanceService
from notifications import NotificationService
import models

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PriceScanner:
    def __init__(self):
        self.db = SessionLocal()
        self.binance = None
        self.notifier = NotificationService()
        self._initialize_services()
    
    def _initialize_services(self):
        """Inicializa servicios con credenciales de la DB"""
        config = crud.get_config(self.db)
        if config and config.binance_api_key:
            self.binance = BinanceService(
                config.binance_api_key,
                config.binance_secret
            )
            logger.info("Binance service initialized")
    
    async def scan_prices(self):
        """Escanea precios cada 30 segundos"""
        while True:
            try:
                if not self.binance:
                    self._initialize_services()
                    await asyncio.sleep(30)
                    continue
                
                # Obtener alertas activas
                alerts = crud.get_active_alerts(self.db)
                logger.info(f"Scanning {len(alerts)} active alerts")
                
                for alert in alerts:
                    try:
                        # Obtener precio actual
                        current_price = self.binance.get_current_price(alert.symbol)
                        
                        # Actualizar precio en DB
                        alert.current_price = current_price
                        self.db.commit()
                        
                        # Verificar si se alcanzó el target
                        if self._check_alert_triggered(alert, current_price):
                            logger.info(f"Alert triggered: {alert.symbol} at {current_price}")
                            
                            # Enviar notificaciones
                            await self.notifier.send_alert(
                                f"🎯 ALERTA ACTIVADA\n"
                                f"Symbol: {alert.symbol}\n"
                                f"Target: ${alert.target_price}\n"
                                f"Current: ${current_price}\n"
                                f"Type: {alert.alert_type}"
                            )
                            
                            # Actualizar estado
                            crud.update_alert(
                                self.db, 
                                alert.id, 
                                schemas.AlertUpdate(status=schemas.AlertStatus.TRIGGERED)
                            )
                    
                    except Exception as e:
                        logger.error(f"Error scanning alert {alert.id}: {e}")
                
                # Limpiar alertas expiradas
                self._cleanup_expired_alerts()
                
            except Exception as e:
                logger.error(f"Scanner error: {e}")
            
            await asyncio.sleep(30)
    
    async def detect_positions(self):
        """Detecta si se abrió posición después de alerta"""
        while True:
            try:
                if not self.binance:
                    await asyncio.sleep(60)
                    continue
                
                # Obtener alertas disparadas recientemente
                triggered_alerts = crud.get_triggered_alerts(self.db)
                
                if triggered_alerts:
                    logger.info(f"Checking {len(triggered_alerts)} triggered alerts")
                    
                    # Obtener posiciones actuales
                    positions = self.binance.get_futures_positions()
                    
                    for alert in triggered_alerts:
                        # Verificar si hay posición abierta para este símbolo
                        position = self._find_position(positions, alert.symbol)
                        
                        if position:
                            logger.info(f"Position detected for {alert.symbol}")
                            
                            # Actualizar alerta como ejecutada
                            crud.update_alert(
                                self.db,
                                alert.id,
                                schemas.AlertUpdate(status=schemas.AlertStatus.EXECUTED)
                            )
                            
                            # Notificar
                            await self.notifier.send_alert(
                                f"✅ POSICIÓN DETECTADA\n"
                                f"Symbol: {alert.symbol}\n"
                                f"Entry: ${position['entryPrice']}\n"
                                f"Size: {position['positionAmt']}\n"
                                f"Alert #{alert.id} ejecutada con éxito"
                            )
                
            except Exception as e:
                logger.error(f"Position detector error: {e}")
            
            await asyncio.sleep(60)
    
    def _check_alert_triggered(self, alert, current_price):
        """Verifica si una alerta debe ser disparada"""
        if alert.alert_type == "LONG":
            return current_price >= alert.target_price
        else:  # SHORT
            return current_price <= alert.target_price
    
    def _find_position(self, positions, symbol):
        """Busca una posición para un símbolo específico"""
        for pos in positions:
            if pos['symbol'] == symbol and float(pos['positionAmt']) != 0:
                return pos
        return None
    
    def _cleanup_expired_alerts(self):
        """Marca como expiradas las alertas viejas"""
        expired = crud.get_expired_alerts(self.db)
        for alert in expired:
            crud.update_alert(
                self.db,
                alert.id,
                schemas.AlertUpdate(status=schemas.AlertStatus.EXPIRED)
            )
        if expired:
            logger.info(f"Cleaned up {len(expired)} expired alerts")

async def main():
    """Función principal que ejecuta ambos scanners"""
    scanner = PriceScanner()
    
    # Crear tareas asíncronas
    price_task = asyncio.create_task(scanner.scan_prices())
    position_task = asyncio.create_task(scanner.detect_positions())
    
    # Ejecutar ambas tareas
    await asyncio.gather(price_task, position_task)

if __name__ == "__main__":
    logger.info("Starting CryptoAlert Scanner...")
    asyncio.run(main())