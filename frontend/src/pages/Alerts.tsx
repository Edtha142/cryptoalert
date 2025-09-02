import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Bell, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  Target,
  TrendingUp,
  Timer,
  CheckCircle,
  Loader2,
  Save,
  X
} from 'lucide-react';

// Tipos para TypeScript
interface Alert {
  id: number;
  symbol: string;
  target_price: number;
  current_price: number;
  alert_type: 'LONG' | 'SHORT';
  status: 'PENDING' | 'TRIGGERED' | 'EXECUTED' | 'CANCELLED';
  notes: string;
  created_at: string;
  triggered_at?: string;
  executed_at?: string;
  progress_percentage: number;
  trade_id?: string;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
  active: number;
}

interface StatsResponse {
  overview: {
    total_alerts: number;
    pending: number;
    triggered: number;
    executed: number;
    success_rate: number;
  };
}

interface CreateAlertData {
  symbol: string;
  target_price: number;
  alert_type: 'LONG' | 'SHORT';
  notes: string;
}

// Hook de toast simple
const useToast = () => ({
  toast: ({ title, description, variant }: { title: string; description: string; variant?: string }) => {
    const toastEl = document.createElement('div');
    toastEl.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md ${
      variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    toastEl.innerHTML = `<strong>${title}</strong><br/>${description}`;
    document.body.appendChild(toastEl);
    setTimeout(() => {
      if (document.body.contains(toastEl)) {
        document.body.removeChild(toastEl);
      }
    }, 4000);
  }
});

export default function Alerts() {
  const [activeSubTab, setActiveSubTab] = useState('active');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [supportedCoins, setSupportedCoins] = useState<string[]>([
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'SOLUSDT',
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'AVAXUSDT', 'MATICUSDT',
    'LTCUSDT', 'LINKUSDT', 'TRXUSDT', 'ATOMUSDT', 'XMRUSDT',
    'UNIUSDT', 'ETCUSDT', 'FILUSDT', 'ALGOUSDT', 'VETUSDT',
    'XTZUSDT', 'AAVEUSDT', 'XLMUSDT', 'SANDUSDT', 'MANAUSDT'
  ]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [stats, setStats] = useState<StatsResponse['overview'] | null>(null);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<CreateAlertData>({
    symbol: '',
    target_price: 0,
    alert_type: 'LONG',
    notes: ''
  });
  const { toast } = useToast();

  // Estado del formulario
  const [formData, setFormData] = useState<CreateAlertData>({
    symbol: '',
    target_price: 0,
    alert_type: 'LONG',
    notes: ''
  });

  const API_BASE = '/api';

  // Cargar datos iniciales
  useEffect(() => {
    loadSupportedCoins();
    loadAlerts();
    loadStats();
  }, []);

  const loadSupportedCoins = async () => {
    try {
      const response = await fetch(`${API_BASE}/coins/supported`);
      if (response.ok) {
        const data = await response.json();
        setSupportedCoins(data.coins);
      } else {
        throw new Error('Error al cargar monedas');
      }
    } catch (error) {
      console.error('Error cargando monedas:', error);
      toast({
        title: "Info",
        description: "Usando monedas por defecto - Backend no disponible",
        variant: "destructive",
      });
    }
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/alerts`);
      if (response.ok) {
        const data: AlertsResponse = await response.json();
        setAlerts(data.alerts);
      } else {
        throw new Error('Error al cargar alertas');
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las alertas. Verificar conexión con backend.",
        variant: "destructive",
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts/stats`);
      if (response.ok) {
        const data: StatsResponse = await response.json();
        setStats(data.overview);
      } else {
        throw new Error('Error al cargar estadísticas');
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setStats({
        total_alerts: 0,
        pending: 0,
        triggered: 0,
        executed: 0,
        success_rate: 0
      });
    }
  };

  const createAlert = async () => {
    if (!formData.symbol || !formData.target_price) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "✅ Alerta Creada",
          description: `Alerta ${formData.symbol} ${formData.alert_type} creada exitosamente`,
        });
        
        // Limpiar formulario
        setFormData({
          symbol: '',
          target_price: 0,
          alert_type: 'LONG',
          notes: ''
        });
        
        // Recargar alertas desde el servidor
        await loadAlerts();
        await loadStats();
        
        // Cambiar a la pestaña de alertas activas
        setActiveSubTab('active');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Error al crear la alerta",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creando alerta:', error);
      toast({
        title: "Error",
        description: "Error de conexión al crear la alerta",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const startEditAlert = (alert: Alert) => {
    setEditingAlert(alert);
    setEditFormData({
      symbol: alert.symbol,
      target_price: alert.target_price,
      alert_type: alert.alert_type,
      notes: alert.notes
    });
    setEditDialogOpen(true);
  };

  const saveEditAlert = async () => {
    if (!editingAlert || !editFormData.target_price) return;

    try {
      const response = await fetch(`${API_BASE}/alerts/${editingAlert.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      if (response.ok) {
        toast({
          title: "✅ Alerta Actualizada",
          description: `Alerta ${editFormData.symbol} editada correctamente`,
        });
        
        setEditDialogOpen(false);
        setEditingAlert(null);
        
        // Recargar alertas desde el servidor
        await loadAlerts();
        await loadStats();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Error al editar la alerta",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error editando alerta:', error);
      toast({
        title: "Error",
        description: "Error de conexión al editar la alerta",
        variant: "destructive",
      });
    }
  };

  const deleteAlert = async (alertId: number, symbol: string) => {
    try {
      const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "🗑️ Alerta eliminada",
          description: `Alerta ${symbol} eliminada correctamente`,
        });
        
        // Recargar alertas desde el servidor
        await loadAlerts();
        await loadStats();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.detail || "Error al eliminar la alerta",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error eliminando alerta:', error);
      toast({
        title: "Error",
        description: "Error de conexión al eliminar la alerta",
        variant: "destructive",
      });
    }
  };

  // Filtrar alertas
  const activeAlerts = alerts.filter(alert => alert.status === 'PENDING');
  const upcomingAlerts = activeAlerts
    .filter(alert => alert.progress_percentage >= 80)
    .sort((a, b) => b.progress_percentage - a.progress_percentage);
  const alertHistory = alerts.filter(alert => 
    ['TRIGGERED', 'EXECUTED', 'CANCELLED'].includes(alert.status)
  );

  const getProgressColor = (progress: number) => {
    if (progress >= 95) return 'bg-red-500';
    if (progress >= 90) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <Badge className="bg-green-500 text-white border-green-600">
            ✅ EJECUTADA
          </Badge>
        );
      case 'TRIGGERED':
        return (
          <Badge className="bg-blue-500 text-white border-blue-600">
            🎯 DISPARADA
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-red-500 text-white border-red-600">
            ❌ CANCELADA
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-500 text-white border-yellow-600">
            ⏰ PENDIENTE
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'hace menos de 1h';
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffHours < 48) return 'ayer';
    return date.toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <Bell className="h-8 w-8 text-blue-600" />
          <span>Sistema de Alertas- FUTURE</span>
        </h1>
        <Button 
          variant="outline" 
          onClick={() => {
            loadAlerts();
            loadStats();
          }}
          className="flex items-center space-x-2"
        >
          <Loader2 className="h-4 w-4" />
          <span>Actualizar</span>
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active" className="text-sm">
            Activas {activeAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{activeAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-sm">
            Próximas {upcomingAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">{upcomingAlerts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="create" className="text-sm">Crear</TabsTrigger>
          <TabsTrigger value="history" className="text-sm">
            Historial {alertHistory.length > 0 && (
              <Badge variant="secondary" className="ml-1">{alertHistory.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-sm">Stats</TabsTrigger>
        </TabsList>

        {/* Active Alerts */}
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-muted-foreground">Cargando alertas...</p>
              </div>
            </div>
          ) : activeAlerts.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="text-muted-foreground">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-semibold mb-2">No hay alertas activas</h3>
                <p className="mb-4">Crea tu primera alerta para empezar a monitorear el mercado</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveSubTab('create')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primera alerta
                </Button>
              </div>
            </Card>
          ) : (
            activeAlerts.map((alert) => (
              <Card key={alert.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl font-bold">{alert.symbol}</span>
                      <Badge variant={alert.alert_type === 'LONG' ? 'default' : 'secondary'} className="px-3 py-1">
                        {alert.alert_type === 'LONG' ? '📈' : '📉'} {alert.alert_type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Target</div>
                      <div className="text-xl font-bold text-green-600">${alert.target_price.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">Current: <span className="font-semibold">${alert.current_price?.toLocaleString() || 'Cargando...'}</span></span>
                      {alert.current_price && (
                        <span className={`font-bold text-lg ${alert.alert_type === 'LONG' ? 'text-green-600' : 'text-red-600'}`}>
                          {alert.alert_type === 'LONG' ? '↗' : '↘'} 
                          {alert.progress_percentage.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progreso hacia target</span>
                        <span className="font-semibold">{alert.progress_percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(alert.progress_percentage)}`}
                          style={{ width: `${Math.min(alert.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>⏰ Creada: {formatDate(alert.created_at)}</span>
                      <span>ID: #{alert.id}</span>
                    </div>

                    {alert.notes && (
                      <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-sm text-blue-800">📝 {alert.notes}</p>
                      </div>
                    )}

                    <div className="flex space-x-3 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startEditAlert(alert)}
                        className="flex-1"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar alerta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará permanentemente la alerta de <strong>{alert.symbol}</strong> con target de <strong>${alert.target_price.toLocaleString()}</strong>.
                              <br/><br/>
                              Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteAlert(alert.id, alert.symbol)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Eliminar alerta
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Upcoming Alerts */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-orange-600" />
                <span>🔥 Alertas Más Cercanas al Target</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingAlerts.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No hay alertas próximas</h3>
                  <p>Las alertas aparecerán aquí cuando estén cerca del 80% de su target</p>
                </div>
              ) : (
                upcomingAlerts.map((alert, index) => (
                  <div key={alert.id} className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl font-bold text-orange-600">#{index + 1}</span>
                        <span className="text-lg font-semibold">{alert.symbol}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-lg font-bold text-green-600">${alert.target_price.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Precio actual: <span className="font-semibold">${alert.current_price?.toLocaleString()}</span></span>
                        <span className={`font-bold ${
                          alert.progress_percentage >= 95 ? 'text-red-600 animate-pulse' :
                          alert.progress_percentage >= 90 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {alert.progress_percentage >= 95 ? '🚨' : alert.progress_percentage >= 90 ? '⚠️' : '✅'} Progreso: {alert.progress_percentage.toFixed(1)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(alert.progress_percentage)}`}
                          style={{ width: `${Math.min(alert.progress_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create New Alert */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <span>Crear Nueva Alerta</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="coin" className="text-sm font-semibold">Moneda *</Label>
                  <Select 
                    value={formData.symbol} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, symbol: value }))}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedCoins.map((coin) => (
                        <SelectItem key={coin} value={coin}>
                          {coin}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="target" className="text-sm font-semibold">Precio Objetivo *</Label>
                  <Input 
                    id="target" 
                    type="number"
                    step="0.01"
                    placeholder="0.00" 
                    className="h-12 text-lg font-semibold"
                    value={formData.target_price || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      target_price: parseFloat(e.target.value) || 0 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Tipo de Operación</Label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="LONG" 
                      checked={formData.alert_type === 'LONG'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        alert_type: e.target.value as 'LONG' | 'SHORT' 
                      }))}
                      className="h-4 w-4"
                    />
                    <span className="text-lg">📈 Short (Venta)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="type" 
                      value="SHORT"
                      checked={formData.alert_type === 'SHORT'}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        alert_type: e.target.value as 'LONG' | 'SHORT' 
                      }))}
                      className="h-4 w-4"
                    />
                    <span className="text-lg">📉 Long (Compra)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-semibold">Notas (Opcional)</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Agrega notas sobre tu análisis técnico, razones de la alerta, etc..."
                  className="min-h-[100px]"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button 
                className="w-full h-12 text-lg font-semibold" 
                onClick={createAlert}
                disabled={creating || !formData.symbol || !formData.target_price}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Creando alerta...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Crear Alerta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span>Historial de Alertas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-semibold mb-2">No hay historial</h3>
                  <p>Las alertas ejecutadas, canceladas o disparadas aparecerán aquí</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-muted-foreground border-b pb-3">
                    <div>Fecha</div>
                    <div>Par</div>
                    <div>Estado</div>
                    <div>Precio Target</div>
                  </div>
                  {alertHistory.map((alert) => (
                    <div key={alert.id} className="grid grid-cols-4 gap-4 py-3 border-b border-gray-100 hover:bg-gray-50 rounded">
                      <div className="text-sm">{formatDate(alert.created_at)}</div>
                      <div className="font-semibold">{alert.symbol}</div>
                      <div>{getStatusBadge(alert.status)}</div>
                      <div className="font-semibold text-green-600">${alert.target_price.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>📊 Rendimiento Global</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {stats ? (
                  <>
                    <div>
                      <div className="flex justify-between mb-3">
                        <span className="text-lg">Tasa de Éxito</span>
                        <span className="text-2xl font-bold text-green-600">
                          {stats.success_rate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-green-500 h-4 rounded-full transition-all duration-500"
                          style={{ width: `${stats.success_rate}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats.total_alerts}</div>
                        <div className="text-sm text-blue-600">Total</div>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats.executed}</div>
                        <div className="text-sm text-green-600">Ejecutadas</div>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                        <div className="text-sm text-yellow-600">Pendientes</div>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{stats.triggered}</div>
                        <div className="text-sm text-purple-600">Disparadas</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                    <p className="text-muted-foreground">Cargando estadísticas...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>🚀 Estado del Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Backend API</span>
                    </div>
                    <Badge className="bg-green-500 text-white">✅ Conectado</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Base de Datos</span>
                    </div>
                    <Badge className="bg-green-500 text-white">✅ PostgreSQL</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>Binance API</span>
                    </div>
                    <Badge className="bg-green-500 text-white">✅ Precios en tiempo real</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Timer className="h-5 w-5 text-blue-600" />
                      <span>Monitoreo</span>
                    </div>
                    <Badge className="bg-blue-500 text-white">🔄 Activo (30s)</Badge>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                  <h4 className="font-semibold text-gray-800 mb-2">💡 Próximas Funcionalidades</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Integración con Telegram</li>
                    <li>• Alertas por email</li>
                    <li>• Trading automático</li>
                    <li>• Análisis técnico IA</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Alert Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Edit3 className="h-5 w-5" />
              <span>Editar Alerta {editingAlert?.symbol}</span>
            </DialogTitle>
            <DialogDescription>
              Modifica los parámetros de tu alerta. Los cambios se aplicarán inmediatamente.
            </DialogDescription>
          </DialogHeader>
          
          {editingAlert && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price" className="text-sm font-semibold">
                  Precio Objetivo *
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={editFormData.target_price}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    target_price: parseFloat(e.target.value) || 0
                  }))}
                  className="h-12 text-lg font-semibold"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de Operación</Label>
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="edit-type" 
                      value="LONG" 
                      checked={editFormData.alert_type === 'LONG'}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        alert_type: e.target.value as 'LONG' | 'SHORT' 
                      }))}
                      className="h-4 w-4"
                    />
                    <span>📈 Long</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input 
                      type="radio" 
                      name="edit-type" 
                      value="SHORT"
                      checked={editFormData.alert_type === 'SHORT'}
                      onChange={(e) => setEditFormData(prev => ({ 
                        ...prev, 
                        alert_type: e.target.value as 'LONG' | 'SHORT' 
                      }))}
                      className="h-4 w-4"
                    />
                    <span>📉 Short</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-sm font-semibold">
                  Notas
                </Label>
                <Textarea
                  id="edit-notes"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  className="min-h-[100px]"
                  placeholder="Actualiza tus notas..."
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={saveEditAlert}
              disabled={!editFormData.target_price}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}