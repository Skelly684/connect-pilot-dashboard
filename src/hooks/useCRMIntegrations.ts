import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CRMIntegration {
  id: string;
  provider: string;
  is_active: boolean;
  auto_sync: boolean;
  last_sync_at: string | null;
  sync_settings: any;
  created_at: string;
  updated_at: string;
}

export interface CRMSyncLog {
  id: string;
  integration_id: string;
  lead_id: string | null;
  sync_type: string;
  status: string;
  error_message: string | null;
  external_id: string | null;
  synced_at: string;
}

export function useCRMIntegrations() {
  const [integrations, setIntegrations] = useState<CRMIntegration[]>([]);
  const [syncLogs, setSyncLogs] = useState<CRMSyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch user's CRM integrations
  const fetchIntegrations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error: any) {
      console.error('Error fetching CRM integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load CRM integrations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Connect to a CRM
  const connectCRM = async (provider: string, apiKey: string) => {
    try {
      setIsLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('crm-sync', {
        body: {
          action: 'connect',
          provider,
          apiKey
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Success",
          description: `Connected to ${provider} successfully!`,
        });
        await fetchIntegrations(); // Refresh list
        return true;
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Error connecting to CRM:', error);
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect to ${provider}`,
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sync leads to CRM
  const syncLeads = async (integrationId: string, leadIds?: string[]) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('crm-sync', {
        body: {
          action: 'sync',
          integrationId,
          leadIds
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sync Complete",
          description: `Successfully synced ${data.synced_count} leads to CRM`,
        });
        await fetchIntegrations(); // Refresh to update last_sync_at
        return data.results;
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Error syncing to CRM:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync leads to CRM",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect CRM
  const disconnectCRM = async (integrationId: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('crm-sync', {
        body: {
          action: 'disconnect',
          integrationId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Disconnected",
          description: "CRM integration removed successfully",
        });
        await fetchIntegrations(); // Refresh list
        return true;
      } else {
        throw new Error(data.error || 'Disconnect failed');
      }
    } catch (error: any) {
      console.error('Error disconnecting CRM:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect CRM",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle auto sync
  const toggleAutoSync = async (integrationId: string, autoSync: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke('crm-sync', {
        body: {
          action: 'toggle_auto_sync',
          integrationId,
          auto_sync: autoSync
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: autoSync ? "Auto-sync Enabled" : "Auto-sync Disabled",
          description: `Automatic synchronization has been ${autoSync ? "enabled" : "disabled"}`,
        });
        await fetchIntegrations(); // Refresh list
        return true;
      } else {
        throw new Error(data.error || 'Toggle failed');
      }
    } catch (error: any) {
      console.error('Error toggling auto-sync:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update auto-sync setting",
        variant: "destructive",
      });
      return false;
    }
  };

  // Fetch sync logs
  const fetchSyncLogs = async (integrationId?: string) => {
    try {
      let query = supabase
        .from('crm_sync_logs')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(50);

      if (integrationId) {
        query = query.eq('integration_id', integrationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setSyncLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching sync logs:', error);
    }
  };

  // Auto-sync replied leads (called when lead status changes to 'replied')
  const autoSyncRepliedLeads = async () => {
    const autoSyncIntegrations = integrations.filter(integration => 
      integration.is_active && integration.auto_sync
    );

    for (const integration of autoSyncIntegrations) {
      try {
        await syncLeads(integration.id); // This will sync only replied leads
      } catch (error) {
        console.error(`Auto-sync failed for integration ${integration.id}:`, error);
      }
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  return {
    integrations,
    syncLogs,
    isLoading,
    connectCRM,
    syncLeads,
    disconnectCRM,
    toggleAutoSync,
    fetchIntegrations,
    fetchSyncLogs,
    autoSyncRepliedLeads
  };
}