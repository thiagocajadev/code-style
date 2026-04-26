# Tooling

> Escopo: Kotlin 2.2, Android ou JVM/KMP.

Configuração inicial de um projeto Kotlin: gerenciador de build, formatação e análise estática.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Gradle KTS** (Kotlin Gradle DSL) | script de build escrito em Kotlin, com type-safety e autocompletar na IDE |
| **ktlint** | formatador e linter de estilo Kotlin; enforça convenções oficiais do Kotlin Style Guide |
| **detekt** | análise estática; detecta code smells, complexidade ciclomática e problemas de design |
| **K2 compiler** | compilador reescrito do Kotlin 2.0+; análise semântica mais precisa e erros melhores |
| **KMP** (Kotlin Multiplatform) | compartilhar lógica entre Android, iOS, Web e Desktop em um único código-fonte |

## Estrutura de projeto

Estrutura recomendada para um módulo Android ou JVM:

```
my-app/
├── build.gradle.kts          ← config do módulo (dependencies, plugins)
├── gradle/
│   └── libs.versions.toml    ← Version Catalog: todas as versões centralizadas
├── src/
│   ├── main/kotlin/
│   │   └── com/acme/app/     ← código de produção
│   └── test/kotlin/
│       └── com/acme/app/     ← testes unitários
└── settings.gradle.kts       ← módulos do projeto
```

## build.gradle.kts mínimo

```kotlin
plugins {
    kotlin("jvm") version "2.2.0"
    id("io.gitlab.arturbosch.detekt") version "1.23.6"
}

kotlin {
    jvmToolchain(21)
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.9.0")

    testImplementation(kotlin("test"))
    testImplementation("io.kotest:kotest-runner-junit5:5.9.1")
    testImplementation("io.mockk:mockk:1.13.12")
}
```

## ktlint

<details>
<summary>❌ Bad — sem formatação padronizada</summary>
<br>

```kotlin
fun calculateTotal(items:List<Item>,discount:Double):Double{
return items.sumOf{it.price}*(1-discount)
}
```

</details>

<br>

<details>
<summary>✅ Good — ktlint aplicado</summary>
<br>

```kotlin
fun calculateTotal(
    items: List<Item>,
    discount: Double,
): Double {
    val subtotal = items.sumOf { it.price }

    return subtotal * (1 - discount)
}
```

</details>

Configuração em `.editorconfig` (ktlint lê este arquivo):

```ini
[*.{kt,kts}]
indent_size = 4
max_line_length = 120
ktlint_standard_multiline-expression-wrapping = enabled
ktlint_standard_trailing-comma-on-call-site = enabled
```

## detekt

Arquivo `detekt.yml` mínimo:

```yaml
complexity:
  CyclomaticComplexMethod:
    threshold: 10
  LongMethod:
    threshold: 30

naming:
  FunctionNaming:
    functionPattern: '[a-z][a-zA-Z0-9]*'

style:
  MagicNumber:
    active: true
    ignoreNumbers: ['-1', '0', '1', '2']
```

## Variáveis de ambiente e segredos

Nunca versionar credenciais. Estratégias por contexto:

| Contexto | Estratégia |
| --- | --- |
| Android | `local.properties` + `BuildConfig` fields (excluído do git) |
| JVM/backend | variáveis de ambiente lidas via `System.getenv()` |
| KMP / CI | secret managers (AWS Secrets Manager, Vault, GitHub Secrets) |

```kotlin
val apiKey = requireNotNull(System.getenv("PAYMENT_API_KEY")) {
    "PAYMENT_API_KEY environment variable is required"
}
```

→ Princípios gerais de segurança: [shared/platform/security.md](../../shared/platform/security.md)
