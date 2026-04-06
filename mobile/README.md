# Cafe Management Mobile

Flutter app for the Cafe Management system, with platform targets for Android and iOS.

## What Changed

- Persistent login on app restart
- Platform-aware API defaults for Android emulator and iOS simulator
- Native app names updated to `Cafe Management`
- Android and iOS configured to reach the local HTTP API during development

## Requirements

- Flutter SDK
- Android Studio for Android builds
- Xcode for iOS builds on macOS
- Backend API running and reachable from the device or simulator

## API Configuration

The mobile app accepts a compile-time API URL:

```bash
--dart-define=API_BASE_URL=https://your-api.example.com
```

If `API_BASE_URL` is not provided, the app uses these defaults:

- Android emulator: `http://10.0.2.2:4100/api`
- iOS simulator and desktop Flutter: `http://localhost:4100/api`

For a physical phone, pass your machine or server address explicitly, for example:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:4100
```

You can pass the URL either with or without `/api`; the app normalizes it automatically.

## Run Locally

### Android

```bash
cd mobile
flutter pub get
flutter run -d android
```

### iOS

```bash
cd mobile
flutter pub get
flutter run -d ios
```

### Physical Device

```bash
cd mobile
flutter run --dart-define=API_BASE_URL=http://YOUR-LAN-IP:4100
```

## Release Builds

### Android APK

```bash
cd mobile
flutter build apk --release --dart-define=API_BASE_URL=https://your-api.example.com
```

### Android App Bundle

```bash
cd mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://your-api.example.com
```

### iOS

```bash
cd mobile
flutter build ipa --release --dart-define=API_BASE_URL=https://your-api.example.com
```

## Notes

- Android currently allows cleartext HTTP so local development works against `http://` APIs.
- iOS currently allows HTTP API traffic for development convenience. Before App Store release, prefer HTTPS and tighten the transport security settings.
- The mobile app restores the previous session on launch when a valid token is already stored.
