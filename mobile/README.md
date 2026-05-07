# StockPulse Mobile

Native iOS + Android app built with **Ionic + Capacitor + Angular 17**.

## Architecture

This mobile app **shares ~90% of its code with the web frontend** (`../frontend`).
The pattern:

1. Most services, models, guards, interceptors — **imported directly** from `../frontend/src/app/core/`
2. Feature components are **Ionic-UI wrappers** around the shared services
3. Only the shell (nav), page wrappers, and mobile-specific pages (push-notification prefs, haptics) are duplicated

To share code, the Angular workspace is set up as a monorepo. In practice, you can:
- Use `paths` in `tsconfig.json` to alias `@stockpulse/core` → `../frontend/src/app/core`
- Or publish `core/` as an internal npm package (`@stockpulse/core`) and consume in both apps
- Or use an Nx workspace (recommended for production)

## Quick Start

```bash
npm install
ionic serve               # run in browser (desktop preview)

# Add native platforms
ionic cap add android
ionic cap add ios

# Build and run on device/emulator
ionic cap run android
ionic cap run ios
```

## Key Differences from Web

| Concern       | Web (Angular Material)      | Mobile (Ionic)                    |
|---------------|-----------------------------|-----------------------------------|
| Nav           | Sidebar + topbar            | Bottom tab bar                    |
| Modals        | `MatDialog`                 | `ModalController`                 |
| Forms         | `MatFormField`              | `IonInput`, `IonItem`             |
| Lists         | `MatList`, `MatCard`        | `IonList`, `IonCard`              |
| Charts        | ApexCharts                  | ApexCharts (works inside WebView) |
| Notifications | Browser `Notification` API  | `@capacitor/push-notifications`   |
| Storage       | `localStorage`              | `@capacitor/preferences`          |

## Push Notifications

The backend emits `notification:push` events via Socket.IO for in-app, and FCM/APNs for native push.
Register the device token on login:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
await PushNotifications.register();
PushNotifications.addListener('registration', token => {
  // POST token to backend /api/v1/notifications/register-device
});
```

## Build for Production

```bash
ionic build --prod
ionic cap sync
# Then use Xcode (iOS) or Android Studio to build/archive/sign
```
