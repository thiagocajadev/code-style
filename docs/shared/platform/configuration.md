# Configuração

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Configuração é **tudo que varia entre ambientes sem mudar o comportamento do código**: URLs de dependências, tamanhos de pool, flags de habilitação, chaves de integração. A organização certa permite promover o mesmo artefato de dev para produção sem recompilar. A errada espalha `if (env === "prod")` pelo código e transforma cada deploy em aposta.

Esta página cobre estrutura e precedência. Secrets (rotina de rotação, armazenamento, escopo) são tratados em [security.md](security.md). Feature flags, como mecanismo de release gradual, em [ci-cd.md](ci-cd.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Config** (configuração) | Valor que varia entre ambientes sem mudar o comportamento do código |
| **Secret** (segredo) | Valor sensível que expõe credencial ou acesso privilegiado; nunca vai para o repositório |
| **Layering** (camadas de configuração) | Estratégia de resolver configuração por níveis de especificidade, onde cada camada sobrescreve a anterior |
| **Fail-fast** (falhar rápido) | Validar toda a configuração no startup e encerrar imediatamente se algo estiver ausente ou inválido |
| **Runtime** (tempo de execução) | Período em que o processo está rodando, após o startup; configurações dinâmicas são avaliadas aqui |

---

## Config vs Secret

Os dois parecem iguais (uma string injetada no startup) mas têm ciclo de vida e superfície de risco distintos:

| Eixo | Config | Secret |
|---|---|---|
| Sensibilidade | Público ou interno não crítico | Expõe credencial ou acesso privilegiado |
| Versionamento | Pode ir no repositório | Nunca no repositório, inclusive histórico |
| Rotação | Raro, acompanha release | Periódica, independente de release |
| Exemplos | `API_BASE_URL`, `PAGE_SIZE`, `LOG_LEVEL` | `DATABASE_PASSWORD`, `JWT_SECRET`, `STRIPE_API_KEY` |

A linha divisória: **um valor que vira notícia se vazar é secret**. Tudo que pode ser inspecionado por qualquer pessoa sem consequência é config.

Misturar os dois no mesmo arquivo força o arquivo inteiro a seguir o regime mais restrito. Config de rotina vira difícil de alterar; secret vaza com facilidade. Separar em duas origens mantém cada um no regime certo.

---

## Precedência em camadas

Configuração resolve-se por camadas, do menos específico ao mais específico. Cada camada sobrescreve a anterior:

```
1. defaults no código        → última linha de defesa
2. arquivo de config         → valores padrão por ambiente (commitado)
3. variáveis de ambiente     → overrides por host (injetadas no deploy)
4. argumentos de linha de comando / runtime → override pontual
5. secrets manager           → resolvido no startup para chaves sensíveis
```

A regra que sustenta o modelo: **camadas mais externas ao código ganham**. Um valor commitado nunca sobrescreve uma variável injetada pelo host. Inverter a ordem quebra a capacidade de promover o mesmo artefato entre ambientes.

O default no código existe para o caso de tudo mais faltar. Um servidor que sobe com `PORT=8080` hardcoded e ignora `PORT=80` do host tem a precedência invertida.

---

## Layering por ambiente

Um único arquivo com `if (env === "prod")` cresce desordenado. Múltiplos arquivos (`config.dev.json`, `config.staging.json`, `config.prod.json`) duplicam valores que não mudam. O padrão sustentável é **base + overrides**:

```
config/
  base.json         <- valores válidos em todo ambiente
  dev.json          <- apenas o que muda em dev
  staging.json      <- apenas o que muda em staging
  prod.json         <- apenas o que muda em produção
```

No startup, o sistema lê `base.json`, aplica o arquivo do ambiente atual por cima e depois as variáveis de ambiente. Valores que não variam ficam em um lugar só. Alterar um default comum não exige tocar três arquivos.

**Sinal de arquitetura errada**: o arquivo do ambiente tem quase tudo que o base tem, com pequenas mudanças. O base está anêmico; a maioria dos valores deveria estar lá.

---

## Tipagem e contrato

Configuração chega ao código como string ou objeto vindo de arquivo. Consumir esse valor diretamente espalha conversões (`parseInt(PORT)`, `value === "true"`) por toda a aplicação. Quando a chave muda de nome, o compilador não acusa; o bug aparece em produção.

A solução é um objeto tipado, construído uma vez no startup:

```
AppConfig {
  port: number
  database: {
    host: string
    maxPoolSize: number
  }
  features: {
    allowsMultiTenant: boolean
  }
}
```

O resto do código recebe `AppConfig` como dependência, não lê variáveis de ambiente diretamente. Mudanças de nome de chave viram erro de compilação, não surpresa em runtime. Testar um cenário com config específica é construir um `AppConfig` de teste, sem monkey-patching em `process.env`.

Em linguagens com forte tipagem (TypeScript, C#, VB.NET), o objeto de config é uma classe ou record com propriedades não-nulas. Em linguagens dinâmicas, validar a forma na carga (schema de JSON, dataclass com validação) cobre o mesmo papel.

---

## Validação fail-fast no startup

Um serviço que sobe com `DATABASE_URL` ausente e só descobre no primeiro request trava o primeiro usuário. Um que sobe com `MAX_POOL_SIZE="abc"` só percebe quando o parser tenta converter, minutos depois.

A regra é: **validar tudo no startup, antes de aceitar tráfego**. O binding do `AppConfig` roda cedo e falha alto:

```
startup → loadConfig() → validar → [válido] server.start() → aceita tráfego
                                 → [inválido] log fatal + exit non-zero
```

```
on startup:
  config = loadConfig()
  if not isValid(config):
    log fatal + exit non-zero
  server.start(config)
```

Três verificações cobrem a maioria dos casos:

| Verificação | Exemplo | Ação na falha |
|---|---|---|
| Presença | `DATABASE_URL` definido | Exit imediato, log da chave faltante |
| Formato | `PORT` é número, `FEATURE_X` é booleano | Exit imediato, log do valor recebido |
| Consistência | `MAX > MIN`, URL responde a ping | Exit imediato, log da regra violada |

Um fail-fast no startup é barato: o orquestrador (Kubernetes, systemd, PM2) marca o container como não-saudável e não encaminha tráfego. Um fail no N-ésimo request já contaminou dados e derrubou sessões.

---

## Acesso à configuração no código

Configuração é **dependência**, não fato global. A forma como o código acessa o valor determina o acoplamento.

| Forma | Acoplamento | Testabilidade |
|---|---|---|
| `process.env.X` direto no meio da lógica | Alto, global | Baixa, exige monkey-patch |
| Objeto de config global importado | Médio | Média, requer reset entre testes |
| Objeto de config injetado via parâmetro | Baixo | Alta, passa fixture pronta |

A injeção explícita é a forma preferida. O caller do módulo decide qual config usar. Em testes, é trivial passar uma config específica para cada cenário. Em produção, o container de injeção resolve o valor uma vez no startup e distribui.

Ver também [code-style.md](../../.ai/skills/code-style.md) seção **Explicit Dependencies** e [data-access.md](../../.ai/skills/data-access.md) para a mesma regra aplicada a conexões.

---

## Mudanças em runtime

A maioria da configuração é estática: lida no startup, não muda até o próximo deploy. Alguns valores, porém, precisam mudar sem reiniciar:

- Feature flags (granularidade: mudar por usuário, percentual ou geografia, ver [ci-cd.md](ci-cd.md))
- Limites operacionais (rate limit, tamanho de batch) ajustados durante incidente
- Níveis de log temporariamente elevados para debugging em produção

Esses valores precisam de um mecanismo explícito (serviço de configuração dinâmico, feature flag service, endpoint admin autenticado) com três garantias:

- **Auditoria**: quem mudou, quando, de que valor para qual.
- **Reversão rápida**: voltar ao estado anterior em um clique.
- **Escopo restrito**: apenas valores marcados como dinâmicos, nunca config estrutural (connection strings, chaves de criptografia).

Config dinâmica é uma faca afiada. Reservar para o que realmente precisa muda em runtime; o resto continua estático e previsível.

---

## Referência rápida

| Decisão | Regra |
|---|---|
| Valor sensível que vaza e vira notícia | Secret, ver [security.md](security.md) |
| Valor que varia entre ambientes | Config em camadas, base + override por ambiente |
| Ordem de precedência | Código < arquivo < ambiente < CLI / runtime < secrets manager |
| Forma de consumir no código | Objeto tipado injetado, não leitura direta de env |
| Validação | Fail-fast no startup, antes de aceitar tráfego |
| Mudança sem restart | Apenas para flags e limites operacionais, com auditoria |
| Feature flags como release gradual | Ver [ci-cd.md](ci-cd.md), seção Feature Flags |
