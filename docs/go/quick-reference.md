# Quick Reference — Go

> Escopo: Go 1.26. Cheat-sheet de nomenclatura, tipos, controle de fluxo e padrões idiomáticos.

## Nomenclatura

| Contexto                        | Convenção        | Exemplos                                    |
| ------------------------------- | ---------------- | ------------------------------------------- |
| Exported (público)              | `PascalCase`     | `UserService`, `FindByID`, `ErrNotFound`    |
| Unexported (interno ao pacote)  | `camelCase`      | `userService`, `findByID`, `errNotFound`    |
| Constantes                      | `PascalCase`     | `MaxRetries`, `DefaultTimeout`              |
| Interfaces                      | `PascalCase` `-er` | `Reader`, `Stringer`, `UserRepository`    |
| Pacotes                         | `lowercase`      | `order`, `auth`, `httputil`                 |
| Parâmetros de função            | `camelCase` curto | `userID`, `ctx`, `req`                     |
| Receptor de método              | 1–2 letras       | `u *User`, `s *Service`                     |

## Booleans

| Correto                   | Errado              |
| ------------------------- | ------------------- |
| `isActive`, `hasPermission` | `active`, `permission` |
| `canDelete`, `shouldRetry`  | `delete`, `retry`    |
| `isValid`, `hasItems`       | `valid`, `items`     |

## Verbos por intenção

| Intenção           | Preferir                                   | Evitar             |
| ------------------ | ------------------------------------------ | ------------------ |
| Ler de storage     | `Fetch`, `Load`, `Find`, `Get`             | `Retrieve`, `Pull` |
| Escrever/persistir | `Save`, `Create`, `Insert`, `Persist`      | `Put`, `Push`      |
| Calcular/derivar   | `Compute`, `Calculate`, `Derive`, `Build`  | `Get`, `Do`        |
| Transformar        | `Map`, `Transform`, `Convert`, `Format`    | `Process`, `Parse` |
| Validar            | `Validate`, `Check`, `Assert`, `Verify`    | `Handle`, `Test`   |
| Notificar          | `Send`, `Dispatch`, `Notify`, `Emit`       | `Fire`, `Trigger`  |

## Taboos — evitar sempre

| Banido                        | Substituir por                          |
| ----------------------------- | --------------------------------------- |
| `Handle`, `Do`, `Run`, `Execute`, `Perform` | verbo de intenção            |
| `data`, `info`, `obj`, `item` | nome de domínio                         |
| `helpers`, `utils`, `common`  | nome de domínio do pacote               |
| `manager`, `controller`       | `Service`, `Repository`, `Handler`      |

## Declarações

| Uso                           | Forma                            |
| ----------------------------- | -------------------------------- |
| Declaração curta (local)      | `userID := 42`                   |
| Declaração explícita          | `var timeout time.Duration`      |
| Constante                     | `const MaxRetries = 3`           |
| Constante enumerada           | `iota` em bloco `const`          |
| Múltiplos retornos            | `result, err := findUser(id)`    |
| Blank identifier              | `_, err := doSomething()`        |

## Controle de fluxo

| Padrão                        | Forma idiomática                                   |
| ----------------------------- | -------------------------------------------------- |
| Guard clause                  | `if err != nil { return err }`                     |
| Switch sem fallthrough        | `switch status { case "active": ... }`             |
| Loop único (for = while)      | `for condition { ... }`                            |
| Loop infinito                 | `for { ... }`                                      |
| Defer cleanup                 | `defer file.Close()`                               |
| Defer com erro                | `defer func() { err = closeWithErr(f, err) }()`   |

## Erros

| Padrão                        | Forma                                                  |
| ----------------------------- | ------------------------------------------------------ |
| Retornar erro                 | `return nil, fmt.Errorf("context: %w", err)`           |
| Sentinel error                | `var ErrNotFound = errors.New("not found")`            |
| Tipo de erro customizado      | `type ValidationError struct { Field string }`         |
| Verificar tipo                | `errors.As(err, &target)`                              |
| Verificar sentinel            | `errors.Is(err, ErrNotFound)`                          |
| Panic — apenas invariantes    | `panic("nil dependency injected")`                     |

## Interfaces

| Padrão                        | Nota                                              |
| ----------------------------- | ------------------------------------------------- |
| Definir no consumidor         | Interface fica no pacote que consome, não no que implementa |
| 1–3 métodos                   | Interfaces pequenas são mais compostas            |
| Verificar implementação       | `var _ UserRepository = (*postgresRepo)(nil)`     |

## Goroutines e channels

| Padrão                        | Forma                                             |
| ----------------------------- | ------------------------------------------------- |
| Lançar goroutine              | `go processOrder(ctx, order)`                     |
| Channel buffered               | `ch := make(chan Result, 1)`                      |
| Select com timeout            | `select { case r := <-ch: ... case <-ctx.Done(): ... }` |
| WaitGroup                     | `var wg sync.WaitGroup; wg.Add(1); defer wg.Done()` |
| errgroup                      | `g, ctx := errgroup.WithContext(ctx)`             |
