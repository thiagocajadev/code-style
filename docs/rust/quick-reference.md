# Quick Reference — Rust

> Escopo: Rust 1.95 (2024 Edition). Cheat-sheet de nomenclatura, tipos, controle de fluxo e padrões idiomáticos.

## Nomenclatura

| Contexto                        | Convenção               | Exemplos                                        |
| ------------------------------- | ----------------------- | ----------------------------------------------- |
| Funções e métodos               | `snake_case`            | `find_user`, `calculate_total`, `is_valid`      |
| Variáveis e parâmetros          | `snake_case`            | `user_id`, `order_total`, `is_active`           |
| Tipos, traits e enums           | `PascalCase`            | `UserService`, `OrderStatus`, `Repository`      |
| Constantes e statics            | `SCREAMING_SNAKE_CASE`  | `MAX_RETRIES`, `DEFAULT_TIMEOUT`                |
| Módulos e crates                | `snake_case`            | `order`, `auth`, `http_client`                  |
| Lifetimes                       | `'` + letra(s) curtas   | `'a`, `'static`, `'req`                        |
| Macros                          | `snake_case!`           | `vec!`, `println!`, `assert_eq!`               |

## Booleans

| Correto                         | Errado                  |
| ------------------------------- | ----------------------- |
| `is_active`, `has_permission`   | `active`, `permission`  |
| `can_delete`, `should_retry`    | `delete`, `retry`       |
| `is_valid`, `has_items`         | `valid`, `items`        |

## Verbos por intenção

| Intenção           | Preferir                                   | Evitar              |
| ------------------ | ------------------------------------------ | ------------------- |
| Ler de storage     | `fetch`, `load`, `find`, `get`             | `retrieve`, `pull`  |
| Escrever/persistir | `save`, `create`, `insert`, `persist`      | `put`, `push`       |
| Calcular/derivar   | `compute`, `calculate`, `derive`, `build`  | `get`, `do`         |
| Transformar        | `map`, `transform`, `convert`, `format`    | `process`, `parse`  |
| Validar            | `validate`, `check`, `assert`, `verify`    | `handle`, `test`    |
| Notificar          | `send`, `dispatch`, `notify`, `emit`       | `fire`, `trigger`   |

## Taboos — evitar sempre

| Banido                                              | Substituir por                           |
| --------------------------------------------------- | ---------------------------------------- |
| `handle`, `do_stuff`, `run`, `execute`, `perform`   | verbo de intenção                        |
| `data`, `info`, `obj`, `item`                       | nome de domínio                          |
| `helpers`, `utils`, `common`                        | nome de domínio do módulo                |
| `manager`, `controller`                             | `service`, `repository`, `handler`      |

## Declarações

| Uso                              | Forma                                    |
| -------------------------------- | ---------------------------------------- |
| Imutável (padrão)               | `let user_id = 42;`                      |
| Mutável (quando necessário)     | `let mut total = 0.0;`                   |
| Constante (compile-time)        | `const MAX_RETRIES: u32 = 3;`           |
| Static (vida toda a aplicação)  | `static DEFAULT_TIMEOUT: u64 = 30;`     |
| Tipo explícito                  | `let timeout: Duration = Duration::from_secs(30);` |
| Shadowing                       | `let order = parse_order(raw)?;`        |

## Controle de fluxo

| Padrão                        | Forma idiomática                                     |
| ----------------------------- | ---------------------------------------------------- |
| Propagação de erro            | `let user = find_user(id)?;`                         |
| Match exaustivo               | `match status { Active => ..., Inactive => ... }`   |
| Guard com Option              | `let Some(user) = find_user(id) else { return; };`  |
| Desestruturação em if         | `if let Some(order) = pending_order { ... }`        |
| Loop com break de valor       | `let result = loop { if done { break value; } };`   |
| Iterator funcional            | `items.iter().filter(|i| i.is_active()).collect()`  |

## Erros

| Padrão                         | Forma                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| Propagar erro                  | `let result = operation()?;`                                  |
| Adicionar contexto (anyhow)    | `operation().context("failed to load order")?`               |
| Erro tipado (thiserror)        | `#[derive(Error)] enum OrderError { NotFound(u64) }`         |
| Verificar tipo                 | `if let Err(OrderError::NotFound(id)) = result { ... }`      |
| Unwrap apenas em testes/demos  | `let user = find_user(1).unwrap(); // test only`             |

## Tipos fundamentais

| Contexto                       | Tipo preferido                                      |
| ------------------------------ | --------------------------------------------------- |
| Ausência opcional              | `Option<T>`                                         |
| Operação que pode falhar       | `Result<T, E>`                                      |
| String owned                   | `String`                                            |
| String borrowed                | `&str`                                              |
| Referência compartilhada (arc) | `Arc<T>`                                            |
| Mutabilidade compartilhada     | `Arc<Mutex<T>>` ou `Arc<RwLock<T>>`               |
| Coleção                        | `Vec<T>`, `HashMap<K, V>`, `HashSet<T>`            |

## Traits comuns

| Trait                 | Uso                                                       |
| --------------------- | --------------------------------------------------------- |
| `Debug`               | `#[derive(Debug)]` — formatação para debugging           |
| `Clone`               | `#[derive(Clone)]` — cópia explícita de valores          |
| `Display`             | Formatação legível para usuário final                    |
| `From` / `Into`       | Conversão idiomática entre tipos                         |
| `Default`             | `#[derive(Default)]` — valor padrão do tipo             |
| `Serialize` / `Deserialize` | `#[derive(Serialize, Deserialize)]` via Serde    |
