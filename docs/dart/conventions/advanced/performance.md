# Performance

> Escopo: Dart 3.7.

Performance em Dart começa por usar `const` constructors: objetos const são reusados pelo
compilador (canonicalizados). Evitar `dynamic` elimina boxing e checagens de runtime. Streams
e Futures têm custo de microtask — lazy evaluation adia trabalho desnecessário.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| `const` constructor | objeto criado em tempo de compilação; canonicalizado — a mesma instância é reusada |
| `Uint8List` | buffer de bytes de baixo nível; muito mais eficiente que `List<int>` para I/O |
| **lazy evaluation** | iterable lazy com `where`/`map` sem materializar lista intermediária |
| `dart:typed_data` | coleções tipadas de primitivos (int, double) sem boxing |
| `profile mode` | build intermediário entre debug e release; ideal para medir performance real |

## `dynamic` e `Object`

<details>
<summary>❌ Bad — dynamic desabilita verificação de tipo</summary>
<br>

```dart
List<dynamic> processItems(List<dynamic> items) {
  return items.map((item) => item['name']).toList();   // runtime error silencioso
}
```

</details>

<br>

<details>
<summary>✅ Good — genérico tipado; erros em compile-time</summary>
<br>

```dart
List<String> extractNames(List<Map<String, dynamic>> items) {
  return items.map((item) => item['name'] as String).toList();
}
```

</details>

## `const` constructors para widgets e objetos imutáveis

<details>
<summary>❌ Bad — objeto novo criado a cada chamada</summary>
<br>

```dart
final padding = EdgeInsets.all(16);     // nova instância sempre
final color = Colors.blue;             // nova instância sempre
```

</details>

<br>

<details>
<summary>✅ Good — const canonicaliza e reusa a mesma instância</summary>
<br>

```dart
const padding = EdgeInsets.all(16);
const color = Colors.blue;
```

</details>

## Lazy evaluation em coleções grandes

<details>
<summary>❌ Bad — cada operação cria lista intermediária</summary>
<br>

```dart
List<String> findTopSpenders(List<Customer> customers, int limit) {
  return customers
      .where((c) => c.totalSpent > 1000)    // nova List
      .map((c) => c.name)                   // nova List
      .take(limit)                          // nova List
      .toList();
}
```

</details>

<br>

<details>
<summary>✅ Good — lazy até o toList() final</summary>
<br>

```dart
List<String> findTopSpenders(List<Customer> customers, int limit) {
  final topSpenderNames = customers
      .where((c) => c.totalSpent > 1000)
      .map((c) => c.name)
      .take(limit)
      .toList();   // materializa uma vez no final

  return topSpenderNames;
}
```

</details>

## `Uint8List` para I/O de bytes

<details>
<summary>❌ Bad — List<int> com boxing para cada byte</summary>
<br>

```dart
Future<List<int>> readFile(String path) async {
  return File(path).readAsBytes().then((bytes) => bytes.toList());
}
```

</details>

<br>

<details>
<summary>✅ Good — Uint8List é buffer nativo sem boxing</summary>
<br>

```dart
Future<Uint8List> readFile(String path) async {
  return File(path).readAsBytes();
}
```

</details>

## Benchmarks com package:benchmark_harness

```dart
import 'package:benchmark_harness/benchmark_harness.dart';

class FilterBenchmark extends BenchmarkBase {
  final customers = List.generate(
    10000,
    (i) => Customer(id: i, totalSpent: i.toDouble()),
  );

  const FilterBenchmark() : super('FilterBenchmark');

  @override
  void run() {
    customers.where((c) => c.totalSpent > 5000).toList();
  }
}

void main() => FilterBenchmark().report();
```

Execute com `dart run --define=flutter.minified=true` em profile mode para resultados próximos
de produção.
