// Persistent app configuration store
export interface AppConfig {
  api_base_url: string;
}

const CONFIG_KEY = 'psn.app_config';

const DEFAULT_CONFIG: AppConfig = {
  api_base_url: 'https://leads-automation-apel.onrender.com/api'
};

export class AppConfigStore {
  private static instance: AppConfigStore;
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AppConfigStore {
    if (!AppConfigStore.instance) {
      AppConfigStore.instance = new AppConfigStore();
    }
    return AppConfigStore.instance;
  }

  private loadConfig(): AppConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    
    try {
      const stored = localStorage.getItem(CONFIG_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load app config:', error);
    }
    
    return DEFAULT_CONFIG;
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
      
      // Dispatch event for components that need to react to config changes
      window.dispatchEvent(new CustomEvent('app-config-changed', {
        detail: this.config
      }));
    } catch (error) {
      console.error('Failed to save app config:', error);
    }
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getApiBaseUrl(): string {
    return this.config.api_base_url;
  }

  setApiBaseUrl(url: string): void {
    // Trim whitespace and remove trailing '/api' if present
    const trimmed = url.trim().replace(/\/api$/, '');
    
    if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    // Remove trailing slash for consistency, but keep "/api" as default for empty input
    const normalized = trimmed === '' ? '/api' : trimmed.replace(/\/$/, '');
    
    this.config.api_base_url = normalized;
    this.saveConfig();
  }
}

// Export singleton instance
export const appConfig = AppConfigStore.getInstance();