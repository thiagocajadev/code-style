# Spring Boot 4

[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)

Spring Boot 4 é o framework Java mais popular para aplicações web e APIs REST. Esta versão
requer Java 21+ e habilita virtual threads por padrão via `spring.threads.virtual.enabled=true`.

## Controller — camada HTTP

O controller recebe a requisição, delega ao service e retorna a resposta. Nenhuma lógica de
negócio fica aqui.

<details>
<summary>❌ Bad — controller com lógica de negócio e acesso direto ao banco</summary>
<br>

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

<br>

<details>
<summary>✅ Good — controller delega ao service; request e response são records tipados</summary>
<br>

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

## Request e Response — records tipados

Records eliminam boilerplate (código repetitivo) e garantem imutabilidade nos DTOs
(Data Transfer Objects, Objetos de Transferência de Dados).

<details>
<summary>✅ Good — records como contrato de API</summary>
<br>

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

## Service — camada de negócio

O service orquestra as regras de negócio. Não conhece HTTP nem detalhes de banco.

<details>
<summary>✅ Good — service orquestra, não implementa detalhes de infra</summary>
<br>

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

## Repository — Spring Data JPA

Spring Data JPA gera implementações de queries a partir de nomes de método. Para queries
complexas, use JPQL (Java Persistence Query Language) com `@Query` — referencia a entidade Java
pelo nome da classe — ou SQL nativo com `nativeQuery = true` — referencia a tabela real do banco.

<details>
<summary>✅ Good — JPQL: referencia a entidade Java, alias expressivo</summary>
<br>

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

<br>

<details>
<summary>✅ Good — SQL nativo: tabela real, padrão Tabela.coluna</summary>
<br>

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

## @Transactional — uso correto

`@Transactional` no service, não no repository (já gerenciado pelo Spring Data). Use
`readOnly = true` por padrão; sobrescreva com `@Transactional` sem `readOnly` nos métodos
de escrita.

<details>
<summary>❌ Bad — @Transactional no controller ou sem readOnly</summary>
<br>

```java
@Transactional // no controller — camada errada
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) { /* ... */ }

@Service
@Transactional // sem readOnly: todas as queries abrem transação de escrita
public class OrderService { /* ... */ }
```

</details>

<br>

<details>
<summary>✅ Good — readOnly por padrão na classe, @Transactional nos métodos de escrita</summary>
<br>

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

## @ControllerAdvice — tratamento global de erros

Centralize o mapeamento de exceções para respostas HTTP em um `@RestControllerAdvice`.

<details>
<summary>✅ Good — tratamento centralizado por tipo de exceção</summary>
<br>

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

Use `Pageable` e `Page<T>` para endpoints que retornam listas potencialmente grandes.

<details>
<summary>✅ Good — paginação via Pageable</summary>
<br>

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

## Actuator — health e métricas

Spring Actuator expõe endpoints de saúde e métricas para monitoramento.

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
