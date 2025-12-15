import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request, Response } from 'express';
import { logRateLimitExceeded } from '../utils/securityLogger.js';

/**
 * Rate limiter para el endpoint de login
 * Limita a 5 intentos por IP cada 15 minutos
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos por ventana de tiempo
  message: {
    success: false,
    message: 'Demasiados intentos de login. Por favor, intenta nuevamente en 15 minutos',
  },
  standardHeaders: true, // Retorna información de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  // Usar IP del cliente con soporte IPv6
  keyGenerator: ipKeyGenerator,
  handler: (req: Request, res: Response) => {
    logRateLimitExceeded(req, '/api/auth/login');
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de login. Por favor, intenta nuevamente en 15 minutos',
    });
  },
});

/**
 * Rate limiter para endpoints de reportes
 * Limita a 30 requests por minuto
 */
export const reportsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Usar IP del cliente o ID de usuario si está autenticado
    const user = (req as any).user;
    if (user && user.uid) {
      return `user:${user.uid}`;
    }
    // Usar el helper de express-rate-limit para IPv6
    return ipKeyGenerator(req);
  },
  handler: (req: Request, res: Response) => {
    logRateLimitExceeded(req, req.path);
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente',
    });
  },
});

/**
 * Rate limiter general para otros endpoints
 * Limita a 100 requests por minuto
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Por favor, espera un momento',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Usar el helper de express-rate-limit para IPv6
  keyGenerator: ipKeyGenerator,
});

