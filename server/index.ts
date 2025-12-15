import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes.js";

// Detectar si estamos en Vercel (serverless) o desarrollo
const isVercel = process.env.VERCEL === "1";
const isDevelopment = process.env.NODE_ENV === "development";

// En producción/Vercel, usar implementación simple sin Vite
// En desarrollo, importar Vite dinámicamente solo cuando se necesite
import { serveStatic, log } from "./static.js";

const app = express();

// Configure Helmet for security headers
// Note: In development, we need to allow unsafe-inline for Vite HMR
// In production, this should be stricter with nonces
const isDevelopmentEnv = app.get("env") === "development";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isDevelopmentEnv
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:3001"] // Vite HMR needs unsafe-eval in dev
          : ["'self'"], // Production: use nonces for inline scripts
        styleSrc: isDevelopmentEnv
          ? ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]
          : ["'self'", "https://fonts.googleapis.com"], // Production: move inline styles to CSS files
        styleSrcAttr: isDevelopmentEnv ? ["'unsafe-inline'"] : [], // Production: avoid inline styles
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        connectSrc: ["'self'", isDevelopmentEnv ? "http://localhost:3001" : ""].filter(Boolean),
        imgSrc: ["'self'", "data:", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: !isDevelopmentEnv ? [] : null, // Only in production
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Vite compatibility
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});


// Manejar errores no capturados y rechazos de promesas
if (isVercel) {
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // No crashear en Vercel, solo loggear
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // No crashear en Vercel, solo loggear
  });
}

// Inicializar la aplicación con mejor manejo de errores
(async () => {
  try {
    // Verificar variables de entorno críticas antes de continuar
    const requiredEnvVars = ['JWT_SECRET', 'ODOO_URL', 'ODOO_DB', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      if (isVercel) {
        // En Vercel, configurar una ruta de error en lugar de crashear
        app.use("*", (_req, res) => {
          res.status(500).json({
            error: "Configuration error",
            message: errorMsg,
            missingVariables: missingVars,
            hint: "Please configure all required environment variables in Vercel Dashboard"
          });
        });
        return; // No continuar con la inicialización
      } else {
        throw new Error(errorMsg);
      }
    }

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      // No lanzar error en serverless para evitar crashes
      if (!isVercel) {
        throw err;
      }
    });

    if (isVercel) {
      // En Vercel (serverless): solo manejar rutas API
      // Los archivos estáticos son servidos automáticamente por Vercel desde dist/public
      // El SPA routing es manejado por vercel.json (rewrite a /index.html)
      // No necesitamos servir archivos estáticos aquí
    } else if (app.get("env") === "development") {
      // Desarrollo local: usar Vite HMR y hacer listen()
      // Importar Vite dinámicamente solo en desarrollo
      const { setupVite: setupViteDev } = await import("./vite.js");
      await setupViteDev(app, server);
      const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
      server.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
      });
    } else {
      // Producción local: servir estáticos y hacer listen()
      serveStatic(app);
      const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
      server.listen(port, "0.0.0.0", () => {
        log(`serving on port ${port}`);
      });
    }
  } catch (error) {
    console.error("❌ Error initializing app:", error);
    // En Vercel, asegurar que la app siempre responda incluso si hay errores
    if (isVercel) {
      app.use("*", (_req, res) => {
        res.status(500).json({
          error: "Initialization error",
          message: error instanceof Error ? error.message : "Unknown error",
          details: process.env.NODE_ENV === "development" ? String(error) : undefined
        });
      });
    } else {
      // En desarrollo/producción local, fallar completamente
      throw error;
    }
  }
})().catch((error) => {
  console.error("❌ Fatal error during initialization:", error);
  if (!isVercel) {
    process.exit(1);
  }
});

// Exportar para Vercel (solo se usa en Vercel, no afecta desarrollo local)
// Vercel requiere este export default para funcionar como serverless function
export default app;
