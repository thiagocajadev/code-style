import { database } from './db.js';

const teamsCollection = database.collection('teams');
const playersCollection = database.collection('players');

// ── soft delete — remoção lógica ─────────────────────────────────────────────

async function softDeleteTeam(teamId) {
  const filter = { _id: teamId };
  const patch = {
    $set: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  };

  const result = await teamsCollection.updateOne(filter, patch);
  const modifiedCount = result.modifiedCount;

  return modifiedCount;
}

// ── soft delete em lote ───────────────────────────────────────────────────────

async function softDeletePlayersByTeam(teamId) {
  const filter = { teamId, isDeleted: { $ne: true } };
  const patch = {
    $set: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  };

  const result = await playersCollection.updateMany(filter, patch);
  const modifiedCount = result.modifiedCount;

  return modifiedCount;
}

// ── hard delete — purga de registros expirados ────────────────────────────────

async function purgeDeletedTeams(cutoffDate) {
  const filter = {
    isDeleted: true,
    deletedAt: { $lt: cutoffDate },
  };

  const result = await teamsCollection.deleteMany(filter);
  const deletedCount = result.deletedCount;

  return deletedCount;
}

// ── deleteOne — remoção física por ID ─────────────────────────────────────────

async function removePlayer(playerId) {
  const filter = { _id: playerId };

  const result = await playersCollection.deleteOne(filter);
  const wasDeleted = result.deletedCount === 1;

  return wasDeleted;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

await softDeleteTeam('66f1a2b3c4d5e6f7a8b9c0d1');
await softDeletePlayersByTeam('66f1a2b3c4d5e6f7a8b9c0d1');

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const deletedCount = await purgeDeletedTeams(thirtyDaysAgo);

console.log({ deletedCount });
