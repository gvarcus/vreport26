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

  // Servir archivos estáticos con tipos MIME correctos
  // IMPORTANTE: Esto debe ejecutarse ANTES del catch-all para index.html
  app.use(express.static(distPath, {
    // Configurar tipos MIME explícitamente
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath);
      if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (ext === '.json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // Solo para rutas que NO sean API y que no sean archivos estáticos
  app.use((req, res, next) => {
    // Saltar si es una ruta API
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Saltar si es un archivo estático (debe tener extensión)
    const ext = path.extname(req.path);
    if (ext && ext !== '.html') {
      return next(); // Dejar que express.static maneje archivos con extensión
    }
    
    // Para rutas sin extensión o .html, servir index.html (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"), (err) => {
      if (err) {
        next(err);
      }
    });
  });
}

