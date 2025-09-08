import { supabase } from '@/integrations/supabase/client';

// Central API helper
const API_BASE = 'https://psn-backend.fly.dev';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('No auth user — cannot call backend');

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-User-Id', user.id); // 👈 REQUIRED

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'POST',
    headers,
    body: options.body,
    // credentials are NOT needed here (no cookies with backend)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Backend ${res.status}: ${text || 'Request failed'}`);
  }
  return res.json();
}

// Helper to build proper API URLs (backwards compatibility)
export const apiUrl = (path: string): string => {
  // If already absolute URL, return as-is
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

export async function fetchLeadActivity(leadId: string) {
  const url = `/api/lead-activity/${encodeURIComponent(leadId)}`;
  
  // Get current user ID from Supabase auth
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || '';
  
  const resp = await fetch(apiUrl(url), { 
    headers: { 
      "Accept": "application/json",
      "ngrok-skip-browser-warning": "true",
      "X-User-Id": userId
    } 
  });
  
  const ctype = resp.headers.get("content-type") || "";
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Activity HTTP ${resp.status}: ${text.slice(0,200)}`);
  }
  
  if (!ctype.includes("application/json")) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Activity returned non-JSON: ${text.slice(0,200)}`);
  }
  
  const data = await resp.json();
  return {
    lead: data.lead ?? null,
    calls: Array.isArray(data.calls) ? data.calls : [],
    emails: Array.isArray(data.emails) ? data.emails : []
  };
}