/**
 * Logger de seguridad para eventos importantes
 * Registra intentos de login, accesos a endpoints protegidos, etc.
 */

interface SecurityEvent {
  type: 'login_success' | 'login_failure' | 'token_expired' | 'unauthorized_access' | 'rate_limit_exceeded' | 'csrf_failure';
  timestamp: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * Registra un evento de seguridad
 */
export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
  const logEntry: SecurityEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  // En producción, esto debería ir a un sistema de logging centralizado
  // Por ahora, lo registramos en consola con formato estructurado
  console.log('[SECURITY]', JSON.stringify(logEntry));

  // TODO: En producción, enviar a:
  // - Sistema de logging centralizado (ELK, Splunk, etc.)
  // - Base de datos de auditoría
  // - Sistema de alertas si es crítico
}

/**
 * Helper para obtener información del request
 */
export function getRequestInfo(req: any): { ip?: string; userAgent?: string } {
  return {
    ip: req.ip || req.socket?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

/**
 * Registrar intento de login exitoso
 */
export function logLoginSuccess(req: any, userId: number, username: string) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'login_success',
    ip,
    userAgent,
    details: {
      userId,
      username,
    },
  });
}

/**
 * Registrar intento de login fallido
 */
export function logLoginFailure(req: any, username?: string, reason?: string) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'login_failure',
    ip,
    userAgent,
    details: {
      username: username || 'unknown',
      reason: reason || 'invalid_credentials',
    },
  });
}

/**
 * Registrar token expirado
 */
export function logTokenExpired(req: any, userId?: number) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'token_expired',
    ip,
    userAgent,
    details: {
      userId,
    },
  });
}

/**
 * Registrar acceso no autorizado
 */
export function logUnauthorizedAccess(req: any, endpoint: string, reason?: string) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'unauthorized_access',
    ip,
    userAgent,
    details: {
      endpoint,
      method: req.method,
      reason: reason || 'missing_or_invalid_token',
    },
  });
}

/**
 * Registrar rate limit excedido
 */
export function logRateLimitExceeded(req: any, endpoint: string) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'rate_limit_exceeded',
    ip,
    userAgent,
    details: {
      endpoint,
      method: req.method,
    },
  });
}

/**
 * Registrar fallo de CSRF
 */
export function logCsrfFailure(req: any, endpoint: string) {
  const { ip, userAgent } = getRequestInfo(req);
  logSecurityEvent({
    type: 'csrf_failure',
    ip,
    userAgent,
    details: {
      endpoint,
      method: req.method,
    },
  });
}








