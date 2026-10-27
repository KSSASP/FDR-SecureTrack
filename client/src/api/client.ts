function getApiBaseUrl(): string {
  const envUrl = ((import.meta as any).env?.VITE_API_BASE_URL || '').trim();
  if (!envUrl) return '/api';
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export const API_BASE = getApiBaseUrl();

export function getAuthToken(): string | null {
  return localStorage.getItem('fdr_token');
}

export function getDocumentPreviewUrl(docId: string): string {
  const token = localStorage.getItem('fdr_token');
  return `${API_BASE}/documents/${docId}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export function getDocumentDownloadUrl(docId: string): string {
  const token = localStorage.getItem('fdr_token');
  return `${API_BASE}/documents/${docId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('fdr_token');
  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set JSON content-type
  if (!(options.body instanceof FormData) && !headers['Content-Type' as keyof HeadersInit]) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('fdr_token');
    localStorage.removeItem('fdr_user');
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }

  // If response is a file download (e.g. CSV)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/csv') || contentType.includes('application/octet-stream')) {
    const blob = await response.blob();
    return blob as unknown as T;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}
