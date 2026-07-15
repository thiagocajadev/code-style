# Validação em Java

> Escopo: Java 25 LTS, Jakarta Bean Validation 3.1, Hibernate Validator 9.

Valide o dado no **limite** do sistema, onde ele entra vindo de fora: a requisição HTTP, a mensagem de uma fila, o argumento de linha de comando. Depois que o dado passou por essa checagem uma vez, o código lá dentro confia no contrato e não repete a validação a cada método.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Bean Validation** (validação por anotação) | especificação Jakarta que declara as regras de validação com anotações no campo |
| **Hibernate Validator** (implementação do Bean Validation) | a implementação de referência da especificação |
| **constraint** (restrição) | regra de validação declarada numa anotação, como `@NotBlank` ou `@Size` |
| **ConstraintViolation** (violação de restrição) | objeto que descreve o campo inválido e a mensagem de erro |
| **@Valid** (anotação que dispara a validação) | instrui o Spring a validar o objeto antes de entrar no método |
| **consumer** (consumidor de mensagem) | componente que lê e processa mensagens de uma fila ou tópico |

## Validação escrita à mão no service

Repetir os `if` de validação dentro de cada service espalha a mesma regra por vários arquivos, e uma delas fica para trás no dia em que o limite muda. Declarar as regras como anotações no record de entrada junta tudo num lugar, e o Spring roda a validação sozinho quando o `@Valid` marca o parâmetro.

<details>
<summary>❌ Ruim: os mesmos if de validação repetidos em cada service</summary>

```java
public User createUser(String name, String email) {
    if (name == null || name.isBlank()) throw new ValidationException("Name is required.");
    if (email == null || !email.contains("@")) throw new ValidationException("Invalid email.");
    if (name.length() > 100) throw new ValidationException("Name is too long.");

    return userRepository.save(new User(name, email));
}
```

</details>

<details>
<summary>✅ Bom: anotações de Bean Validation no record de input</summary>

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

## Validação chamada no código

Fora de um controller Spring, o `@Valid` não dispara sozinho, então injete o `Validator` e chame a validação no código. É o caso do **consumer** (consumidor de mensagem) que lê de uma fila: a mensagem chega pelo mesmo limite externo de uma requisição HTTP e passa pela mesma checagem antes de seguir para o service.

<details>
<summary>✅ Bom: o consumer valida a mensagem no limite antes de processar</summary>

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

## Validação sob medida

Quando nenhuma anotação padrão descreve a regra, como validar o dígito verificador de um CPF, escreva uma anotação própria e a classe que a implementa. O campo passa a carregar `@Cpf` do mesmo jeito que carregaria `@NotBlank`, e a regra fica reutilizável em qualquer record.

<details>
<summary>✅ Bom: anotação e validador próprios para o CPF</summary>

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

## Um handler para os erros de validação

Quando o `@Valid` recusa uma requisição, o Spring lança `MethodArgumentNotValidException`. Um `@RestControllerAdvice` captura essa exceção num lugar só e monta a mesma resposta de erro para toda a API, com a lista de campos inválidos e suas mensagens, em vez de repetir esse tratamento em cada controller.

<details>
<summary>✅ Bom: um handler traduz o erro de validação para a resposta padrão</summary>

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
