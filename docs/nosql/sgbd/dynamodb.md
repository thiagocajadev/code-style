# DynamoDB

> Escopo: AWS DynamoDB. Referência: [docs.aws.amazon.com/dynamodb](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/).
>
> Driver: `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` (SDK v3).

DynamoDB é o banco **NoSQL** (Not Only SQL, Não Apenas SQL) gerenciado da AWS. Escala automaticamente e elimina operações de cluster. Exige design cuidadoso de access patterns antes de criar a tabela.

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Partition key** (chave de partição) | Atributo obrigatório que determina em qual partição o item é armazenado; deve ter alta cardinalidade |
| **Sort key** (chave de ordenação) | Atributo opcional que ordena itens dentro da mesma partição; permite range queries |
| **GSI** (Global Secondary Index, Índice Secundário Global) | Índice alternativo com partition key diferente da tabela base; criado a qualquer momento |
| **LSI** (Local Secondary Index, Índice Secundário Local) | Índice com mesma partition key da tabela, sort key diferente; criado apenas na criação da tabela |
| **Single-table design** (design de tabela única) | Armazena múltiplas entidades na mesma tabela usando prefixos em PK/SK |
| **RCU** (Read Capacity Unit, Unidade de Capacidade de Leitura) | Unidade de leitura: 1 RCU = uma leitura fortemente consistente de até 4 KB |
| **WCU** (Write Capacity Unit, Unidade de Capacidade de Escrita) | Unidade de escrita: 1 WCU = uma escrita de até 1 KB |
| **Hot spot** (ponto quente) | Partição sobrecarregada pela má distribuição do partition key |
| **Scan** | Lê todos os itens da tabela; anti-padrão em produção |

---

## Setup (SDK v3)

```js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true, // ignora atributos undefined no put
  },
});
```

---

## Partition Key e Sort Key

### Design de chaves

Regras:
- Partition key com alta cardinalidade — evita hot spots
- Sort key define hierarquia dentro da partição
- Prefixo de entidade em uppercase com `#` como separador

```
PK: TEAM#42          SK: PROFILE
PK: TEAM#42          SK: PLAYER#7
PK: TEAM#42          SK: PLAYER#11
PK: MATCH#1099       SK: EVENT#001
PK: MATCH#1099       SK: EVENT#002
```

<details>
<summary>❌ Bad — partition key de baixa cardinalidade; hot spot; Scan em produção</summary>
<br>

```js
import { ScanCommand } from '@aws-sdk/lib-dynamodb';

// Scan lê toda a tabela — custo proporcional ao tamanho total
async function findActiveTeams() {
  const command = new ScanCommand({
    TableName: 'Sports',
    FilterExpression: 'isActive = :val',
    ExpressionAttributeValues: { ':val': true },
  });

  const response = await docClient.send(command);

  return response.Items;
}

// partition key por status — todos os itens 'active' na mesma partição
// hot spot garantido em produção
const item = {
  PK: 'STATUS#active', // baixa cardinalidade
  SK: `TEAM#${teamId}`,
};
```

</details>

<br>

<details>
<summary>✅ Good — Query por partition key; GSI para access patterns alternativos</summary>
<br>

```js
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// item com partition key de alta cardinalidade
const teamItem = {
  PK: `TEAM#${teamId}`,
  SK: 'PROFILE',
  name: 'São Paulo FC',
  city: 'São Paulo',
  isActive: true,
  GSI1PK: `CITY#São Paulo`,  // GSI para buscar por cidade
  GSI1SK: `TEAM#${teamId}`,
};

// Query por cidade usando GSI
async function findTeamsByCity(city) {
  const command = new QueryCommand({
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :cityKey',
    ExpressionAttributeValues: { ':cityKey': `CITY#${city}` },
    ProjectionExpression: 'PK, SK, #name, city',
    ExpressionAttributeNames: { '#name': 'name' }, // name é palavra reservada
  });

  const response = await docClient.send(command);
  const teams = response.Items;

  return teams;
}
```

</details>

---

## PutItem

```js
import { PutCommand } from '@aws-sdk/lib-dynamodb';

class TeamRepository {
  async create(team) {
    const item = {
      PK: `TEAM#${team.id}`,
      SK: 'PROFILE',
      ...team,
      createdAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)', // impede sobrescrita
    });

    await docClient.send(command);

    return team.id;
  }
}
```

---

## GetItem

```js
import { GetCommand } from '@aws-sdk/lib-dynamodb';

class TeamRepository {
  async findById(teamId) {
    const command = new GetCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        PK: `TEAM#${teamId}`,
        SK: 'PROFILE',
      },
      ProjectionExpression: '#name, city, foundedYear, isActive',
      ExpressionAttributeNames: { '#name': 'name' },
    });

    const response = await docClient.send(command);
    const team = response.Item ?? null;

    return team;
  }
}
```

---

## UpdateItem

```js
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

class TeamRepository {
  async updateManager(teamId, managerId) {
    const command = new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        PK: `TEAM#${teamId}`,
        SK: 'PROFILE',
      },
      UpdateExpression: 'SET managerId = :managerId, updatedAt = :updatedAt',
      ConditionExpression: 'attribute_exists(PK)', // impede criação acidental
      ExpressionAttributeValues: {
        ':managerId': managerId,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'UPDATED_NEW',
    });

    const response = await docClient.send(command);
    const updated = response.Attributes;

    return updated;
  }
}
```

---

## DeleteItem

```js
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

class TeamRepository {
  async delete(teamId) {
    const command = new DeleteCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        PK: `TEAM#${teamId}`,
        SK: 'PROFILE',
      },
      ReturnValues: 'ALL_OLD', // retorna o item antes de deletar
    });

    const response = await docClient.send(command);
    const deletedItem = response.Attributes ?? null;

    return deletedItem;
  }
}
```

---

## Query

```js
import { QueryCommand } from '@aws-sdk/lib-dynamodb';

class TeamRepository {
  async findPlayersByTeam(teamId) {
    const command = new QueryCommand({
      TableName: process.env.DYNAMODB_TABLE,
      KeyConditionExpression: 'PK = :teamKey AND begins_with(SK, :playerPrefix)',
      ExpressionAttributeValues: {
        ':teamKey': `TEAM#${teamId}`,
        ':playerPrefix': 'PLAYER#',
      },
      ProjectionExpression: 'SK, #name, position, squadNumber',
      ExpressionAttributeNames: { '#name': 'name' },
    });

    const response = await docClient.send(command);
    const players = response.Items;

    return players;
  }
}
```

---

## Anti-Padrões

| Anti-padrão | Consequência | Solução |
| --- | --- | --- |
| `Scan` em produção | Lê toda a tabela; custo proporcional ao volume total | Criar GSI para o access pattern |
| Partition key de baixa cardinalidade | Hot spot em poucas partições | Usar IDs únicos ou adicionar random suffix |
| `FilterExpression` sem índice | Consome RCUs de itens descartados no filtro | Criar GSI com o campo de filtro como PK |
| Sem `ConditionExpression` no Put | Sobrescreve item existente sem aviso | Usar `attribute_not_exists(PK)` para inserts |
| Atributo com nome reservado sem alias | Erro em runtime | Usar `ExpressionAttributeNames` com `#alias` |
