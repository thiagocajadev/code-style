# Datas em Python

> Escopo: Python. Idiomas específicos deste ecossistema.

Uma data sem fuso horário não identifica um instante. "31 de dezembro às 23h" é um momento diferente em São Paulo e em Lisboa, e comparar duas datas assim produz um resultado que depende de onde o servidor está ligado.

A regra que evita a classe inteira de problemas: guarde sempre em **UTC** (Coordinated Universal Time · Tempo Universal Coordenado), com o fuso escrito no objeto, e converta para o fuso local só na hora de mostrar na tela.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **naive datetime** (data sem fuso) | O `datetime` que não sabe a que fuso pertence. Comparar dois deles dá um resultado que depende do relógio da máquina |
| **aware datetime** (data com fuso) | O `datetime` com `tzinfo` preenchido. Ele identifica um instante sem ambiguidade |
| **UTC** (Coordinated Universal Time · Tempo Universal Coordenado) | O fuso de referência, sem horário de verão. É o que se guarda no banco |
| **zoneinfo** (módulo de fusos, Python 3.9 ou superior) | O módulo da biblioteca padrão que conhece os fusos por nome e aplica o horário de verão de cada um |
| **DST** (Daylight Saving Time · horário de verão) | O período do ano em que o relógio local anda uma hora, e o deslocamento do fuso muda |
| **ISO 8601** (norma ISO de datas) | O formato de texto universal para data: `2026-04-22T15:30:00+00:00` |

## Data com fuso e data sem fuso

<details>
<summary>❌ Ruim: a comparação depende do relógio da máquina</summary>

```python
from datetime import datetime

created_at = datetime.now()       # sem fuso: depende do relógio local
expires_at = datetime(2026, 12, 31)  # naive

if created_at > expires_at:   # comparação ambígua: qual timezone?
    expire_session()
```

</details>

<details>
<summary>✅ Bom: as duas datas carregam UTC, e a comparação é a mesma em qualquer máquina</summary>

```python
from datetime import datetime, timezone

created_at = datetime.now(tz=timezone.utc)
expires_at = datetime(2026, 12, 31, tzinfo=timezone.utc)

if created_at > expires_at:
    expire_session()
```

</details>

## zoneinfo: o fuso pelo nome

Escrever o fuso como um deslocamento fixo (`-03:00`) congela uma informação que muda. No dia em que o horário de verão entra, São Paulo passa a `-02:00`, e o código continua somando três horas. `ZoneInfo("America/Sao_Paulo")` carrega o calendário de mudanças daquele lugar e acerta a conta nos dois períodos do ano.

<details>
<summary>❌ Ruim: deslocamento fixo, que erra durante o horário de verão</summary>

```python
from datetime import datetime, timezone, timedelta

brasilia = timezone(timedelta(hours=-3))  # offset fixo: errado no horário de verão
local_time = datetime.now(tz=brasilia)
```

</details>

<details>
<summary>✅ Bom: ZoneInfo conhece o calendário do fuso e aplica a mudança</summary>

```python
from datetime import datetime
from zoneinfo import ZoneInfo

local_time = datetime.now(tz=ZoneInfo("America/Sao_Paulo"))
```

</details>

## Escrever e ler a data como texto: ISO 8601

Guarde e transmita a data no formato **ISO** (International Organization for Standardization · Organização Internacional de Normalização) 8601. `isoformat()` produz o texto, e `datetime.fromisoformat()` volta ao objeto com o fuso preservado.

O formato local (`22/04/2026 15:30`) perde o fuso pelo caminho, e ainda troca dia por mês quando o texto chega num sistema que espera a ordem americana.

<details>
<summary>❌ Ruim: formato local, sem fuso, e ambíguo entre dia e mês</summary>

```python
from datetime import datetime

created_at = datetime.now().strftime("%d/%m/%Y %H:%M")  # formato local, sem fuso
parsed = datetime.strptime("22/04/2026 15:30", "%d/%m/%Y %H:%M")  # naive, frágil
```

</details>

<details>
<summary>✅ Bom: ISO 8601 com fuso, e a volta devolve o mesmo instante</summary>

```python
from datetime import datetime, timezone

created_at = datetime.now(tz=timezone.utc)
serialized = created_at.isoformat()  # "2026-04-22T15:30:00+00:00"

parsed = datetime.fromisoformat(serialized)  # aware, fuso preservado
```

</details>

## strptime em date e time (Python 3.14)

O Python 3.14 acrescentou `date.strptime()` e `time.strptime()` ao lado do `datetime.strptime()` que já existia. Quando o que você quer é só o dia, use `date.strptime()` e pule o passo de montar um `datetime` inteiro para jogar o horário fora na linha seguinte.

<details>
<summary>❌ Ruim: monta um datetime completo e descarta o horário</summary>

```python
from datetime import datetime

parsed = datetime.strptime("2026-04-22", "%Y-%m-%d")
due_date = parsed.date()  # descarta o horário depois
```

</details>

<details>
<summary>✅ Bom: date.strptime direto (Python 3.14+)</summary>

```python
from datetime import date

due_date = date.strptime("2026-04-22", "%Y-%m-%d")
```

</details>

## Somar e subtrair intervalos

Use `timedelta`. Somar `86400` a um timestamp numérico acerta em 363 dias do ano e erra nos dois em que o relógio local muda: no dia da entrada do horário de verão, "amanhã no mesmo horário" está a 23 horas de distância, e não a 24.

<details>
<summary>❌ Ruim: soma 86400 segundos e erra no dia da virada</summary>

```python
import time

now_ts = time.time()
tomorrow_ts = now_ts + 86400  # pode estar errado no dia de mudança de DST
```

</details>

<details>
<summary>✅ Bom: timedelta sobre uma data com fuso</summary>

```python
from datetime import datetime, timedelta, timezone

now = datetime.now(tz=timezone.utc)
tomorrow = now + timedelta(days=1)
```

</details>
