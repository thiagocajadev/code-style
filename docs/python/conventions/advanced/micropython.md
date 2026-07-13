# MicroPython / IoT

> Escopo: MicroPython 1.28 (RP2040, Raspberry Pi Pico, e ESP32).
> Padrões de domínio IoT (debounce, FSM, watchdog): [shared/platform/iot.md](../../../shared/platform/iot.md)

O MicroPython é uma implementação de Python 3 feita para microcontroladores. A sintaxe é a mesma que você já escreve, e o ambiente em volta é outro: 256 KB de memória ou menos, nenhum sistema operacional, sem o `pip` completo e com uma biblioteca padrão cortada.

O que isso significa na prática é que operações consideradas gratuitas no servidor passam a importar. Uma lista que cresce dentro de um laço infinito derruba o dispositivo por falta de memória, e um `time.sleep()` no laço principal deixa o **watchdog** (o circuito que reinicia a placa quando o programa trava) sem resposta.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| `machine` | O módulo que conversa com o hardware: pinos digitais, leitura analógica, temporizadores, watchdog |
| `utime` | A versão reduzida do `time`. Para medir intervalo, use `ticks_ms()` com `ticks_diff()` |
| `micropython-lib` | A coleção de módulos que funcionam no MicroPython. Substitui em parte o repositório de pacotes do Python |
| **heap** (memória para objetos) | A memória onde os objetos são criados. É pouca, e enchê-la levanta `MemoryError` |
| `gc` | O coletor de lixo, que libera a memória dos objetos sem uso. Aqui ele pode ser chamado à mão, com `gc.collect()` |
| **WDT** (Watchdog Timer · temporizador de vigilância) | O circuito que reinicia a placa se o programa parar de avisar que está vivo |
| **frozen module** (módulo gravado na flash) | O módulo já compilado e gravado na memória permanente. Ele não ocupa a memória de trabalho |

## O que falta da biblioteca padrão

O MicroPython corta ou reduz vários módulos. Confira a tabela antes de escrever o `import`.

| Módulo CPython | Situação no MicroPython | Alternativa |
| -------------- | ----------------------- | ----------- |
| `datetime` | Ausente | `utime.localtime()` + cálculo manual |
| `threading` | Ausente | Loops cooperativos ou `asyncio` (uasyncio) |
| `logging` | Ausente | `print()` ou implementação manual |
| `pathlib` | Ausente | `os` nativo |
| `json` | Disponível (`ujson`) | `import ujson as json` |
| `re` | Disponível (`ure`), limitado | `import ure as re` |
| `socket` | Disponível, sem SSL completo | `ssl` disponível em alguns ports |
| `asyncio` | Disponível (`uasyncio`) | `import asyncio` funciona em MicroPython 1.20+ |

## Memória

Não deixe lista nem texto crescerem dentro de um laço. Prefira somar num acumulador de tamanho fixo, e chame `gc.collect()` de tempos em tempos nos laços que criam muitos objetos.

O exemplo ruim abaixo guarda cem leituras numa lista para tirar a média. Ele funciona na bancada e falha em campo: a lista chega a cem itens antes de ser esvaziada, e esse pico de memória compete com o que a pilha de rede precisa no mesmo instante.

<details>
<summary>❌ Ruim: a lista de leituras cresce até estourar a memória</summary>

```python
import machine
import utime

temperature_adc = machine.ADC(26)
readings = []  # cresce indefinidamente: MemoryError em dispositivos com <256 KB

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

<details>
<summary>✅ Bom: soma num total e conta as amostras, sem guardar nenhuma</summary>

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

## O datetime não existe aqui

O `import datetime` falha no dispositivo. O substituto é o `utime`: `utime.time()` devolve os segundos desde 1970, e `utime.localtime()` quebra esse número nos campos de data e hora.

<details>
<summary>❌ Ruim: um import que falha assim que a placa liga</summary>

```python
from datetime import datetime, timedelta

now = datetime.now()
expiry = now + timedelta(hours=1)
```

</details>

<details>
<summary>✅ Bom: utime devolve os segundos e separa os campos da data</summary>

```python
import utime

ONE_HOUR_SECS = 3600

now_secs = utime.time()
expiry_secs = now_secs + ONE_HOUR_SECS

year, month, day, hour, minute, second, weekday, yearday = utime.localtime(now_secs)
print(f"now: {year}-{month:02d}-{day:02d} {hour:02d}:{minute:02d}:{second:02d}")
```

</details>

## asyncio no MicroPython

A partir da versão 1.20, o `import asyncio` funciona no dispositivo. Como não há threads, ele é o caminho para fazer duas coisas ao mesmo tempo: ler o sensor a cada cinco segundos e avisar o watchdog a cada segundo, sem que uma espera trave a outra.

O exemplo abaixo mostra as duas tarefas rodando juntas. Se a leitura do sensor fosse feita com `utime.sleep(5)` num laço único, o watchdog ficaria cinco segundos sem receber aviso, e reiniciaria a placa.

<details>
<summary>✅ Bom: o sensor e o aviso ao watchdog rodam ao mesmo tempo</summary>

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

## Práticas que valem a pena

| Padrão | Motivo |
| ------ | ------ |
| Constantes em `UPPER_SNAKE_CASE` para pinos e tempos de espera | Trocar o pino vira uma linha, sem procurar o número solto no meio do código |
| `try/except` em volta de operação de rede | A conexão cai, e o dispositivo precisa continuar rodando quando isso acontece |
| Nada de `time.sleep()` no laço principal quando há watchdog | Ele trava o laço, o aviso não sai, e a placa reinicia. Use `utime.sleep_ms()` com intervalo menor que o tempo do watchdog |
| Poucas f-strings dentro do laço que roda o tempo todo | Cada uma cria um texto novo na memória. O `print()` aceita vários argumentos e evita a montagem |
| `gc.collect()` depois do trecho que cria muitos objetos | Libera a memória num momento que você escolhe, antes que ela acabe num momento que você não escolhe |
