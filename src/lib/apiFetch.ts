import { appConfig } from './appConfig';

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

export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<any> {
  const baseUrl = appConfig.getApiBaseUrl();
  
  // Ensure path starts with /api for API endpoints
  let apiPath = path;
  if (!path.startsWith('/api/')) {
    if (path.startsWith('/')) {
      apiPath = `/api${path}`;
    } else {
      apiPath = `/api/${path}`;
    }
  }
  
  // Construct full URL
  const fullUrl = baseUrl === '/api' ? apiPath : `${baseUrl}${apiPath}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add user ID header if available
  const userId = localStorage.getItem('user_id');
  if (userId) {
    defaultHeaders['X-User-Id'] = userId;
  }

  const requestOptions: RequestInit = {
    ...options,
    credentials: 'omit', // Explicitly omit credentials for CORS
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(fullUrl, requestOptions);
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      throw new ApiError(
        `Expected JSON response but received ${contentType || 'unknown content type'}. Response: ${responseText.substring(0, 300)}${responseText.length > 300 ? '...' : ''}`,
        response.status,
        fullUrl,
        responseText
      );
    }

    // Parse JSON
    const data = await response.json();

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