# Project Foundation

> [!NOTE] Essa estrutura reflete como costumo iniciar projetos Java com Spring Boot 4. Os exemplos
> são referências conceituais: podem não cobrir todos os detalhes de implementação. O que importa
> é o princípio: configuração centralizada, módulos por domínio e entry point como índice.

A fundação de um projeto Java define três decisões estruturantes: onde fica a configuração, como
pacotes se organizam por domínio, e como o entry point orquestra o boot da aplicação.

## Conceitos fundamentais

| Conceito                        | O que é                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| **DI** (Dependency Injection, Injeção de Dependência) | Framework provê dependências, não o componente as busca |
| **Bean**                        | Objeto gerenciado pelo container Spring                                          |
| **Controller**                  | Camada HTTP: recebe requisições, retorna respostas                               |
| **Service**                     | Camada de negócio: orquestra regras e coordena dependências                      |
| **Repository**                  | Camada de dados: abstração de acesso ao banco                                    |
| **virtual threads**             | Threads leves do Project Loom, habilitadas por padrão no Spring Boot 4           |

## Ambiente

Antes de iniciar, configure o editor:

- [EditorConfig](../../shared/standards/editorconfig.md): indentação, charset, trailing whitespace
- Checkstyle ou Spotless: linting e formatação de código

```bash
# Criar projeto via Spring Initializr
curl https://start.spring.io/starter.zip \
  -d type=gradle-project-kotlin \
  -d language=java \
  -d bootVersion=4.0.5 \
  -d javaVersion=25 \
  -d dependencies=web,data-jpa,validation,actuator,lombok \
  -o project.zip
```

## Injeção de dependência via construtor

Nunca injete com `@Autowired` em campo. Construtor torna as dependências explícitas e o objeto
testável sem o container Spring.

<details>
<summary>❌ Bad — @Autowired em campo: dependências ocultas, dificulta teste</summary>
<br>

```java
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository; // invisível no construtor

    @Autowired
    private NotificationService notificationService;
}
```

</details>

<br>

<details>
<summary>✅ Good — injeção via construtor: dependências explícitas</summary>
<br>

```java
@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService;

    public OrderService(OrderRepository orderRepository, NotificationService notificationService) {
        this.orderRepository = orderRepository;
        this.notificationService = notificationService;
    }
}
```

```java
// com Lombok: @RequiredArgsConstructor gera o construtor automaticamente
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final NotificationService notificationService;
}
```

</details>

## Configuração centralizada

`application.yml` é o único ponto de configuração. Nenhum componente acessa `System.getenv()`
diretamente. Use `@ConfigurationProperties` para agrupar propriedades por domínio.

<details>
<summary>❌ Bad — System.getenv() espalhado em todo lugar</summary>
<br>

```java
@Service
public class PaymentService {
    private final String apiKey = System.getenv("PAYMENT_API_KEY"); // leitura direta

    public void charge(BigDecimal amount) {
        // ...
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — @ConfigurationProperties agrupa e valida a configuração</summary>
<br>

```java
// config/PaymentProperties.java
@Validated
@ConfigurationProperties(prefix = "payment")
public record PaymentProperties(
    @NotBlank String apiKey,
    @NotBlank String apiUrl,
    @Positive int timeoutMs
) {}
```

```yaml
# application.yml
payment:
  api-key: ${PAYMENT_API_KEY}
  api-url: ${PAYMENT_API_URL:https://api.payment.com}
  timeout-ms: 5000

spring:
  threads:
    virtual:
      enabled: true   # virtual threads habilitadas por padrão no Spring Boot 4
```

</details>

## Estrutura de pacotes por domínio

Organize por domínio (feature), não por camada técnica. O código de um domínio fica co-localizado.

<details>
<summary>❌ Bad — pacotes por camada técnica: acopla tudo</summary>
<br>

```
src/main/java/com/example/
├── controllers/
│   ├── OrderController.java
│   └── UserController.java
├── services/
│   ├── OrderService.java
│   └── UserService.java
└── repositories/
    ├── OrderRepository.java
    └── UserRepository.java
```

</details>

<br>

<details>
<summary>✅ Good — pacotes por domínio: cada domínio é dono do seu código</summary>
<br>

```
src/main/java/com/example/
├── Application.java
├── config/
│   ├── SecurityConfig.java
│   └── WebConfig.java
├── orders/
│   ├── Order.java
│   ├── OrderController.java
│   ├── OrderService.java
│   ├── OrderRepository.java
│   └── dto/
│       ├── OrderRequest.java
│       └── OrderResponse.java
└── users/
    ├── User.java
    ├── UserController.java
    ├── UserService.java
    └── UserRepository.java
```

</details>

## Entry point enxuto

`Application.java` declara intenção, não implementa. É o índice do projeto.

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Virtual threads — Spring Boot 4

Com `spring.threads.virtual.enabled=true`, o Tomcat usa virtual threads por padrão. Código
bloqueante (JDBC, HTTP externo) escala como código reativo sem callbacks.

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

> Não é necessário alterar nenhum código de serviço ou repositório: o Spring configura o
> executor do servidor automaticamente.
