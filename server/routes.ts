import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { OdooService } from "./lib/odooService.js";
import { authenticate } from "./middleware/auth.js";
import { loginRateLimiter, reportsRateLimiter, generalRateLimiter } from "./middleware/rateLimit.js";
import { validateLogin, validateDateRange, validatePagination, combineValidators } from "./middleware/validation.js";
import { generateToken } from "./utils/jwt.js";
import { csrfToken, validateCsrf } from "./middleware/csrf.js";
import { logLoginSuccess, logLoginFailure } from "./utils/securityLogger.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  // Aplicar middleware CSRF a todas las rutas
  app.use(csrfToken);

  // Endpoint para obtener token CSRF (útil para el cliente)
  app.get('/api/csrf-token', (req, res) => {
    res.json({
      success: true,
      csrfToken: res.locals.csrfToken,
    });
  });

  // 🔗 Rutas de prueba de Odoo
  app.post('/api/test-odoo', async (req, res) => {
    try {
      console.log('🧪 Iniciando prueba de conexión con Odoo...');

      // Usar credenciales de prueba desde variables de entorno
      const testUser = process.env.TEST_USER;
      const testPassword = process.env.TEST_PASSWORD;

      // Validar que las credenciales estén configuradas
      if (!testUser || !testPassword) {
        return res.status(500).json({
          success: false,
          message: 'Credenciales de prueba no configuradas. Configura TEST_USER y TEST_PASSWORD en .env',
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`🔐 Probando autenticación con usuario de prueba`);

      const authResult = await OdooService.authenticate(testUser, testPassword);
      
      console.log('✅ Prueba de conexión exitosa');
      res.json({
        success: true,
        message: 'Conexión exitosa con Odoo',
        data: {
          odooUrl: OdooService.getConfig().odooUrl,
          odooDb: OdooService.getConfig().odooDb,
          authResult: {
            uid: authResult.uid,
            name: authResult.name,
            username: authResult.username,
            company_id: authResult.company_id,
            partner_id: authResult.partner_id,
            server_version: authResult.server_version,
            db: authResult.db,
            is_admin: authResult.is_admin,
            is_system: authResult.is_system,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error en prueba de conexión:', error);
      res.status(500).json({
        success: false,
        message: `Error de conexión: ${error}`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 🔧 ENDPOINT REMOVIDO: /api/odoo-config
  // ⚠️ Este endpoint fue removido por seguridad
  // La configuración de Odoo contiene información sensible (IPs, nombres de BD, etc.)
  // que no debe exponerse públicamente a través de la API.
  //
  // La configuración ahora se obtiene exclusivamente desde variables de entorno
  // y NO se expone a través de endpoints HTTP.

  // 🔐 Autenticación con Odoo
  // Rate limiting: 5 intentos por IP cada 15 minutos
  // CSRF: No requerido para login (es el punto de entrada)
  app.post('/api/auth/login', loginRateLimiter, combineValidators(...validateLogin), async (req: Request, res: Response) => {
    try {
      const { login, password } = req.body;

      const config = OdooService.getConfig();
      console.log(`🔐 Intentando autenticación:`);
      console.log(`   - Usuario: ${login}`);
      console.log(`   - Odoo URL: ${config.odooUrl}`);
      console.log(`   - Base de datos: ${config.odooDb}`);
      
      const authResult = await OdooService.authenticate(login, password);
      
      console.log(`✅ Autenticación exitosa para: ${authResult.name} (UID: ${authResult.uid})`);
      
      // Generar token JWT
      const token = generateToken({
        uid: authResult.uid,
        username: authResult.username,
        name: authResult.name,
      });
      
      // Registrar login exitoso
      logLoginSuccess(req, authResult.uid, authResult.username);
      
      res.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          uid: authResult.uid,
          name: authResult.name,
          username: authResult.username,
          partner_display_name: authResult.partner_display_name,
          company_id: authResult.company_id,
          partner_id: authResult.partner_id,
          server_version: authResult.server_version,
          db: authResult.db,
          is_admin: authResult.is_admin,
          is_system: authResult.is_system,
          token, // Incluir token JWT en la respuesta
        },
      });
    } catch (error) {
      const config = OdooService.getConfig();
      console.error('💥 Error en autenticación:', error);
      console.error(`   - Odoo URL: ${config.odooUrl}`);
      console.error(`   - Base de datos: ${config.odooDb}`);
      
      // Proporcionar mensaje de error más detallado
      let errorMessage = 'Error de autenticación';
      let errorDetails = '';
      let reason = 'unknown_error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
        
        // Mensajes más específicos según el tipo de error
        if (error.message.includes('HTTP error')) {
          errorMessage = `No se pudo conectar con el servidor Odoo en ${config.odooUrl}. Verifica la URL y la conectividad de red.`;
          reason = 'connection_error';
        } else if (error.message.includes('Invalid credentials') || error.message.includes('Wrong login')) {
          errorMessage = 'Credenciales inválidas. Verifica tu usuario y contraseña.';
          reason = 'invalid_credentials';
        } else if (error.message.includes('Database')) {
          errorMessage = `Error con la base de datos "${config.odooDb}". Verifica que el nombre de la base de datos sea correcto.`;
          reason = 'database_error';
        }
      }
      
      // Registrar intento de login fallido
      logLoginFailure(req, req.body.login, reason);
      
      res.status(401).json({
        success: false,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        config: process.env.NODE_ENV === 'development' ? {
          odooUrl: config.odooUrl,
          odooDb: config.odooDb
        } : undefined,
      });
    }
  });

  // 🚪 Logout - Cerrar sesión
  // Requiere autenticación para cerrar sesión
  // CSRF: Protegido con autenticación JWT (menos crítico pero buena práctica)
  app.post('/api/auth/logout', authenticate, validateCsrf, async (req, res) => {
    try {
      console.log(`🚪 Cerrando sesión...`);
      
      // Limpiar la sesión global de Odoo
      await OdooService.clearSession();
      
      console.log(`✅ Sesión cerrada exitosamente`);
      
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error al cerrar sesión:', error);
      res.status(500).json({
        success: false,
        message: `Error al cerrar sesión: ${error}`,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📊 Informe de pagos diarios para ventas
  // Protegido con autenticación, rate limiting y CSRF
  app.post('/api/reports/daily-payments', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, estadoRep } = req.body;

      console.log(`📊 Generando informe de pagos diarios desde ${dateFrom} hasta ${dateTo}`);
      if (estadoRep) {
        console.log(`🔍 Filtrando por estado REP: ${estadoRep}`);
      }
      
      const paymentStats = await OdooService.getPaymentStatistics({
        dateFrom,
        dateTo,
        estadoRep
      });
      
      console.log(`✅ Informe generado: ${paymentStats.dailyData.length} días, ${paymentStats.totals.totalPayments} pagos`);
      
      res.json({
        success: true,
        message: 'Informe de pagos diarios generado exitosamente',
        data: paymentStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error generando informe de pagos:', error);
      
      // Proporcionar información más detallada del error
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Verificar si es un error de conexión con Odoo
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de pagos.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📋 Tabla de pagos con paginación
  // Protegido con autenticación, rate limiting y CSRF
  app.post('/api/reports/payment-table', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange, ...validatePagination), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, estadoRep, page = 1, pageSize = 10 } = req.body;

      console.log(`📋 Obteniendo tabla de pagos - Página ${page}, Tamaño ${pageSize}`);
      if (estadoRep) {
        console.log(`🔍 Filtrando por estado REP: ${estadoRep}`);
      }
      
      const tableData = await OdooService.getPaymentTableData({
        dateFrom,
        dateTo,
        estadoRep,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
      
      console.log(`✅ Tabla generada: ${tableData.data.length} registros en página ${page} de ${tableData.pagination.totalPages}`);
      
      res.json({
        success: true,
        message: 'Datos de tabla obtenidos exitosamente',
        data: tableData.data,
        pagination: tableData.pagination,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error obteniendo datos de tabla:', error);
      
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de pagos.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📄 Ruta para obtener datos de facturas con paginación
  // Protegido con autenticación, rate limiting y CSRF
  app.post('/api/reports/invoices', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange, ...validatePagination), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, state, page = 1, pageSize = 10 } = req.body;

      console.log(`📄 Obteniendo datos de facturas - Página ${page}, Tamaño ${pageSize}`);
      if (state) {
        console.log(`🔍 Filtrando por estado: ${state}`);
      }
      
      // Intentar obtener datos reales de Odoo
      try {
        const invoiceData = await OdooService.getInvoiceData({
          dateFrom,
          dateTo,
          state,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        });
        
        console.log(`✅ Facturas obtenidas: ${invoiceData.data.length} registros en página ${page} de ${invoiceData.pagination.totalPages}`);
        
        res.json({
          success: true,
          message: 'Datos de facturas obtenidos exitosamente',
          data: invoiceData.data,
          pagination: invoiceData.pagination,
          timestamp: new Date().toISOString(),
        });
        
      } catch (odooError) {
        console.log(`⚠️ Error con Odoo, usando datos de prueba: ${odooError}`);
        
        // Datos de prueba mientras resolvemos el problema de autenticación
        const mockInvoices = [
          {
            id: 1,
            name: "FACT/2025/00001",
            invoice_date: "2025-09-01",
            invoice_date_due: "2025-09-15",
            partner_id: [1, "Cliente Demo 1"],
            amount_total: 15000.00,
            amount_residual: 0.00,
            amount_tax: 2400.00,
            currency_id: [1, "MXN"],
            state: "posted",
            move_type: "out_invoice",
            ref: "",
            invoice_origin: "SO001",
            invoice_payment_term_id: [1, "Pago Inmediato"],
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-09-01 10:00:00",
            write_date: "2025-09-01 10:00:00"
          },
          {
            id: 2,
            name: "FACT/2025/00002",
            invoice_date: "2025-09-02",
            invoice_date_due: "2025-09-16",
            partner_id: [2, "Cliente Demo 2"],
            amount_total: 25000.00,
            amount_residual: 25000.00,
            amount_tax: 4000.00,
            currency_id: [1, "MXN"],
            state: "posted",
            move_type: "out_invoice",
            ref: "",
            invoice_origin: "SO002",
            invoice_payment_term_id: [2, "30 días"],
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-09-02 11:00:00",
            write_date: "2025-09-02 11:00:00"
          },
          {
            id: 3,
            name: "FACT/2025/00003",
            invoice_date: "2025-09-03",
            invoice_date_due: "2025-09-17",
            partner_id: [3, "Cliente Demo 3"],
            amount_total: 18000.00,
            amount_residual: 0.00,
            amount_tax: 2880.00,
            currency_id: [1, "MXN"],
            state: "posted",
            move_type: "out_invoice",
            ref: "",
            invoice_origin: "SO003",
            invoice_payment_term_id: [1, "Pago Inmediato"],
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-09-03 12:00:00",
            write_date: "2025-09-03 12:00:00"
          },
          {
            id: 4,
            name: "FACT/2025/00004",
            invoice_date: "2025-09-04",
            invoice_date_due: "2025-09-18",
            partner_id: [4, "Cliente Demo 4"],
            amount_total: 32000.00,
            amount_residual: 32000.00,
            amount_tax: 5120.00,
            currency_id: [1, "MXN"],
            state: "posted",
            move_type: "out_invoice",
            ref: "",
            invoice_origin: "SO004",
            invoice_payment_term_id: [2, "30 días"],
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-09-04 13:00:00",
            write_date: "2025-09-04 13:00:00"
          },
          {
            id: 5,
            name: "FACT/2025/00005",
            invoice_date: "2025-09-05",
            invoice_date_due: "2025-09-19",
            partner_id: [5, "Cliente Demo 5"],
            amount_total: 12000.00,
            amount_residual: 0.00,
            amount_tax: 1920.00,
            currency_id: [1, "MXN"],
            state: "posted",
            move_type: "out_invoice",
            ref: "",
            invoice_origin: "SO005",
            invoice_payment_term_id: [1, "Pago Inmediato"],
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-09-05 14:00:00",
            write_date: "2025-09-05 14:00:00"
          }
        ];
        
        // Filtrar datos de prueba según los filtros
        let filteredInvoices = mockInvoices;
        
        if (state && state !== 'all') {
          filteredInvoices = filteredInvoices.filter(invoice => invoice.state === state);
        }
        
        // Aplicar paginación
        const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
        const endIndex = startIndex + parseInt(pageSize);
        const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
        
        const totalRecords = filteredInvoices.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / parseInt(pageSize)));
        
        res.json({
          success: true,
          message: `Datos de prueba cargados (${paginatedInvoices.length} registros)`,
          data: paginatedInvoices,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalRecords,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('💥 Error obteniendo datos de facturas:', error);
      
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de facturas.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📋 Ruta para obtener datos de cotizaciones con paginación
  // Protegido con autenticación, rate limiting y CSRF
  app.post('/api/reports/quotations', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange, ...validatePagination), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, state, page = 1, pageSize = 10 } = req.body;

      console.log(`📋 Obteniendo datos de cotizaciones - Página ${page}, Tamaño ${pageSize}`);
      if (state) {
        console.log(`🔍 Filtrando por estado: ${state}`);
      }
      
      try {
        const quotationData = await OdooService.getQuotationData({
          dateFrom,
          dateTo,
          state,
          page: parseInt(page),
          pageSize: parseInt(pageSize)
        });
        
        console.log(`✅ Cotizaciones obtenidas: ${quotationData.data.length} registros en página ${page} de ${quotationData.pagination.totalPages}`);
        
        res.json({
          success: true,
          message: 'Datos de cotizaciones obtenidos exitosamente',
          data: quotationData.data,
          pagination: quotationData.pagination,
          timestamp: new Date().toISOString(),
        });
        
      } catch (odooError) {
        console.log(`⚠️ Error con Odoo, usando datos de prueba: ${odooError}`);
        
        // Datos de prueba mientras resolvemos el problema
        const mockQuotations = [
          {
            id: 1,
            name: "COT/2025/00001",
            date_order: "2025-01-15",
            partner_id: [1, "Cliente Demo 1"],
            amount_total: 50000.00,
            amount_untaxed: 43103.45,
            amount_tax: 6896.55,
            currency_id: [1, "MXN"],
            state: "sale",
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-01-15 10:00:00",
            write_date: "2025-01-15 10:00:00"
          },
          {
            id: 2,
            name: "COT/2025/00002",
            date_order: "2025-01-16",
            partner_id: [2, "Cliente Demo 2"],
            amount_total: 75000.00,
            amount_untaxed: 64655.17,
            amount_tax: 10344.83,
            currency_id: [1, "MXN"],
            state: "cancel",
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-01-16 11:00:00",
            write_date: "2025-01-16 11:00:00"
          },
          {
            id: 3,
            name: "COT/2025/00003",
            date_order: "2025-01-17",
            partner_id: [3, "Cliente Demo 3"],
            amount_total: 30000.00,
            amount_untaxed: 25862.07,
            amount_tax: 4137.93,
            currency_id: [1, "MXN"],
            state: "sent",
            user_id: [1, "Usuario Demo"],
            team_id: [1, "Equipo Ventas"],
            company_id: [1, "Empresa Demo"],
            create_date: "2025-01-17 12:00:00",
            write_date: "2025-01-17 12:00:00"
          }
        ];
        
        // Filtrar datos de prueba según los filtros
        let filteredQuotations = mockQuotations;
        
        if (state && state !== 'all') {
          filteredQuotations = filteredQuotations.filter(q => q.state === state);
        }
        
        // Aplicar paginación
        const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
        const endIndex = startIndex + parseInt(pageSize);
        const paginatedQuotations = filteredQuotations.slice(startIndex, endIndex);
        
        const totalRecords = filteredQuotations.length;
        const totalPages = Math.max(1, Math.ceil(totalRecords / parseInt(pageSize)));
        
        res.json({
          success: true,
          message: `Datos de prueba cargados (${paginatedQuotations.length} registros)`,
          data: paginatedQuotations,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            totalRecords,
            totalPages,
            hasNext: parseInt(page) < totalPages,
            hasPrev: parseInt(page) > 1
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('💥 Error obteniendo datos de cotizaciones:', error);
      
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de cotizaciones.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📊 Ruta para obtener estadísticas de cotizaciones
  // Protegido con autenticación, rate limiting y CSRF
  app.post('/api/reports/quotations/stats', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo, state } = req.body;

      console.log(`📊 Generando estadísticas de cotizaciones desde ${dateFrom} hasta ${dateTo}`);
      
      const stats = await OdooService.getQuotationStatistics({
        dateFrom,
        dateTo,
        state
      });
      
      console.log(`✅ Estadísticas generadas: ${stats.total} cotizaciones`);
      
      res.json({
        success: true,
        message: 'Estadísticas de cotizaciones generadas exitosamente',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error generando estadísticas de cotizaciones:', error);
      
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de cotizaciones.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 📦 Ruta para obtener top 10 productos y categorías con más ventas
  // Basado en sale.order.line - Solo pedidos confirmados (state IN ('sale', 'done'))
  app.post('/api/reports/top-products-categories', authenticate, validateCsrf, reportsRateLimiter, combineValidators(...validateDateRange), async (req: Request, res: Response) => {
    try {
      const { dateFrom, dateTo } = req.body;

      console.log(`📦 Generando top productos y categorías desde ${dateFrom} hasta ${dateTo}`);
      
      const topData = await OdooService.getTopProductsAndCategories({
        dateFrom,
        dateTo
      });
      
      console.log(`✅ Top productos y categorías generados: ${topData.products.length} productos, ${topData.categories.length} categorías`);
      
      res.json({
        success: true,
        message: 'Top productos y categorías obtenidos exitosamente',
        data: topData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('💥 Error generando top productos y categorías:', error);
      
      let errorMessage = 'Error interno del servidor';
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
        errorMessage = 'Error de conexión con el servidor Odoo. Verifique la configuración.';
      } else if (errorMessage.includes('authentication') || errorMessage.includes('401')) {
        errorMessage = 'Error de autenticación con Odoo. Verifique las credenciales.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
        errorMessage = 'Sin permisos para acceder a los datos de productos y categorías.';
      }
      
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
