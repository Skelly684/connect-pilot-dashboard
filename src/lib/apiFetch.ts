import { appConfig } from './appConfig';
import { supabase } from '@/integrations/supabase/client';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string,
    public responseText?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'credentials'> {
  headers?: Record<string, string>;
}

// Helper to build proper API URLs
export const apiUrl = (path: string): string => {
  // If already absolute URL, return as-is
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  
  const baseUrl = appConfig.getApiBaseUrl();
  const base = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${base}${normalizedPath}`;
};

export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  // Get current user ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id || '';
  
  // Create headers object
  const headers = new Headers(init.headers || {});
  headers.set('X-User-Id', uid);
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
  headers.set('Accept', 'application/json');
  headers.set('ngrok-skip-browser-warning', 'true');

  // Build full URL using apiUrl helper
  const fullUrl = apiUrl(path);

  const requestOptions: RequestInit = {
    ...init,
    headers,
    credentials: 'omit',
  };

  try {
    const response = await fetch(fullUrl, requestOptions);
    
    // Check content type
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (!contentType || !contentType.includes('application/json')) {
      // Try to handle non-JSON responses that might still contain JSON
      const responseText = await response.text();
      
      // Check if it looks like JSON (starts with { or [)
      const trimmedText = responseText.trim();
      if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
        try {
          data = JSON.parse(trimmedText);
        } catch (parseError) {
          throw new ApiError(
            `Response appears to be JSON but failed to parse. Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`,
            response.status,
            fullUrl,
            responseText
          );
        }
      } else {
        throw new ApiError(
          `Expected JSON response but received ${contentType || 'unknown content type'}. Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`,
          response.status,
          fullUrl,
          responseText
        );
      }
    } else {
      // Parse JSON normally
      data = await response.json();
    }

    // Check if response is ok
    if (!response.ok) {
      throw new ApiError(
        data.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        fullUrl,
        JSON.stringify(data)
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      fullUrl
    );
  }
}

export async function fetchLeadActivity(leadId: string) {
  const url = `/api/lead-activity/${encodeURIComponent(leadId)}`;
  
  const resp = await apiFetch(url);
  
  return {
    lead: resp.lead ?? null,
    calls: Array.isArray(resp.calls) ? resp.calls : [],
    emails: Array.isArray(resp.emails) ? resp.emails : []
  };
}