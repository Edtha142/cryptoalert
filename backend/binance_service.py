import os
import aiohttp
import asyncio
import hmac
import hashlib
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class BinanceFuturesService:
    def __init__(self, api_key: str = None, secret_key: str = None, testnet: bool = True):
        # Cargar desde variables de entorno si no se proporcionan
        self.api_key = api_key or os.getenv('BINANCE_API_KEY', '')
        self.secret_key = secret_key or os.getenv('BINANCE_SECRET_KEY', '') or os.getenv('BINANCE_SECRET', '')
        self.testnet = testnet or os.getenv('BINANCE_TESTNET', 'true').lower() == 'true'
        
        # URLs para FUTURES
        if self.testnet:
            self.base_url = 'https://testnet.binancefuture.com'
        else:
            self.base_url = 'https://fapi.binance.com'
            
        self.price_url = f'{self.base_url}/fapi/v1/ticker/price'
        self.exchange_info_url = f'{self.base_url}/fapi/v1/exchangeInfo'
        
        # Símbolos excluidos
        self.excluded_symbols = ['ADA', 'ALGO', 'AAVE']
        
        # Modos de trading por apalancamiento
        self.trading_modes = {
            range(1, 11): 'Conservative',
            range(11, 26): 'Moderate', 
            range(26, 51): 'Aggressive',
            range(51, 101): 'Extreme',
            range(101, 126): 'Degen'
        }

    def _generate_signature(self, query_string: str) -> str:
        return hmac.new(
            self.secret_key.encode('utf-8'),
            query_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    async def get_account_info(self):
        if not self.api_key or not self.secret_key:
            print('Error obteniendo info de cuenta: Secret key requerida para operaciones autenticadas')
            return None
            
        try:
            timestamp = int(time.time() * 1000)
            query_string = f'timestamp={timestamp}'
            signature = self._generate_signature(query_string)
            
            url = f'{self.base_url}/fapi/v2/account?{query_string}&signature={signature}'
            headers = {'X-MBX-APIKEY': self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        error_text = await response.text()
                        print(f'Binance API error {response.status}: {error_text}')
                        return None
        except Exception as e:
            print(f'Error obteniendo info de cuenta: {e}')
            return None

    async def get_positions(self):
        if not self.api_key or not self.secret_key:
            print('Error obteniendo posiciones: Secret key requerida para operaciones autenticadas')
            return []
            
        try:
            timestamp = int(time.time() * 1000)
            query_string = f'timestamp={timestamp}'
            signature = self._generate_signature(query_string)
            
            url = f'{self.base_url}/fapi/v2/positionRisk?{query_string}&signature={signature}'
            headers = {'X-MBX-APIKEY': self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        positions = await response.json()
                        return [pos for pos in positions if float(pos['positionAmt']) != 0]
                    else:
                        error_text = await response.text()
                        print(f'Binance API error {response.status}: {error_text}')
                        return []
        except Exception as e:
            print(f'Error obteniendo posiciones: {e}')
            return []

    async def get_price(self, symbol: str):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f'{self.price_url}?symbol={symbol}') as response:
                    if response.status == 200:
                        data = await response.json()
                        return float(data['price'])
                    return None
        except Exception as e:
            print(f'Error obteniendo precio para {symbol}: {e}')
            return None

    async def get_multiple_prices(self, symbols: List[str]):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.price_url) as response:
                    if response.status == 200:
                        all_prices = await response.json()
                        return {item['symbol']: float(item['price']) for item in all_prices if item['symbol'] in symbols}
                    return {}
        except Exception as e:
            print(f'Error obteniendo precios múltiples: {e}')
            return {}

    async def get_futures_symbols(self):
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.exchange_info_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        symbols = []
                        for symbol_info in data['symbols']:
                            if (symbol_info['status'] == 'TRADING' and 
                                symbol_info['contractType'] == 'PERPETUAL' and
                                symbol_info['quoteAsset'] == 'USDT'):
                                base_asset = symbol_info['baseAsset']
                                if base_asset not in self.excluded_symbols:
                                    symbols.append(symbol_info['symbol'])
                        return sorted(symbols)
                    return []
        except Exception as e:
            print(f'Error obteniendo símbolos: {e}')
            return []

    def calculate_take_profits(self, entry_price: float, leverage: int, direction: str = 'LONG'):
        multiplier = 1 if direction == 'LONG' else -1
        
        if leverage <= 10:
            tp1 = entry_price * (1 + multiplier * 0.03)
            tp2 = entry_price * (1 + multiplier * 0.06)
            tp3 = entry_price * (1 + multiplier * 0.09)
        elif leverage <= 25:
            tp1 = entry_price * (1 + multiplier * 0.02)
            tp2 = entry_price * (1 + multiplier * 0.04)
            tp3 = entry_price * (1 + multiplier * 0.06)
        elif leverage <= 50:
            tp1 = entry_price * (1 + multiplier * 0.015)
            tp2 = entry_price * (1 + multiplier * 0.03)
            tp3 = entry_price * (1 + multiplier * 0.045)
        else:
            tp1 = entry_price * (1 + multiplier * 0.01)
            tp2 = entry_price * (1 + multiplier * 0.02)
            tp3 = entry_price * (1 + multiplier * 0.03)
        
        return {
            'tp1': round(tp1, 8),
            'tp2': round(tp2, 8), 
            'tp3': round(tp3, 8)
        }

    def calculate_stop_loss(self, entry_price: float, leverage: int, direction: str = 'LONG'):
        multiplier = -1 if direction == 'LONG' else 1
        risk_percentage = min(0.02, 1 / leverage)
        stop_loss = entry_price * (1 + multiplier * risk_percentage)
        return round(stop_loss, 8)

    def get_trading_mode_by_leverage(self, leverage: int):
        for range_obj, mode in self.trading_modes.items():
            if leverage in range_obj:
                return mode
        return 'Unknown'

# Función para uso global
binance_futures = BinanceFuturesService()
