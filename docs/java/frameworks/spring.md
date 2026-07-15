# Spring Boot 4

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)

O Spring Boot 4 é o framework Java mais usado para aplicação web e API REST. Esta versão pede Java 21 no mínimo e já liga as **virtual threads** (threads leves que a JVM cria aos milhares) por padrão, pela configuração `spring.threads.virtual.enabled=true`. As três camadas do padrão aparecem em anotações: `@RestController` recebe o HTTP, `@Service` guarda a regra de negócio, e `@Repository` fala com o banco.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **@RestController** (anotação de controlador REST) | junta `@Controller` e `@ResponseBody`; cada método devolve o corpo HTTP já serializado |
| **@Service** (anotação de serviço) | marca a camada de negócio, que coordena as regras e as dependências |
| **@Repository** (anotação de repositório) | marca a camada de acesso a dados e traduz as exceções de persistência |
| **JPA** (Jakarta Persistence API · API de Persistência Java) | especificação Java para o mapeamento objeto-relacional |
| **DI** (Dependency Injection · Injeção de Dependência) | o container do Spring entrega as dependências pelo construtor |
| **DTO** (Data Transfer Object · Objeto de Transferência de Dados) | record de entrada e saída HTTP, que mantém a entidade JPA fora da resposta |
| **virtual threads** (threads leves que a JVM cria aos milhares) | ligadas por padrão no Spring Boot 4; o código sequencial atende muitas requisições ao mesmo tempo |

## Controller: a camada HTTP

O controller recebe a requisição, chama o service e devolve a resposta. Nenhuma regra de negócio mora aqui: quando o controller começa a validar dados de negócio e a montar objetos de domínio, a mesma regra vai precisar ser repetida no próximo controller que fizer a mesma operação.

<details>
<summary>❌ Ruim: controller com regra de negócio e acesso direto ao banco</summary>

```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @PostMapping
    public Order createOrder(@RequestBody Map<String, Object> body) {
        if (body.get("customerId") == null) {
            throw new RuntimeException("customerId required");
        }
        final var order = new Order();
        order.setCustomerId((String) body.get("customerId"));
        order.setTotal(new BigDecimal(body.get("total").toString()));
        order.setCreatedAt(LocalDateTime.now());
        return orderRepository.save(order);
    }
}
```

</details>

<details>
<summary>✅ Bom: controller delega ao service; request e response são records tipados</summary>

```java
@Slf4j
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
        log.info("Creating order: customerId={}", request.customerId());

        final var order = orderService.create(request);
        final var response = OrderResponse.from(order);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String id) {
        final var order = orderService.findById(id);
        final var response = OrderResponse.from(order);

        return ResponseEntity.ok(response);
    }
}
```

</details>

## Request e Response como records

O record descreve o contrato da API em poucas linhas, e o compilador gera o construtor, os acessores e o `equals`. O objeto nasce pronto e não muda depois, então a requisição que chegou não é alterada no meio do caminho. Manter records de entrada e saída separados da entidade JPA impede que uma coluna nova do banco apareça sozinha na resposta da API.

<details>
<summary>✅ Bom: records como contrato de entrada e saída da API</summary>

```java
// request
public record OrderRequest(
    @NotBlank(message = "Customer ID is required.")
    String customerId,

    @NotEmpty(message = "Items are required.")
    List<@Valid OrderItemRequest> items
) {}

public record OrderItemRequest(
    @NotBlank String productId,
    @Positive int quantity
) {}

// response
public record OrderResponse(
    String id,
    String customerId,
    BigDecimal total,
    String status,
    Instant createdAt
) {
    public static OrderResponse from(Order order) {
        final var response = new OrderResponse(
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            order.getStatus().name(),
            order.getCreatedAt()
        );

        return response;
    }
}
```

</details>

## Service: a camada de negócio

O service coordena as regras de negócio e nada mais. Ele não sabe que veio de uma requisição HTTP, e não sabe se o banco é Postgres ou MySQL. Assim a mesma regra serve a um controller REST, a um consumer de fila e a um teste, sem arrastar junto o detalhe de onde a chamada nasceu.

<details>
<summary>✅ Bom: o service coordena as regras e delega a infra</summary>

```java
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final NotificationService notificationService;

    @Transactional
    public Order create(OrderRequest request) {
        final var products = productService.validateAndFetchProducts(request.items());
        final var order = buildOrder(request, products);

        final var savedOrder = orderRepository.save(order);
        notificationService.notifyOrderCreated(savedOrder);

        return savedOrder;
    }

    public Order findById(String id) {
        final var order = orderRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Order " + id + " not found."));

        return order;
    }

    private Order buildOrder(OrderRequest request, List<Product> products) {
        final var total = calculateTotal(request.items(), products);
        final var order = new Order(request.customerId(), total, Instant.now());
        return order;
    }

    private BigDecimal calculateTotal(List<OrderItemRequest> items, List<Product> products) {
        final var priceByProductId = products.stream()
            .collect(Collectors.toMap(Product::getId, Product::getPrice));

        final var total = items.stream()
            .map(item -> priceByProductId.get(item.productId())
                .multiply(BigDecimal.valueOf(item.quantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return total;
    }
}
```

</details>

## Repository com Spring Data JPA

O Spring Data JPA lê o nome do método e escreve a query sozinho: `findByCustomerIdAndStatus` vira um `SELECT` com os dois filtros. Para uma consulta que o nome não alcança, escreva a query você mesmo, de dois jeitos. O **JPQL** (Java Persistence Query Language) fala em nomes de entidade Java pelo `@Query`. O **SQL nativo**, com `nativeQuery = true`, fala nos nomes reais das tabelas do banco.

<details>
<summary>✅ Bom: JPQL usa o nome da entidade Java e um alias claro</summary>

```java
public interface OrderRepository extends JpaRepository<Order, String> {

    // query derivada do nome do método
    List<Order> findByCustomerIdAndStatus(String customerId, OrderStatus status);

    // JPQL: entidade Java "Order", alias "ord" (order é reservado em JPQL)
    @Query("""
        SELECT
          ord
        FROM
          Order ord
        JOIN FETCH
          ord.items item
        WHERE
          ord.customerId = :customerId AND
          ord.createdAt >= :since
        ORDER BY
          ord.createdAt DESC
    """)
    List<Order> findRecentOrdersWithItems(
        @Param("customerId") String customerId,
        @Param("since") Instant since
    );

    // paginação
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);
}
```

</details>

<details>
<summary>✅ Bom: SQL nativo usa a tabela real, no padrão Tabela.coluna</summary>

```java
public interface OrderRepository extends JpaRepository<Order, String> {

    // SQL nativo: tabela "Orders" (plural), Tabela.coluna explícito
    @Query(value = """
        SELECT
          Orders.id,
          Orders.customer_id,
          Orders.status,
          Orders.created_at
        FROM
          Orders
        JOIN
          OrderItems ON OrderItems.order_id = Orders.id
        WHERE
          Orders.customer_id = :customerId AND
          Orders.created_at >= :since
        ORDER BY
          Orders.created_at DESC
    """, nativeQuery = true)
    List<Order> findRecentOrdersWithItems(
        @Param("customerId") String customerId,
        @Param("since") Instant since
    );
}
```

</details>

## @Transactional no lugar certo

O `@Transactional` mora no service, a camada que decide o que entra numa transação. O repository já vem com a transação gerenciada pelo Spring Data, e o controller cuida do HTTP. Marque a classe do service com `readOnly = true`, que é o caso da maioria dos métodos, e sobrescreva com `@Transactional` sem `readOnly` só nos métodos que gravam.

<details>
<summary>❌ Ruim: @Transactional no controller, ou na classe sem readOnly</summary>

```java
@Transactional // no controller: camada errada
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) { /* ... */ }

@Service
@Transactional // sem readOnly: todas as queries abrem transação de escrita
public class OrderService { /* ... */ }
```

</details>

<details>
<summary>✅ Bom: readOnly por padrão na classe, @Transactional nos métodos de escrita</summary>

```java
@Service
@Transactional(readOnly = true) // padrão: transação somente leitura
public class OrderService {

    @Transactional // sobrescreve readOnly para escrita
    public Order create(OrderRequest request) { /* ... */ }

    public Order findById(String id) { /* ... */ } // herda readOnly = true
}
```

</details>

## @ControllerAdvice para os erros da aplicação

Um `@RestControllerAdvice` reúne num lugar só a tradução de cada exceção para a resposta HTTP. O `NotFoundException` vira 404, o `ValidationException` vira 400, e qualquer outra exceção cai no 500 com log. Sem esse ponto único, cada controller repetiria o mesmo `try/catch` para montar a resposta de erro.

<details>
<summary>✅ Bom: um handler por tipo de exceção, num ponto só</summary>

```java
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
        final var response = new ErrorResponse(ex.getMessage(), ex.action());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidation(ValidationException ex) {
        final var response = new ErrorResponse(ex.getMessage(), ex.action());
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unexpected error", ex);

        final var response = new ErrorResponse("An unexpected error occurred.", "Contact support.");
        return ResponseEntity.internalServerError().body(response);
    }
}

record ErrorResponse(String message, String action) {}
```

</details>

## Paginação

Um endpoint que devolve lista pode crescer para milhares de linhas com o tempo. Receba um `Pageable` e devolva um `Page<T>`: o cliente pede uma página por vez, e a consulta traz só aquele pedaço do banco, em vez de carregar a tabela inteira na memória.

<details>
<summary>✅ Bom: paginação com Pageable</summary>

```java
// controller
@GetMapping
public Page<OrderResponse> listOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

    final var pageable = PageRequest.of(page, size, Sort.by(sort));
    final var orders = orderService.findAll(pageable);

    return orders.map(OrderResponse::from);
}

// service
public Page<Order> findAll(Pageable pageable) {
    final var orders = orderRepository.findAll(pageable);
    return orders;
}
```

</details>

## Actuator para saúde e métricas

O Spring Actuator abre endpoints que informam a saúde e as métricas da aplicação, para o sistema de monitoramento consultar. Exponha só os que o monitoramento usa, e proteja os detalhes: o `show-details: when-authorized` esconde o estado interno de quem não está autenticado.

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      show-details: when-authorized
```

> Exponha `/actuator/prometheus` para Micrometer + Prometheus. Nunca exponha todos os endpoints
> sem autenticação em produção.
