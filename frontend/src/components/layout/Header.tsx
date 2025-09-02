import { useState, useEffect } from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-header backdrop-blur supports-[backdrop-filter]:bg-gradient-header/95">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">CryptoAlert System</h1>
              <p className="text-xs text-white/70">Trading Analytics & Management</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-white/80">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-danger" />
            )}
            <span className="text-sm">
              {isConnected ? 'Connected' : 'Offline'}
            </span>
          </div>

          <div className="text-right">
            <div className="text-sm font-medium text-white">
              {lastUpdate.toLocaleTimeString()}
            </div>
            <div className="text-xs text-white/70">
              Last update
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}