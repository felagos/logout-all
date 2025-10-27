# 🎬 Simple Logout-All (Netflix-Style)

Un sistema simplificado de logout distribuido sin WebSockets ni SSE. Los dispositivos se deslogean cuando intentan reproducir contenido, no inmediatamente.

## 🏗️ Arquitectura

### Flujo de Funcionamiento

```
1. LOGIN
   └─ Crea una sesión en MongoDB
   └─ JWT incluye sessionId
   └─ Retorna token al cliente

2. REPRODUCIR CONTENIDO (Play)
   └─ Cliente valida sesión: POST /api/auth/validate-session
   └─ Servidor verifica si la sesión sigue activa
   └─ ✅ Válida → Permite reproducción
   └─ ❌ Inválida → "Session revoked. Please sign in again"

3. SIGN OUT ALL DEVICES
   └─ POST /api/auth/logout-all
   └─ Invalida TODAS las sesiones del usuario en MongoDB
   └─ Retorna confirmación al cliente actual

4. PRÓXIMA REPRODUCCIÓN (otros dispositivos)
   └─ Intenta reproducir → Valida sesión
   └─ Obtiene error 401 → Se auto-desloguea
   └─ SIN notificación push, SIN WebSocket, SIN SSE
```

## 🔑 Conceptos Clave

### 1. **Validación de Sesión Pasiva**
- No hay notificaciones en tiempo real
- La validación ocurre bajo demanda (al reproducir)
- El servidor es la fuente de verdad

### 2. **Tokens de Sesión con Estado**
```typescript
// JWT contiene el sessionId
{
  userId: "user123",
  email: "user@example.com",
  sessionId: "uuid-1234" // Referencia a sesión en BD
}

// La sesión tiene estado: isActive = true/false
{
  userId: "user123",
  sessionId: "uuid-1234",
  isActive: true, // ← Estado puede cambiar
  deviceInfo: "Windows PC",
  ...
}
```

### 3. **Logout All = Invalidar Tokens**
```typescript
// Antes: todos tienen sesiones activas
Session.isActive = true

// Después de "logout-all":
// UPDATE sessions SET isActive = false WHERE userId = "user123"
Session.isActive = false

// Los dispositivos no lo saben hasta intentar reproducir
```

## 📡 Endpoints Principales

### Register/Login
```
POST /api/auth/register
POST /api/auth/login
→ Retorna: { token, sessionId, user, activeSessions }
```

### Validar Sesión (antes de reproducir)
```
POST /api/auth/validate-session
Authorization: Bearer {token}
→ { valid: true/false, message: "...", reason: "logout-all" }
```

### Obtener Dispositivos Activos
```
GET /api/auth/sessions
Authorization: Bearer {token}
→ { sessions: [...] }
```

### Logout Individual
```
POST /api/auth/logout
Authorization: Bearer {token}
→ Desloguea solo este dispositivo
```

### **Logout All Devices**
```
POST /api/auth/logout-all
Authorization: Bearer {token}
→ Invalida TODAS las sesiones del usuario
```

## 🚀 Desarrollo Local

### Requerimientos
- Node.js / Bun
- MongoDB
- (Opcional) Redis (si usas el servidor completo)

### Iniciar

**Opción 1: Solo backend + frontend local**
```bash
cd server
bun install
bun run start  # O: bun run index-simple.ts

# En otra terminal
cd frontend
npm install
npm run dev
```

**Opción 2: Docker Compose simplificado**
```bash
docker-compose up -d
```

### Variables de Entorno (.env)
```
MONGODB_URI=mongodb://localhost:27017/logout-all
JWT_SECRET=your-super-secret-key-change-in-production
PORT=3001
NODE_ENV=development
```

## 🧪 Flujo de Prueba

### 1. Registrarse / Iniciar sesión
- Abre la UI
- Crea una cuenta o inicia sesión
- ✅ Te logueas exitosamente

### 2. Simular reproducción de contenido
- Click en "▶ Play Content"
- Se valida la sesión
- ✅ "Playing content... Session is valid!"

### 3. Abre otra pestaña/dispositivo
- Abre la misma aplicación
- Inicia sesión con la misma cuenta
- Ahora tienes 2 sesiones activas

### 4. Sign Out All Devices (desde cualquier dispositivo)
- Click en "🚨 Sign Out All Devices"
- Confirma
- El dispositivo actual se desloguea inmediatamente
- ✅ Mensaje: "Signed out from all devices"

### 5. Intenta reproducir en otro dispositivo
- En la otra pestaña, click "▶ Play Content"
- ❌ Error: "Session invalidated. Please sign in again."
- El dispositivo se auto-desloguea

## 📊 Comparación con Netflix Real

| Aspecto | Netflix Real | Este Sistema |
|---------|-------------|-------------|
| **Notificación** | Hasta 8 horas | Inmediata validación |
| **Real-time Push** | No (por defecto) | No |
| **Validación** | Cada X minutos | A demanda |
| **Logout All** | Invalida tokens | Invalida sesiones |
| **Detección** | Próximo play/resume | Próximo play |
| **Complejidad** | Baja | Muy baja |
| **WebSocket/SSE** | No | No |

## 🔐 Seguridad

### JWT + Sesión State
- JWT es validado por firma criptográfica
- Sesión es validada contra BD
- Si jwt.sessionId no existe o isActive=false → 401

### No hay race conditions
- Validación ocurre en servidor
- Base de datos es la fuente de verdad
- No hay caché local

## 📈 Escalabilidad

### Sin Redis (versión simple)
- **1 servidor**: Funciona perfecto
- **N servidores**: Cada uno tiene su BD MongoDB compartida
- **Load Balancer**: Distribuye las requests

### Con Redis (coordinación mejorada)
- Usar `RedisSSEManager` para notificaciones
- O mantener simple: solo MongoDB

## 🎯 Ventajas de este Approach

✅ **Simple**: Sin WebSockets, sin SSE, sin pub/sub  
✅ **Eficiente**: Validación solo a demanda  
✅ **Escalable**: Funciona con múltiples servidores  
✅ **Seguro**: Estado centralizado en BD  
✅ **Mantenible**: Código claro y fácil de entender  
✅ **Compatible**: Funciona en cualquier red (no requiere upgrades HTTP)  

## 🔗 Referencia de Archivos

- **Backend**: `server/routes/auth-simple.ts`
- **Frontend**: `frontend/src/AppSimple.tsx`
- **Estilos**: `frontend/src/AppSimple.css`
- **Server Entry**: `server/index-simple.ts`

---

**Rama**: `simple-logout-all`  
**Patrón**: Netflix-style logout (validación a demanda, sin real-time)
