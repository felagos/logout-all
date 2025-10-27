# 🚀 Guía Rápida - Simple Logout All

## Rama: `simple-logout-all`

Sistema Netflix-style: **validación de sesión bajo demanda, SIN WebSockets/SSE**

### ⚡ Iniciar en 30 segundos

**Terminal 1 (Backend):**
```bash
cd server
bun install
bun run index-simple.ts
# → Server escuchando en http://localhost:3001
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
# → App en http://localhost:5173
```

**Listo** ✅ Abre http://localhost:5173

---

## 🎯 Flujo de Prueba (2 minutos)

### Paso 1: Crear cuenta
- Email: `test@example.com`
- Password: `password123`
- Name: `John Doe`
- Click "Create Account"

### Paso 2: Reproducir contenido
- Click "▶ Play Content"
- Verás: "✅ Playing content... Session is valid!"

### Paso 3: Abrir otra sesión (nueva pestaña)
```
- Nueva pestaña: http://localhost:5173
- Login con mismas credenciales
- Ahora tienes 2 dispositivos activos
```

### Paso 4: Sign out all devices
- En **cualquiera** de los dispositivos
- Click "🚨 Sign Out All Devices"
- Confirma
- ✅ Verás "Signed out from all devices"
- Ambas pestañas redirigen a Login

### Paso 5: Intenta reproducir en la otra pestaña
- En la otra pestaña, estás en Login
- Login nuevamente
- Click "▶ Play Content"
- ✅ Funciona porque tiene nueva sesión válida

---

## 🔑 Conceptos Clave

### 1️⃣ Session Validation (El Core)
```typescript
// Cada vez que reproducimos:
POST /api/auth/validate-session

// Servidor verifica:
- ¿El JWT es válido? → Decodificar
- ¿La sessionId existe en BD? → Buscar
- ¿isActive = true? → Validar estado

// Respuesta:
{
  valid: true/false,
  reason: "logout-all" // Si fue revocada
}
```

### 2️⃣ Logout All = Invalidar Estado
```typescript
// En MongoDB:
UPDATE sessions
SET isActive = false
WHERE userId = "user123"

// Los JWTs no cambian
// Las sesiones en BD sí
// Validación fallará en próximo play
```

### 3️⃣ No hay Notificación en Tiempo Real
- Sin WebSocket
- Sin SSE
- Sin Redis pub/sub
- **Dispositivos se enteran cuando intentan reproducir**

---

## 📱 Endpoints Principales

| Endpoint | Method | Auth | Descripción |
|----------|--------|------|-------------|
| `/register` | POST | No | Crear cuenta + sesión |
| `/login` | POST | No | Iniciar sesión |
| `/validate-session` | POST | JWT | ✅ Validar antes de play |
| `/sessions` | GET | JWT | Listar dispositivos activos |
| `/logout` | POST | JWT | Deslogear este dispositivo |
| `/logout-all` | POST | JWT | 🚨 Deslogear TODOS |

---

## 🐳 Con Docker

```bash
# Compilar y ejecutar
docker-compose -f server/docker-compose.dev.yml up -d

# Logs
docker-compose -f server/docker-compose.dev.yml logs -f

# Parar
docker-compose -f server/docker-compose.dev.yml down

# URLs:
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# Nginx:    http://localhost:80
```

---

## 📊 Arquitectura Simple

```
┌─────────────────────────────────────────────────────────┐
│                  CLIENTE (Browser)                      │
│  - React App (AppSimple.tsx)                            │
│  - LocalStorage: token, sessionId                       │
│  - Valida sesión antes de reproducir                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP REST
                     │
┌────────────────────▼────────────────────────────────────┐
│                SERVER (Express)                         │
│  - auth-simple.ts (endpoints)                           │
│  - Valida JWT + Session en BD                           │
│  - Retorna 401 si isActive=false                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ MongoDB Driver
                     │
┌────────────────────▼────────────────────────────────────┐
│              MONGODB (Persistence)                      │
│  - sessions collection                                  │
│  - userId, sessionId, isActive, deviceInfo              │
└─────────────────────────────────────────────────────────┘
```

**Sin Redis. Sin WebSocket. Sin coordinar entre servidores.**

---

## 🔐 Security

✅ **JWT**: Firmado criptográficamente, expira en 24h  
✅ **Session State**: En BD, puede cambiar anytime  
✅ **Validación**: Bilateral (JWT + DB)  
✅ **No race conditions**: BD es fuente de verdad  

---

## 📈 Escalabilidad

### 1 Servidor
```
Cliente → Servidor1 → MongoDB
```

### N Servidores (Load Balancer)
```
Cliente → LB → Servidor1 → MongoDB
           ↓   Servidor2 ↗
           └─→ Servidor3
```

**Funciona igual** porque todos consultan la misma BD.

---

## 🧪 Verificar que Funciona

### Health Check
```bash
curl http://localhost:3001/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "service": "Logout-All Server (Simple Mode)",
  "mode": "Netflix-style (no real-time updates)",
  "database": "Connected"
}
```

### Validar sesión (con JWT)
```bash
curl -X POST http://localhost:3001/api/auth/validate-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## 🆚 Comparación: Simple vs Full

| Característica | Simple (Esta) | Full (Master) |
|---|---|---|
| WebSocket | ❌ No | ✅ Sí |
| SSE | ❌ No | ✅ Sí |
| Redis | ❌ No | ✅ Sí |
| Notificaciones RT | ❌ No | ✅ Sí |
| Complejidad | ⭐ Muy Baja | ⭐⭐⭐ Alta |
| Latencia notif | Larga (demanda) | Inmediata |
| Escalabilidad | ✅ Buena | ✅ Excelente |
| Costo infraestructura | $ | $$ |

---

## 📚 Documentación Completa

- **SIMPLE_README.md**: Documentación técnica completa
- **FLOW_DIAGRAM.md**: Diagramas de flujo ASCII
- **server/routes/auth-simple.ts**: Código anotado
- **frontend/src/AppSimple.tsx**: React component con comentarios

---

## 🆘 Troubleshooting

### Error: "Cannot connect to MongoDB"
```bash
# Verifica que MongoDB esté corriendo
# Opción 1: Instala MongoDB localmente
# Opción 2: Usa MongoDB Atlas (cloud)
# En .env: MONGODB_URI=mongodb://localhost:27017/logout-all
```

### Error: "Port 3001 already in use"
```bash
# Cambia el puerto en .env
PORT=3002
```

### Frontend muestra "Network error"
```bash
# Verifica CORS en backend
# Debería estar habilitado para http://localhost:5173
```

---

## 🎯 Próximos Pasos

1. **Entender el flujo**: Lee SIMPLE_README.md
2. **Probar endpoints**: Usa Postman/Thunder Client
3. **Modificar UI**: Personaliza AppSimple.tsx
4. **Agregar features**: Valida sesión en otros lugares

---

## 📞 Contacto

Rama: `simple-logout-all`  
Base: `master` (pero simplificada, sin complejidad)  
Patrón: Netflix-style passive validation

**Última actualización**: 2025-10-26
