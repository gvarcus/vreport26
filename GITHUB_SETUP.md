# Instrucciones de GitHub - Proyecto vreportes

**Estado:** Fase 1 Completada - Repositorio Limpio y Listo

---

## 📋 Checklist Pre-GitHub

Antes de conectar y subir a GitHub, completa estas acciones:

### 1. ✅ Credenciales (CRÍTICO)

**Status:** Removidas del código ✅

Lo que DEBES hacer:
- [ ] Cambiar password de `soporte.tecnico@varcus.com.mx` en Odoo
- [ ] Cambiar password de usuario `odoo16` en PostgreSQL
- [ ] Generar nuevo SESSION_SECRET
- [ ] Generar nuevo JWT_SECRET

**Generar nuevos secrets:**
```bash
openssl rand -base64 32
# Ejecutar dos veces para obtener dos valores únicos
```

### 2. ✅ Variables de Entorno (CRÍTICO)

**Status:** Template creado ✅

Lo que DEBES hacer:
- [ ] Crear archivo `.env` en servidor/staging con valores REALES
- [ ] NO incluir valores de ejemplo o template
- [ ] Proteger el archivo con permisos 600

```bash
# En el servidor:
cp .env .env.production
nano .env.production
chmod 600 .env.production
```

**Variables a configurar:**
```
ODOO_URL=https://tu-servidor-odoo.com
ODOO_DB=tu_database
DB_HOST=tu-host-postgresql
DB_PORT=5432
DB_NAME=tu_database
DB_USER=postgres
DB_PASSWORD=tu_password_real

TEST_USER=usuario_prueba@ejemplo.com  # NO usar credenciales de producción
TEST_PASSWORD=contraseña_prueba_segura

SESSION_SECRET=valor-generado-con-openssl
JWT_SECRET=otro-valor-generado-con-openssl

NODE_ENV=production
PORT=8080
```

### 3. ✅ Repositorio Git (CRÍTICO)

**Status:** Repositorio limpio creado ✅

Estado actual:
```bash
$ git log --oneline
f7986c7 Initial commit - Clean version with security remediations (Fase 1)

$ git status
En la rama master
nada para hacer commit, el árbol de trabajo está limpio
```

Acciones completadas:
- ✅ Eliminado historial anterior (con credenciales)
- ✅ Nuevo repositorio inicializado
- ✅ Primer commit realizado
- ✅ .env en .gitignore

---

## 🔗 Conectar a GitHub

### Opción A: Repositorio Nuevo en GitHub (RECOMENDADO)

**Paso 1:** Crear nuevo repositorio en GitHub.com

1. Ve a https://github.com/new
2. Nombre del repositorio: `vreportes`
3. Descripción: `Dashboard de reportes conectado a Odoo`
4. Privado (si es código de empresa)
5. **NO inicialices con README** (ya tienes commits locales)
6. Haz click en "Create repository"

**Paso 2:** Conectar repositorio local a GitHub

```bash
cd /home/frikilancer/Escritorio/vreportes

# Agregar remote
git remote add origin https://github.com/TU_USUARIO/vreportes.git

# Verificar remote
git remote -v
# Debe mostrar:
# origin  https://github.com/TU_USUARIO/vreportes.git (fetch)
# origin  https://github.com/TU_USUARIO/vreportes.git (push)
```

**Paso 3:** Cambiar rama a 'main' (opcional pero recomendado)

```bash
# GitHub usa 'main' por defecto ahora
git branch -m master main

# Verificar
git branch
# Debe mostrar: * main
```

**Paso 4:** Subir a GitHub

```bash
git push -u origin main
# O si quedaste en master:
git push -u origin master
```

Ingresa tus credenciales de GitHub cuando se pida:
- Usuario: tu usuario de GitHub
- Token: Tu personal access token (https://github.com/settings/tokens)

---

### Opción B: Repositorio Existente en GitHub

Si ya tienes un repositorio en GitHub:

```bash
# Cambiar remote si es necesario
git remote set-url origin https://github.com/TU_USUARIO/vreportes.git

# Subir
git push -u origin main
```

---

## 🔐 Proteger el Repositorio en GitHub

### Configuración Recomendada

1. **Ve a Settings → Branches**
   - [ ] Activar "Require branches to be up to date before merging"
   - [ ] Activar "Require status checks to pass before merging"

2. **Ve a Settings → Security**
   - [ ] Activar "Secret scanning"
   - [ ] Activar "Dependabot alerts"

3. **Ve a Settings → Code and automation → Pre-receive hooks**
   - [ ] Crear hook para prevenir commits con credenciales

4. **IMPORTANTE: Agregar archivo `.env.example`**

Crea `.env.example` sin valores reales:

```bash
# .env.example (COMMITAR ESTO)
ODOO_URL=https://tu-servidor-odoo.com
ODOO_DB=nombre_base_datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vreportes
DB_USER=postgres
DB_PASSWORD=tu_contraseña_segura
TEST_USER=usuario_prueba@ejemplo.com
TEST_PASSWORD=contraseña_segura_12345
SESSION_SECRET=generar-con-openssl-rand-base64-32
JWT_SECRET=generar-con-openssl-rand-base64-32
NODE_ENV=production
PORT=8080
```

Agregar a Git:
```bash
git add .env.example
git commit -m "docs: add environment variables example file"
git push
```

---

## 📝 Crear CONTRIBUTING.md

Para documentar cómo contribuir de forma segura:

```bash
# Crear archivo
cat > CONTRIBUTING.md << 'EOF'
# Contributing to vreportes

## Security Guidelines

1. **NUNCA commitees credenciales o secrets**
   - Use variables de entorno (.env)
   - Verificar con: `bash check-security.sh`

2. **Antes de hacer push:**
   ```bash
   bash check-security.sh
   ```
   Debe retornar: ✅ Verificación completada: Todo está seguro

3. **Si accidentalmente commiteaste un secret:**
   - Notifica inmediatamente
   - No hagas push
   - Usa: `git reset HEAD~1` y reintenta

## Pull Request Process

1. Crea rama feature: `git checkout -b feature/description`
2. Haz cambios
3. Ejecuta: `bash check-security.sh`
4. Haz commit: `git commit -m "feat: description"`
5. Abre Pull Request contra `main`
6. Espera revisión

## Security Issues

Si encontras una vulnerabilidad:
- **NO** la reportes públicamente
- Envía email a: [tu-email]@[empresa].com
- Asunto: "[SECURITY] Vulnerability Description"

EOF
git add CONTRIBUTING.md
git commit -m "docs: add contribution guidelines"
git push
```

---

## 📚 Documentación en GitHub

Crear sección de seguridad en README.md:

```markdown
## Security

- Credentials must be configured via environment variables (.env)
- See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for security analysis
- See [PHASE_1_COMPLETED.md](PHASE_1_COMPLETED.md) for remediation status

### Pre-commit Check

Run security verification before committing:

\`\`\`bash
bash check-security.sh
\`\`\`

All checks must pass before pushing to GitHub.
```

---

## 🚀 Primer Push a GitHub

```bash
# Verificar que todo está en orden
git status
# Debe mostrar: nothing to commit, working tree clean

# Verificar commits
git log --oneline
# Debe mostrar: f7986c7 Initial commit - Clean version...

# Verificar remote
git remote -v
# Debe mostrar origen correcta

# Hacer push
git push -u origin main

# Verificar en GitHub
# Ve a https://github.com/TU_USUARIO/vreportes
# Debes ver el código subido
```

---

## ✅ Verificación Post-Push

En GitHub, verifica:

- [ ] Código visible en repositorio
- [ ] Archivos de documentación presentes
- [ ] `.env` NO está en commits
- [ ] Rama `main` es la default
- [ ] README.md visible

### Buscar Credenciales (Verificación Doble)

GitHub tiene secret scanning. Verifica que no encontró nada:

1. Ve a Settings → Security
2. Ve a "Secret scanning"
3. Busca alertas de secrets

Debe estar vacío ✅

---

## 📋 Checklist Final

```
PRE-GITHUB:
[ ] Credenciales rotadas en Odoo
[ ] Credenciales rotadas en PostgreSQL
[ ] Archivo .env creado en servidor (chmod 600)
[ ] Variables de entorno configuradas con valores reales
[ ] Repositorio Git limpio (git log muestra solo 1 commit)
[ ] No hay archivos sin commitear (git status está limpio)

CONECTANDO A GITHUB:
[ ] Repositorio creado en GitHub.com
[ ] Remote agregado (git remote -v muestra origin)
[ ] Rama main configurada (git branch muestra main)
[ ] Push completado (git push -u origin main exitoso)

POST-GITHUB:
[ ] Código visible en GitHub
[ ] Documentación accesible
[ ] No hay secrets en Secret Scanning
[ ] Protecciones de rama configuradas
[ ] .env.example presentado (sin valores reales)
[ ] CONTRIBUTING.md presente
[ ] README actualizado con info de seguridad
```

---

## 🔐 Protecciones Adicionales Recomendadas

### GitHub Actions para CI/CD

Crear archivo `.github/workflows/security.yml`:

```yaml
name: Security Check

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run security check
        run: bash check-security.sh

      - name: Check for secrets
        run: npm audit
```

Esto verificará seguridad en cada push/PR.

---

## 📞 Soporte

Si necesitas ayuda:

1. **Conectando a GitHub:**
   ```bash
   git remote -v  # Verifica origin
   git status     # Verifica cambios
   git push -u origin main  # Intenta push
   ```

2. **Error de credenciales:**
   - Usar token en lugar de password
   - https://github.com/settings/tokens

3. **Error de rama:**
   ```bash
   git branch -m main  # Cambiar a main
   git push -u origin main
   ```

---

## ✨ Siguientes Pasos (Fases 2-10)

Una vez en GitHub, implementar:

- Fase 2: Autenticación en endpoints
- Fase 3: Rate limiting
- Fase 4: Hash de contraseñas
- Fases 5-10: Mejoras de seguridad

Ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) para detalles.

---

**Versión:** 1.0
**Fecha:** 15 de Diciembre de 2024
**Estado:** Listo para GitHub
