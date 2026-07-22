# Logout All - Flujo Completo

Diagramas del flujo de sesiones multi-dispositivo con notificacion en tiempo real via SSE + Redis pub/sub.

## Diagrama de flujo

```
          ┌────────────────┐
          │ Login/Register │
          └────────────────┘
                   │
                   ▼
       ┌──────────────────────┐
       │ Crea Session Mongo + │
       │  JWT con sessionId   │
       └──────────────────────┘
                   │
                   ▼
         ┌───────────────────┐
         │ Frontend abre SSE │
         │      ?token=      │
         └───────────────────┘
                   │
                   ▼
      ┌────────────────────────┐
      │ RedisSSEManager.addCli │
      │  ent: localClients +   │
      │ Redis session hash/set │
      └────────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Click Logout All en │
        │    dispositivo X    │
        └─────────────────────┘
                   │
                   ▼
      ┌────────────────────────┐
      │   Session.updateMany   │
      │ isActive=false (Mongo) │
      └────────────────────────┘
                   │
                   ▼
      ┌────────────────────────┐
      │ sendToUserExceptSessio │
      │ n: publish canal sse-  │
      │     events (Redis)     │
      └────────────────────────┘
                   │
                   │ Redis pub/sub
                   ▼
        ┌─────────────────────┐
        │    Cada servidor    │
        │ (subscriber) recibe │
        │       mensaje       │
        └─────────────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ Filtra localClients │
        │ por userId, excluye │
        │   sessionId origen  │
        └─────────────────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │  res.write evento SSE │
       │ logout-all a clientes │
       │        locales        │
       └───────────────────────┘
                   │
                   ▼
       ┌──────────────────────┐
       │ Frontend EventSource │
       │  escucha logout-all  │
       └──────────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Auto-logout ese │
          │   dispositivo   │
          └─────────────────┘
```

Nota: "Cada servidor (subscriber) recibe mensaje" representa N instancias detras del nginx load balancer, todas suscritas al mismo canal Redis — por eso logout-all llega a dispositivos conectados a un servidor distinto del que origino el evento.

## Diagrama de interaccion

Dos dispositivos, cada uno conectado a una instancia de servidor distinta detras del load balancer, coordinados via Redis.

```
  DispA                     DispB                     Srv1                     Srv2                     Redis                     Mongo
    │                         │                         │                        │                        │                         │
    |--------------------POST /login-------------------->
    │                         │                         │                        │                        │                         │
                                                        |----------------------------crea Session + JWT----------------------------->
    │                         │                         │                        │                        │                         │
                                                        < - - - - - - - - - - - - - - - - - -OK - - - - - - - - - - - - - - - - - - |
    │                         │                         │                        │                        │                         │
    < - - - - - - - - token, sessionId- - - - - - - - - |
    │                         │                         │                        │                        │                         │
    |----------------GET /events?token=----------------->
    │                         │                         │                        │                        │                         │
                                                        |--------------addClient (hset/sadd)-------------->
    │                         │                         │                        │                        │                         │
                              |----------------GET /events?token=---------------->
    │                         │                         │                        │                        │                         │
                                                                                 |-addClient (hset/sadd)-->
    │                         │                         │                        │                        │                         │
    |-----------------POST /logout-all------------------>
    │                         │                         │                        │                        │                         │
                                                        |-------------------------updateMany isActive=false------------------------->
    │                         │                         │                        │                        │                         │
                                                        |---------------publish sse-events---------------->
    │                         │                         │                        │                        │                         │
                                                                                 < - message sse-events- -|
    │                         │                         │                        │                        │                         │
    │                         │                         │                        │ (self: filtra userId)  │                         │
                              < - - - - - - - - SSE: logout-all - - - - - - - - -|
    │                         │                         │                        │                        │                         │
    │                         │ (self: auto-logout)     │                        │                        │                         │
    < - - - - - - - - - - -200 ok - - - - - - - - - - - |
    │                         │                         │                        │                        │                         │
```
