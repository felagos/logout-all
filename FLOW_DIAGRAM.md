# Diagrama de Flujo - Simple Logout All (Netflix-Style)

## 🔄 Flujo Básico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIMPLE LOGOUT-ALL FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

1. INICIAL: Usuario no autenticado
   ┌─────────────┐
   │   Login     │
   │   Screen    │
   └──────┬──────┘
          │
          ▼
   ┌─────────────────────────────────────┐
   │ POST /api/auth/login                │
   ├─────────────────────────────────────┤
   │ • Validar credenciales              │
   │ • Crear Session en MongoDB          │
   │ • Generar JWT con sessionId         │
   │ • Retorna token + sessionId         │
   └──────┬──────────────────────────────┘
          │
          ▼
   ┌─────────────┐
   │  ✅ LOGGEDIN│  JWT = { userId, email, sessionId }
   │   Screen    │  Session.isActive = true
   └─────────────┘

───────────────────────────────────────────────────────────────────────────────

2. REPRODUCIR CONTENIDO (Play)

   ┌──────────────────┐
   │ Click "Play"     │
   │ botón del UI     │
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ POST /api/auth/validate-session      │
   ├──────────────────────────────────────┤
   │ Headers: Authorization: Bearer {JWT} │
   │                                      │
   │ Server: Decodifica JWT               │
   │ Server: Busca Session en BD          │
   │ Server: Valida isActive == true      │
   └────────┬─────────────┬───────────────┘
            │             │
      ✅ VALID      ❌ INVALID
            │             │
            ▼             ▼
    ┌──────────────┐  ┌──────────────────────┐
    │ 200 OK       │  │ 401 Unauthorized     │
    │ { valid: true}  │ Reason: logout-all   │
    │              │  │ Message: Sign in again
    │ ▶ Play Video │  │                      │
    └──────────────┘  │ → Auto-logout UI     │
                      │ → Redirect to Login  │
                      └──────────────────────┘

───────────────────────────────────────────────────────────────────────────────

3. SIGN OUT ALL DEVICES

   Dispositivo A         Dispositivo B         Dispositivo C
   (Loggeado)            (Loggeado)            (Loggeado)
         │                    │                     │
         │                    │                     │
         ├────────────────────┼─────────────────────┤
         │                    │                     │
         │ Click "Sign out    │                     │
         │ all devices"       │                     │
         │                    │                     │
         ▼                    │                     │
   ┌─────────────────────────────────────┐
   │ POST /api/auth/logout-all           │
   ├─────────────────────────────────────┤
   │ • Obtener userId del JWT            │
   │ • UPDATE sessions                   │
   │   SET isActive = false              │
   │   WHERE userId = 'userXYZ'          │
   └────────────┬────────────────────────┘
                │
                ▼
   ┌──────────────────────────────┐
   │ 200 OK                       │
   │ "Signed out from all devices"│
   │ Dispositivo A desloguea ←────┤
   └──────────────────────────────┘

   Los dispositivos B y C NO reciben notificación en tiempo real
   ⏳ Esperan hasta que intenten reproducir algo

───────────────────────────────────────────────────────────────────────────────

4. PRÓXIMO PLAY EN OTRO DISPOSITIVO

   Dispositivo B (sin saber que fue deslogueado)
   
   ┌──────────────────┐
   │ Click "Play" ▶   │
   │ (Usuario creyendo que sigue loggeado)
   └────────┬─────────┘
            │
            ▼
   ┌──────────────────────────────────────┐
   │ POST /api/auth/validate-session      │
   ├──────────────────────────────────────┤
   │ JWT aún válido (no expiró)           │
   │ PERO: sessionId en BD tiene          │
   │       isActive = false  ❌           │
   │                                      │
   │ → Retorna 401 Unauthorized           │
   └──────────┬───────────────────────────┘
              │
              ▼
   ┌────────────────────────────────────┐
   │ Frontend recibe: 401 + logout-all   │
   ├────────────────────────────────────┤
   │ • Limpia token local                │
   │ • Limpia sessionId local            │
   │ • Redirige a Login                  │
   │ • Muestra: "Session invalidated"    │
   └────────────────────────────────────┘
```

## 🗄️ Estado de Base de Datos

```
MONGODB - sessions collection

ANTES (todos logueados):
┌─────────────────────────────────────────────────────────────┐
│ sessionId: "uuid-1", userId: "user123", isActive: true      │
│ sessionId: "uuid-2", userId: "user123", isActive: true      │
│ sessionId: "uuid-3", userId: "user123", isActive: true      │
└─────────────────────────────────────────────────────────────┘

DESPUÉS de "logout-all":
┌─────────────────────────────────────────────────────────────┐
│ sessionId: "uuid-1", userId: "user123", isActive: false  ❌ │
│ sessionId: "uuid-2", userId: "user123", isActive: false  ❌ │
│ sessionId: "uuid-3", userId: "user123", isActive: false  ❌ │
└─────────────────────────────────────────────────────────────┘

Próxima validación: Error 401 → Re-login requerido
```

## 🔐 JWT vs Session

```
JWT (Cliente)              Session (Servidor)
─────────────────────      ──────────────────
{                          {
  userId: "123",             userId: "123",
  email: "x@y.com",          sessionId: "uuid",
  sessionId: "uuid",         isActive: true,
  exp: 1234567890            createdAt: ...,
}                            lastActivity: ...
                           }

✅ Validado por:           ✅ Validado por:
   Criptografía               Búsqueda en BD

❌ No expira si              ❌ Puede cambiar
   no expira el JWT           isActive anytime
```

## 📡 Endpoints y Flujos

```
GET  /health                              (Sin auth)
     → { status, database, service }

POST /api/auth/register                   (Sin auth)
     { email, password, name }
     → { token, sessionId, user }

POST /api/auth/login                      (Sin auth)
     { email, password }
     → { token, sessionId, user, activeSessions }

POST /api/auth/validate-session           (Con JWT)
     Authorization: Bearer {token}
     → { valid: true/false, reason?, message? }

GET  /api/auth/sessions                   (Con JWT)
     Authorization: Bearer {token}
     → { sessions: [...] }

POST /api/auth/logout                     (Con JWT)
     Authorization: Bearer {token}
     → { message: "Logout successful" }

POST /api/auth/logout-all                 (Con JWT)
     Authorization: Bearer {token}
     → { message: "Signed out from all devices" }
```

## 🎯 Comparación: Este Sistema vs Netflix

```
ASPECTO              NETFLIX REAL           ESTE SISTEMA
─────────────────────────────────────────────────────────────
Notificación         Hasta 8 horas          Inmediata (validación)
Real-time Updates    No (por defecto)       No
Complejidad          Media-Alta             Baja
WebSocket/SSE        No                     No
Escalabilidad        Multi-servidor ✅      Multi-servidor ✅
Latencia de cambio   Larga (pasiva)         Media (a demanda)
Dependencias         Baja                   Muy Baja
Base de datos        Centralizada           Centralizada
Load Balancing       Sí                     Sí
Costos infraestructura Bajos               Muy Bajos
```

## 🔄 Estados del Usuario (Frontend)

```
┌──────────────┐
│  Not Logged  │
└──────┬───────┘
       │ Login exitoso
       │ Crea Session + JWT
       ▼
┌──────────────┐
│  Logged In   │◄─────── validar-session cada play
└──────┬───────┘
       │
       ├─────────────────────────┐
       │                         │
       │ Logout                  │ Logout-all (otro device)
       │ POST /logout            │ o session invalidada
       │                         │
       ▼                         ▼
   ┌─────────┐            ┌─────────────┐
   │ Logged  │            │ Error 401   │
   │ Out     │            │ Auto-logout │
   └─────────┘            └─────────────┘
       │                         │
       └─────────────┬───────────┘
                     │ Redirige a Login
                     ▼
              ┌──────────────┐
              │  Not Logged  │
              └──────────────┘
```

---

**Ventajas del Design:**
- ✅ Simple: Sin estado distribuido complejo
- ✅ Seguro: BD es fuente de verdad
- ✅ Escalable: Funciona con N servidores
- ✅ Eficiente: Validación bajo demanda
- ✅ Robusto: No hay race conditions
