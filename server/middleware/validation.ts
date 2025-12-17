import { body, validationResult, type ValidationChain } from 'express-validator';
import type { Request, Response, NextFunction } from 'express';

/**
 * Validador para el endpoint de login
 */
export const validateLogin = [
  body('login')
    .trim()
    .notEmpty()
    .withMessage('El campo login es requerido')
    .isLength({ min: 3, max: 255 })
    .withMessage('El login debe tener entre 3 y 255 caracteres'),
  body('password')
    .notEmpty()
    .withMessage('El campo password es requerido')
    .isLength({ min: 1 })
    .withMessage('El password es requerido'),
];

/**
 * Validador para endpoints de reportes con fechas
 */
export const validateDateRange = [
  body('dateFrom')
    .notEmpty()
    .withMessage('El campo dateFrom es requerido')
    .custom((value) => {
      // Aceptar formato YYYY-MM-DD o ISO8601 completo
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!dateRegex.test(value)) {
        throw new Error('dateFrom debe ser una fecha válida en formato YYYY-MM-DD o ISO8601');
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('dateFrom debe ser una fecha válida');
      }
      return true;
    }),
  body('dateTo')
    .notEmpty()
    .withMessage('El campo dateTo es requerido')
    .custom((value) => {
      // Aceptar formato YYYY-MM-DD o ISO8601 completo
      const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
      if (!dateRegex.test(value)) {
        throw new Error('dateTo debe ser una fecha válida en formato YYYY-MM-DD o ISO8601');
      }
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('dateTo debe ser una fecha válida');
      }
      return true;
    })
    .custom((value, { req }) => {
      const dateFrom = new Date(req.body.dateFrom);
      const dateTo = new Date(value);
      if (dateTo < dateFrom) {
        throw new Error('dateTo debe ser posterior a dateFrom');
      }
      return true;
    }),
];

/**
 * Validador para paginación
 */
export const validatePagination = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un número entero mayor a 0'),
  body('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('pageSize debe ser un número entre 1 y 100'),
];

/**
 * Middleware para manejar errores de validación
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array(),
    });
  }
  next();
}

/**
 * Combinar validadores
 */
export function combineValidators(...validators: ValidationChain[]) {
  return [...validators, handleValidationErrors];
}








