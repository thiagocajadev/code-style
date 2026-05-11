# Dates

> Escopo: PHP 8.4.

PHP tem duas classes de data: `DateTime` (mutável) e `DateTimeImmutable` (não pode ser
alterada após criação). Use sempre `DateTimeImmutable`. Para receber e serializar datas,
use `DateTimeInterface` como tipo de parâmetro. Armazene e transmita datas em
**ISO 8601** com timezone explícito.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `DateTimeImmutable` | Objeto de data e hora que não pode ser alterado após criação; operações retornam nova instância |
| `DateTimeInterface` | Interface implementada por `DateTime` e `DateTimeImmutable`; use em assinaturas para flexibilidade |
| `DateTimeZone` | Representa um fuso horário; sempre especifique explicitamente |
| **ISO 8601** (padrão internacional de data e hora) | Formato textual com timezone explícito: `2026-01-15T10:00:00+00:00` |
| `\DateTimeImmutable::createFromFormat` | Parse de string em formato específico com verificação de erro |

## DateTime vs DateTimeImmutable

Nunca use `DateTime` mutável. `DateTimeImmutable` é seguro para uso em value objects
e readonly classes.

<details>
<summary>❌ Ruim — DateTime mutável causa bugs sutis</summary>

```php
function addWorkdays(\DateTime $date, int $days): \DateTime
{
    $date->modify("+{$days} weekdays"); // modifica o original!
    return $date;
}

$orderDate = new \DateTime('2026-01-15');
$dueDate = addWorkdays($orderDate, 5);

// $orderDate também foi modificado — bug!
echo $orderDate->format('Y-m-d'); // "2026-01-22" em vez de "2026-01-15"
```

</details>

<details>
<summary>✅ Bom — DateTimeImmutable: operações retornam nova instância</summary>

```php
function addWorkdays(\DateTimeImmutable $date, int $days): \DateTimeImmutable
{
    $newDate = $date->modify("+{$days} weekdays"); // retorna nova instância
    return $newDate;
}

$orderDate = new \DateTimeImmutable('2026-01-15');
$dueDate = addWorkdays($orderDate, 5);

// $orderDate intacto
echo $orderDate->format('Y-m-d'); // "2026-01-15"
echo $dueDate->format('Y-m-d');   // "2026-01-22"
```

</details>

## Timezone explícito

Sempre crie datas com timezone explícito. `new DateTimeImmutable()` sem argumento usa
o timezone padrão do servidor — não determinístico em produção.

<details>
<summary>❌ Ruim — timezone implícito do servidor</summary>

```php
$now = new \DateTimeImmutable(); // depende do php.ini date.timezone
$scheduledAt = new \DateTime('2026-01-15 10:00:00'); // sem timezone
```

</details>

<details>
<summary>✅ Bom — timezone explícito sempre</summary>

```php
$utc = new \DateTimeZone('UTC');
$now = new \DateTimeImmutable('now', $utc);

// Para input do usuário com timezone específico:
$saoPaulo = new \DateTimeZone('America/Sao_Paulo');
$scheduledAt = new \DateTimeImmutable('2026-01-15 10:00:00', $saoPaulo);

// Normalizar para UTC ao persistir:
$scheduledAtUTC = $scheduledAt->setTimezone($utc);
```

</details>

## Parse de strings de data

Use `DateTimeImmutable::createFromFormat` para formatos conhecidos. Use
`new DateTimeImmutable($string)` apenas para ISO 8601.

<details>
<summary>❌ Ruim — parse sem verificação de erro</summary>

```php
$date = \DateTime::createFromFormat('d/m/Y', $input); // retorna false em erro
$date->format('Y-m-d'); // Fatal Error se false
```

</details>

<details>
<summary>✅ Bom — parse com verificação explícita de erro</summary>

```php
function parseBrazilianDate(string $input): \DateTimeImmutable
{
    $date = \DateTimeImmutable::createFromFormat('d/m/Y', $input, new \DateTimeZone('UTC'));

    if ($date === false) {
        throw new \InvalidArgumentException(
            "Invalid date format: expected d/m/Y, got {$input}"
        );
    }

    return $date;
}

// ISO 8601 diretamente:
function parseISO8601(string $input): \DateTimeImmutable
{
    try {
        $date = new \DateTimeImmutable($input);
    } catch (\Exception $e) {
        throw new \InvalidArgumentException(
            "Invalid ISO 8601 date: {$input}",
            previous: $e
        );
    }

    return $date;
}
```

</details>

## Comparação de datas

Use operadores de comparação ou `diff()` para comparar `DateTimeInterface`. Nunca
compare strings de datas.

<details>
<summary>✅ Bom — comparação com operadores nativos</summary>

```php
$now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
$expiry = $order->expiresAt;

$isExpired = $expiry < $now;
$daysUntilExpiry = (int) $now->diff($expiry)->days;
```

</details>

## Serialização para API e banco

Serialize como ISO 8601 com timezone. Ao ler do banco, reconstituir com `DateTimeImmutable`.

<details>
<summary>✅ Bom — ISO 8601 para API; DateTimeImmutable ao reconstruir</summary>

```php
final class Order implements \JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly \DateTimeImmutable $createdAt,
        public readonly ?\DateTimeImmutable $canceledAt,
    ) {}

    public function jsonSerialize(): array
    {
        $data = [
            'id' => $this->id,
            'created_at' => $this->createdAt->format(\DateTimeInterface::ATOM),
            'canceled_at' => $this->canceledAt?->format(\DateTimeInterface::ATOM),
        ];

        return $data;
    }

    public static function fromRow(array $row): self
    {
        $utc = new \DateTimeZone('UTC');

        $order = new self(
            id: (int) $row['id'],
            createdAt: new \DateTimeImmutable($row['created_at'], $utc),
            canceledAt: $row['canceled_at'] !== null
                ? new \DateTimeImmutable($row['canceled_at'], $utc)
                : null,
        );

        return $order;
    }
}
```

</details>
