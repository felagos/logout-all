# 📋 Configuración por Rama

## Branch: `simple-logout-all`

### Propósito
Implementar un sistema de logout simplificado **estilo Netflix** sin complejidad de tiempo real.

### Características
- ✅ Session validation on demand
- ✅ NO WebSocket / NO SSE / NO Redis pub/sub
- ✅ Passive verification
- ✅ Simple scaling with MongoDB

### Archivos Principales

#### Backend
- `server/routes/auth-simple.ts` - Endpoints sin SSE
- `server/index-simple.ts` - Entry point simple
- `server/services/SimpleSSEManager.ts` - (placeholder)

#### Frontend
- `frontend/src/AppSimple.tsx` - UI Netflix-style
- `frontend/src/AppSimple.css` - Responsive design

#### Documentación
- `SIMPLE_README.md` - Documentación técnica completa
- `QUICK_START.md` - Guía de inicio rápido
- `FLOW_DIAGRAM.md` - Diagramas de arquitectura

### Configuración Recomendada

#### .env
```
PORT=3001
NODE_ENV=development
JWT_SECRET=dev-secret-key-change-in-prod
MONGODB_URI=mongodb://localhost:27017/logout-all
SERVER_ID=server-1
```

#### Variables de Entorno
- `PORT`: Puerto del servidor (default: 3001)
- `JWT_SECRET`: Clave para firmar JWTs (cambiar en producción)
- `MONGODB_URI`: Conexión MongoDB
- `SERVER_ID`: ID único si escalas a N servidores

### Comandos

```bash
# Desarrollo
bun run dev:simple       # Con auto-reload (nodemon)
bun run start:simple     # Ejecución única

# Producción
docker build -t simple-logout .
docker run -p 3001:3001 simple-logout

# Frontend
npm run dev              # Vite dev server
npm run build            # Producción build
```

### API Endpoints

```
POST   /api/auth/register            # Crear cuenta
POST   /api/auth/login               # Iniciar sesión
POST   /api/auth/validate-session    # Validar antes de play ⭐
GET    /api/auth/sessions            # Listar dispositivos
POST   /api/auth/logout              # Deslogear este dispositivo
POST   /api/auth/logout-all          # Deslogear TODOS 🚨

GET    /health                       # Health check
```

### Flujo de Validación (Core)

1. **POST /api/auth/login**
   - Crear `Session` en MongoDB con `isActive: true`
   - Generar JWT con `sessionId`
   - Retornar `{ token, sessionId, user }`

2. **POST /api/auth/validate-session** (antes de reproducir)
   - Decodificar JWT
   - Buscar `Session` en MongoDB con ese `sessionId`
   - Verificar `isActive === true`
   - Retornar `{ valid: true/false }`

3. **POST /api/auth/logout-all**
   - Obtener `userId` del JWT
   - UPDATE todos los Sessions del usuario
   - SET `isActive = false`
   - Otros dispositivos ❌ en próxima validación

### Escalabilidad

#### Single Server
```
Client → Server → MongoDB
```

#### Multiple Servers (Load Balanced)
```
         ┌─ Server 1 ──┐
Client → LB ┼─ Server 2 ─┼─ MongoDB
         └─ Server 3 ──┘
```
**Funciona igual** porque todos consultan la misma BD.

### Comparación de Ramas

| Aspecto | simple-logout-all | master |
|---------|-------------------|--------|
| WebSocket | ❌ | ✅ |
| SSE | ❌ | ✅ |
| Redis | ❌ | ✅ |
| Complejidad | ⭐ Baja | ⭐⭐⭐ Alta |
| Real-time | ❌ Passive | ✅ Immediate |
| Entry Point | `index-simple.ts` | `index.ts` |
| Routes | `auth-simple.ts` | `auth.ts` |
| Frontend | `AppSimple.tsx` | `App.tsx` |

### Migración entre Ramas

Para cambiar entre `simple-logout-all` y `master`:

```bash
# Cambiar a simple
git checkout simple-logout-all
cd server && bun run start:simple

# Cambiar a full (con WebSocket/SSE)
git checkout master
cd server && bun run start
```

### Testing

```bash
# Health check
curl http://localhost:3001/health

# Registrarse
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass","name":"Test"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass"}'

# Validar sesión (cambiar token por el real)
curl -X POST http://localhost:3001/api/auth/validate-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Logout all
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Ventajas del Approach

✅ **Simple**: Código fácil de entender  
✅ **Mantenible**: Menos dependencias  
✅ **Seguro**: BD es fuente de verdad  
✅ **Escalable**: Funciona con múltiples servidores  
✅ **Eficiente**: Validación bajo demanda  
✅ **Compatible**: Funciona en cualquier red (solo HTTP)  

### Desventajas (comparado con WebSocket/SSE)

❌ **Latencia**: Logout-all no es inmediato en otros dispositivos  
❌ **Experiencia**: Dispositivos se enteran en próximo play  
❌ **Notificaciones**: Sin push en tiempo real  

### Cuándo Usar Esta Rama

✅ Desarrollo inicial rápido  
✅ Prototipos y POCs  
✅ Casos donde latencia no es crítica  
✅ Entornos con limitaciones de red  
✅ Máxima simplicidad preferida  

### Cuándo Usar master (Full Version)

✅ Producción crítica  
✅ Cuando latencia es importante  
✅ Necesitas notificaciones inmediatas  
✅ Casos Netflix-like reales  

---

**Última actualización**: 2025-10-26
