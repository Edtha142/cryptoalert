import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Settings as SettingsIcon, 
  Key, 
  Bell, 
  TrendingUp, 
  Palette,
  Eye,
  EyeOff,
  ExternalLink,
  TestTube,
  Loader2,
  Check,
  X,
  RefreshCw,
  MessageCircle,
  Zap
} from 'lucide-react';

// Interfaces
interface BinanceConfig {
  has_api_key: boolean;
  has_secret_key: boolean;
  use_testnet: boolean;
}

interface TelegramConfig {
  bot_token: string | null;
  chat_id: string | null;
}

interface DiscordConfig {
  webhook_url: string | null;
}

interface TradingConfig {
  max_positions: number;
  max_daily_loss: number;
  auto_close_profit: number;
  enable_anti_greed: boolean;
  enable_post_tp1_lock: boolean;
  enable_psychological_alerts: boolean;
  enable_sound_notifications: boolean;
}

interface AlertsConfig {
  default_expiry_hours: number;
  auto_delete_expired: boolean;
  snooze_duration_minutes: number;
  notify_on_trigger: boolean;
  notify_on_near_price: boolean;
  notify_on_expiry: boolean;
  notify_on_position_detected: boolean;
}

interface AppearanceConfig {
  theme: string;
  animations: string;
  sounds_enabled: boolean;
  number_format: string;
  timezone: string;
}

interface Config {
  id: number;
  binance: BinanceConfig;
  telegram: TelegramConfig;
  discord: DiscordConfig;
  trading: TradingConfig;
  alerts: AlertsConfig;
  appearance: AppearanceConfig;
}

// Hook de toast mejorado
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
    
    // Auto remove after 5 seconds
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

export default function Settings() {
  const [activeSubTab, setActiveSubTab] = useState('api');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Form states
  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [useTestnet, setUseTestnet] = useState(true);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  
  const { toast } = useToast();
  // Configuración del API usando la IP correcta
  const API_BASE = '/api';

  // Cargar configuración al iniciar
  useEffect(() => {
    console.log('API_BASE configurado como:', API_BASE);
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      console.log('Cargando configuración desde:', `${API_BASE}/config`);
      const response = await fetch(`${API_BASE}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Config data:', data);
        setConfig(data.config);
        
        // Poblar formularios con los datos existentes
        setUseTestnet(data.config.binance.use_testnet);
        setTelegramToken(data.config.telegram.bot_token || '');
        setTelegramChatId(data.config.telegram.chat_id || '');
        setDiscordWebhook(data.config.discord.webhook_url || '');
        
        toast({
          title: "✅ Configuración cargada",
          description: "Datos cargados correctamente",
        });
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error completo:', error);
      toast({
        title: "Error de conexión",
        description: `No se pudo conectar al servidor: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (section: string, data: any) => {
    setSaving(section);
    try {
      const updateData = { [section]: data };
      
      const response = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        setConfig(result.config);
        toast({
          title: "✅ Guardado",
          description: `Configuración de ${section} actualizada correctamente`,
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || 'Error guardando configuración');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: `No se pudo guardar la configuración de ${section}`,
        variant: "destructive"
      });
    } finally {
      setSaving(null);
    }
  };

  const testConnection = async (service: string, config: any) => {
    setTesting(service);
    try {
      const response = await fetch(`${API_BASE}/config/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service,
          config
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "✅ Test Exitoso",
          description: result.message,
        });
      } else {
        toast({
          title: "❌ Test Fallido",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error realizando test de conexión",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const getTelegramChatIds = async () => {
    if (!telegramToken) {
      toast({
        title: "Error",
        description: "Ingresa el Bot Token primero",
        variant: "destructive"
      });
      return;
    }

    setTesting('telegram-chat');
    try {
      const response = await fetch(`${API_BASE}/config/telegram/chat-ids?bot_token=${telegramToken}`);
      const result = await response.json();
      
      if (result.success && result.chat_ids.length > 0) {
        const chatId = result.chat_ids[0].chat_id;
        setTelegramChatId(chatId);
        toast({
          title: "✅ Chat ID Encontrado",
          description: `Chat ID: ${chatId}`,
        });
      } else {
        toast({
          title: "Info",
          description: result.message || "No se encontraron chats recientes",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error obteniendo Chat ID",
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSaveBinance = () => {
    if (!apiKey || !secretKey) {
      toast({
        title: "Error",
        description: "API Key y Secret Key son requeridos",
        variant: "destructive"
      });
      return;
    }

    saveConfig('binance', {
      api_key: apiKey,
      secret_key: secretKey,
      use_testnet: useTestnet
    });
  };

  const handleTestBinance = () => {
    if (!apiKey || !secretKey) {
      toast({
        title: "Error",
        description: "API Key y Secret Key son requeridos",
        variant: "destructive"
      });
      return;
    }

    testConnection('binance', {
      api_key: apiKey,
      secret_key: secretKey,
      use_testnet: useTestnet
    });
  };

  const handleSaveTelegram = () => {
    saveConfig('telegram', {
      bot_token: telegramToken,
      chat_id: telegramChatId
    });
  };

  const handleTestTelegram = () => {
    if (!telegramToken || !telegramChatId) {
      toast({
        title: "Error",
        description: "Bot Token y Chat ID son requeridos",
        variant: "destructive"
      });
      return;
    }

    testConnection('telegram', {
      bot_token: telegramToken,
      chat_id: telegramChatId
    });
  };

  const handleSaveDiscord = () => {
    saveConfig('discord', {
      webhook_url: discordWebhook
    });
  };

  const handleTestDiscord = () => {
    if (!discordWebhook) {
      toast({
        title: "Error",
        description: "Webhook URL es requerida",
        variant: "destructive"
      });
      return;
    }

    testConnection('discord', {
      webhook_url: discordWebhook
    });
  };

  const updateTradingConfig = (field: string, value: any) => {
    if (!config) return;
    
    const newTradingConfig = {
      ...config.trading,
      [field]: value
    };
    
    saveConfig('trading', newTradingConfig);
  };

  const updateAlertsConfig = (field: string, value: any) => {
    if (!config) return;
    
    const newAlertsConfig = {
      ...config.alerts,
      [field]: value
    };
    
    saveConfig('alerts', newAlertsConfig);
  };

  const updateAppearanceConfig = (field: string, value: any) => {
    if (!config) return;
    
    const newAppearanceConfig = {
      ...config.appearance,
      [field]: value
    };
    
    saveConfig('appearance', newAppearanceConfig);
  };

  if (loading || !config) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-muted-foreground">Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center space-x-2">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          <span>Configuración del Sistema</span>
        </h1>
        <Button 
          variant="outline" 
          onClick={loadConfig}
          className="flex items-center space-x-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Recargar</span>
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="api" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>API Keys</span>
            {config.binance.has_api_key && <Badge className="bg-green-500 text-white text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notificaciones</span>
            {(config.telegram.bot_token || config.discord.webhook_url) && 
              <Badge className="bg-green-500 text-white text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="trading" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Trading</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Apariencia</span>
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5 text-purple-600" />
                <span>🔐 Configuración de Binance Futures</span>
                {config.binance.has_api_key && (
                  <Badge className="bg-green-500 text-white">Configurado</Badge>
                )}
                {config.binance.use_testnet && (
                  <Badge className="bg-orange-500 text-white">TESTNET</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key *</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="apiKey" 
                    placeholder={config.binance.has_api_key ? "••••••••••••••••" : "Ingresa tu API Key de Binance..."}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigator.clipboard.readText().then(setApiKey)}
                  >
                    Pegar
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key *</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input 
                      id="secretKey" 
                      type={showSecretKey ? "text" : "password"}
                      placeholder={config.binance.has_secret_key ? "••••••••••••••••" : "Ingresa tu Secret Key..."}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      className="font-mono pr-10"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                    >
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigator.clipboard.readText().then(setSecretKey)}
                  >
                    Pegar
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  id="testnet" 
                  checked={useTestnet}
                  onCheckedChange={setUseTestnet}
                />
                <Label htmlFor="testnet">Usar Testnet (Recomendado para pruebas)</Label>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={handleTestBinance}
                  disabled={testing === 'binance'}
                >
                  {testing === 'binance' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Conexión
                </Button>
                <Button 
                  onClick={handleSaveBinance}
                  disabled={saving === 'binance'}
                >
                  {saving === 'binance' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm space-y-2">
                    <div className="font-semibold flex items-center space-x-2">
                      <span>ℹ️ Cómo obtener API Keys de Binance</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => window.open('https://www.binance.com/en/my/settings/api-management', '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-blue-800 space-y-1">
                      <p>1. Ve a Binance → API Management</p>
                      <p>2. Crea una nueva API Key</p>
                      <p>3. ✅ Habilita "Futures Trading"</p>
                      <p>4. ❌ NO habilites "Withdrawal"</p>
                      <p>5. Configura IP whitelist (opcional pero recomendado)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Telegram */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  <span>📱 Telegram Bot</span>
                  {config.telegram.bot_token && (
                    <Badge className="bg-green-500 text-white">Configurado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="botToken">Bot Token *</Label>
                  <Input 
                    id="botToken" 
                    placeholder="1234567890:ABCdefGhIjKlMnOpQrStUvWxYz"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chatId">Chat ID *</Label>
                  <div className="flex space-x-2">
                    <Input 
                      id="chatId" 
                      placeholder="-1001234567890"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      className="font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={getTelegramChatIds}
                      disabled={testing === 'telegram-chat'}
                    >
                      {testing === 'telegram-chat' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestTelegram}
                    disabled={testing === 'telegram'}
                  >
                    {testing === 'telegram' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveTelegram}
                    disabled={saving === 'telegram'}
                  >
                    {saving === 'telegram' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                </div>

                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  ℹ️ Habla con @BotFather en Telegram para crear un bot
                </div>
              </CardContent>
            </Card>

            {/* Discord */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-purple-500" />
                  <span>💬 Discord Webhook</span>
                  {config.discord.webhook_url && (
                    <Badge className="bg-green-500 text-white">Configurado</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL *</Label>
                  <Textarea 
                    id="webhookUrl" 
                    placeholder="https://discord.com/api/webhooks/..."
                    value={discordWebhook}
                    onChange={(e) => setDiscordWebhook(e.target.value)}
                    className="font-mono"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleTestDiscord}
                    disabled={testing === 'discord'}
                  >
                    {testing === 'discord' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveDiscord}
                    disabled={saving === 'discord'}
                  >
                    {saving === 'discord' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Check className="h-4 w-4 mr-1" />
                    )}
                    Guardar
                  </Button>
                </div>

                <div className="text-sm text-purple-600 bg-purple-50 p-2 rounded">
                  ℹ️ Server Settings → Integrations → Webhooks
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trading Configuration */}
        <TabsContent value="trading" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>📊 Preferencias de Trading</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max posiciones simultáneas</Label>
                  <Select 
                    value={config.trading.max_positions.toString()} 
                    onValueChange={(value) => updateTradingConfig('max_positions', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="8">8</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max pérdida diaria</Label>
                  <Select 
                    value={config.trading.max_daily_loss.toString()} 
                    onValueChange={(value) => updateTradingConfig('max_daily_loss', parseFloat(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-2">-2%</SelectItem>
                      <SelectItem value="-3">-3%</SelectItem>
                      <SelectItem value="-5">-5%</SelectItem>
                      <SelectItem value="-10">-10%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Auto-cerrar en profit</Label>
                <Select 
                  value={config.trading.auto_close_profit.toString()} 
                  onValueChange={(value) => updateTradingConfig('auto_close_profit', parseFloat(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">+5%</SelectItem>
                    <SelectItem value="10">+10%</SelectItem>
                    <SelectItem value="15">+15%</SelectItem>
                    <SelectItem value="20">+20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activar Anti-Codicia</Label>
                    <div className="text-sm text-muted-foreground">
                      Alertas cuando alcanzas take profits
                    </div>
                  </div>
                  <Switch 
                    checked={config.trading.enable_anti_greed}
                    onCheckedChange={(checked) => updateTradingConfig('enable_anti_greed', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bloqueo post-TP1 (5 min)</Label>
                    <div className="text-sm text-muted-foreground">
                      Pausa después del primer take profit
                    </div>
                  </div>
                  <Switch 
                    checked={config.trading.enable_post_tp1_lock}
                    onCheckedChange={(checked) => updateTradingConfig('enable_post_tp1_lock', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas psicológicas</Label>
                    <div className="text-sm text-muted-foreground">
                      Recordatorios sobre estadísticas
                    </div>
                  </div>
                  <Switch 
                    checked={config.trading.enable_psychological_alerts}
                    onCheckedChange={(checked) => updateTradingConfig('enable_psychological_alerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sonidos de notificación</Label>
                    <div className="text-sm text-muted-foreground">
                      Alertas sonoras para eventos importantes
                    </div>
                  </div>
                  <Switch 
                    checked={config.trading.enable_sound_notifications}
                    onCheckedChange={(checked) => updateTradingConfig('enable_sound_notifications', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Configuration */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-600" />
                <span>🔔 Comportamiento de Alertas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiración default</Label>
                  <Select 
                    value={config.alerts.default_expiry_hours.toString()} 
                    onValueChange={(value) => updateAlertsConfig('default_expiry_hours', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Duración de snooze</Label>
                  <Select 
                    value={config.alerts.snooze_duration_minutes.toString()} 
                    onValueChange={(value) => updateAlertsConfig('snooze_duration_minutes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-eliminar expiradas</Label>
                  <div className="text-sm text-muted-foreground">
                    Eliminar automáticamente alertas vencidas
                  </div>
                </div>
                <Switch 
                  checked={config.alerts.auto_delete_expired}
                  onCheckedChange={(checked) => updateAlertsConfig('auto_delete_expired', checked)}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-lg">Notificar cuando:</Label>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Alerta se activa</Label>
                    <Switch 
                      checked={config.alerts.notify_on_trigger}
                      onCheckedChange={(checked) => updateAlertsConfig('notify_on_trigger', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Precio cerca (&lt;2%)</Label>
                    <Switch 
                      checked={config.alerts.notify_on_near_price}
                      onCheckedChange={(checked) => updateAlertsConfig('notify_on_near_price', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Alerta por expirar (1h antes)</Label>
                    <Switch 
                      checked={config.alerts.notify_on_expiry}
                      onCheckedChange={(checked) => updateAlertsConfig('notify_on_expiry', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Posición detectada</Label>
                    <Switch 
                      checked={config.alerts.notify_on_position_detected}
                      onCheckedChange={(checked) => updateAlertsConfig('notify_on_position_detected', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5 text-pink-600" />
                <span>🎨 Tema y Visualización</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tema</Label>
                  <Select 
                    value={config.appearance.theme} 
                    onValueChange={(value) => updateAppearanceConfig('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="auto">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Animaciones</Label>
                  <Select 
                    value={config.appearance.animations} 
                    onValueChange={(value) => updateAppearanceConfig('animations', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin animaciones</SelectItem>
                      <SelectItem value="reduced">Reducidas</SelectItem>
                      <SelectItem value="normal">Normales</SelectItem>
                      <SelectItem value="enhanced">Mejoradas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formato de números</Label>
                  <Select 
                    value={config.appearance.number_format} 
                    onValueChange={(value) => updateAppearanceConfig('number_format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decimal">1,234.56</SelectItem>
                      <SelectItem value="european">1.234,56</SelectItem>
                      <SelectItem value="compact">1.2K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zona horaria</Label>
                  <Select 
                    value={config.appearance.timezone} 
                    onValueChange={(value) => updateAppearanceConfig('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">EST (New York)</SelectItem>
                      <SelectItem value="Europe/London">GMT (London)</SelectItem>
                      <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                      <SelectItem value="America/Los_Angeles">PST (Los Angeles)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sonidos habilitados</Label>
                  <div className="text-sm text-muted-foreground">
                    Activar efectos de sonido en la interfaz
                  </div>
                </div>
                <Switch 
                  checked={config.appearance.sounds_enabled}
                  onCheckedChange={(checked) => updateAppearanceConfig('sounds_enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Manual de Notificaciones */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="h-5 w-5 text-green-600" />
            <span>🧪 Probar Notificaciones</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Test manual de notificaciones</Label>
              <div className="text-sm text-muted-foreground">
                Envía un mensaje de prueba a todos los servicios configurados
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={async () => {
                setTesting('manual-test');
                try {
                  const response = await fetch(`${API_BASE}/notifications/test`, {
                    method: 'POST'
                  });
                  const result = await response.json();
                  
                  toast({
                    title: "✅ Test Completado",
                    description: result.message,
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Error en test manual",
                    variant: "destructive"
                  });
                } finally {
                  setTesting(null);
                }
              }}
              disabled={testing === 'manual-test'}
            >
              {testing === 'manual-test' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Ejecutar Test
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}