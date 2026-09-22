# Logout All Mobile

Aplicación Expo para probar el cierre de sesión en todos los dispositivos contra el backend de este repositorio.

## Ejecutar con Expo Go

1. Inicia la API y la infraestructura desde la raíz del repositorio.
2. Copia `.env.example` como `.env.local` y cambia la IP por la dirección LAN del equipo que ejecuta el backend. No uses `localhost` desde un teléfono físico.
3. Instala dependencias con `npm install`.
4. Ejecuta `npm start` y abre el código QR con Expo Go.

La app usa Expo SDK 57, Expo Router, React Native y SecureStore. El token permanece cifrado en el dispositivo y nunca se registra en consola.

## Probar Logout All

Inicia sesión con la misma cuenta en la app móvil y en la aplicación web. Al seleccionar **Cerrar todo** en cualquiera de los clientes, el backend revoca todas las sesiones. El cliente remoto recibe el evento SSE `logout-all`, elimina su token local y vuelve a la pantalla de acceso. Si la app estaba en segundo plano, valida de nuevo la sesión cuando vuelve a estar activa.

## Scripts

- `npm start` inicia Metro/Expo.
- `npm run android` abre Android.
- `npm run ios` abre iOS (Expo Go permite escanear el QR también desde Windows).
- `npm run lint` ejecuta el linter de Expo.
