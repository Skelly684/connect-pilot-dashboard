import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { appConfig } from '@/lib/appConfig';
import { apiFetch } from '@/lib/apiFetch';

export const ApiStatusBanner = () => {
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setApiBaseUrl(appConfig.getApiBaseUrl());

    const handleConfigChange = () => {
      setApiBaseUrl(appConfig.getApiBaseUrl());
      checkHealth();
    };

    window.addEventListener('app-config-changed', handleConfigChange);
    checkHealth();

    return () => {
      window.removeEventListener('app-config-changed', handleConfigChange);
    };
  }, []);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      await apiFetch('/api/health');
      setIsHealthy(true);
    } catch (error) {
      setIsHealthy(false);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) return null;
    return isHealthy ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-600" />
    );
  };

  const getStatusBadge = () => {
    if (isChecking) {
      return <Badge variant="secondary">Checking...</Badge>;
    }
    return (
      <Badge variant={isHealthy ? "default" : "destructive"} className={isHealthy ? "bg-green-100 text-green-800" : ""}>
        {getStatusIcon()}
        <span className="ml-1">{isHealthy ? 'Connected' : 'Disconnected'}</span>
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between bg-muted/50 border border-border rounded-lg p-3 mb-4">
      <div className="flex items-center gap-3">
        <div className="text-sm">
          <span className="text-muted-foreground">API:</span>
          <span className="ml-1">{isHealthy ? 'Connected' : 'Disconnected'}</span>
        </div>
        {getStatusBadge()}
      </div>
      
      <Button variant="outline" size="sm" asChild>
        <Link to="/settings">
          <Settings className="h-4 w-4 mr-2" />
          Change
        </Link>
      </Button>
    </div>
  );
};