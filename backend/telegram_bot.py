# backend/telegram_bot.py - ACTUALIZACIÓN PARA USAR PUERTO 8080

import requests
import json
import subprocess
import time
import logging
from typing import Optional

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NgrokManager:
    def __init__(self):
        self.api_url = "http://localhost:4040/api/tunnels"
        self.target_port = 8080  # CAMBIADO DE 8077 A 8080
        
    def get_active_tunnel(self) -> Optional[str]:
        """Obtiene la URL del túnel activo de ngrok"""
        try:
            response = requests.get(self.api_url, timeout=5)
            response.raise_for_status()
            
            tunnels = response.json().get('tunnels', [])
            
            # Buscar túnel que apunte al puerto correcto
            for tunnel in tunnels:
                config = tunnel.get('config', {})
                if config.get('addr') == f'http://localhost:{self.target_port}':
                    public_url = tunnel.get('public_url')
                    if public_url and 'https' in public_url:
                        return public_url
                        
            logger.warning(f"No se encontró túnel activo para el puerto {self.target_port}")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Error conectando con ngrok API: {e}")
            return None
        except Exception as e:
            logger.error(f"Error inesperado: {e}")
            return None
    
    def start_ngrok(self) -> bool:
        """Inicia ngrok en el puerto configurado"""
        try:
            logger.info(f"Iniciando ngrok en puerto {self.target_port}...")
            
            # Matar procesos ngrok existentes
            subprocess.run(['pkill', '-f', 'ngrok'], stderr=subprocess.DEVNULL)
            time.sleep(2)
            
            # Iniciar nuevo túnel
            cmd = ['ngrok', 'http', str(self.target_port), '--log=stdout']
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Esperar a que ngrok se inicie
            time.sleep(5)
            
            # Verificar que se inició correctamente
            if process.poll() is None:  # Proceso aún corriendo
                logger.info("✅ Ngrok iniciado correctamente")
                return True
            else:
                logger.error("❌ Error al iniciar ngrok")
                return False
                
        except Exception as e:
            logger.error(f"Error iniciando ngrok: {e}")
            return False
    
    def get_system_status(self) -> dict:
        """Obtiene el estado del sistema"""
        status = {
            'ngrok_running': False,
            'tunnel_url': None,
            'system_accessible': False,
            'backend_healthy': False,
            'frontend_healthy': False
        }
        
        try:
            # Verificar ngrok
            tunnel_url = self.get_active_tunnel()
            if tunnel_url:
                status['ngrok_running'] = True
                status['tunnel_url'] = tunnel_url
                
                # Verificar accesibilidad del sistema
                try:
                    health_response = requests.get(f"{tunnel_url}/health", timeout=10)
                    status['system_accessible'] = health_response.status_code == 200
                    status['frontend_healthy'] = True
                except:
                    pass
                
                # Verificar backend
                try:
                    api_response = requests.get(f"{tunnel_url}/api/health", timeout=10)
                    status['backend_healthy'] = api_response.status_code == 200
                except:
                    pass
            
        except Exception as e:
            logger.error(f"Error verificando estado del sistema: {e}")
        
        return status

class TelegramBot:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id
        self.base_url = f"https://api.telegram.org/bot{token}"
        self.ngrok_manager = NgrokManager()
        
    def send_message(self, message: str, parse_mode: str = "HTML") -> bool:
        """Envía un mensaje a Telegram"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': self.chat_id,
                'text': message,
                'parse_mode': parse_mode
            }
            
            response = requests.post(url, json=data, timeout=10)
            response.raise_for_status()
            
            logger.info("✅ Mensaje enviado a Telegram")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error enviando mensaje a Telegram: {e}")
            return False
    
    def send_startup_notification(self):
        """Envía notificación de inicio del sistema"""
        message = """
🚀 <b>CryptoAlert System - INICIANDO</b>

⚙️ <b>Estado:</b> Configurando servicios...
🔄 <b>Puerto:</b> 8080 (Configuración unificada)
⏳ <b>Tiempo estimado:</b> 30-60 segundos

<i>Te notificaré cuando esté listo.</i>
        """
        
        return self.send_message(message)
    
    def send_system_ready(self):
        """Envía notificación cuando el sistema está listo"""
        status = self.ngrok_manager.get_system_status()
        
        if status['tunnel_url']:
            # Sistema accesible
            message = f"""
🎉 <b>¡CryptoAlert System LISTO!</b>

🌐 <b>URL:</b> {status['tunnel_url']}
✅ <b>Frontend:</b> {'Funcionando' if status['frontend_healthy'] else 'Con problemas'}
✅ <b>Backend API:</b> {'Funcionando' if status['backend_healthy'] else 'Con problemas'}
🔗 <b>Proxy:</b> Nginx configurado correctamente

📱 <b>Páginas disponibles:</b>
• Dashboard: {status['tunnel_url']}
• Alertas: {status['tunnel_url']}/alerts
• Trading: {status['tunnel_url']}/trading
• Configuración: {status['tunnel_url']}/settings

<b>¡Sistema listo para usar! 🚀</b>
            """
        else:
            # Error con ngrok
            message = """
⚠️ <b>CryptoAlert System - PROBLEMA</b>

❌ <b>Error:</b> No se pudo establecer túnel ngrok
🔧 <b>Estado del sistema:</b> Funcionando localmente
🌐 <b>Puerto local:</b> 8080

<b>Acciones sugeridas:</b>
1. Verificar que ngrok esté instalado
2. Revisar conexión a internet
3. Intentar reiniciar manualmente: <code>ngrok http 8080</code>

<i>El sistema funciona en localhost:8080</i>
            """
        
        return self.send_message(message)
    
    def send_error_notification(self, error: str):
        """Envía notificación de error"""
        message = f"""
🚨 <b>CryptoAlert System - ERROR</b>

❌ <b>Error:</b> {error}
🕐 <b>Hora:</b> {time.strftime('%H:%M:%S')}

<b>Acciones automáticas:</b>
• Intentando reiniciar servicios...
• Reestableciendo conexiones...

<i>Te notificaré cuando se resuelva.</i>
        """
        
        return self.send_message(message)
    
    def monitor_and_notify(self):
        """Monitorea el sistema y envía notificaciones"""
        logger.info("🤖 Iniciando monitoreo del sistema...")
        
        # Notificación de inicio
        self.send_startup_notification()
        
        # Esperar a que los servicios se inicien
        time.sleep(30)
        
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            logger.info(f"🔍 Verificando sistema (intento {attempt}/{max_attempts})...")
            
            status = self.ngrok_manager.get_system_status()
            
            if status['tunnel_url'] and status['system_accessible']:
                # Sistema funcionando correctamente
                self.send_system_ready()
                logger.info("✅ Sistema funcionando - Notificación enviada")
                return True
            
            elif not status['ngrok_running']:
                # Ngrok no está corriendo, intentar iniciarlo
                logger.info("🔄 Ngrok no detectado, intentando iniciar...")
                if self.ngrok_manager.start_ngrok():
                    time.sleep(10)  # Dar tiempo para que se establezca
                    continue
                else:
                    logger.error("❌ No se pudo iniciar ngrok")
            
            # Esperar antes del siguiente intento
            time.sleep(10)
        
        # Si llegamos aquí, hubo problemas
        self.send_error_notification("No se pudo establecer conexión después de múltiples intentos")
        logger.error("❌ Sistema no pudo iniciarse correctamente")
        return False

def main():
    """Función principal para usar el bot"""
    import os
    from dotenv import load_dotenv
    
    # Cargar variables de entorno
    load_dotenv()
    
    token = os.getenv('TELEGRAM_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if not token or not chat_id:
        logger.error("❌ TELEGRAM_TOKEN y TELEGRAM_CHAT_ID deben estar configurados en .env")
        return False
    
    # Crear instancia del bot
    bot = TelegramBot(token, chat_id)
    
    # Monitorear y notificar
    return bot.monitor_and_notify()

# Funciones adicionales para integración con el sistema

def send_alert_notification(symbol: str, condition: str, price: float, alert_type: str = "triggered"):
    """Envía notificación cuando se dispara una alerta"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    token = os.getenv('TELEGRAM_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if not token or not chat_id:
        return False
    
    bot = TelegramBot(token, chat_id)
    
    emoji = "🔥" if alert_type == "triggered" else "⚠️"
    
    message = f"""
{emoji} <b>ALERTA {alert_type.upper()}</b>

💰 <b>Símbolo:</b> {symbol}
📊 <b>Condición:</b> {condition}
💵 <b>Precio:</b> ${price:,.4f}
🕐 <b>Hora:</b> {time.strftime('%H:%M:%S')}

<i>Revisa tu dashboard para más detalles.</i>
    """
    
    return bot.send_message(message)

def send_system_stats(stats: dict):
    """Envía estadísticas del sistema"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    token = os.getenv('TELEGRAM_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    
    if not token or not chat_id:
        return False
    
    bot = TelegramBot(token, chat_id)
    
    message = f"""
📊 <b>Estadísticas del Sistema</b>

✅ <b>Alertas Exitosas:</b> {stats.get('successful_alerts', 0)}
📈 <b>Total Alertas:</b> {stats.get('total_alerts', 0)}
🎯 <b>Tasa de Éxito:</b> {stats.get('success_rate', 0):.1f}%
💰 <b>PnL Total:</b> ${stats.get('total_pnl', 0):,.2f}

🕐 <b>Última actualización:</b> {time.strftime('%H:%M:%S')}
    """
    
    return bot.send_message(message)

if __name__ == "__main__":
    main()