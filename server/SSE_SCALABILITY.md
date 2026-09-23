# Escalabilidad de conexiones SSE

## ¿Por qué existen clientes locales si usamos Redis?

Una conexión Server-Sent Events es una conexión HTTP persistente. El proceso que acepta la conexión conserva el socket y el objeto `Response` de Express para poder enviar eventos con `response.write()`.

Redis puede distribuir eventos y registrar presencia, pero no puede almacenar ni utilizar un `Response`: ese objeto pertenece al proceso y no es serializable. Por eso cada instancia necesita mantener un registro de sus conexiones locales.

El flujo distribuido es:

1. Una instancia publica un evento en Redis.
2. Las instancias interesadas reciben el evento.
3. Cada instancia localiza las conexiones que mantiene para ese usuario.
4. La instancia escribe el evento en esos sockets HTTP.

## Consumo de memoria

El consumo crece con el número de conexiones simultáneas. El `Map` usado para localizar clientes representa una parte pequeña del coste. Cada conexión también mantiene:

- Un socket TCP y un file descriptor.
- Objetos `Request` y `Response`.
- Listeners, closures y estado del runtime.
- Buffers de entrada y salida.

Por eso una conexión puede consumir desde varios KB hasta decenas de KB. La capacidad real no debe estimarse solo con una multiplicación teórica: se debe medir bajo carga, incluyendo el runtime, la aplicación, clientes lentos y picos de tráfico.

También es importante distinguir:

- **Consumo esperado:** memoria correspondiente a conexiones activas.
- **Fuga de memoria:** conexiones cerradas que siguen registradas o buffers que crecen sin límite.

## Cómo abordar el crecimiento

### 1. Medir y establecer capacidad

Realizar pruebas de carga para determinar el consumo promedio y máximo por conexión. Cada instancia debe tener un límite seguro de conexiones, dejando margen para el runtime y para picos temporales.

Las métricas mínimas son:

- Conexiones SSE activas por instancia.
- Memoria RSS y heap.
- File descriptors abiertos.
- Eventos enviados y errores de escritura.
- Reconexiones y conexiones descartadas.
- Clientes con backpressure.

### 2. Escalar horizontalmente

Las conexiones se distribuyen entre varias instancias detrás de un balanceador. Redis permite propagar los eventos entre procesos, mientras cada instancia conserva solamente sus conexiones locales.

Cuando una instancia alcanza su límite, debe dejar de aceptar nuevas conexiones o marcarse como no disponible para que el balanceador utilice otra instancia.

### 3. Manejar backpressure

`response.write()` devuelve `false` cuando el buffer de salida está lleno. Ignorar ese resultado permite que clientes lentos acumulen datos y consuman la memoria de la instancia.

La aplicación debe aplicar una política acotada:

- Esperar el evento `drain` antes de continuar escribiendo.
- Limitar la cantidad de mensajes pendientes por conexión.
- Desconectar clientes que permanezcan lentos o superen el límite.

Para notificaciones como `logout-all`, normalmente es preferible desconectar y permitir que `EventSource` reconecte antes que mantener una cola grande.

### 4. Limpiar conexiones inactivas

Los clientes deben eliminarse ante `close`, `error` y timeout. Los heartbeats periódicos permiten detectar dispositivos que perdieron conectividad sin completar correctamente el cierre TCP.

La eliminación debe ser idempotente y proteger una conexión nueva frente al cierre tardío de una conexión anterior con el mismo identificador de sesión.

### 5. Evitar trabajo proporcional a todos los clientes

El registro local debe estar indexado por usuario, por ejemplo:

```ts
Map<string, Map<string, Response>>
// userId -> sessionId -> response
```

Así, enviar un evento cuesta `O(sesiones del usuario)` y no `O(total de conexiones de la instancia)`.

En una escala mayor, Redis también puede publicar por instancia o por grupo de instancias para evitar que todos los servidores procesen eventos de usuarios que no tienen conectados.

### 6. Delegar la infraestructura cuando sea necesario

Miles o decenas de miles de conexiones pueden manejarse con varias instancias correctamente dimensionadas. Para cientos de miles o millones puede ser más rentable utilizar un gateway especializado o un servicio administrado de tiempo real.

Delegar SSE no elimina el consumo de recursos: traslada la responsabilidad de mantener sockets, backpressure, reconexiones y capacidad al proveedor.

## Respuesta breve para una entrevista

> Mantener conexiones SSE tiene un coste de memoria proporcional al número de clientes. No movería los objetos `Response` a Redis porque pertenecen al proceso que mantiene cada socket. Mediría el coste real por conexión, fijaría límites por instancia y escalaría horizontalmente, usando Redis para distribuir eventos. También implementaría heartbeats, limpieza idempotente, métricas y backpressure: si `response.write()` devuelve `false`, esperaría `drain` o desconectaría al cliente cuando supere un límite. El estado local es inherente a una conexión persistente; el objetivo es mantenerlo acotado, observable, distribuible y resistente a clientes lentos.
