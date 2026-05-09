# Quick Reference

> Escopo: Java 25 LTS. Cheat-sheet das convenções; detalhes em `conventions/`.

## Nomenclatura

| Categoria       | Convenção        | Exemplos                                                      |
| --------------- | ---------------- | ------------------------------------------------------------- |
| Classes         | PascalCase       | `UserService`, `OrderRepository`, `InvoiceController`         |
| Interfaces      | PascalCase       | `PaymentGateway`, `UserRepository`, `Notifier`                |
| Records         | PascalCase       | `OrderSummary`, `UserProfile`, `InvoiceData`                  |
| Enums           | PascalCase       | `OrderStatus`, `PaymentMethod`, `NotificationType`            |
| Métodos         | camelCase        | `findUser`, `calculateTax`, `validateEmail`                   |
| Variáveis       | camelCase        | `userName`, `totalAmount`, `isActive`                         |
| Constantes      | UPPER_SNAKE_CASE | `MAX_RETRIES`, `ONE_DAY_MS`, `DEFAULT_TIMEOUT`                |
| Pacotes         | lowercase        | `com.example.orders`, `com.example.users.domain`              |
| Booleanos       | `is/has/can/should` + camelCase | `isValid`, `hasPermission`, `canRetry`       |
| Coleções        | plural camelCase | `orders`, `activeUsers`, `pendingItems`                       |

## Verbos

| Verbo                  | Uso              | Exemplos                                             |
| ---------------------- | ---------------- | ---------------------------------------------------- |
| `fetch` / `find` / `get` | Busca          | `fetchUserById`, `findActiveOrders`, `getConfig`     |
| `save` / `persist`     | Persistência     | `saveInvoice`, `persistChanges`                      |
| `compute` / `calculate` | Cálculo         | `computeTotal`, `calculateDiscount`                  |
| `validate` / `check`   | Verificação      | `validateEmail`, `checkPermission`                   |
| `notify` / `send`      | Comunicação      | `notifyUser`, `sendConfirmation`                     |
| `format` / `render`    | Apresentação     | `formatDate`, `renderTemplate`                       |
| `build` / `create`     | Construção       | `buildReport`, `createInvoice`                       |
| `parse` / `map`        | Conversão        | `parseDate`, `mapToViewModel`                        |

## Taboos

Nomes que não dizem nada. Troque pelo verbo ou conceito correto.

| Evitar                         | Usar                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| `handle`, `do`, `run`, `process` | verbo que descreve a ação: `save`, `validate`, `send`          |
| `data`, `info`, `result`       | nome do conceito: `user`, `invoice`, `summary`                   |
| `IUserService` (prefixo `I`)   | `UserService` — interfaces não precisam de prefixo               |
| `tmp`, `val`, `obj`, `item`    | nome completo e expressivo                                       |
| `Manager`, `Helper`, `Utils`   | nome do domínio: `OrderService`, `InvoiceBuilder`, `DateParser`  |

## Records — imutabilidade por padrão

```java
record InvoiceData(String orderId, String customerId, BigDecimal amount, String currency) {}

InvoiceData invoice = new InvoiceData("ord-1", "cust-99", new BigDecimal("149.90"), "BRL");
```

## Pattern matching — switch expressivo

```java
String label = switch (status) {
    case PENDING   -> "Pending review";
    case APPROVED  -> "Approved";
    case REJECTED  -> "Rejected";
    case CANCELLED -> "Cancelled";
};
```
