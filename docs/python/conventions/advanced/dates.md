# Dates

> Escopo: Python. Idiomas específicos deste ecossistema.

Datas sem fuso horário (_naive_) são uma fonte silenciosa de bugs. Toda data que representa um
instante no tempo deve ser _aware_ — com fuso horário explícito.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **naive datetime** | `datetime` sem informação de fuso — comparações e aritmética são ambíguas |
| **aware datetime** | `datetime` com `tzinfo` definido — instante no tempo inequívoco |
| **UTC** (Coordinated Universal Time, Tempo Universal Coordenado) | Fuso de referência; armazene sempre em UTC, converta apenas para exibição |
| **zoneinfo** | Módulo padrão (Python 3.9+) para fusos com suporte a DST (Daylight Saving Time, horário de verão) |
| **ISO 8601** | Formato de serialização universal: `2026-04-22T15:30:00+00:00` |

## naive vs aware

<details>
<summary>❌ Bad — datetime sem fuso: comparação ambígua</summary>
<br>

```python
from datetime import datetime

created_at = datetime.now()       # sem fuso — depende do relógio local
expires_at = datetime(2026, 12, 31)  # naive

if created_at > expires_at:   # comparação ambígua: qual timezone?
    expire_session()
```

</details>

<br>

<details>
<summary>✅ Good — datetime aware com UTC explícito</summary>
<br>

```python
from datetime import datetime, timezone

created_at = datetime.now(tz=timezone.utc)
expires_at = datetime(2026, 12, 31, tzinfo=timezone.utc)

if created_at > expires_at:
    expire_session()
```

</details>

## zoneinfo — fusos nomeados

Para fusos que respeitam horário de verão (DST), use `zoneinfo.ZoneInfo` em vez de offsets fixos.
Um offset fixo como `+03:00` não muda com o DST — um fuso nomeado sim.

<details>
<summary>❌ Bad — offset fixo ignora DST</summary>
<br>

```python
from datetime import datetime, timezone, timedelta

brasilia = timezone(timedelta(hours=-3))  # offset fixo — errado no horário de verão
local_time = datetime.now(tz=brasilia)
```

</details>

<br>

<details>
<summary>✅ Good — ZoneInfo aplica DST automaticamente</summary>
<br>

```python
from datetime import datetime
from zoneinfo import ZoneInfo

local_time = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
```

</details>

## Serialização e parsing — ISO 8601

Armazene e transmita datas como strings **ISO** (International Organization for Standardization, Organização Internacional de Normalização) 8601. Use `isoformat()` para serializar e
`datetime.fromisoformat()` para desserializar.

<details>
<summary>❌ Bad — formato não padronizado, parsing frágil</summary>
<br>

```python
from datetime import datetime

created_at = datetime.now().strftime("%d/%m/%Y %H:%M")  # formato local, sem fuso
parsed = datetime.strptime("22/04/2026 15:30", "%d/%m/%Y %H:%M")  # naive, frágil
```

</details>

<br>

<details>
<summary>✅ Good — ISO 8601 com fuso, round-trip garantido</summary>
<br>

```python
from datetime import datetime, timezone

created_at = datetime.now(tz=timezone.utc)
serialized = created_at.isoformat()  # "2026-04-22T15:30:00+00:00"

parsed = datetime.fromisoformat(serialized)  # aware, fuso preservado
```

</details>

## strptime em date e time (Python 3.14)

Python 3.14 adiciona `date.strptime()` e `time.strptime()` além de `datetime.strptime()`.
Quando você precisa apenas da parte da data ou do horário, use o método correspondente — sem
construir um `datetime` completo para descartar metade.

<details>
<summary>❌ Bad — datetime completo só para extrair a data</summary>
<br>

```python
from datetime import datetime

parsed = datetime.strptime("2026-04-22", "%Y-%m-%d")
due_date = parsed.date()  # descarta o horário depois
```

</details>

<br>

<details>
<summary>✅ Good — date.strptime direto (Python 3.14+)</summary>
<br>

```python
from datetime import date

due_date = date.strptime("2026-04-22", "%Y-%m-%d")
```

</details>

## Aritmética de datas

Use `timedelta` para somar ou subtrair intervalos. Nunca calcule com timestamps numéricos
diretamente — erros de DST e overflow são difíceis de rastrear.

<details>
<summary>❌ Bad — aritmética com timestamp numérico</summary>
<br>

```python
import time

now_ts = time.time()
tomorrow_ts = now_ts + 86400  # pode estar errado no dia de mudança de DST
```

</details>

<br>

<details>
<summary>✅ Good — timedelta com aware datetime</summary>
<br>

```python
from datetime import datetime, timedelta, timezone

now = datetime.now(tz=timezone.utc)
tomorrow = now + timedelta(days=1)
```

</details>
