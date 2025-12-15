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

  // Servir archivos estáticos con Express
  // IMPORTANTE: express.static debe ejecutarse ANTES del catch-all
  // y debe configurar los tipos MIME correctamente
  
  // Servir archivos estáticos con Express
  // IMPORTANTE: Esto debe ejecutarse ANTES del catch-all para index.html
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath);
      if (ext === '.js') {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      } else if (ext === '.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      } else if (ext === '.json') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else if (ext === '.ico') {
        res.setHeader('Content-Type', 'image/x-icon');
      } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.gif' || ext === '.svg') {
        res.setHeader('Content-Type', `image/${ext.slice(1)}`);
      }
    },
    // Si el archivo no existe, continuar al siguiente middleware (catch-all)
    fallthrough: true
  }));

  // fall through to index.html if the file doesn't exist (SPA routing)
  // Solo para rutas que NO sean API
  app.use((req, res, next) => {
    // Saltar si es una ruta API
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Verificar si el archivo solicitado existe antes de servir index.html
    const ext = path.extname(req.path);
    if (ext) {
      // Si tiene extensión, verificar si el archivo existe
      const requestedFile = path.resolve(distPath, req.path.slice(1)); // Remover leading /
      if (fs.existsSync(requestedFile)) {
        // El archivo existe pero express.static no lo sirvió (fallthrough)
        // Intentar servirlo manualmente con el tipo MIME correcto
        const contentType = ext === '.js' ? 'application/javascript; charset=utf-8' :
                            ext === '.css' ? 'text/css; charset=utf-8' :
                            ext === '.json' ? 'application/json; charset=utf-8' :
                            ext === '.ico' ? 'image/x-icon' :
                            ext === '.png' ? 'image/png' :
                            ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                            ext === '.gif' ? 'image/gif' :
                            ext === '.svg' ? 'image/svg+xml' :
                            'application/octet-stream';
        
        return res.type(contentType).sendFile(requestedFile, (err) => {
          if (err) {
            console.error(`Error serving file ${requestedFile}:`, err);
            res.status(404).json({ error: "File not found" });
          }
        });
      }
      // Archivo con extensión pero no existe, devolver 404
      return res.status(404).json({ error: "File not found", path: req.path });
    }
    
    // Para rutas sin extensión, servir index.html (SPA routing)
    res.sendFile(path.resolve(distPath, "index.html"), (err) => {
      if (err) {
        console.error(`Error serving index.html:`, err);
        next(err);
      }
    });
  });
}

