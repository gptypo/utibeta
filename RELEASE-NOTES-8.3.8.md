# 8.3.8 — Complete Offline Module Cache

- Pre-caches the complete ES-module dependency graph used by the main application.
- Pre-caches all visual assets referenced during startup and navigation.
- Uses the cached application shell for offline PWA navigation, including `?source=pwa`.
- Makes the delayed service-worker update check safe while offline.
