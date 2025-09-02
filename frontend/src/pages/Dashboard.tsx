import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Percent
} from 'lucide-react';

export default function Dashboard() {
  // Mock data
  const todayStats = {
    totalAlerts: 12,
    takenTrades: 8,
    winRate: 75,
    pnl: 2.34
  };

  const upcomingAlerts = [
    {
      id: 1,
      symbol: 'BTCUSDT',
      target: 45234,
      current: 44567,
      progress: 85,
      type: 'LONG',
      timeLeft: '2h 15m'
    },
    {
      id: 2,
      symbol: 'ETHUSDT',
      target: 3200,
      current: 3174,
      progress: 96,
      type: 'SHORT',
      timeLeft: '45m'
    }
  ];

  const livePositions = [
    {
      id: 1,
      symbol: 'BTCUSDT',
      type: 'LONG',
      leverage: '10x',
      pnl: 2.45,
      pnlUsd: 234.50,
      mode: 'SWING'
    },
    {
      id: 2,
      symbol: 'ETHUSDT',
      type: 'SHORT',
      leverage: '5x',
      pnl: -0.32,
      pnlUsd: -15.20,
      mode: 'SCALP'
    }
  ];

  const topPerformers = [
    { symbol: 'SOLUSDT', winRate: 85, alerts: 45 },
    { symbol: 'INJUSDT', winRate: 78, alerts: 38 },
    { symbol: 'BTCUSDT', winRate: 72, alerts: 32 }
  ];

  const getProgressColor = (progress: number) => {
    if (progress >= 95) return 'bg-danger text-danger-soft animate-pulse';
    if (progress >= 90) return 'bg-warning text-warning-soft';
    return 'bg-info text-info-soft';
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-success' : 'text-danger';
  };

  return (
    <div className="container mx-auto p-4 space-y-6 mb-20 md:mb-0">
      {/* Today's Summary */}
      <Card className="card-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Resumen de Hoy</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{todayStats.totalAlerts}</div>
              <div className="text-sm text-muted-foreground">Alertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{todayStats.takenTrades}</div>
              <div className="text-sm text-muted-foreground">Tomadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{todayStats.winRate}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getPnLColor(todayStats.pnl)}`}>
                {todayStats.pnl > 0 ? '+' : ''}{todayStats.pnl}%
              </div>
              <div className="text-sm text-muted-foreground">PnL</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Alerts */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Alertas Próximas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingAlerts.map((alert) => (
              <div key={alert.id} className="p-4 rounded-lg bg-surface border border-border hover-lift">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{alert.symbol}</span>
                    <Badge variant={alert.type === 'LONG' ? 'default' : 'secondary'}>
                      {alert.type === 'LONG' ? '▲' : '▼'} {alert.type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Target</div>
                    <div className="crypto-price">${alert.target.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: ${alert.current.toLocaleString()}</span>
                    <span className="text-muted-foreground">{alert.timeLeft}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Progreso</span>
                      <span>{alert.progress}%</span>
                    </div>
                    <Progress 
                      value={alert.progress} 
                      className={`h-2 ${getProgressColor(alert.progress)}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Positions */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Posiciones Live</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {livePositions.map((position) => (
              <div key={position.id} className="p-4 rounded-lg bg-surface border border-border hover-lift">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant={position.type === 'LONG' ? 'default' : 'secondary'}>
                      {position.type} {position.leverage}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {position.mode}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">PnL</span>
                    <div className="text-right">
                      <div className={`crypto-percentage font-semibold ${getPnLColor(position.pnl)}`}>
                        {position.pnl > 0 ? '+' : ''}{position.pnl}%
                      </div>
                      <div className={`text-xs ${getPnLColor(position.pnlUsd)}`}>
                        ${position.pnlUsd > 0 ? '+' : ''}{position.pnlUsd.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="card-soft">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Top Performers (7 días)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((performer, index) => (
              <div key={performer.symbol} className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <span className="font-semibold">{performer.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="text-success font-semibold">{performer.winRate}% éxito</div>
                  <div className="text-xs text-muted-foreground">+{performer.alerts} alertas</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BarChart3(props: any) {
  return <TrendingUp {...props} />;
}

function Trophy(props: any) {
  return <Target {...props} />;
}