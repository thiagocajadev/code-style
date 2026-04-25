# Project Foundation

> Escopo: Go 1.26.

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Go. Os exemplos são referências
> conceituais: podem não cobrir todos os detalhes de implementação e, conforme as tecnologias
> evoluem, alguns podem ficar desatualizados. O que importa é o princípio: entry point enxuto,
> pacotes por domínio, configuração centralizada.

Um projeto Go bem fundado começa com `go.mod` declarando o módulo e a versão mínima do toolchain.
O entry point em `cmd/` inicializa configuração e delega para `internal/`. Pacotes ficam organizados
por domínio, não por camada técnica.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **module** (módulo) | Unidade de versionamento em Go; declarado em `go.mod` com um caminho de importação único |
| **package** (pacote) | Unidade de compilação e encapsulamento; arquivos `.go` no mesmo diretório pertencem ao mesmo pacote |
| **toolchain** | Versão do compilador Go gerenciada pelo `go.mod` desde Go 1.21; garantia de build reproduzível |
| `internal/` | Diretório que restringe importações externas ao módulo; convenção de encapsulamento |
| `cmd/` | Diretório de entry points executáveis; cada subdiretório vira um binário separado |

## Estrutura de arquivos

```
my-app/
├── go.mod                  ← módulo + versão mínima do toolchain
├── go.sum                  ← hashes verificados das dependências
├── .editorconfig           ← indentação, charset, trailing whitespace
├── .env.example            ← template — nunca commite .env
├── cmd/
│   └── api/
│       └── main.go         ← entry point: carrega config, sobe servidor
├── internal/
│   ├── config/
│   │   └── config.go       ← Settings lidos de env vars
│   ├── order/
│   │   ├── handler.go      ← HTTP handler (fronteira)
│   │   ├── service.go      ← lógica de domínio
│   │   └── repository.go   ← interface + implementação de persistência
│   └── user/
│       ├── handler.go
│       ├── service.go
│       └── repository.go
└── scripts/
    └── seed.go
```

## go.mod — configuração central

`go.mod` declara o módulo, a versão mínima do Go e as dependências diretas.
`go.sum` é gerado automaticamente e não deve ser editado manualmente.

<details>
<summary>❌ Bad — sem versão de toolchain, dependências soltas</summary>
<br>

```go
module my-app

go 1.18

require (
    github.com/gin-gonic/gin latest
)
```

</details>

<br>

<details>
<summary>✅ Good — módulo com toolchain fixo e dependências versionadas</summary>
<br>

```go
module github.com/company/my-app

go 1.26

toolchain go1.26.0

require (
    github.com/gin-gonic/gin v1.10.0
    github.com/jmoiron/sqlx v1.4.0
    golang.org/x/sync v0.10.0
)

require (
    // dependências indiretas gerenciadas pelo go mod tidy
)
```

</details>

## Configuração centralizada

`internal/config/config.go` é o único ponto de leitura de variáveis de ambiente.
Nenhum pacote acessa `os.Getenv` diretamente. Use `os.LookupEnv` para distinguir
ausência de valor vazio.

<details>
<summary>❌ Bad — os.Getenv espalhado em todo lugar</summary>
<br>

```go
// internal/order/repository.go
import "os"

func NewRepository() *Repository {
    dsn := os.Getenv("DATABASE_URL") // leitura direta
    return &Repository{dsn: dsn}
}

// internal/auth/middleware.go
import "os"

secret := os.Getenv("JWT_SECRET") // leitura direta
```

</details>

<br>

<details>
<summary>✅ Good — Config como único ponto de entrada de env vars</summary>
<br>

```go
// internal/config/config.go
package config

import (
    "fmt"
    "os"
)

type Config struct {
    DatabaseURL string
    JWTSecret   string
    Port        string
}

func Load() (*Config, error) {
    databaseURL, ok := os.LookupEnv("DATABASE_URL")
    if !ok {
        return nil, fmt.Errorf("DATABASE_URL is required")
    }

    jwtSecret, ok := os.LookupEnv("JWT_SECRET")
    if !ok {
        return nil, fmt.Errorf("JWT_SECRET is required")
    }

    port, ok := os.LookupEnv("PORT")
    if !ok {
        port = "8080"
    }

    cfg := &Config{
        DatabaseURL: databaseURL,
        JWTSecret:   jwtSecret,
        Port:        port,
    }

    return cfg, nil
}
```

```go
// internal/order/repository.go
package order

type Repository struct {
    db *sqlx.DB
}

func NewRepository(db *sqlx.DB) *Repository {
    return &Repository{db: db}
}
```

</details>

## Entry point enxuto

`cmd/api/main.go` declara intenção, não implementa. Toda inicialização é delegada para `internal/`.

<details>
<summary>❌ Bad — main.go como dumping ground</summary>
<br>

```go
package main

import (
    "database/sql"
    "net/http"
    "os"
)

func main() {
    db, _ := sql.Open("postgres", os.Getenv("DATABASE_URL"))

    http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
        rows, _ := db.Query("SELECT * FROM orders")
        // handler inline com lógica de banco
        _ = rows
    })

    http.ListenAndServe(":8080", nil)
}
```

</details>

<br>

<details>
<summary>✅ Good — main.go como índice, lógica delegada</summary>
<br>

```go
// cmd/api/main.go
package main

import (
    "log"
    "github.com/company/my-app/internal/config"
    "github.com/company/my-app/internal/server"
)

func main() {
    cfg, err := config.Load()
    if err != nil {
        log.Fatalf("config: %v", err)
    }

    srv, err := server.New(cfg)
    if err != nil {
        log.Fatalf("server: %v", err)
    }

    if err := srv.Start(); err != nil {
        log.Fatalf("server: %v", err)
    }
}
```

```go
// internal/server/server.go
package server

import (
    "fmt"
    "net/http"
    "github.com/company/my-app/internal/config"
    "github.com/company/my-app/internal/order"
)

type Server struct {
    cfg    *config.Config
    router http.Handler
}

func New(cfg *config.Config) (*Server, error) {
    orderHandler := order.NewHandler(cfg)
    router := buildRouter(orderHandler)

    srv := &Server{cfg: cfg, router: router}

    return srv, nil
}

func (s *Server) Start() error {
    addr := fmt.Sprintf(":%s", s.cfg.Port)

    return http.ListenAndServe(addr, s.router)
}
```

</details>

## Pacotes por domínio

Cada domínio encapsula handler, service e repository. O server não conhece os internos de cada domínio.

<details>
<summary>❌ Bad — estrutura por camada técnica</summary>
<br>

```
internal/
├── handlers/
│   ├── order.go
│   └── user.go
├── services/
│   ├── order.go
│   └── user.go
└── repositories/
    ├── order.go
    └── user.go
```

</details>

<br>

<details>
<summary>✅ Good — estrutura por domínio (feature-based)</summary>
<br>

```
internal/
├── order/
│   ├── handler.go      ← HTTP: deserializa, chama service, serializa
│   ├── service.go      ← domínio: regras de negócio
│   └── repository.go   ← dados: interface + implementação
└── user/
    ├── handler.go
    ├── service.go
    └── repository.go
```

</details>
