# MicroPython / IoT

> Escopo: MicroPython 1.28 — RP2040 (Raspberry Pi Pico) e ESP32.
> Padrões de domínio IoT (debounce, FSM, watchdog): [shared/platform/iot.md](../../../../shared/platform/iot.md)

MicroPython é uma implementação de Python 3 otimizada para microcontroladores. Roda com
256 KB de RAM ou menos, sem sistema operacional, sem `pip` completo e com uma stdlib
reduzida. O código Python é o mesmo em sintaxe, mas as restrições de hardware mudam tudo.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `machine` | Módulo de acesso ao hardware: GPIO, ADC, PWM, I2C, SPI, Timer, WDT |
| `utime` | Versão reduzida de `time`; use `ticks_ms()` e `ticks_diff()` para medir intervalos |
| `micropython-lib` | Coleção de módulos compatíveis com MicroPython; substituto parcial de PyPI |
| **heap** | Memória de alocação dinâmica; limitada; alocações excessivas causam `MemoryError` |
| `gc` | Garbage collector; pode ser chamado manualmente com `gc.collect()` em loops longos |
| **frozen module** | Módulo compilado em bytecode e gravado na flash do dispositivo; economiza RAM |

## Diferenças da stdlib CPython

MicroPython omite ou reduz módulos da stdlib padrão. Verifique disponibilidade antes de usar.

| Módulo CPython | Situação no MicroPython | Alternativa |
| -------------- | ----------------------- | ----------- |
| `datetime` | Ausente | `utime.localtime()` + cálculo manual |
| `threading` | Ausente | Loops cooperativos ou `asyncio` (uasyncio) |
| `logging` | Ausente | `print()` ou implementação manual |
| `pathlib` | Ausente | `os` nativo |
| `json` | Disponível (`ujson`) | `import ujson as json` |
| `re` | Disponível (`ure`) — limitado | `import ure as re` |
| `socket` | Disponível — sem SSL completo | `ssl` disponível em alguns ports |
| `asyncio` | Disponível (`uasyncio`) | `import asyncio` funciona em MicroPython 1.20+ |

## Restrições de memória

Evite criar listas e strings grandes em loops. Prefira operações in-place.
Chame `gc.collect()` periodicamente em loops que alocam muito.

<details>
<summary>❌ Bad — lista crescente em memória limitada</summary>
<br>

```python
import machine
import utime

temperature_adc = machine.ADC(26)
readings = []  # cresce indefinidamente — MemoryError em dispositivos com <256 KB

while True:
    raw = temperature_adc.read_u16()
    readings.append(raw)

    if len(readings) >= 100:
        avg = sum(readings) / len(readings)
        print(f"avg: {avg:.1f}")
        readings = []  # descarta, mas o pico de alocação já ocorreu

    utime.sleep_ms(100)
```

</details>

<br>

<details>
<summary>✅ Good — acumulador com tamanho fixo, sem lista</summary>
<br>

```python
import machine
import utime

temperature_adc = machine.ADC(26)

SAMPLE_COUNT = 100
total = 0
count = 0

while True:
    raw = temperature_adc.read_u16()
    total += raw
    count += 1

    if count >= SAMPLE_COUNT:
        average = total / count
        print(f"avg raw: {average:.1f}")

        total = 0
        count = 0

    utime.sleep_ms(100)
```

</details>

## Módulos ausentes — datetime

MicroPython não tem `datetime`. Use `utime.localtime()` para decompor timestamps Unix.

<details>
<summary>❌ Bad — import que falha em MicroPython</summary>
<br>

```python
from datetime import datetime, timedelta

now = datetime.now()
expiry = now + timedelta(hours=1)
```

</details>

<br>

<details>
<summary>✅ Good — utime como substituto</summary>
<br>

```python
import utime

ONE_HOUR_SECS = 3600

now_secs = utime.time()
expiry_secs = now_secs + ONE_HOUR_SECS

year, month, day, hour, minute, second, weekday, yearday = utime.localtime(now_secs)
print(f"now: {year}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}")
```

</details>

## asyncio em MicroPython (uasyncio)

MicroPython 1.20+ inclui `uasyncio` compatível com `asyncio`. Permite concorrência cooperativa
sem threads — essencial para ler sensores e manter rede ao mesmo tempo.

<details>
<summary>✅ Good — leitura de sensor + keep-alive de rede com asyncio</summary>
<br>

```python
import asyncio
import machine
import utime

temperature_adc = machine.ADC(26)
wdt = machine.WDT(timeout=8000)

async def read_temperature_loop():
    while True:
        raw = temperature_adc.read_u16()
        voltage = raw * 3.3 / 65535
        temperature = 27 - (voltage - 0.706) / 0.001721

        print(f"temperature: {temperature:.1f}°C")

        await asyncio.sleep(5)

async def watchdog_feed_loop():
    while True:
        wdt.feed()
        await asyncio.sleep(1)

async def main():
    await asyncio.gather(
        read_temperature_loop(),
        watchdog_feed_loop(),
    )

asyncio.run(main())
```

</details>

## Boas práticas gerais

| Padrão | Motivo |
| ------ | ------ |
| Constantes em `UPPER_SNAKE_CASE` para pinos e timeouts | Facilita reconfiguração sem busca no código |
| `try/except` em operações de rede | Conexão pode cair a qualquer momento |
| Nunca use `time.sleep()` no loop principal com watchdog | Bloqueia o feed; use `utime.sleep_ms()` com intervalo menor que o timeout do WDT |
| Evite f-strings longas em loops críticos | Alocam strings; use `print()` com múltiplos argumentos quando possível |
| `gc.collect()` após operações que alocam muito | Libera memória proativamente antes que o heap encha |
