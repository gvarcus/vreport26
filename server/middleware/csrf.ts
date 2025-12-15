import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { logCsrfFailure } from '../utils/securityLogger.js';

// Store CSRF tokens in memory (en producción, usar Redis o similar)
const csrfTokens = new Map<string, { token: string; expires: number }>();

const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hora

/**
 * Genera un token CSRF y lo almacena
 */
export function generateCsrfToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + CSRF_TOKEN_EXPIRY;
  
  // Usar un ID único para asociar el token
  const tokenId = crypto.randomBytes(16).toString('hex');
  csrfTokens.set(tokenId, { token, expires });
  
  // Limpiar tokens expirados periódicamente
  cleanupExpiredTokens();
  
  return `${tokenId}:${token}`;
}

/**
 * Valida un token CSRF
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const [tokenId, tokenValue] = token.split(':');
  if (!tokenId || !tokenValue) {
    return false;
  }

  const stored = csrfTokens.get(tokenId);
  if (!stored) {
    return false;
  }

  // Verificar expiración
  if (Date.now() > stored.expires) {
    csrfTokens.delete(tokenId);
    return false;
  }

  // Verificar que el token coincida
  if (stored.token !== tokenValue) {
    return false;
  }

  // Eliminar el token después de usarlo (one-time use)
  csrfTokens.delete(tokenId);
  return true;
}

/**
 * Limpia tokens expirados
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  const entries = Array.from(csrfTokens.entries());
  for (const [tokenId, data] of entries) {
    if (now > data.expires) {
      csrfTokens.delete(tokenId);
    }
  }
}

/**
 * Middleware para generar token CSRF (para GET requests)
 */
export function csrfToken(req: Request, res: Response, next: NextFunction) {
  // Solo generar token para métodos seguros (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const token = generateCsrfToken();
    res.locals.csrfToken = token;
    // También enviar en header para fácil acceso desde el cliente
    res.setHeader('X-CSRF-Token', token);
  }
  next();
}

/**
 * Middleware para validar token CSRF (para métodos que modifican estado)
 */
export function validateCsrf(req: Request, res: Response, next: NextFunction) {
  // Solo validar para métodos que modifican estado
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Obtener token del header o del body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  
  if (!token || !validateCsrfToken(token as string)) {
    logCsrfFailure(req, req.path);
    return res.status(403).json({
      success: false,
      message: 'Token CSRF inválido o faltante',
    });
  }

  next();
}

