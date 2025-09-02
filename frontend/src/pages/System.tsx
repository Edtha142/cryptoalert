import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Monitor, 
  Wifi, 
  Shield, 
  Settings, 
  RefreshCw, 
  FileText, 
  Wrench,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock
} from 'lucide-react';

export default function System() {
  // Mock data
  const connectivity = [
    { service: 'Binance API', status: 'connected', icon: '🔗' },
    { service: 'Precios Realtime', status: 'active', icon: '📊' },
    { service: 'Telegram Bot', status: 'config', icon: '📱' },
    { service: 'Discord Webhook', status: 'config', icon: '💬' },
    { service: 'WebSocket', status: 'active', icon: '🔌' },
    { service: 'Base de Datos', status: 'online', icon: '💾' }
  ];

  const protections = [
    { name: 'Anti-Codicia', status: 'active', value: null },
    { name: 'Stop Loss Auto', status: 'active', value: null },
    { name: 'Take Profit Auto', status: 'active', value: null },
    { name: 'Trailing Stop', status: 'active', value: null },
    { name: 'Max Daily Loss', status: 'active', value: '-3%' },
    { name: 'Trading Hours', status: 'active', value: '24/7' }
  ];

  const tradingSystem = [
    { label: 'Versión', value: 'v5.0' },
    { label: 'Estado', value: 'Operativo' },
    { label: 'Modo Activo', value: 'SWING' },
    { label: 'Alertas Activas', value: '12' },
    { label: 'Posiciones', value: '3' },
    { label: 'Última Update', value: 'hace 5s' }
  ];

  const tradingModes = [
    {
      name: 'SWING MODE',
      leverage: '1-7x',
      active: true,
      color: 'border-info',
      tp: [
        { level: 'TP1', percent: '1.0%', allocation: '20%' },
        { level: 'TP2', percent: '2.0%', allocation: '30%' },
        { level: 'TP3', percent: '3.5%', allocation: '30%' },
        { level: 'TP4', percent: '4.0%', allocation: '20% trailing' }
      ],
      stopLoss: '1.0%',
      maxTime: '24 horas',
      breakeven: 'Después TP1 +0.2%'
    },
    {
      name: 'SCALP MODE',
      leverage: '8-15x',
      active: false,
      color: 'border-warning',
      tp: [
        { level: 'TP1', percent: '0.6%', allocation: '35%' },
        { level: 'TP2', percent: '1.2%', allocation: '35%' },
        { level: 'TP3', percent: '2.0%', allocation: '20%' },
        { level: 'TP4', percent: '2.5%', allocation: '10% trailing' }
      ],
      stopLoss: '0.8%',
      maxTime: '2 horas',
      breakeven: 'Después TP1 +0.1%'
    },
    {
      name: 'PRUEBA MODE',
      leverage: '16-20x',
      active: false,
      color: 'border-purple-300',
      tp: [
        { level: 'TP1', percent: '0.5%', allocation: '50%' },
        { level: 'TP2', percent: '1.0%', allocation: '35%' },
        { level: 'TP3', percent: '1.8%', allocation: '15%' },
        { level: 'TP4', percent: 'N/A', allocation: 'Sin trailing' }
      ],
      stopLoss: '0.4%',
      maxTime: '3 horas',
      breakeven: 'Inmediato tras TP1'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'online':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'config':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'offline':
      case 'error':
        return <XCircle className="h-4 w-4 text-danger" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'active':
        return 'Activo';
      case 'online':
        return 'Online';
      case 'config':
        return 'Configurar';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'online':
        return 'text-success';
      case 'config':
        return 'text-warning';
      case 'offline':
      case 'error':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6 mb-20 md:mb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center space-x-2">
          <Monitor className="h-6 w-6" />
          <span>Estado del Sistema</span>
        </h1>
      </div>

      {/* Status Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Connectivity */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wifi className="h-5 w-5" />
              <span>🌐 Conectividad</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {connectivity.map((service) => (
              <div key={service.service} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">{service.icon}</span>
                  <span className="text-sm">{service.service}:</span>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(service.status)}
                  <span className={`text-sm ${getStatusColor(service.status)}`}>
                    {getStatusText(service.status)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Protections */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>🛡️ Protecciones</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {protections.map((protection) => (
              <div key={protection.name} className="flex items-center justify-between">
                <span className="text-sm">{protection.name}:</span>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(protection.status)}
                  <span className={`text-sm ${getStatusColor(protection.status)}`}>
                    {protection.value ? protection.value : getStatusText(protection.status)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Trading System */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>⚙️ Trading System</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tradingSystem.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm">{item.label}:</span>
                <span className="text-sm font-semibold">
                  {item.label === 'Estado' && <CheckCircle className="h-4 w-4 text-success inline mr-1" />}
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Trading Modes Configuration */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Configuración de Modos de Trading</h2>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {tradingModes.map((mode) => (
            <Card 
              key={mode.name} 
              className={`card-elevated ${mode.color} ${mode.active ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">
                    {mode.name === 'SWING MODE' && '🎯'} 
                    {mode.name === 'SCALP MODE' && '⚡'} 
                    {mode.name === 'PRUEBA MODE' && '🧪'} 
                    {mode.name}
                  </span>
                  <div className="text-right text-sm">
                    <div>Leverage: {mode.leverage}</div>
                    {mode.active && (
                      <Badge className="badge-success mt-1">ACTIVO</Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {mode.tp.map((tp) => (
                    <div key={tp.level} className="flex justify-between text-sm">
                      <span>{tp.level}: {tp.percent}</span>
                      <span className="text-muted-foreground">→ {tp.allocation}</span>
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Stop Loss:</span>
                    <span className="text-danger font-semibold">{mode.stopLoss}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiempo máx:</span>
                    <span>{mode.maxTime}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Breakeven: {mode.breakeven}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button variant="outline" className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4" />
          <span>🔄 Reiniciar Sistema</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <FileText className="h-4 w-4" />
          <span>📊 Ver Logs</span>
        </Button>
        <Button variant="outline" className="flex items-center space-x-2">
          <Wrench className="h-4 w-4" />
          <span>🔧 Diagnóstico</span>
        </Button>
      </div>
    </div>
  );
}