import { useState } from 'react';
import { cn } from '@/lib/utils';
import { 
  BarChart3, 
  Bell, 
  TrendingUp, 
  Settings, 
  Monitor,
  Smartphone
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, emoji: '📊' },
  { id: 'alerts', label: 'Alertas', icon: Bell, emoji: '🔔' },
  { id: 'trading', label: 'Trading', icon: TrendingUp, emoji: '📈' },
  { id: 'system', label: 'Sistema', icon: Monitor, emoji: '🖥️' },
  { id: 'settings', label: 'Configuración', icon: Settings, emoji: '⚙️' },
];

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border">
        <div className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center px-2 py-1 text-xs transition-colors",
                  isActive 
                    ? "text-primary bg-surface-hover" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b border-border bg-surface">
      <div className="container px-4">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                  isActive
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                )}
              >
                <span className="text-base">{tab.emoji}</span>
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}