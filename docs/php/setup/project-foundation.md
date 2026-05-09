# Project Foundation

> Escopo: PHP 8.4.

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos PHP. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point enxuto,
> configuração centralizada, módulos por domínio.

Um projeto PHP bem fundado usa **Composer** (gerenciador de dependências) para autoload e
dependências, **PSR-12** (PHP Standards Recommendation 12, padrão de estilo de código) para
formatação, e **PHPStan** (PHP Static Analysis Tool, analisador estático) para detecção de erros
em tempo de desenvolvimento. O entry point delega configuração ao container de dependências;
módulos ficam organizados por domínio.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **Composer** | Gerenciador de dependências e autoload do PHP; `composer.json` é o `package.json` do ecossistema |
| **PSR-12** | Padrão de estilo de código PHP: indentação, espaços, chaves, declarações de tipo |
| **PHPStan** | Analisador estático que detecta erros de tipo sem executar o código; nível 9 é o mais estrito |
| **PSR-4** (PHP Standards Recommendation 4) | Padrão de autoload que mapeia namespaces para diretórios |
| `readonly` | Propriedade que não pode ser alterada após a inicialização; disponível desde PHP 8.1 |

## Estrutura de arquivos

```
my-app/
├── composer.json           ← deps, autoload PSR-4, scripts
├── composer.lock           ← versões travadas
├── phpstan.neon            ← configuração do PHPStan (nível 9)
├── .editorconfig           ← indentação, charset, trailing whitespace
├── .env.example            ← template — nunca commite .env
├── public/
│   └── index.php           ← entry point: bootstrap + dispatch
├── src/
│   ├── Bootstrap.php       ← monta container, registra módulos
│   ├── Config.php          ← lê variáveis de ambiente, fail-fast
│   └── Domain/
│       ├── Order/
│       │   ├── OrderHandler.php      ← HTTP handler (fronteira)
│       │   ├── OrderService.php      ← lógica de domínio
│       │   └── OrderRepository.php   ← interface de persistência
│       └── User/
│           ├── UserHandler.php
│           ├── UserService.php
│           └── UserRepository.php
└── tests/
    └── Domain/
        └── Order/
            └── OrderServiceTest.php
```

## composer.json — configuração central

`composer.json` declara dependências, autoload e scripts. Rode `composer install` para
instalar e `composer dump-autoload` após adicionar classes.

<details>
<summary>✅ Good — composer.json com PSR-4, PHPStan e scripts</summary>
<br>

```json
{
    "name": "company/my-app",
    "description": "My application",
    "require": {
        "php": ">=8.4",
        "ext-json": "*",
        "monolog/monolog": "^3.0",
        "symfony/validator": "^7.0"
    },
    "require-dev": {
        "phpunit/phpunit": "^11.0",
        "phpstan/phpstan": "^2.0",
        "squizlabs/php_codesniffer": "^3.10"
    },
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "App\\Tests\\": "tests/"
        }
    },
    "scripts": {
        "test": "phpunit --testdox",
        "analyse": "phpstan analyse src tests --level=9",
        "cs": "phpcs --standard=PSR12 src/ tests/"
    }
}
```

</details>

## Configuração centralizada

`Config.php` é o único ponto de leitura de variáveis de ambiente. Nenhum módulo usa
`getenv()` ou `$_ENV` diretamente. Falhe na inicialização se variáveis obrigatórias estiverem ausentes.

<details>
<summary>❌ Bad — getenv() espalhado em todo lugar</summary>
<br>

```php
// src/Domain/Order/OrderRepository.php
class OrderRepository
{
    public function __construct()
    {
        $dsn = getenv('DATABASE_URL'); // leitura direta
    }
}

// src/Domain/User/UserService.php
$jwtSecret = $_ENV['JWT_SECRET']; // leitura direta
```

</details>

<br>

<details>
<summary>✅ Good — Config como único ponto de entrada de env vars</summary>
<br>

```php
// src/Config.php
declare(strict_types=1);

namespace App;

final class Config
{
    public readonly string $databaseUrl;
    public readonly string $jwtSecret;
    public readonly int $port;

    public function __construct()
    {
        $this->databaseUrl = $this->require('DATABASE_URL');
        $this->jwtSecret   = $this->require('JWT_SECRET');
        $this->port        = (int) ($_ENV['PORT'] ?? 8080);
    }

    private function require(string $key): string
    {
        $value = $_ENV[$key] ?? null;

        if ($value === null || $value === '') {
            throw new \RuntimeException("{$key} is required");
        }

        return $value;
    }
}
```

```php
// src/Domain/Order/OrderRepository.php
final class OrderRepository implements OrderRepositoryInterface
{
    public function __construct(private readonly \PDO $connection) {}
}
```

</details>

## Entry point enxuto

`public/index.php` declara intenção, não implementa. Bootstrap monta container e
registra rotas; handlers ficam no domínio.

<details>
<summary>✅ Good — index.php como índice, lógica delegada</summary>
<br>

```php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use App\Bootstrap;

$app = Bootstrap::create();
$app->run();
```

```php
// src/Bootstrap.php
declare(strict_types=1);

namespace App;

final class Bootstrap
{
    public static function create(): self
    {
        $config = new Config();
        $container = Container::build($config);

        return new self($container);
    }

    public function __construct(private readonly Container $container) {}

    public function run(): void
    {
        $router = $this->container->get(Router::class);

        $router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);
    }
}
```

</details>

## strict_types

Sempre declare `strict_types=1` em todos os arquivos PHP. Isso habilita verificação
estrita de tipos em chamadas de função e previne coerções silenciosas.

<details>
<summary>❌ Bad — sem strict_types, coerção silenciosa</summary>
<br>

```php
<?php

function calculateTotal(int $price, int $quantity): int
{
    return $price * $quantity;
}

calculateTotal("5", "3"); // "5" é convertido para 5 silenciosamente
```

</details>

<br>

<details>
<summary>✅ Good — strict_types em todos os arquivos</summary>
<br>

```php
<?php

declare(strict_types=1);

function calculateTotal(int $price, int $quantity): int
{
    return $price * $quantity;
}

calculateTotal("5", "3"); // TypeError: argument must be of type int
```

</details>
