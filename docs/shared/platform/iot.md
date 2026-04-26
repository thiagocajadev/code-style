# IoT / MicroPython

> Escopo: transversal — padrões de domínio IoT com exemplos em MicroPython 1.28.

Sistemas IoT (Internet of Things, Internet das Coisas) têm restrições que não existem
em servidores: memória em kilobytes, CPU em megahertz, sem sistema operacional completo,
alimentação por bateria e conectividade instável. As boas práticas derivam dessas restrições.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **debounce** (filtragem de ruído) | Ignorar leituras redundantes de sensor durante uma janela de tempo após a primeira leitura |
| **FSM** (Finite State Machine, Máquina de Estados Finitos) | Modelo de controle onde o sistema está sempre em um estado definido; transições são explícitas |
| **watchdog** (cão de guarda) | Timer de hardware que reinicia o dispositivo se o firmware travar |
| **idempotência** | Enviar o mesmo alerta múltiplas vezes não causa efeito duplicado no servidor |
| **polling** (varredura) | Leitura periódica de um sensor; alternativa a interrupções quando GPIO não suporta IRQ |
| **IRQ** (Interrupt Request, Requisição de Interrupção) | Sinal de hardware que interrompe o loop principal para tratar um evento |
| `machine` | Módulo MicroPython de acesso ao hardware: GPIO, I2C, SPI, UART, Timer, WDT |

## Naming de sensores e atuadores

Nomes refletem o papel do sensor no domínio, não o tipo de hardware.

<details>
<summary>❌ Bad — nome técnico sem contexto de domínio</summary>
<br>

```python
pin0 = machine.Pin(0, machine.Pin.IN)
adc1 = machine.ADC(1)
pwm_out = machine.PWM(machine.Pin(2))
```

</details>

<br>

<details>
<summary>✅ Good — nome de domínio revela intenção</summary>
<br>

```python
door_sensor = machine.Pin(0, machine.Pin.IN, machine.Pin.PULL_UP)
temperature_adc = machine.ADC(1)
fan_pwm = machine.PWM(machine.Pin(2), freq=1000)
```

</details>

## Debounce — filtragem de ruído de botão e sensor

Sensores físicos produzem leituras ruidosas na transição. Ignore leituras dentro da janela
de tempo após a primeira detecção.

<details>
<summary>❌ Bad — sem debounce, evento disparado múltiplas vezes</summary>
<br>

```python
import machine

button = machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP)

def on_press(pin):
    print("button pressed")  # dispara 5–50 vezes por toque físico

button.irq(trigger=machine.Pin.IRQ_FALLING, handler=on_press)
```

</details>

<br>

<details>
<summary>✅ Good — debounce por timestamp</summary>
<br>

```python
import machine
import utime

DEBOUNCE_MS = 200

button = machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP)
last_press_ms = 0

def on_button_press(pin):
    global last_press_ms

    now = utime.ticks_ms()
    elapsed = utime.ticks_diff(now, last_press_ms)

    if elapsed < DEBOUNCE_MS:
        return

    last_press_ms = now
    handle_door_open()

button.irq(trigger=machine.Pin.IRQ_FALLING, handler=on_button_press)

def handle_door_open():
    print("door opened")
```

</details>

## Máquina de estados — FSM

Modele o comportamento do dispositivo como estados explícitos. Evite flags booleanos soltos.

<details>
<summary>❌ Bad — flags soltos sem estado explícito</summary>
<br>

```python
is_door_open = False
is_alarm_active = False
is_waiting = False

# lógica espalhada em if-else sem estrutura
if is_door_open and not is_alarm_active:
    is_alarm_active = True
    is_waiting = False
```

</details>

<br>

<details>
<summary>✅ Good — FSM com estados nomeados e transições explícitas</summary>
<br>

```python
import utime

IDLE = "idle"
DOOR_OPEN = "door_open"
ALARM_ACTIVE = "alarm_active"
ALARM_SILENCED = "alarm_silenced"

ALARM_DELAY_MS = 30_000

state = IDLE
door_open_at = 0

def transition_to(new_state):
    global state
    print(f"state: {state} -> {new_state}")
    state = new_state

def on_door_opened():
    global door_open_at
    if state == IDLE:
        door_open_at = utime.ticks_ms()
        transition_to(DOOR_OPEN)

def on_door_closed():
    if state in (DOOR_OPEN, ALARM_SILENCED):
        transition_to(IDLE)

def on_silence_button():
    if state == ALARM_ACTIVE:
        transition_to(ALARM_SILENCED)

def tick():
    if state == DOOR_OPEN:
        elapsed = utime.ticks_diff(utime.ticks_ms(), door_open_at)
        if elapsed >= ALARM_DELAY_MS:
            transition_to(ALARM_ACTIVE)
            trigger_alarm()
```

</details>

## Alertas idempotentes

Envie alertas com identificador único. O servidor ignora duplicatas. Evite re-enviar
o mesmo alerta enquanto a condição não mudar.

<details>
<summary>❌ Bad — alerta reenviado a cada tick enquanto condição persiste</summary>
<br>

```python
import urequests

def check_temperature(temp_celsius):
    if temp_celsius > 80:
        urequests.post("http://server/alert", json={"type": "overheating", "value": temp_celsius})
        # reenviado a cada segundo enquanto temperatura permanecer alta
```

</details>

<br>

<details>
<summary>✅ Good — alerta enviado uma vez por evento, com ID único</summary>
<br>

```python
import urequests
import ubinascii
import os

alert_sent = False

def check_temperature(temp_celsius):
    global alert_sent

    if temp_celsius > 80 and not alert_sent:
        alert_id = ubinascii.hexlify(os.urandom(8)).decode()

        payload = {
            "alert_id": alert_id,
            "type": "overheating",
            "value": temp_celsius,
        }

        try:
            urequests.post("http://server/alert", json=payload).close()
            alert_sent = True
        except Exception as error:
            print(f"alert failed: {error}")

    elif temp_celsius <= 80 and alert_sent:
        alert_sent = False  # reseta quando condição normaliza
```

</details>

## Watchdog — recuperação de travamento

O **Watchdog** reinicia o dispositivo se o loop principal parar de alimentá-lo.
Útil para recuperação automática de travamentos ou deadlocks de rede.

<details>
<summary>❌ Bad — watchdog nunca alimentado, ou ausente</summary>
<br>

```python
import machine

# sem watchdog: travamento de rede deixa o dispositivo parado para sempre

def main_loop():
    while True:
        data = read_sensor()
        send_data(data)  # pode travar indefinidamente em timeout de rede
```

</details>

<br>

<details>
<summary>✅ Good — watchdog alimentado a cada iteração do loop</summary>
<br>

```python
import machine
import utime

WATCHDOG_TIMEOUT_MS = 8000

wdt = machine.WDT(timeout=WATCHDOG_TIMEOUT_MS)

def main_loop():
    while True:
        wdt.feed()  # reseta o timer do watchdog

        try:
            data = read_sensor()
            send_data(data)
        except Exception as error:
            print(f"loop error: {error}")
            # watchdog reinicia o device se o erro persistir por 8s

        utime.sleep_ms(1000)
```

</details>

## Polling vs IRQ

Use IRQ para eventos rápidos (botão, borda de sinal). Use polling para leituras periódicas
de sensores analógicos ou quando o hardware não suporta interrupção.

<details>
<summary>✅ Good — polling periódico com sleep para sensores analógicos</summary>
<br>

```python
import machine
import utime

temperature_adc = machine.ADC(26)  # GPIO26 no Pico — ADC0
READ_INTERVAL_MS = 5_000

def read_temperature_celsius() -> float:
    raw = temperature_adc.read_u16()
    voltage = raw * 3.3 / 65535
    temperature = 27 - (voltage - 0.706) / 0.001721  # fórmula do sensor interno RP2040

    return temperature

def main_loop():
    while True:
        temperature = read_temperature_celsius()

        print(f"temperature: {temperature:.1f}°C")

        utime.sleep_ms(READ_INTERVAL_MS)
```

</details>
