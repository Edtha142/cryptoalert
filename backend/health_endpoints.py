# backend/health_endpoints.py - CORREGIDO
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psutil
import time
from datetime import datetime
from typing import Dict, Any
import asyncio

health_router = APIRouter()

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"
    uptime_seconds: float
    system: Dict[str, Any]

class SystemStatus(BaseModel):
    database: str
    redis: str
    binance_api: str
    system_load: Dict[str, float]

# Variable global para tracking de uptime
start_time = time.time()

@health_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Endpoint básico de health check para nginx y ngrok"""
    try:
        uptime = time.time() - start_time
        
        # Información básica del sistema
        system_info = {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent if hasattr(psutil, 'disk_usage') else 0
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=datetime.now(),
            uptime_seconds=uptime,
            system=system_info
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@health_router.get("/api/health", response_model=HealthResponse)
async def api_health_check():
    """Health check específico para la API"""
    return await health_check()

@health_router.get("/status", response_model=SystemStatus)
async def detailed_status():
    """Status detallado de todos los componentes del sistema"""
    status = SystemStatus(
        database="unknown",
        redis="unknown", 
        binance_api="unknown",
        system_load={
            "cpu": psutil.cpu_percent(interval=1),
            "memory": psutil.virtual_memory().percent,
            "connections": len(psutil.net_connections())
        }
    )
    
    # Verificar base de datos
    try:
        from database import get_db
        db = next(get_db())
        # Hacer una query simple
        result = db.execute("SELECT 1").fetchone()
        status.database = "healthy" if result else "unhealthy"
        db.close()
    except Exception as e:
        status.database = f"error: {str(e)[:50]}"
    
    # Verificar Redis
    try:
        import redis
        r = redis.Redis(host='redis', port=6379, decode_responses=True)
        r.ping()
        status.redis = "healthy"
    except Exception as e:
        status.redis = f"error: {str(e)[:50]}"
    
    # Verificar Binance API
    try:
        from binance_service import test_connection
        if await test_connection():
            status.binance_api = "healthy"
        else:
            status.binance_api = "connection_failed"
    except Exception as e:
        status.binance_api = f"error: {str(e)[:50]}"
    
    return status

@health_router.get("/api/system/stats")
async def system_statistics():
    """Estadísticas del sistema para el dashboard"""
    try:
        from crud import get_alert_statistics, get_position_summary
        from database import get_db
        
        db = next(get_db())
        
        # Obtener estadísticas de alertas
        alert_stats = await get_alert_statistics(db)
        
        # Obtener resumen de posiciones
        position_stats = await get_position_summary(db)
        
        # Información del sistema
        system_info = {
            "uptime_seconds": time.time() - start_time,
            "cpu_usage": psutil.cpu_percent(),
            "memory_usage": psutil.virtual_memory().percent,
            "active_connections": len(psutil.net_connections()),
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "alerts": alert_stats,
            "positions": position_stats,
            "system": system_info,
            "status": "operational"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")

# MIDDLEWARE REMOVIDO - Los APIRouter no pueden tener middleware
# Si necesitas logging, agrégalo en main.py usando @app.middleware("http")