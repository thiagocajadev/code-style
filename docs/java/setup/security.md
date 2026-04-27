# Security

> Escopo: Java 25 LTS — Spring Security 7 + Spring Boot 4.

## Secrets fora do código

Nunca hardcode (codifique diretamente) credenciais, tokens ou chaves no código-fonte.

<details>
<summary>❌ Bad — segredo hardcoded no código</summary>
<br>

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

<br>

<details>
<summary>✅ Good — variáveis de ambiente via @ConfigurationProperties</summary>
<br>

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

## Spring Security — configuração mínima

<details>
<summary>✅ Good — SecurityFilterChain por bean, sem herança de WebSecurityConfigurerAdapter</summary>
<br>

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

## Senhas — BCrypt sempre

Nunca armazene senhas em texto puro. Nunca use MD5 ou SHA-1.

<details>
<summary>❌ Bad — senha em texto puro ou hash fraco</summary>
<br>

```java
user.setPassword(input.password());                        // texto puro
user.setPassword(DigestUtils.md5Hex(input.password()));    // MD5 é reversível
```

</details>

<br>

<details>
<summary>✅ Good — BCrypt com custo configurável</summary>
<br>

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

## JWT (JSON Web Token, Token Web em JSON) — validação rigorosa

Valide assinatura, expiração e audience (audiência) do token. Rejeite tokens malformados.

<details>
<summary>✅ Good — filtro JWT com validação completa</summary>
<br>

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

## @PreAuthorize — autorização por método

Use `@PreAuthorize` para autorização granular por role (papel) ou permissão específica.

<details>
<summary>✅ Good — autorização declarativa no método</summary>
<br>

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

## CORS (Cross-Origin Resource Sharing, Compartilhamento de Recursos entre Origens) — configuração explícita

Nunca deixe CORS permissivo em produção. Configure origens, métodos e headers permitidos.

<details>
<summary>❌ Bad — CORS aberto para tudo</summary>
<br>

```java
corsConfig.addAllowedOrigin("*"); // permite qualquer origem
corsConfig.addAllowedMethod("*"); // permite qualquer método
```

</details>

<br>

<details>
<summary>✅ Good — CORS restrito por ambiente</summary>
<br>

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
