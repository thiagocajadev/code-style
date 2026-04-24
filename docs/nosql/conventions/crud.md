# CRUD — NoSQL

> Escopo: NoSQL. Padrões de operações de leitura e escrita para bancos não-relacionais.

As convenções abaixo usam MongoDB como referência primária. Princípios de projeção, filtro e repository pattern aplicam-se a qualquer SGBD **NoSQL** (Not Only SQL, Não Apenas SQL).

## Conceitos fundamentais

| Conceito | O que é |
| --- | --- |
| **Repository pattern** (padrão de repositório) | Camada que encapsula o acesso ao banco; expõe métodos de domínio, esconde o driver |
| **Upsert** | Operação que insere o documento se não existir ou atualiza se já existir |
| **Soft delete** | Remoção lógica via campo `isDeleted: true`; o documento permanece no banco |
| **Projection** (projeção) | Lista de campos a retornar; reduz tráfego e consumo de memória |
| **Filter** (filtro) | Condição de seleção executada no banco, não no cliente |

---

## Insert

<details>
<summary>❌ Bad — inserção fora do repository, sem campo de auditoria, dado inline no driver</summary>
<br>

```js
// lógica de negócio acoplada ao driver
async function createTeam(name, city, year) {
  const result = await db.collection('teams').insertOne({
    name,
    city,
    year,        // nome inconsistente — deveria ser foundedYear
    active: true, // boolean sem prefixo
  });

  return result;  // expõe o resultado bruto do driver
}
```

</details>

<br>

<details>
<summary>✅ Good — repository encapsula o driver; campos de auditoria; nomes de domínio</summary>
<br>

```js
class TeamRepository {
  async create(team) {
    const document = {
      ...team,
      isActive: true,
      createdAt: new Date(),
    };

    const result = await this.collection.insertOne(document);
    const insertedId = result.insertedId;

    return insertedId;
  }
}
```

</details>

---

## Find

<details>
<summary>❌ Bad — sem projeção, filtro no cliente, nome genérico</summary>
<br>

```js
// carrega o documento inteiro para usar dois campos
async function getTeam(id) {
  const data = await db.collection('teams').findOne({ _id: id });
  const name = data.name;
  const city = data.city;

  return { name, city };
}

// filtro no cliente — varre a coleção inteira
async function getActiveTeams() {
  const allTeams = await db.collection('teams').find({}).toArray();
  const active = allTeams.filter(t => t.isActive === true);

  return active;
}
```

</details>

<br>

<details>
<summary>✅ Good — projeção limita campos; filtro no banco; repository</summary>
<br>

```js
class TeamRepository {
  async findById(teamId) {
    const filter = { _id: teamId };
    const projection = { name: 1, city: 1, foundedYear: 1, _id: 0 };

    const team = await this.collection.findOne(filter, { projection });

    return team;
  }

  async findActive() {
    const filter = { isActive: true };
    const projection = { name: 1, city: 1, _id: 1 };

    const teams = await this.collection
      .find(filter, { projection })
      .toArray();

    return teams;
  }
}
```

</details>

---

## Update

<details>
<summary>❌ Bad — replace completo em vez de patch; sem campo de auditoria; expõe driver</summary>
<br>

```js
// substitui o documento inteiro — apaga campos não enviados
async function updateTeam(id, data) {
  await db.collection('teams').replaceOne({ _id: id }, data);
}

// atualiza sem registrar quando foi alterado
async function setManager(id, manager) {
  await db.collection('teams').updateOne(
    { _id: id },
    { $set: { manager } },
  );
}
```

</details>

<br>

<details>
<summary>✅ Good — patch com $set; updatedAt de auditoria; repository</summary>
<br>

```js
class TeamRepository {
  async updateManager(teamId, managerId) {
    const filter = { _id: teamId };
    const patch = {
      $set: {
        managerId,
        updatedAt: new Date(),
      },
    };

    const result = await this.collection.updateOne(filter, patch);
    const modifiedCount = result.modifiedCount;

    return modifiedCount;
  }

  async deactivate(teamId) {
    const filter = { _id: teamId };
    const patch = {
      $set: {
        isActive: false,
        deactivatedAt: new Date(),
      },
    };

    const result = await this.collection.updateOne(filter, patch);
    const modifiedCount = result.modifiedCount;

    return modifiedCount;
  }
}
```

</details>

---

## Delete

<details>
<summary>❌ Bad — hard delete sem auditoria; condição fraca; expõe driver</summary>
<br>

```js
// apaga fisicamente sem registro de quem ou quando
async function deleteTeam(id) {
  await db.collection('teams').deleteOne({ _id: id });
}

// deleteMany com filtro fraco — risco de apagar mais do que pretendido
async function cleanup() {
  await db.collection('teams').deleteMany({ active: false });
}
```

</details>

<br>

<details>
<summary>✅ Good — soft delete com campo de auditoria; hard delete explícito e restrito</summary>
<br>

```js
class TeamRepository {
  async softDelete(teamId) {
    const filter = { _id: teamId };
    const patch = {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    };

    const result = await this.collection.updateOne(filter, patch);
    const modifiedCount = result.modifiedCount;

    return modifiedCount;
  }

  async purgeExpired(cutoffDate) {
    const filter = {
      isDeleted: true,
      deletedAt: { $lt: cutoffDate },
    };

    const result = await this.collection.deleteMany(filter);
    const deletedCount = result.deletedCount;

    return deletedCount;
  }
}
```

</details>

---

## Upsert

<details>
<summary>❌ Bad — find + insert manual, não atômico, condição de corrida</summary>
<br>

```js
// find-then-insert: janela de condição de corrida entre as duas operações
async function saveStandings(teamId, points) {
  const existing = await db.collection('standings').findOne({ teamId });

  if (existing) {
    await db.collection('standings').updateOne({ teamId }, { $set: { points } });
  } else {
    await db.collection('standings').insertOne({ teamId, points });
  }
}
```

</details>

<br>

<details>
<summary>✅ Good — **upsert** (atualizar ou inserir) atômico com $setOnInsert para campos de criação</summary>
<br>

```js
class StandingsRepository {
  async save(teamId, points) {
    const filter = { teamId };
    const update = {
      $set: { points, updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    };
    const options = { upsert: true };

    const result = await this.collection.updateOne(filter, update, options);
    const wasInserted = result.upsertedCount > 0;

    return { wasInserted, modifiedCount: result.modifiedCount };
  }
}
```

</details>
