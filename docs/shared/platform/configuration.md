# Configuração

> Escopo: transversal. Aplica-se a qualquer linguagem ou stack do projeto.

Configuração é tudo que muda de um ambiente para o outro sem que o código mude: a URL do banco, o tamanho do pool de conexões, o nível de log, a chave da integração. Quando ela está bem organizada, o mesmo artefato compilado sobe em desenvolvimento, em homologação e em produção, e só os valores injetados mudam.

Quando está mal organizada, aparecem linhas de `if (env === "prod")` espalhadas pelo código. O comportamento em produção passa a ser diferente do comportamento que foi testado, e ninguém consegue prever o resultado do deploy lendo o código.

Esta página cobre estrutura e precedência. Os secrets (rotação, armazenamento, escopo) estão em [security.md](security.md). As feature flags como mecanismo de release gradual estão em [ci-cd.md](../process/ci-cd.md).

## Conceitos fundamentais

| Conceito | O que é |
|---|---|
| **Config** (configuração) | Valor que varia entre ambientes sem mudar o comportamento do código |
| **Secret** (segredo) | Valor sensível que expõe credencial ou acesso privilegiado; nunca vai para o repositório |
| **Layering** (camadas de configuração) | Estratégia de resolver configuração por níveis de especificidade, onde cada camada sobrescreve a anterior |
| **Fail-fast** (falhar rápido) | Validar toda a configuração no startup e encerrar imediatamente se algo estiver ausente ou inválido |
| **Runtime** (tempo de execução) | Período em que o processo está rodando, após o startup; configurações dinâmicas são avaliadas aqui |

---

## O que separa uma config de um secret

Do ponto de vista do código, os dois chegam iguais: uma string injetada no startup. O que muda é o estrago que cada um causa ao vazar, e a frequência com que precisam ser trocados.

| Eixo | Config | Secret |
|---|---|---|
| Sensibilidade | Público ou interno não crítico | Expõe credencial ou acesso privilegiado |
| Versionamento | Pode ir no repositório | Nunca no repositório, inclusive histórico |
| Rotação | Raro, acompanha release | Periódica, independente de release |
| Exemplos | `API_BASE_URL`, `PAGE_SIZE`, `LOG_LEVEL` | `DATABASE_PASSWORD`, `JWT_SECRET`, `STRIPE_API_KEY` |

A pergunta que decide: esse valor dá a alguém de fora algum acesso que ele não deveria ter? Se dá, é secret. O `PAGE_SIZE` pode ser lido por qualquer pessoa sem consequência alguma, e por isso é config.

Guardar os dois no mesmo arquivo obriga o arquivo inteiro a viver sob o regime mais restrito. Mudar o `PAGE_SIZE` passa a exigir acesso ao cofre de credenciais, e a senha do banco passa a circular junto com um valor que todo mundo precisa editar. Separar as origens deixa cada um no regime que lhe cabe.

---

## Precedência em camadas

A configuração se resolve por camadas, da menos específica para a mais específica. Cada camada sobrescreve a anterior:

```
1. defaults no código        → última linha de defesa
2. arquivo de config         → valores padrão por ambiente (commitado)
3. variáveis de ambiente     → overrides por host (injetadas no deploy)
4. argumentos de linha de comando / runtime → override pontual
5. secrets manager           → resolvido no startup para chaves sensíveis
```

A regra que sustenta o modelo: **quanto mais perto do host, mais forte o valor**. O que está commitado no repositório sempre perde para o que o host injetou no deploy. É essa ordem que permite promover o mesmo artefato entre ambientes.

O default escrito no código serve para o caso em que nenhuma outra camada respondeu. Um servidor que sobe com `PORT=8080` fixo no código e ignora o `PORT=80` que o host mandou tem a precedência de cabeça para baixo, e nenhum deploy consegue corrigir isso sem alterar o código.

---

## Um arquivo base e um override por ambiente

O arquivo único com `if (env === "prod")` por dentro cresce sem ordem. Três arquivos completos (`config.dev.json`, `config.staging.json`, `config.prod.json`) repetem os valores que são iguais nos três, e alterar um default comum vira uma edição em triplicata. O formato que se sustenta é **base mais override**:

```
config/
  base.json         <- valores válidos em todo ambiente
  dev.json          <- apenas o que muda em dev
  staging.json      <- apenas o que muda em staging
  prod.json         <- apenas o que muda em produção
```

No startup, o sistema lê `base.json`, aplica por cima o arquivo do ambiente atual e depois as variáveis de ambiente. O valor que não varia mora em um lugar só.

O sinal de que a divisão está errada é o arquivo de ambiente ter quase o mesmo tamanho do base. Isso indica que valores comuns aos três ambientes foram parar no arquivo específico, e o lugar deles é no base.

---

## Um objeto tipado no lugar da leitura solta

A configuração chega ao código como texto. Ler esse texto direto onde ele é usado espalha conversões (`parseInt(PORT)`, `value === "true"`) por toda a aplicação, e cada ponto de leitura pode converter de um jeito diferente. Renomear uma chave nesse cenário não quebra a compilação, e o defeito só aparece em produção.

Construa um objeto tipado uma vez, no startup:

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

O resto do código recebe esse `AppConfig` como dependência, e o acesso a variável de ambiente fica confinado ao ponto que monta o objeto. A partir daí, renomear uma chave vira erro de compilação, que aparece na build. Testar um cenário com configuração diferente vira construir um `AppConfig` de teste, sem precisar alterar `process.env` por baixo dos panos.

Em linguagens com tipagem forte (TypeScript, C#, VB.NET), o objeto de config é uma classe ou um record com propriedades não-nulas. Em linguagens dinâmicas, validar o formato na carga cumpre o mesmo papel: um schema de **JSON** (JavaScript Object Notation · Notação de Objetos JavaScript), ou uma dataclass com validação.

---

## Validar tudo no startup, antes de aceitar tráfego

O serviço que sobe sem `DATABASE_URL` e só descobre isso no primeiro request entrega o erro para um usuário real. O que sobe com `MAX_POOL_SIZE="abc"` quebra minutos depois, quando alguma linha tenta converter o valor, longe da causa.

O `AppConfig` é montado e validado antes de o servidor abrir a porta:

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

Falhar no startup sai barato porque o orquestrador (Kubernetes, systemd, PM2) enxerga o processo morrer, marca a instância como não-saudável e continua mandando tráfego para a versão anterior. Falhar no centésimo request sai caro: nesse ponto o serviço já respondeu a noventa e nove, e alguns deles podem ter gravado dados incompletos.

---

## Receber a config como dependência

A configuração é uma dependência do módulo, e a forma de acessá-la define o quanto o módulo fica preso ao ambiente.

| Forma | Acoplamento | Testabilidade |
|---|---|---|
| `process.env.X` direto no meio da lógica | Alto, global | Baixa, exige monkey-patch |
| Objeto de config global importado | Médio | Média, requer reset entre testes |
| Objeto de config injetado via parâmetro | Baixo | Alta, passa fixture pronta |

A injeção explícita é a forma preferida. Quem chama o módulo decide qual config passar. No teste, cada cenário recebe a sua. Em produção, o container de injeção resolve o valor uma vez no startup e distribui para quem precisa.

Ver também a seção [Dependências explícitas](../architecture/principles.md#explicit-dependencies) em principles.md; [database.md](database.md) aplica a mesma regra a conexões.

---

## Mudanças em runtime

Quase toda configuração é estática: o processo lê no startup e o valor fica igual até o próximo deploy. Alguns valores precisam mudar com o processo no ar:

- Feature flags (granularidade: mudar por usuário, percentual ou geografia, ver [ci-cd.md](../process/ci-cd.md))
- Limites operacionais (rate limit, tamanho de batch) ajustados durante incidente
- Níveis de log temporariamente elevados para debugging em produção

Esses valores exigem um mecanismo próprio (serviço de configuração dinâmica, feature flag service, endpoint administrativo autenticado) com três garantias:

- **Auditoria**: quem mudou, quando, de que valor para qual.
- **Reversão rápida**: voltar ao estado anterior em um clique.
- **Escopo restrito**: apenas valores marcados como dinâmicos, nunca config estrutural (connection strings, chaves de criptografia).

Mantenha essa lista curta. Cada valor que pode mudar com o sistema no ar é um valor que ninguém consegue reproduzir a partir do repositório, e um incidente causado por ele fica difícil de investigar depois.

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
| Feature flags como release gradual | Ver [ci-cd.md](../process/ci-cd.md), seção Feature Flags |
