import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // Ruta correcta: dist/public según vite.build.config.ts
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    // En Vercel, si el directorio no existe, crear una respuesta de error más amigable
    // pero no lanzar error para evitar que la función serverless falle completamente
    console.warn(`⚠️ Build directory not found: ${distPath}`);
    console.warn(`⚠️ Make sure 'npm run vercel-build' runs before deployment`);
    
    // Solo manejar rutas que NO sean API
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) {
        return next(); // Dejar que las rutas API se manejen normalmente
      }
      res.status(503).json({
        error: "Build files not found",
        message: "The client build directory is missing. Make sure 'vercel-build' script runs successfully.",
        path: distPath
      });
    });
    return;
  }

  // Servir archivos estáticos solo para rutas que NO sean API
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next(); // Saltar archivos estáticos para rutas API
    }
    express.static(distPath)(req, res, next);
  });

  // fall through to index.html if the file doesn't exist (SPA routing)
  // Solo para rutas que NO sean API
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next(); // Dejar que las rutas API se manejen normalmente
    }
    res.sendFile(path.resolve(distPath, "index.html"), (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

