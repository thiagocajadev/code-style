# Platform Channels

> Escopo: Flutter 3.29.

Platform channels permitem que código Dart se comunique com código nativo (Kotlin/Java no
Android, Swift/ObjC no iOS). Existem três tipos: `MethodChannel` (chamada única com retorno),
`EventChannel` (stream de eventos do nativo) e `BasicMessageChannel` (mensagens bidirecionais).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `MethodChannel` | invoca método no nativo e aguarda retorno; caso mais comum |
| `EventChannel` | stream de eventos emitidos pelo nativo (ex: sensores, localização) |
| `BasicMessageChannel` | canal bidirecional para mensagens arbitrárias com codec customizado |
| **codec** | serialização da mensagem entre Dart e nativo: `StandardMessageCodec`, `JSONMessageCodec` |
| **platform thread** | código nativo roda na main thread nativa; I/O pesado usa background thread |

## MethodChannel — estrutura básica

Dart invoca o método; nativo processa e retorna.

**Dart (client):**

```dart
import 'package:flutter/services.dart';

class BiometricAuthService {
  static const _channel = MethodChannel('com.acme.app/biometric');

  Future<bool> authenticate({required String reason}) async {
    try {
      final result = await _channel.invokeMethod<bool>(
        'authenticate',
        {'reason': reason},
      );
      return result ?? false;
    } on PlatformException catch (e) {
      throw BiometricAuthException(e.message ?? 'Authentication failed');
    }
  }
}
```

**Android — Kotlin:**

```kotlin
class MainActivity : FlutterActivity() {
    private val channel = "com.acme.app/biometric"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channel)
            .setMethodCallHandler { call, result ->
                if (call.method == "authenticate") {
                    val reason = call.argument<String>("reason") ?: ""
                    authenticateBiometric(reason, result)
                } else {
                    result.notImplemented()
                }
            }
    }
}
```

**iOS — Swift:**

```swift
override func application(_ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    let controller = window?.rootViewController as! FlutterViewController
    let channel = FlutterMethodChannel(
        name: "com.acme.app/biometric",
        binaryMessenger: controller.binaryMessenger
    )

    channel.setMethodCallHandler { call, result in
        if call.method == "authenticate" {
            let reason = (call.arguments as? [String: Any])?["reason"] as? String ?? ""
            self.authenticateBiometric(reason: reason, result: result)
        } else {
            result(FlutterMethodNotImplemented)
        }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
}
```

## EventChannel — stream de eventos nativos

<details>
<summary>❌ Bad — polling via MethodChannel para dados contínuos</summary>
<br>

```dart
// polling: ineficiente e com latência
Future<void> trackLocation() async {
  while (true) {
    final coords = await _channel.invokeMethod('getLocation');
    updateMap(coords);
    await Future.delayed(const Duration(seconds: 1));
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — EventChannel entrega eventos quando disponíveis</summary>
<br>

```dart
const _locationChannel = EventChannel('com.acme.app/location');

Stream<Coordinate> get locationStream {
  return _locationChannel.receiveBroadcastStream().map((event) {
    final data = event as Map;
    return Coordinate(
      latitude: data['latitude'] as double,
      longitude: data['longitude'] as double,
    );
  });
}
```

</details>

## Tratamento de erro em MethodChannel

<details>
<summary>❌ Bad — PlatformException não tratada — crash</summary>
<br>

```dart
Future<String> readNfcTag() async {
  return await _channel.invokeMethod<String>('readNfc') ?? '';
}
```

</details>

<br>

<details>
<summary>✅ Good — PlatformException mapeada para erro de domínio</summary>
<br>

```dart
Future<String> readNfcTag() async {
  try {
    final tag = await _channel.invokeMethod<String>('readNfc');
    return tag ?? '';
  } on PlatformException catch (e) {
    switch (e.code) {
      case 'NFC_NOT_AVAILABLE': throw NfcNotAvailableException();
      case 'NFC_READ_FAILED': throw NfcReadFailedException(e.message);
      default: throw NfcException('Unexpected error: ${e.message}');
    }
  }
}
```

</details>
