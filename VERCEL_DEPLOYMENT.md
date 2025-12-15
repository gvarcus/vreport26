# Guía de Despliegue en Vercel

Este documento describe los cambios realizados para hacer el proyecto compatible con Vercel y cómo revertirlos si es necesario.

## Cambios Realizados

### 1. Archivos Nuevos Creados

- **`vercel.json`**: Configuración de Vercel para serverless functions
- **`VERCEL_DEPLOYMENT.md`**: Este documento

### 2. Archivos Modificados

- **`server/index.ts`**: 
  - Agregada detección de entorno Vercel (`process.env.VERCEL === "1"`)
  - Condicionado `server.listen()` para que solo se ejecute en desarrollo/producción local
  - Agregado `export default app` para Vercel (no afecta desarrollo local)

- **`server/vite.ts`**: 
  - Corregida ruta de `serveStatic` para apuntar a `dist/public` (compatible con ambos entornos)

- **`package.json`**: 
  - Agregado script `vercel-build` para Vercel
  - Instalado `@vercel/node` como devDependency

- **`server/middleware/rateLimit.ts`**: 
  - Corregido uso de `ipKeyGenerator` para compatibilidad con TypeScript

## Compatibilidad

✅ **Desarrollo local (`npm run dev`)**: Funciona igual que antes
✅ **Producción local (`npm run build && npm start`)**: Funciona igual que antes  
✅ **Vercel**: Ahora compatible con serverless functions

## Cómo Desplegar en Vercel

### Paso 1: Conectar Repositorio GitHub

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en "Add New Project"
3. Selecciona GitHub como proveedor
4. Autoriza Vercel para acceder a tu cuenta de GitHub
5. Selecciona el repositorio `vreport26`
6. Click en "Import"

### Paso 2: Configurar Variables de Entorno

En la configuración del proyecto en Vercel, agrega las siguientes variables de entorno:

```
ODOO_URL=https://fexs.mx
ODOO_DB=Productiva
JWT_SECRET=<tu-secret-jwt-generado>
TEST_USER=<tu-usuario-prueba>
TEST_PASSWORD=<tu-password-prueba>
DB_HOST=<tu-host-db>
DB_PORT=5432
DB_NAME=<tu-db-name>
DB_USER=<tu-db-user>
DB_PASSWORD=<tu-db-password>
NODE_ENV=production
```

**Importante**: Genera un nuevo `JWT_SECRET` para producción:
```bash
openssl rand -base64 32
```

### Paso 3: Configurar Build Settings

Vercel debería detectar automáticamente:
- **Framework Preset**: Other
- **Build Command**: `npm run vercel-build` (o dejar vacío, Vercel lo detectará)
- **Output Directory**: `dist/public`
- **Install Command**: `npm install`

### Paso 4: Deploy

1. Click en "Deploy"
2. Vercel construirá y desplegará automáticamente
3. Una vez completado, tendrás una URL de producción

## Cómo Revertir los Cambios (Si Algo Se Rompe)

Si necesitas revertir los cambios para volver al estado anterior:

### Opción 1: Revertir con Git

```bash
# Ver los commits relacionados con Vercel
git log --oneline --grep="vercel" -i

# Revertir el commit específico (reemplaza COMMIT_HASH)
git revert COMMIT_HASH

# O simplemente eliminar los archivos nuevos
git rm vercel.json VERCEL_DEPLOYMENT.md
git checkout HEAD -- server/index.ts server/vite.ts package.json server/middleware/rateLimit.ts
```

### Opción 2: Revertir Manualmente

1. **Eliminar archivos nuevos**:
   ```bash
   rm vercel.json VERCEL_DEPLOYMENT.md
   ```

2. **Revertir `server/index.ts`**:
   - Eliminar la línea `const isVercel = process.env.VERCEL === "1";`
   - Revertir el bloque `(async () => {...})()` al original
   - Eliminar `export default app;`

3. **Revertir `server/vite.ts`**:
   - Cambiar `path.resolve(import.meta.dirname, "..", "dist", "public")` 
   - Por `path.resolve(import.meta.dirname, "public")`

4. **Revertir `package.json`**:
   - Eliminar el script `"vercel-build"`
   - Eliminar `@vercel/node` de devDependencies

## Verificación Post-Deploy

Después de desplegar en Vercel, verifica:

1. ✅ Las rutas `/api/*` funcionan correctamente
2. ✅ El frontend se sirve desde `/`
3. ✅ La autenticación funciona
4. ✅ Los endpoints de reportes requieren autenticación
5. ✅ Rate limiting funciona
6. ✅ Variables de entorno están configuradas

## Troubleshooting

### Error: "Cannot find module"
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que `@vercel/node` esté instalado

### Error: "Build directory not found"
- Verifica que `vercel-build` ejecute `npm run build:client`
- Verifica que el output directory sea `dist/public`

### Error: "Port already in use" (en desarrollo local)
- Esto NO debería pasar, pero si pasa, verifica que `isVercel` esté funcionando correctamente
- El código solo hace `listen()` cuando NO está en Vercel

### Las rutas API no funcionan en Vercel
- Verifica que `vercel.json` tenga la ruta `/api/(.*)` apuntando a `server/index.ts`
- Verifica que `export default app` esté presente en `server/index.ts`

## Notas Importantes

1. **Rate Limiting**: En Vercel serverless, el rate limiting en memoria puede no funcionar perfectamente entre invocaciones. Considera usar Redis o el Rate Limiting de Vercel Firewall para producción.

2. **CSRF Tokens**: Similar al rate limiting, los tokens CSRF en memoria pueden tener problemas. Considera usar cookies firmadas o Redis.

3. **Variables de Entorno**: NUNCA subas el archivo `.env` al repositorio. Configura todas las variables en Vercel Dashboard.

4. **Build Time**: El build en Vercel puede tardar varios minutos la primera vez. Los builds subsecuentes son más rápidos.

## Referencias

- [Documentación oficial de Vercel para Express](https://vercel.com/changelog/zero-configuration-express-backends)
- [Documentación de Vercel para frameworks](https://vercel.com/docs/frameworks)
- [Guía de importación de proyectos](https://vercel.com/docs/getting-started-with-vercel/import)

