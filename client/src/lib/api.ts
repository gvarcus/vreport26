/**
 * Utilidades para hacer requests autenticadas a la API
 */

const API_BASE_URL = '';

/**
 * Obtiene el token JWT del localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('authToken');
}

/**
 * Guarda el token JWT en localStorage
 */
export function setAuthToken(token: string): void {
  localStorage.setItem('authToken', token);
}

/**
 * Elimina el token JWT del localStorage
 */
export function removeAuthToken(): void {
  localStorage.removeItem('authToken');
}

/**
 * Hace una request autenticada a la API
 * Incluye automáticamente el token JWT en el header Authorization
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Obtener token CSRF si está disponible
  const csrfToken = localStorage.getItem('csrfToken');
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken);
  }

  return fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });
}

/**
 * Obtiene el token CSRF del servidor
 */
export async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/csrf-token');
    const data = await response.json();
    if (data.success && data.csrfToken) {
      localStorage.setItem('csrfToken', data.csrfToken);
      return data.csrfToken;
    }
  } catch (error) {
    console.error('Error obteniendo token CSRF:', error);
  }
  return null;
}

