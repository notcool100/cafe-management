import 'package:flutter/foundation.dart';

class AppConfig {
  static const String _configuredApiBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const String _defaultLocalApiBaseUrl = 'http://localhost:4100/api';
  static const String _defaultAndroidApiBaseUrl = 'http://10.0.2.2:4100/api';

  static String get apiBaseUrl {
    final configured = _normalizeConfiguredApiBaseUrl(_configuredApiBaseUrl);
    if (configured != null) {
      return configured;
    }

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return _defaultAndroidApiBaseUrl;
    }

    return _defaultLocalApiBaseUrl;
  }

  static String? _normalizeConfiguredApiBaseUrl(String value) {
    final configured = value.trim();
    if (configured.isEmpty) {
      return null;
    }

    final clean = configured.endsWith('/')
        ? configured.substring(0, configured.length - 1)
        : configured;

    return clean.endsWith('/api') ? clean : '$clean/api';
  }
}
