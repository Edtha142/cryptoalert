import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  AlertTriangle,
  ExternalLink,
  Eye,
  X,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  Settings,
  Target,
  Shield
} from 'lucide-react';

// Interfaces
interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entry_price: number;
  mark_price: number;
  pnl: number;
  pnl_percent: number;
  leverage: number;
  trading_mode: 'SWING' | 'SCALP' | 'PRUEBA';
  auto_tp_enabled: boolean;
  take_profits: TakeProfit[];
  stop_loss: StopLoss;
  alert_origin?: {
    alert_id: number;
    created_at: string;
    triggered_at: string;
    notes: string;
    target_price: number;
  };
  time_in_position?: string;
}

interface TakeProfit {
  level: string;
  price: number;
  percent: number;
  allocation: number;
  status: 'pending' | 'executed';
}

interface StopLoss {
  price: number;
  percent: number;
}

interface Balance {
  total: number;
  available: number;
  in_positions: number;
  unrealized_pnl: number;
  pnl_today: number;
  pnl_today_percent: number;
  positions_count: number;
  can_trade: boolean;
  testnet: boolean;
}

interface TrackingItem {
  alert_id: number;
  symbol: string;
  alert_type: string;
  target_price: number;
  triggered_at: string;
  status: 'position_opened' | 'not_taken' | 'triggered_only';
  position_pnl?: number;
  position_pnl_usd?: number;
  trading_mode?: string;
  missed_opportunity?: boolean;
  notes?: string;
}

// Hook de toast
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    const toastEl = document.createElement('div');
    toastEl.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md transition-all duration-300 ${
      variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    toastEl.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="font-semibold">${title}</div>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">×</button>
      </div>
      <div class="text-sm mt-1">${description}</div>
    `;
    
    document.body.appendChild(toastEl);
    
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(toastEl)) {
            document.body.removeChild(toastEl);
          }
        }, 300);
      }
    }, 5000);
  }
});

export default function Trading() {
  const [activeSubTab, setActiveSubTab] = useState('positions');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados de datos
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [tracking, setTracking] = useState<TrackingItem[]>([]);
  const [setupLoading, setSetupLoading] = useState<string | null>(null);
  const [closeLoading, setCloseLoading] = useState<string | null>(null);
  
  const { toast } = useToast();
  
  // Configuración del API
  const getApiBaseUrl = () => {
    return '/api';
  };
  
  const API_BASE = getApiBaseUrl();

  // Cargar datos al inicializar
  useEffect(() => {
    loadAllTradingData();
    
    // Refresh automático cada 30 segundos
    const interval = setInterval(loadAllTradingData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAllTradingData = async () => {
    if (!refreshing) {
      setLoading(true);
    }
    
    try {
      await Promise.all([
        loadPositions(),
        loadBalance(),
        loadTracking()
      ]);
    } catch (error) {
      console.error('Error cargando datos de trading:', error);
      toast({
        title: "Error",
        description: "Error cargando datos de trading",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await fetch(`${API_BASE}/trading/positions`);
      if (response.ok) {
        const data = await response.json();
        setPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Error cargando posiciones:', error);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await fetch(`${API_BASE}/trading/balance`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Error cargando balance:', error);
    }
  };

  const loadTracking = async () => {
    try {
      const response = await fetch(`${API_BASE}/trading/tracking`);
      if (response.ok) {
        const data = await response.json();
        setTracking(data.tracking || []);
      }
    } catch (error) {
      console.error('Error cargando tracking:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllTradingData();
  };

  const setupTakeProfits = async (symbol: string) => {
    setSetupLoading(symbol);
    try {
      const response = await fetch(`${API_BASE}/trading/setup-take-profits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.excluded) {
          toast({
            title: "Crypto Excluida",
            description: result.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "TPs Configurados",
            description: result.message,
          });
          await loadPositions(); // Recargar posiciones
        }
      } else {
        throw new Error(result.detail || 'Error configurando TPs');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error configurando take profits",
        variant: "destructive"
      });
    } finally {
      setSetupLoading(null);
    }
  };

  const closePosition = async (symbol: string, percentage: number) => {
    setCloseLoading(symbol);
    try {
      const response = await fetch(`${API_BASE}/trading/close-position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, percentage }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Posición Cerrada",
          description: result.message,
        });
        await loadAllTradingData(); // Recargar todos los datos
      } else {
        throw new Error(result.detail || 'Error cerrando posición');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error cerrando posición",
        variant: "destructive"
      });
    } finally {
      setCloseLoading(null);
    }
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'executed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-500';
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'SWING':
        return 'bg-blue-100 text-blue-800';
      case 'SCALP':
        return 'bg-yellow-100 text-yellow-800';
      case 'PRUEBA':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getModeEmoji = (mode: string) => {
    switch (mode) {
      case 'SWING':
        return '🎯';
      case 'SCALP':
        return '⚡';
      case 'PRUEBA':
        return '🧪';
      default:
        return '📊';
    }
  };

  if (loading && positions.length === 0) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Cargando datos de trading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 mb-20 md:mb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center space-x-2">
          <TrendingUp className="h-6 w-6" />
          <span>Trading Dashboard</span>
          {balance?.testnet && (
            <Badge className="bg-orange-500 text-white">TESTNET</Badge>
          )}
        </h1>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="positions">
            Posiciones ({positions.length})
          </TabsTrigger>
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="tracking">
            Seguimiento ({tracking.length})
          </TabsTrigger>
          <TabsTrigger value="antigreed">Anti-Codicia</TabsTrigger>
        </TabsList>

        {/* Positions */}
        <TabsContent value="positions" className="space-y-4">
          {positions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No tienes posiciones abiertas</p>
                  <p className="text-sm mt-2">Las posiciones aparecerán aquí cuando abras trades</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            positions.map((position) => (
              <Card key={position.symbol} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold">{position.symbol}</span>
                      <Badge variant={position.side === 'LONG' ? 'default' : 'secondary'}>
                        {position.side} {position.leverage}x
                      </Badge>
                      <Badge className={`text-xs ${getModeColor(position.trading_mode)}`}>
                        {getModeEmoji(position.trading_mode)} {position.trading_mode}
                      </Badge>
                      {!position.auto_tp_enabled && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Excluido
                        </Badge>
                      )}
                    </div>
                  </div>

                  {position.alert_origin && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Activity className="h-4 w-4" />
                        <span>
                          🔔 Origen: Alerta #{position.alert_origin.alert_id} 
                          {position.time_in_position && ` (${position.time_in_position})`}
                        </span>
                      </div>
                      {position.alert_origin.notes && (
                        <p className="text-xs text-blue-600 mt-1">{position.alert_origin.notes}</p>
                      )}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry:</span>
                        <span className="font-mono">${position.entry_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current:</span>
                        <span className="font-mono">${position.mark_price.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-semibold">{position.size} {position.symbol.replace('USDT', '')}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getPnLColor(position.pnl)}`}>
                        {position.pnl_percent > 0 ? '+' : ''}{position.pnl_percent.toFixed(2)}%
                      </div>
                      <div className={`text-lg ${getPnLColor(position.pnl)}`}>
                        ${position.pnl > 0 ? '+' : ''}{position.pnl.toFixed(2)}
                      </div>
                      {position.pnl > 0 && (
                        <Badge className="bg-green-500 text-white mt-1">✅ Profitable</Badge>
                      )}
                    </div>
                  </div>

                  {/* Take Profits */}
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-semibold text-gray-700">Take Profits:</h4>
                    {position.take_profits.map((tp) => (
                      <div key={tp.level} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {tp.level}: ${tp.price.toFixed(4)} ({tp.allocation}%)
                        </span>
                        <div className="flex items-center space-x-1">
                          {tp.status === 'executed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                          <span className={`text-sm ${getStatusColor(tp.status)}`}>
                            {tp.status === 'executed' ? 'Ejecutado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Stop Loss */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-red-600">
                        SL: ${position.stop_loss.price.toFixed(4)} ({position.stop_loss.percent}%)
                      </span>
                      <span className="text-sm text-red-600">Protección</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-4 border-t">
                    {position.auto_tp_enabled && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setupTakeProfits(position.symbol)}
                        disabled={setupLoading === position.symbol}
                      >
                        {setupLoading === position.symbol ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Target className="h-3 w-3 mr-1" />
                        )}
                        Setup TPs
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => closePosition(position.symbol, 25)}
                      disabled={closeLoading === position.symbol}
                    >
                      {closeLoading === position.symbol ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <X className="h-3 w-3 mr-1" />
                      )}
                      Cerrar 25%
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700"
                      onClick={() => closePosition(position.symbol, 100)}
                      disabled={closeLoading === position.symbol}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cerrar Todo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Balance */}
        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>💰 Balance de Cuenta Futures</span>
                {balance?.testnet && (
                  <Badge className="bg-orange-500 text-white">TESTNET</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {balance ? (
                <>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="text-2xl font-bold">${balance.total.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Balance Total</div>
                      <div className="text-xs text-gray-500">USDT</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="text-2xl font-bold text-yellow-600">${balance.in_positions.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">En posiciones</div>
                      <div className="text-xs text-gray-500">{balance.positions_count} posiciones</div>
                    </div>
                    
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="text-2xl font-bold text-green-600">${balance.available.toFixed(2)}</div>
                      <div className="text-sm text-gray-600">Disponible</div>
                      <div className="text-xs text-gray-500">Para trading</div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className={`text-center p-4 rounded-lg ${
                        balance.unrealized_pnl >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <div className={`text-xl font-bold ${getPnLColor(balance.unrealized_pnl)}`}>
                          ${balance.unrealized_pnl > 0 ? '+' : ''}{balance.unrealized_pnl.toFixed(2)}
                        </div>
                        <div className="text-sm opacity-90">
                          PnL No Realizado ({balance.pnl_today_percent > 0 ? '+' : ''}{balance.pnl_today_percent.toFixed(2)}%)
                        </div>
                      </div>
                      
                      <div className="text-center p-4 rounded-lg bg-blue-100">
                        <div className="text-xl font-bold text-blue-700">
                          {balance.can_trade ? '✅ Habilitado' : '❌ Deshabilitado'}
                        </div>
                        <div className="text-sm text-blue-600">
                          Estado de Trading
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-gray-600">Cargando balance...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>🔄 Seguimiento de Alertas vs Posiciones</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Alertas disparadas en las últimas 24 horas y su seguimiento
              </div>
              
              {tracking.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay alertas disparadas recientes</p>
                  <p className="text-sm mt-2">El seguimiento aparecerá cuando se disparen alertas</p>
                </div>
              ) : (
                tracking.map((track) => (
                  <div key={track.alert_id} className="p-4 rounded-lg bg-gray-50 border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="font-semibold">{track.symbol} #{track.alert_id}</span>
                        <span className="text-gray-400">→</span>
                        
                        {track.status === 'position_opened' && (
                          <>
                            <Badge className="bg-green-500 text-white">✅ Posición Abierta</Badge>
                            <span className="text-gray-400">→</span>
                            <div className="text-right">
                              <span className={`font-semibold ${getPnLColor(track.position_pnl || 0)}`}>
                                {track.position_pnl ? `${track.position_pnl > 0 ? '+' : ''}${track.position_pnl.toFixed(2)}%` : '0%'}
                              </span>
                              {track.position_pnl_usd && (
                                <div className="text-sm text-gray-600">
                                  ${track.position_pnl_usd > 0 ? '+' : ''}{track.position_pnl_usd.toFixed(2)}
                                </div>
                              )}
                              {track.trading_mode && (
                                <Badge className={`text-xs mt-1 ${getModeColor(track.trading_mode)}`}>
                                  {getModeEmoji(track.trading_mode)} {track.trading_mode}
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                        
                        {track.status === 'not_taken' && (
                          <>
                            <Badge className="bg-red-500 text-white">❌ No Tomada</Badge>
                            <span className="text-gray-400">→</span>
                            <span className="text-red-600 font-semibold">Oportunidad Perdida</span>
                          </>
                        )}
                        
                        {track.status === 'triggered_only' && (
                          <>
                            <Badge className="bg-yellow-500 text-white">⚠️ Solo Alerta</Badge>
                            <span className="text-gray-400">→</span>
                            <span className="text-yellow-600 font-semibold">Sin Verificación</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Target: ${track.target_price.toFixed(4)}</span>
                        <span>{new Date(track.triggered_at).toLocaleString()}</span>
                      </div>
                      {track.notes && (
                        <p className="mt-1 text-xs text-gray-500">{track.notes}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anti-Greed System */}
        <TabsContent value="antigreed" className="space-y-4">
          <Card className="border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span>⚠️ Sistema Anti-Codicia</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {positions.filter(p => p.pnl_percent > 1).length > 0 ? (
                positions
                  .filter(p => p.pnl_percent > 1)
                  .map(position => (
                    <div key={position.symbol} className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="text-center space-y-2">
                        <div className="text-lg font-semibold">
                          {position.symbol}: +{position.pnl_percent.toFixed(2)}% profit
                        </div>
                        <div className="text-sm text-gray-600">
                          "Has alcanzado ganancia significativa"
                        </div>
                        <div className="text-sm font-medium text-yellow-700">
                          "Considera tomar ganancias parciales para mantener disciplina"
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-green-600 border-green-600"
                          onClick={() => closePosition(position.symbol, 25)}
                          disabled={closeLoading === position.symbol}
                        >
                          Cerrar 25%
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setupTakeProfits(position.symbol)}
                          disabled={setupLoading === position.symbol}
                        >
                          Setup TPs
                        </Button>
                        <Button variant="outline" size="sm">
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-green-700 font-medium">Sistema funcionando correctamente</p>
                  <p className="text-sm text-gray-600 mt-2">
                    No hay alertas de codicia en este momento
                  </p>
                </div>
              )}
              
              <div className="text-sm text-gray-600 space-y-2 mt-6">
                <p className="font-medium">El sistema anti-codicia te ayuda a:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Mantener disciplina después de alcanzar ganancias</li>
                  <li>Recordarte la importancia de tomar profits</li>
                  <li>Sugerir cierres parciales en momentos clave</li>
                  <li>Evitar el over-trading por emoción</li>
                  <li>Aplicar la regla 75%-25% automáticamente</li>
                </ul>
                
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>Regla 75%-25%:</strong> Se cerrará el 75% de la posición en TPs progresivos, 
                    manteniendo el 25% restante con trailing stop para maximizar ganancias.
                  </p>
                </div>
                
                <div className="mt-2 p-3 bg-orange-50 rounded">
                  <p className="text-sm text-orange-700">
                    <strong>Cryptos excluidas:</strong> ADA/USDT, ALGO/USDT, AAVE/USDT no aplican 
                    el sistema automático de TPs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}