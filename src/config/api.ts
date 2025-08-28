// API Configuration with fallback chain
export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (typeof window !== 'undefined' && (window as any).API_BASE_URL) ||
  (typeof window !== 'undefined' && localStorage.getItem('API_BASE_URL')) ||
  'https://dafed33295c9.ngrok-free.app';

export const API_ENDPOINTS = {
  ACCEPTED_LEADS: '/api/accepted-leads',
  HEALTH: '/api/health',
  CALENDAR_LIST: '/api/calendar/list',
  CALENDAR_BOOK: '/api/calendar/book',
  OAUTH_GOOGLE_START: '/oauth/google/start',
  OAUTH_STATUS: '/oauth/status',
} as const;