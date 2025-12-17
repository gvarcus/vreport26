# Configuración de Vercel - Guía de Setup

## ⚠️ Configuración Requerida en Vercel Dashboard

### 1. Build & Output Settings

Ve a **Settings → General → Build & Output Settings** y configura:

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist/public`
- **Install Command**: `npm install` (o déjalo vacío)

### 2. Environment Variables

Ve a **Settings → Environment Variables** y configura las siguientes variables:

#### Variables Requeridas:

```
ODOO_URL=https://fexs.mx
ODOO_DB=Productiva
DB_HOST=98.80.84.181
DB_PORT=5432
DB_NAME=Productiva
DB_USER=odoo16
DB_PASSWORD=z14K7uN1
JWT_SECRET=9uai0exXIlcXbuwF1N20Q/WWJVmkPlmqzbhKLpPja+4=
```

#### Variables Opcionales (para testing):

```
TEST_USER=soporte.tecnico@varcus.com.mx
TEST_PASSWORD=z14K7uN1!
```

#### ⚠️ Importante sobre NODE_ENV:

- **NO** configures `NODE_ENV` manualmente en Vercel
- Vercel automáticamente establece `NODE_ENV=production` en producción
- Si tienes `NODE_ENV=development` configurado, **ELIMÍNALO** de las variables de entorno

#### ⚠️ Importante sobre PORT:

- **NO** configures `PORT` en Vercel
- Vercel maneja los puertos automáticamente para serverless functions
- Si tienes `PORT=3001` configurado, **ELIMÍNALO** de las variables de entorno

### 3. Framework Preset

- **Framework Preset**: Deja en "Other" o "No Framework"
- Vercel detectará automáticamente la configuración desde `vercel.json`

## ✅ Checklist Antes del Deploy

- [ ] Build Command = `npm run vercel-build`
- [ ] Output Directory = `dist/public`
- [ ] Todas las variables de entorno requeridas están configuradas
- [ ] `NODE_ENV` NO está configurado (o está en `production` si es necesario)
- [ ] `PORT` NO está configurado
- [ ] `JWT_SECRET` está configurado y es seguro
- [ ] Las credenciales de Odoo y DB están correctas

## 🔍 Verificación Post-Deploy

Después del deploy, verifica:

1. **Logs de Build**: Revisa que `npm run vercel-build` se ejecutó correctamente
2. **Logs de Function**: Revisa los logs de `server/index.ts` para errores
3. **Rutas API**: Prueba `/api/csrf-token` para verificar que la API funciona
4. **Frontend**: Verifica que la página principal carga correctamente

## 🐛 Troubleshooting

### Error: "Build files not found"
- Verifica que Output Directory = `dist/public`
- Verifica que Build Command = `npm run vercel-build`
- Revisa los logs de build para ver si el cliente se construyó correctamente

### Error: "FUNCTION_INVOCATION_FAILED"
- Verifica que todas las variables de entorno requeridas estén configuradas
- Revisa los logs de la función serverless en Vercel
- Verifica que `JWT_SECRET` esté configurado

### Error: "NOT_FOUND"
- Verifica que Output Directory = `dist/public` (no `dist`)
- Verifica que `vercel.json` esté en la raíz del proyecto
- Verifica que las rutas en `vercel.json` sean correctas








