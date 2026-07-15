# Segurança em Java

> Escopo: Java 25 LTS com Spring Security 7 + Spring Boot 4.

A segurança começa no limite do sistema, o ponto onde o dado externo entra. Três regras valem desde a primeira linha: valide todo dado que chega de fora antes de usá-lo, mantenha os **secrets** (segredos) fora do código-fonte, e confira a assinatura do **JWT** (JSON Web Token) em toda requisição que chega pelo HTTP.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **secret** (segredo) | credencial, token ou chave que nunca aparece no código-fonte |
| **JWT** (JSON Web Token · Token Web em JSON) | token assinado que carrega a identidade sem o servidor guardar sessão |
| **CSRF** (Cross-Site Request Forgery · Falsificação de Requisição entre Sites) | ataque que dispara ações em nome do usuário já autenticado |
| **CORS** (Cross-Origin Resource Sharing · Compartilhamento de Recursos entre Origens) | regra que controla qual origem pode chamar a API |
| **BCrypt** (algoritmo de hash de senha) | função que guarda a senha com um salt embutido e um custo ajustável |
| **RBAC** (Role-Based Access Control · Controle de Acesso por Papel) | autorização pelo papel atribuído ao usuário |
| **principal** (identidade autenticada) | objeto que representa o usuário atual depois da autenticação |

## Segredos fora do código

Nunca escreva credencial, token ou chave direto no código-fonte. O que entra no repositório fica no histórico do Git para sempre, e qualquer pessoa com acesso ao código passa a ter a chave. Guarde o valor numa variável de ambiente e leia por `@ConfigurationProperties`.

<details>
<summary>❌ Ruim: o segredo escrito direto no código</summary>

```java
private static final String JWT_SECRET = "minha-chave-super-secreta"; // no repositório

@Bean
public DataSource dataSource() {
    return DataSourceBuilder.create()
        .url("jdbc:postgresql://localhost/mydb")
        .username("admin")
        .password("admin123") // hardcoded
        .build();
}
```

</details>

<details>
<summary>✅ Bom: variáveis de ambiente lidas por @ConfigurationProperties</summary>

```yaml
# application.yml
app:
  security:
    jwt-secret: ${JWT_SECRET}
    jwt-expiration-ms: ${JWT_EXPIRATION_MS:3600000}

spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USERNAME}
    password: ${DATABASE_PASSWORD}
```

```java
@Validated
@ConfigurationProperties(prefix = "app.security")
public record SecurityProperties(
    @NotBlank String jwtSecret,
    @Positive long jwtExpirationMs
) {}
```

</details>

## Configuração mínima do Spring Security

O Spring Security 7 configura a segurança por um bean `SecurityFilterChain`, montado com o `HttpSecurity`. A API antiga, que estendia `WebSecurityConfigurerAdapter`, saiu. O bean deixa as regras à vista: quais rotas são públicas, que a sessão é stateless (o servidor não guarda estado de login) e onde o filtro do JWT entra na fila.

<details>
<summary>✅ Bom: SecurityFilterChain como bean, sem a classe base antiga</summary>

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**", "/actuator/health").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        final var encoder = new BCryptPasswordEncoder();
        return encoder;
    }
}
```

</details>

## Senhas sempre com BCrypt

Nunca guarde a senha em texto puro, e nunca com MD5 ou SHA-1. O MD5 e o SHA-1 são rápidos de calcular, o que ajuda quem tenta adivinhar a senha por força bruta a testar bilhões por segundo. O BCrypt tem um custo ajustável que torna cada tentativa lenta de propósito, e embute um salt (um valor aleatório por senha) que impede o ataque por tabela pronta.

<details>
<summary>❌ Ruim: senha em texto puro ou com hash rápido demais</summary>

```java
user.setPassword(input.password());                        // texto puro
user.setPassword(DigestUtils.md5Hex(input.password()));    // MD5 é reversível
```

</details>

<details>
<summary>✅ Bom: BCrypt com custo configurável</summary>

```java
@Service
@RequiredArgsConstructor
public class UserService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public User create(UserInput input) {
        final var hash = passwordEncoder.encode(input.password());
        final var user = new User(input.name(), input.email(), hash);

        final var savedUser = userRepository.save(user);
        return savedUser;
    }
}
```

</details>

## Validação rigorosa do JWT

Confira três coisas em todo token: a assinatura, para garantir que ninguém o forjou; a expiração, para recusar um token vencido; e a audience (o destinatário para quem o token foi emitido), para recusar um token feito para outro serviço. Um token malformado é rejeitado antes de qualquer uso.

<details>
<summary>✅ Bom: o filtro do JWT confere assinatura, expiração e validade</summary>

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        final var authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        final var token = authHeader.substring(7);
        final var username = jwtService.extractUsername(token);

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            final var userDetails = userDetailsService.loadUserByUsername(username);

            if (jwtService.isValid(token, userDetails)) {
                final var authToken = new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        chain.doFilter(request, response);
    }
}
```

</details>

## @PreAuthorize na autorização por método

O `@PreAuthorize` prende a regra de acesso ao próprio método, e o Spring a checa antes de executá-lo. A anotação aceita uma expressão, então dá para exigir o papel `ADMIN` e ainda barrar que um admin apague a própria conta na mesma linha. A regra fica ao lado do código que ela protege, à vista de quem lê o método.

<details>
<summary>✅ Bom: a regra de acesso declarada no próprio método</summary>

```java
@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> listAllUsers() {
        final var users = userService.findAll();
        return users.stream().map(UserResponse::from).toList();
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN') and #id != authentication.principal.id")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

</details>

## CORS declarado por extenso

O CORS diz ao navegador quais sites de outra origem podem chamar a sua API. Em produção, liste as origens, os métodos e os headers que você aceita. Deixar `*` em qualquer um deles libera qualquer site a chamar a API com o cookie do usuário logado, o que abre a porta que o CORS existe para fechar.

<details>
<summary>❌ Ruim: CORS liberado para qualquer origem</summary>

```java
corsConfig.addAllowedOrigin("*"); // permite qualquer origem
corsConfig.addAllowedMethod("*"); // permite qualquer método
```

</details>

<details>
<summary>✅ Bom: CORS restrito por ambiente</summary>

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    final var config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://app.example.com"));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    config.setAllowCredentials(true);

    final var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

</details>
