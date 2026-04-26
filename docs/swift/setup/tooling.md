# Tooling

> Escopo: Swift 6.1, Xcode 16 / Swift Package Manager.

Configuração inicial de um projeto Swift: gerenciador de pacotes, formatação e análise estática.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **SPM** (Swift Package Manager) | gerenciador de dependências nativo da Apple; `Package.swift` descreve o pacote |
| **SwiftLint** | linter de estilo e qualidade; enforça convenções do Swift API Design Guidelines |
| **swift-format** | formatador oficial da Apple; opcionado pelo SPM |
| **Swift 6 language mode** | strict concurrency checking ativado; data races são erros de compilação |
| **Xcode scheme** | configuração de build que define o alvo, ambiente e destino de execução |

## Estrutura de projeto (SPM)

```
MyPackage/
├── Package.swift             ← manifesto do pacote (targets, dependencies, products)
├── Sources/
│   └── MyPackage/
│       ├── Domain/           ← modelos e regras de negócio
│       ├── Data/             ← repositórios e I/O
│       └── Presentation/     ← ViewModels, UI state
└── Tests/
    └── MyPackageTests/
        └── OrderServiceTests.swift
```

## Package.swift mínimo

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyPackage",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "MyPackage", targets: ["MyPackage"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-algorithms", from: "1.2.0"),
    ],
    targets: [
        .target(
            name: "MyPackage",
            dependencies: [
                .product(name: "Algorithms", package: "swift-algorithms"),
            ],
            swiftSettings: [
                .enableExperimentalFeature("StrictConcurrency"),
            ]
        ),
        .testTarget(
            name: "MyPackageTests",
            dependencies: ["MyPackage"]
        ),
    ]
)
```

## SwiftLint

Arquivo `.swiftlint.yml` mínimo:

```yaml
included:
  - Sources
  - Tests

opt_in_rules:
  - explicit_init
  - force_unwrapping
  - prefer_self_in_static_references

disabled_rules:
  - trailing_whitespace

line_length:
  warning: 120
  error: 150

function_body_length:
  warning: 30
  error: 50
```

Executar: `swiftlint --strict` em CI.

<details>
<summary>❌ Bad — force unwrap detectado pelo SwiftLint</summary>
<br>

```swift
let user = userRepository.find(id: userId)!   // força unwrap sem mensagem
```

</details>

<br>

<details>
<summary>✅ Good — guard let com saída antecipada expressiva</summary>
<br>

```swift
guard let user = userRepository.find(id: userId) else {
    return .failure(.userNotFound(userId))
}
```

</details>

## Variáveis de ambiente e segredos

Nunca versionar credenciais em código ou em arquivos de configuração commitados.

| Contexto | Estratégia |
| --- | --- |
| iOS / macOS | `xcconfig` excluído do git; valores injetados via `Bundle.main.infoDictionary` |
| Backend (Vapor) | variáveis de ambiente lidas via `Environment.get("KEY")` |
| CI / CD | secrets do GitHub Actions ou Xcode Cloud environment variables |

```swift
guard let apiKey = ProcessInfo.processInfo.environment["PAYMENT_API_KEY"] else {
    preconditionFailure("PAYMENT_API_KEY environment variable is required")
}
```

→ Princípios gerais de segurança: [shared/platform/security.md](../../shared/platform/security.md)
