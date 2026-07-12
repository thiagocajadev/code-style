# Dispositivos IoT com MicroPython

> Escopo: transversal, com padrões de domínio IoT em exemplos MicroPython 1.28.

Um microcontrolador impõe limites que um servidor não tem: memória medida em kilobytes, processador na casa dos megahertz, nenhum sistema operacional completo por baixo, bateria contada em meses e uma rede que cai sem avisar. Cada prática desta página nasce de um desses limites. Sistemas **IoT** (Internet of Things · Internet das Coisas) são os que colocam esses dispositivos para conversar com um servidor.

Os exemplos usam MicroPython, a versão do Python que roda direto no chip. O módulo `machine` dá acesso ao hardware: pinos, conversores analógicos, temporizadores.

## Conceitos fundamentais

| Conceito | O que é |
| -------- | ------- |
| **debounce** (filtragem de ruído) | Ignorar as leituras repetidas que o sensor produz logo depois da primeira |
| **FSM** (Finite State Machine · Máquina de Estados Finitos) | Modelo em que o sistema está sempre em um estado nomeado, e cada transição é escrita de forma explícita |
| **watchdog** (temporizador de reinício) | Temporizador de hardware que reinicia o dispositivo quando o firmware para de responder |
| **idempotency** (repetir sem efeito extra) | Enviar o mesmo alerta duas vezes produz o mesmo resultado no servidor que enviar uma |
| **polling** (consulta periódica) | Ler o sensor de tempos em tempos, dentro do laço principal |
| **IRQ** (Interrupt Request · Requisição de Interrupção) | Sinal do hardware que interrompe o laço principal na hora em que o evento acontece |
| `machine` | Módulo do MicroPython que dá acesso ao hardware: GPIO, I2C, SPI, UART, Timer e WDT |

## O nome revela o papel do sensor no domínio

O nome do pino diz para que ele serve no produto. `pin0` obriga quem lê a procurar o esquema elétrico para descobrir o que está ligado ali. `door_sensor` responde na hora.

<details>
<summary>❌ Ruim: nome técnico sem contexto de domínio</summary>

```python
pin0 = machine.Pin(0, machine.Pin.IN)
adc1 = machine.ADC(1)
pwm_out = machine.PWM(machine.Pin(2))
```

</details>

<details>
<summary>✅ Bom: nome de domínio revela intenção</summary>

```python
door_sensor = machine.Pin(0, machine.Pin.IN, machine.Pin.PULL_UP)
temperature_adc = machine.ADC(1)
fan_pwm = machine.PWM(machine.Pin(2), freq=1000)
```

</details>

## Ignorar o ruído do botão e do sensor

Um toque físico no botão não produz um sinal limpo. O contato metálico bate e volta algumas vezes antes de assentar, e o pino registra dezenas de transições em poucos milissegundos. Sem tratamento, o programa acha que o usuário apertou o botão cinquenta vezes.

A correção é guardar o instante da primeira detecção e descartar tudo que chegar dentro da janela seguinte, por exemplo 200 milissegundos. `utime.ticks_ms()` devolve o relógio interno do chip, e `utime.ticks_diff()` calcula a distância entre dois instantes sem quebrar quando o contador estoura o limite e volta a zero.

<details>
<summary>❌ Ruim: sem debounce, evento disparado múltiplas vezes</summary>

```python
import machine

button = machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP)

def on_press(pin):
    print("button pressed")  # dispara 5–50 vezes por toque físico

button.irq(trigger=machine.Pin.IRQ_FALLING, handler=on_press)
```

</details>

<details>
<summary>✅ Bom: debounce por timestamp</summary>

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

## O dispositivo está sempre em um estado nomeado

Descreva o comportamento do dispositivo como um conjunto pequeno de estados, e escreva cada transição entre eles de forma explícita. Um alarme de porta tem quatro: parado, porta aberta, alarme tocando, alarme silenciado.

Com flags booleanas soltas, o número de combinações cresce rápido, e várias delas não fazem sentido no mundo real. Três flags dão oito combinações, e nada no código impede que o dispositivo caia numa que não existe (porta fechada com alarme tocando). Uma **FSM** guarda um único valor de estado por vez, então a combinação impossível deixa de ser representável.

<details>
<summary>❌ Ruim: flags soltos sem estado explícito</summary>

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

<details>
<summary>✅ Bom: FSM com estados nomeados e transições explícitas</summary>

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

Cada função de transição confere o estado atual antes de mudar. `on_silence_button()` só age quando o alarme está tocando, então apertar o botão de silêncio com a porta fechada não faz nada.

## Um alerta por evento, mesmo quando a condição persiste

O laço principal roda a cada segundo, e a temperatura alta continua alta no ciclo seguinte. Um `if` sem memória faz o dispositivo repetir a requisição em toda volta: o servidor recebe o mesmo alerta de superaquecimento sessenta vezes por minuto.

A solução tem duas partes. Uma flag registra que o alerta já saiu e só volta a zero quando a temperatura normaliza, o que impede o reenvio. Um `alert_id` único vai no corpo da requisição, e o servidor usa esse identificador para descartar a cópia que chegar duas vezes por causa de uma retentativa de rede.

<details>
<summary>❌ Ruim: alerta reenviado a cada tick enquanto condição persiste</summary>

```python
import urequests

def check_temperature(temp_celsius):
    if temp_celsius > 80:
        urequests.post("http://server/alert", json={"type": "overheating", "value": temp_celsius})
        # reenviado a cada segundo enquanto temperatura permanecer alta
```

</details>

<details>
<summary>✅ Bom: alerta enviado uma vez por evento, com ID único</summary>

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

O `.close()` no fim da chamada devolve a memória do buffer da resposta. Em um chip com poucos kilobytes livres, esquecer isso derruba o dispositivo depois de algumas centenas de requisições.

## Reiniciar sozinho quando o firmware trava

O **watchdog** é um temporizador de hardware que reinicia o dispositivo se o firmware parar de avisá-lo que está vivo. O laço principal chama `wdt.feed()` a cada volta. Se uma chamada de rede travar e o laço não completar dentro do prazo configurado, o chip reinicia sem intervenção humana.

Isso importa porque um dispositivo IoT costuma estar preso a uma parede, longe de qualquer pessoa que possa apertar o botão de reset. O prazo precisa ser folgado o bastante para caber a iteração mais lenta do laço, e curto o bastante para o dispositivo não ficar horas parado.

<details>
<summary>❌ Ruim: watchdog nunca alimentado, ou ausente</summary>

```python
import machine

# sem watchdog: travamento de rede deixa o dispositivo parado para sempre

def main_loop():
    while True:
        data = read_sensor()
        send_data(data)  # pode travar indefinidamente em timeout de rede
```

</details>

<details>
<summary>✅ Bom: watchdog alimentado a cada iteração do loop</summary>

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

## Consultar de tempos em tempos ou reagir à interrupção

A escolha depende do tipo de evento. Um botão exige **IRQ**: o hardware chama a função no instante em que o sinal muda, e nenhum toque se perde entre duas voltas do laço. Um sensor de temperatura pede **polling**: o valor muda devagar, ler a cada cinco segundos basta, e muitos pinos analógicos não geram interrupção.

O `utime.sleep_ms()` entre as leituras existe por causa da bateria. O processador entra em repouso durante a espera, e o consumo cai.

<details>
<summary>✅ Bom: polling periódico com sleep para sensores analógicos</summary>

```python
import machine
import utime

temperature_adc = machine.ADC(26)  # GPIO26 no Pico: ADC0
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
