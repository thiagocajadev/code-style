# Validation

> Escopo: Java 25 LTS — Jakarta Bean Validation 3.1 + Hibernate Validator 9.

Valide na **fronteira** do sistema: input externo (HTTP, mensageria, CLI). Dentro da aplicação,
confie nos contratos já validados.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Bean Validation** | especificação Jakarta para validação declarativa via anotações |
| **Hibernate Validator** | implementação de referência do Bean Validation |
| **constraint** (restrição) | regra de validação declarada via anotação (`@NotBlank`, `@Size`, etc.) |
| **ConstraintViolation** (violação de restrição) | objeto que descreve um campo inválido e a mensagem de erro |
| **@Valid** | instrui o Spring a validar o objeto anotado antes de chamar o método |
| **consumer** (consumidor de mensagem) | componente que lê e processa mensagens de uma fila ou tópico |

## Validação inline no service

<details>
<summary>❌ Bad — validação espalhada em múltiplos serviços</summary>
<br>

```java
public User createUser(String name, String email) {
    if (name == null || name.isBlank()) throw new ValidationException("Name is required.");
    if (email == null || !email.contains("@")) throw new ValidationException("Invalid email.");
    if (name.length() > 100) throw new ValidationException("Name is too long.");

    return userRepository.save(new User(name, email));
}
```

</details>

<br>

<details>
<summary>✅ Good — anotações de Bean Validation no record de input</summary>
<br>

```java
public record UserInput(
    @NotBlank(message = "Name is required.")
    @Size(max = 100, message = "Name must not exceed 100 characters.")
    String name,

    @NotBlank(message = "Email is required.")
    @Email(message = "Email must be valid.")
    String email
) {}

// Spring valida automaticamente com @Valid no controller
@PostMapping("/users")
public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserInput input) {
    final var user = userService.create(input);
    return ResponseEntity.status(201).body(UserResponse.from(user));
}
```

</details>

## Anotações principais

| Anotação              | Uso                                                         |
| --------------------- | ----------------------------------------------------------- |
| `@NotNull`            | Campo não pode ser null                                     |
| `@NotBlank`           | String não pode ser null, vazia ou apenas espaços           |
| `@NotEmpty`           | String ou coleção não pode ser null ou vazia                |
| `@Size(min, max)`     | Tamanho de string ou coleção dentro do intervalo            |
| `@Min` / `@Max`       | Valor numérico mínimo / máximo                              |
| `@Email`              | Formato de e-mail válido                                    |
| `@Pattern(regexp)`    | String deve corresponder à expressão regular                |
| `@Positive`           | Número deve ser positivo (> 0)                              |
| `@PositiveOrZero`     | Número deve ser positivo ou zero (≥ 0)                      |
| `@Past` / `@Future`   | Data deve estar no passado / futuro                         |

## Validator programático

Quando precisar validar fora de um controller Spring, injete o `Validator` programaticamente.

<details>
<summary>✅ Good — validação programática na fronteira de um consumer (consumidor de mensagem)</summary>
<br>

```java
@Component
public class OrderMessageConsumer {

    private final Validator validator;
    private final OrderService orderService;

    public OrderMessageConsumer(Validator validator, OrderService orderService) {
        this.validator = validator;
        this.orderService = orderService;
    }

    public void consume(OrderMessage message) {
        final var violations = validator.validate(message);
        if (!violations.isEmpty()) {
            final var errors = violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
            throw new ValidationException("Invalid message: " + errors);
        }

        orderService.process(message);
    }
}
```

</details>

## Validator customizado

Quando as anotações padrão não cobrem uma regra de negócio, crie um validator customizado.

<details>
<summary>✅ Good — validator customizado para CPF</summary>
<br>

```java
// annotation
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CpfValidator.class)
public @interface Cpf {
    String message() default "CPF must be valid.";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

// implementação
public class CpfValidator implements ConstraintValidator<Cpf, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) return true; // @NotBlank cuida disso
        return CpfUtils.isValid(value);
    }
}

// uso
public record CustomerInput(
    @NotBlank String name,
    @Cpf String cpf
) {}
```

</details>

## @ControllerAdvice — tratamento centralizado de erros de validação

<details>
<summary>✅ Good — mapeia MethodArgumentNotValidException para resposta padronizada</summary>
<br>

```java
@RestControllerAdvice
public class ValidationExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        final var errors = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> new FieldError(error.getField(), error.getDefaultMessage()))
            .toList();

        final var response = new ErrorResponse("Validation failed.", errors);
        return ResponseEntity.badRequest().body(response);
    }
}

record ErrorResponse(String message, List<FieldError> errors) {}
record FieldError(String field, String message) {}
```

</details>
