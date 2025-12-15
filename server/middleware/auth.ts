import type { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { logTokenExpired, logUnauthorizedAccess } from '../utils/securityLogger.js';

/**
 * Middleware de autenticación que verifica tokens JWT
 * Requiere que el cliente envíe el token en el header Authorization: Bearer <token>
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    // Intentar obtener token del header Authorization
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logUnauthorizedAccess(req, req.path, 'missing_token');
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación',
      });
    }

    // Verificar y decodificar el token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        logTokenExpired(req, undefined);
      } else {
        logUnauthorizedAccess(req, req.path, 'invalid_token');
      }
      throw error;
    }

    // Agregar información del usuario al request para uso en rutas
    (req as any).user = {
      uid: decoded.uid,
      username: decoded.username,
      name: decoded.name,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        logTokenExpired(req, undefined);
        return res.status(401).json({
          success: false,
          message: 'Token expirado. Por favor, inicia sesión nuevamente',
        });
      } else if (error.message === 'Invalid token') {
        logUnauthorizedAccess(req, req.path, 'invalid_token');
        return res.status(401).json({
          success: false,
          message: 'Token inválido',
        });
      }
    }

    logUnauthorizedAccess(req, req.path, 'authentication_error');
    return res.status(401).json({
      success: false,
      message: 'Error de autenticación',
    });
  }
}

/**
 * Middleware opcional de autenticación
 * No bloquea la request si no hay token, pero agrega el usuario si existe
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      (req as any).user = {
        uid: decoded.uid,
        username: decoded.username,
        name: decoded.name,
      };
    }
  } catch (error) {
    // Ignorar errores en autenticación opcional
  }

  next();
}

