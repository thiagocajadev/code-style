# Security

> Escopo: PHP 8.4. Especificidades do ecossistema PHP para secrets, validação e proteção HTTP.
> Princípios gerais de segurança em [shared/platform/security.md](../../shared/platform/security.md).

Secrets em PHP ficam em variáveis de ambiente lidas por `Config.php`. Nunca em arquivos
versionados, nunca em banco de dados, nunca em logs. Toda entrada do usuário é validada
na fronteira antes de chegar ao domínio.

## Secrets e variáveis de ambiente

<details>
<summary>❌ Bad — secret no código-fonte</summary>
<br>

```php
class AuthService
{
    private const JWT_SECRET = 'supersecret123'; // hardcoded

    public function validateToken(string $token): bool
    {
        return $this->verify($token, self::JWT_SECRET);
    }
}
```

</details>

<br>

<details>
<summary>✅ Good — secret lido de variável de ambiente, fail-fast se ausente</summary>
<br>

```php
// src/Config.php
public readonly string $jwtSecret;

public function __construct()
{
    $this->jwtSecret = $this->require('JWT_SECRET');
}

// src/Domain/Auth/AuthService.php
final class AuthService
{
    public function __construct(private readonly Config $config) {}

    public function validateToken(string $token): bool
    {
        return $this->verify($token, $this->config->jwtSecret);
    }
}
```

</details>

## Prepared statements — SQL injection

Nunca concatene input do usuário em queries. Use sempre PDO com `prepare()` e `bindValue()`.

<details>
<summary>❌ Bad — concatenação em query SQL</summary>
<br>

```php
$query = "SELECT * FROM users WHERE email = '" . $email . "'";
$result = $pdo->query($query); // SQL injection
```

</details>

<br>

<details>
<summary>✅ Good — prepared statement com bind</summary>
<br>

```php
final class UserRepository
{
    public function findByEmail(string $email): ?User
    {
        $stmt = $this->connection->prepare(
            'SELECT id, name, email FROM users WHERE email = :email'
        );

        $stmt->bindValue(':email', $email, \PDO::PARAM_STR);
        $stmt->execute();

        $row = $stmt->fetch(\PDO::FETCH_ASSOC);

        if ($row === false) {
            return null;
        }

        return User::fromRow($row);
    }
}
```

</details>

## Output escaping — XSS

Sempre escape output em templates HTML. Nunca exiba input do usuário sem tratar.

<details>
<summary>❌ Bad — output sem escaping</summary>
<br>

```php
echo "<h1>Olá, " . $_GET['name'] . "</h1>"; // XSS
```

</details>

<br>

<details>
<summary>✅ Good — htmlspecialchars para output HTML</summary>
<br>

```php
$name = htmlspecialchars($_GET['name'] ?? '', ENT_QUOTES | ENT_HTML5, 'UTF-8');
echo "<h1>Olá, {$name}</h1>";
```

</details>

## Senhas com password_hash

Use `password_hash` com `PASSWORD_BCRYPT` ou `PASSWORD_ARGON2ID`. Nunca MD5, SHA1 ou SHA256
para senhas.

<details>
<summary>❌ Bad — hash fraco para senha</summary>
<br>

```php
$passwordHash = md5($password); // quebrável por rainbow table
$passwordHash = sha256($password); // sem salt, vulnerável
```

</details>

<br>

<details>
<summary>✅ Good — password_hash + password_verify</summary>
<br>

```php
final class PasswordHasher
{
    public function hash(string $password): string
    {
        $hash = password_hash($password, PASSWORD_ARGON2ID);

        return $hash;
    }

    public function verify(string $password, string $hash): bool
    {
        $isValid = password_verify($password, $hash);

        return $isValid;
    }
}
```

</details>

## CSRF em formulários

Proteja formulários com token CSRF gerado por sessão.

<details>
<summary>✅ Good — geração e verificação de token CSRF</summary>
<br>

```php
final class CsrfProtection
{
    public function generateToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    public function validateToken(string $token): bool
    {
        $storedToken = $_SESSION['csrf_token'] ?? '';

        $isValid = hash_equals($storedToken, $token);

        return $isValid;
    }
}
```

</details>
