# Auditoría de Seguridad - Proyecto vreportes

## 📋 Resumen Ejecutivo

**Fecha:** 15 de Diciembre de 2024
**Estado:** FASE 1 - Remediación Crítica Completada
**Siguiente Fase:** Implementación de autenticación en endpoints

---

## 🔍 Vulnerabilidades Encontradas

### 1. Credenciales Hardcodeadas en Código Fuente ✅ REMEDIADO

**Vulnerabilidad:**
- Usuario: `soporte.tecnico@varcus.com.mx`
- Contraseña: `z14K7uN1`
- Ubicadas en múltiples archivos del código fuente

**Impacto:** CRÍTICO
- Acceso no autorizado a sistemas de producción
- Compromiso del servidor Odoo
- Acceso a datos empresariales

**Remediación Completada:**
```
✅ server/routes.ts - Removidas credenciales (líneas 19-20)
✅ server/lib/odooService.ts - Removidas 4 instancias de credenciales
✅ api/odoo-config.js - Endpoint deshabilitado
✅ Todas las credenciales ahora en archivo .env
```

---

### 2. Información de Infraestructura Expuesta ✅ PARCIALMENTE REMEDIADO

**Vulnerabilidad:**
- IP de PostgreSQL: `98.80.84.181`
- Nombre de base de datos: `Productiva`
- Usuario de base de datos: `odoo16`
- URL de servidor Odoo: `https://fexs.mx`

**Impacto:** CRÍTICO
- Mapeo de infraestructura
- Facilita ataques dirigidos
- Exposición de superficie de ataque

**Remediación Completada:**
```
✅ Removidas de code source (fallbacks inseguros)
✅ Endpoint /api/odoo-config deshabilitado
✅ Solo valores por defecto en .env
⚠️ Aún presentes en historial de Git (ver sección de Git)
```

---

### 3. Endpoints Sin Autenticación ⚠️ PENDIENTE

**Vulnerabilidad:**
- Todos los endpoints de reportes son públicos
- No hay protección contra acceso no autorizado
- Cualquiera puede acceder a datos de negocio

**Endpoints Afectados:**
- POST /api/reports/daily-payments
- POST /api/reports/payment-table
- POST /api/reports/invoices
- POST /api/reports/quotations
- POST /api/reports/quotations/stats

**Impacto:** CRÍTICO

**Remediación:** Planificada en Fase 2

---

### 4. Sin Protección Contra Fuerza Bruta ⚠️ PENDIENTE

**Vulnerabilidad:**
- No hay rate limiting en endpoint de login
- Vulnerable a ataques de diccionario
- Sin límite de intentos fallidos

**Impacto:** ALTO

**Remediación:** Planificada en Fase 3

---

### 5. Contraseñas Sin Hash ⚠️ PENDIENTE

**Vulnerabilidad:**
- Contraseñas almacenadas en texto plano
- No se usa bcrypt o argon2
- Si la BD es comprometida, todas las contraseñas se exponen

**Impacto:** CRÍTICO

**Remediación:** Planificada en Fase 4

---

### 6. CSP con Unsafe-Inline ⚠️ PENDIENTE

**Vulnerabilidad:**
- Content-Security-Policy permite `unsafe-inline`
- Abre la puerta a XSS
- No se usan nonces

**Ubicación:** server/index.ts líneas 10-22

**Impacto:** ALTO

**Remediación:** Planificada en Fase 6

---

## 📊 Estado del Repositorio Git

### Hallazgos Críticos

**Problema:** Las credenciales expuestas están en el historial de Git

```
❌ LAS CREDENCIALES ESTÁN EN MÚLTIPLES COMMITS
❌ LA IP DE INFRAESTRUCTURA ESTÁ EN COMMITS
✅ El archivo .env NO está commiteado (correcto)
✅ El archivo .env ESTÁ en .gitignore (correcto)
```

### Archivos Afectados en Git History

1. `server/lib/odooService.ts` - En TODOS los commits
2. `server/routes.ts` - En TODOS los commits
3. `api/odoo-config.js` - En múltiples commits

### Recomendación: Crear Nuevo Repositorio Limpio

**Opción A - Recomendada:** Iniciar repositorio nuevo

```bash
# 1. Hacer backup
cp -r /home/frikilancer/Escritorio/vreportes /home/frikilancer/Escritorio/vreportes-backup

# 2. Eliminar historial de Git con credenciales
cd /home/frikilancer/Escritorio/vreportes
rm -rf .git

# 3. Inicializar nuevo repositorio
git init
git config user.email "tu@email.com"
git config user.name "Tu Nombre"

# 4. Agregar archivos
git add .

# 5. Hacer commit inicial
git commit -m "Initial commit - Clean version with security remediations"

# 6. Verificar que no hay credenciales
bash check-security.sh
```

**Opción B - Avanzada:** Usar BFG Repo-Cleaner (si quieres mantener el historial)

```bash
# Requiere instalación de BFG
# NO recomendado para principiantes - puede perder commits
```

---

## ✅ Cambios Realizados - Fase 1

### Archivos Modificados

#### 1. ✅ Creado: `.env`
- Template con todas las variables necesarias
- Documentación completa de cada variable
- Incluye advertencias de seguridad
- Correctamente ignorado en .gitignore

#### 2. ✅ Modificado: `server/routes.ts`
**Cambios:**
- Removidas credenciales hardcodeadas de `/api/test-odoo`
- Agregada validación de variables de entorno
- Mensaje de error claro si faltan credenciales
- Removido endpoint `/api/odoo-config` completamente
- Remplazado con comentario de seguridad

#### 3. ✅ Modificado: `server/lib/odooService.ts`
**Cambios:**
- Eliminadas todas las credenciales hardcodeadas (4 instancias)
- Implementada validación estricta de variables de entorno
- Cada variable ahora REQUIERE estar configurada
- Lanza error claro si falta alguna variable
- No hay fallbacks inseguros

#### 4. ✅ Modificado: `api/odoo-config.js`
**Cambios:**
- Removida toda la lógica que exponía configuración
- Endpoint devuelve HTTP 410 Gone
- Mensaje claro explicando la remediación
- Archivo mantenido por compatibilidad (pueden migrar gradualmente)

#### 5. ✅ Creado: `SECURITY_AUDIT.md` (este archivo)
- Documentación completa de vulnerabilidades encontradas
- Estado de remediación de cada vulnerabilidad
- Plan de implementación para fases posteriores
- Guía para limpiar historial de Git

---

## 🔒 Verificación de Seguridad

### Ejecutar script de verificación:

```bash
bash check-security.sh
```

### Checklist Manual:

```
✅ No hay credenciales hardcodeadas en código fuente
✅ Las variables de entorno son requeridas
✅ El archivo .env existe y está en .gitignore
✅ Endpoint /api/odoo-config removido
✅ No hay fallbacks inseguros a valores de producción
⚠️ Las credenciales aún están en historial de Git (requiere limpiar)
⚠️ Endpoints de reportes aún sin autenticación
⚠️ Contraseñas aún sin hash
```

---

## 📋 Variables de Entorno Requeridas

Crear archivo `.env` con las siguientes variables **REQUERIDAS**:

```env
# OBLIGATORIO - Configuración de Odoo
ODOO_URL=https://tu-servidor-odoo.com
ODOO_DB=tu_base_datos

# OBLIGATORIO - Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vreportes
DB_USER=postgres
DB_PASSWORD=tu_contraseña_segura

# OBLIGATORIO - Credenciales de Prueba
TEST_USER=usuario_prueba@ejemplo.com
TEST_PASSWORD=contraseña_segura_12345

# OBLIGATORIO - Secrets para sesiones
SESSION_SECRET=generar-con-openssl-rand-base64-32
JWT_SECRET=otro-string-aleatorio-largo

# Configuración del Servidor
NODE_ENV=production
PORT=8080
```

**Importante:** Usar contraseñas fuertes y únicas. NO usar credenciales de producción en desarrollo.

---

## 🚀 Próximas Fases

### Fase 2: Protección de Endpoints (SEMANA 1)
- [ ] Implementar autenticación en endpoints de reportes
- [ ] Crear middleware de autenticación
- [ ] Validar tokens en cada request

### Fase 3: Rate Limiting (SEMANA 1)
- [ ] Instalar express-rate-limit
- [ ] Implementar rate limiting en login (5 intentos/15min)
- [ ] Implementar rate limiting en reportes (30/min)

### Fase 4: Hash de Contraseñas (SEMANA 1)
- [ ] Instalar bcrypt
- [ ] Hashear contraseñas al guardar
- [ ] Comparar con bcrypt.compare() en login

### Fase 5-10: Mejoras Adicionales
- [ ] Validación de entrada con express-validator
- [ ] Mejorar headers de seguridad con Helmet
- [ ] Implementar CSRF protection
- [ ] Configurar CORS apropiadamente
- [ ] Documentación de seguridad
- [ ] Auditoría de dependencias

---

## 📚 Referencias

- OWASP Top 10 2021: https://owasp.org/Top10/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework
- CWE Top 25: https://cwe.mitre.org/top25/

---

## ✋ Acciones Previas a Despliegue

**ANTES de subir a GitHub o desplegar a producción:**

1. ✅ Remover credenciales del código (FASE 1)
2. ⏳ Crear nuevo repositorio Git limpio
3. ⏳ Rotar credenciales en Odoo y BD
4. ⏳ Implementar autenticación en endpoints (FASE 2)
5. ⏳ Implementar rate limiting (FASE 3)
6. ⏳ Implementar hash de contraseñas (FASE 4)
7. ⏳ Ejecutar `npm audit` y resolver vulnerabilidades
8. ⏳ Testing exhaustivo de seguridad

---

## 📝 Notas

- Script de seguridad disponible: `check-security.sh`
- Verificar antes de cada commit
- Ejecutar `npm audit` regularmente
- Mantener dependencias actualizadas
- Revisar logs regularmente en producción

---

**Última Actualización:** 15 de Diciembre de 2024
**Versión del Documento:** 1.0
**Estado de Implementación:** Fase 1 - Completada
