import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthToken, setAuthToken, removeAuthToken, authenticatedFetch, fetchCsrfToken } from '@/lib/api';

interface User {
  uid: number;
  name: string;
  username: string;
  partner_display_name: string;
  company_id: number;
  partner_id: number;
  server_version: string;
  db: string;
  is_admin: boolean;
  is_system: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });

  const checkAuth = useCallback(async () => {
    const token = getAuthToken();
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        // Verificar que el token sigue siendo válido haciendo una request al servidor
        // Por ahora, confiamos en el token del localStorage, pero en producción
        // deberíamos verificar con el servidor
        setAuthState({
          user: parsedUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      } catch (error) {
        // Si hay error al parsear, limpiar localStorage
        localStorage.removeItem('user');
        removeAuthToken();
      }
    }

    return false;
  }, []);

  // Inicializar estado de autenticación al montar el componente
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login: email, password }),
      });

      const result = await response.json();

      if (result.success) {
        const user = result.data;
        const token = user.token;
        
        // Guardar token JWT
        if (token) {
          setAuthToken(token);
        }
        
        // Remover token del objeto user antes de guardarlo
        const { token: _, ...userWithoutToken } = user;
        
        // Guardar usuario en localStorage
        localStorage.setItem('user', JSON.stringify(userWithoutToken));

        // Obtener token CSRF
        await fetchCsrfToken();

        setAuthState({
          user: userWithoutToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return { success: true, user: userWithoutToken };
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: result.message || 'Error de autenticación',
        }));
        return { success: false, error: result.message };
      }
    } catch (error) {
      const errorMessage = 'Error de conexión con el servidor';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Obtener token CSRF antes de hacer logout
      const csrfToken = localStorage.getItem('csrfToken');
      
      // Llamar al endpoint de logout del servidor con autenticación
      await authenticatedFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error al cerrar sesión en el servidor:', error);
      // Continuar con el logout local aunque falle el servidor
    }

    // Limpiar datos locales
    localStorage.removeItem('user');
    removeAuthToken();
    localStorage.removeItem('csrfToken');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });

    // Redirigir al login después del logout
    navigate('/');
  }, [navigate]);

  return {
    ...authState,
    login,
    logout,
    checkAuth,
  };
}
