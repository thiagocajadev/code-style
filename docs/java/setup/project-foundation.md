# Base de um projeto Java

> [!NOTE]
> Essa estrutura reflete como costumo iniciar projetos Java com Spring Boot 4. Os exemplos
> são referências conceituais: podem não cobrir todos os detalhes de implementação. O que importa
> é o princípio: configuração num lugar só, pacotes por domínio e entry point como índice.

A base de um projeto Java se resolve em três decisões: onde fica a configuração, como os pacotes se dividem por domínio, e como o entry point (o ponto de partida da aplicação) sobe tudo. As três aparecem no começo do projeto e ficam caras de mudar depois, então vale acertá-las cedo.

## Conceitos fundamentais

| Conceito                        | O que é                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| **DI** (Dependency Injection · Injeção de Dependência) | o framework entrega as dependências ao componente, que não vai buscá-las |
| **Bean** (componente gerenciado)                      | objeto que o container Spring cria e entrega                                     |
| **Controller** (controlador HTTP)                     | camada HTTP: recebe a requisição e devolve a resposta                            |
| **Service** (serviço de negócio)                      | camada de negócio: coordena as regras e as dependências                          |
| **Repository** (repositório de dados)                 | camada de dados: esconde o acesso ao banco                                       |
| **virtual threads** (threads leves que a JVM cria aos milhares) | threads leves do Project Loom, ligadas por padrão no Spring Boot 4     |

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

## Injeção de dependência pelo construtor

Receba as dependências pelo construtor, nunca com `@Autowired` num campo. O construtor lista o que a classe precisa para funcionar, e o teste consegue criar a classe passando dados fictícios direto, sem subir o container Spring. Com `@Autowired` no campo, as dependências ficam escondidas e o teste depende do framework para preenchê-las.

<details>
<summary>❌ Ruim: @Autowired no campo esconde as dependências e trava o teste</summary>

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

<details>
<summary>✅ Bom: o construtor lista o que a classe precisa</summary>

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

## Configuração num lugar só

O `application.yml` é o ponto único de configuração, e nenhum componente lê `System.getenv()` por conta própria. Junte as propriedades de cada domínio num record com `@ConfigurationProperties`: elas ficam agrupadas, validadas na subida da aplicação, e um `@Positive` num campo de timeout barra o valor errado antes de a aplicação atender a primeira requisição.

<details>
<summary>❌ Ruim: System.getenv() lido direto, espalhado pelo código</summary>

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

<details>
<summary>✅ Bom: @ConfigurationProperties agrupa e valida na subida</summary>

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

## Pacotes por domínio

Organize os pacotes por domínio, com o nome da funcionalidade. Assim `Order`, `OrderController`, `OrderService` e `OrderRepository` moram no mesmo pacote `orders`, e quem mexe em pedidos abre uma pasta só. Organizar por camada técnica espalha esses quatro arquivos por três pastas distantes, e uma mudança de funcionalidade toca todas elas.

<details>
<summary>❌ Ruim: pacotes por camada técnica espalham cada funcionalidade</summary>

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

<details>
<summary>✅ Bom: cada domínio guarda o próprio código num pacote</summary>

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

O `Application.java` só liga o Spring e sai do caminho. Ele não tem regra de negócio nem configuração inline: a anotação `@SpringBootApplication` faz o trabalho, e o método `main` chama o `run`. Quem abre o arquivo entende o ponto de partida em quatro linhas.

```java
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Virtual threads no Spring Boot 4

Com `spring.threads.virtual.enabled=true`, o Tomcat atende cada requisição numa virtual thread. Uma chamada que espera pelo banco (JDBC) ou por outro serviço HTTP para naquela thread leve, sem prender uma thread do sistema, então o servidor atende muitas requisições ao mesmo tempo com código escrito na ordem natural.

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true
```

> Não é necessário alterar nenhum código de serviço ou repositório: o Spring configura o
> executor do servidor automaticamente.
