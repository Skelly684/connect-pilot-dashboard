// API Configuration with localStorage support
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return '/api';
  return localStorage.getItem('API_BASE_URL') || '/api';
};

export let API_BASE_URL = getApiBaseUrl();

// Update API_BASE_URL when settings change
if (typeof window !== 'undefined') {
  window.addEventListener('api-config-changed', (event: any) => {
    API_BASE_URL = event.detail.apiBaseUrl || '/api';
  });
}

export const API_ENDPOINTS = {
  ACCEPTED_LEADS: '/api/accepted-leads',
  HEALTH: '/api/health',
  CALENDAR_LIST: '/api/calendar/list',
  CALENDAR_BOOK: '/api/calendar/book',
  CALENDAR_EVENTS: '/calendar/events',
  CALENDAR_CALENDARS: '/calendar/calendars',
  OAUTH_GOOGLE_START: '/oauth/google/start',
  OAUTH_STATUS: '/oauth/google/status',
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => {
  const baseUrl = typeof window !== 'undefined' ? 
    localStorage.getItem('API_BASE_URL') || '/api' : '/api';
  
  if (baseUrl === '/api') {
    return endpoint; // Same origin
  }
  
  return `${baseUrl}${endpoint}`;
};