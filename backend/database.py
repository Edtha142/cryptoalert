# backend/database.py - CORREGIDO FINAL
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
import time

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://crypto:cryptopass123@db:5432/cryptoalert"
)

print(f"🔌 Conectando a base de datos: {DATABASE_URL}")

# Crear engine
engine = create_engine(DATABASE_URL, echo=False)

# Crear sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Importar Base desde models DESPUÉS de crear engine
# Esto evita import circular
def get_base():
    from models import Base
    return Base

def test_connection():
    """Probar conexión a la base de datos"""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
            return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

def run_migrations():
    """Ejecutar migraciones/crear tablas"""
    try:
        Base = get_base()
        
        # Crear todas las tablas
        Base.metadata.create_all(bind=engine)
        print("✅ Tablas creadas/verificadas")
        
        # Crear configuración por defecto
        create_default_config()
        
        return True
    except Exception as e:
        print(f"❌ Error en migraciones: {e}")
        return False

def create_default_config():
    """Crear configuración por defecto si no existe"""
    try:
        from models import Config
        
        db = SessionLocal()
        
        # Verificar si ya existe configuración
        existing_config = db.query(Config).first()
        
        if not existing_config:
            # Crear configuración por defecto
            default_config = Config(
                use_testnet=True,
                max_positions=5,
                max_daily_loss=-3.0,
                auto_close_profit=10.0,
                default_expiry_hours=24,
                auto_delete_expired=True,
                snooze_duration_minutes=5,
                notify_on_trigger=True,
                notify_on_near_price=True,
                notify_on_expiry=True,
                notify_on_position_detected=True,
                enable_anti_greed=True,
                enable_post_tp1_lock=True,
                enable_psychological_alerts=True,
                enable_sound_notifications=True,
                theme="light",
                animations="smooth",
                sounds_enabled=True,
                number_format="us",
                timezone="UTC-4"
            )
            
            db.add(default_config)
            db.commit()
            print("✅ Configuración por defecto creada")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Error creando configuración por defecto: {e}")

def init_database():
    """Inicializar base de datos"""
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            if test_connection():
                if run_migrations():
                    print("✅ Base de datos inicializada correctamente")
                    return True
                else:
                    print("❌ Error en migraciones")
                    return False
            else:
                retry_count += 1
                print(f"⏳ Reintentando conexión ({retry_count}/{max_retries})...")
                time.sleep(2)
                
        except Exception as e:
            print(f"❌ Error inicializando base de datos: {e}")
            retry_count += 1
            time.sleep(2)
    
    print("❌ No se pudo conectar a la base de datos después de varios intentos")
    return False

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()