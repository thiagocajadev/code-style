import { database } from "./db.js";

const teamsCollection = database.collection("teams");
const playersCollection = database.collection("players");
const standingsCollection = database.collection("standings");

// ── updateOne — patch parcial ─────────────────────────────────────────────────

async function updateManager(teamId, managerId) {
  const filter = { _id: teamId };
  const patch = {
    $set: {
      managerId,
      updatedAt: new Date(),
    },
  };

  const result = await teamsCollection.updateOne(filter, patch);
  const modifiedCount = result.modifiedCount;
  return modifiedCount;
}

// ── updateOne — incremento atômico ────────────────────────────────────────────

async function incrementGoals(playerId, goals) {
  const filter = { _id: playerId };
  const patch = {
    $inc: { totalGoals: goals },
    $set: { updatedAt: new Date() },
  };

  const result = await playersCollection.updateOne(filter, patch);
  const modifiedCount = result.modifiedCount;
  return modifiedCount;
}

// ── upsert — insert ou update atômico ────────────────────────────────────────

async function saveStandings(teamId, season, points) {
  const filter = { teamId, season };
  const update = {
    $set: { points, updatedAt: new Date() },
    $setOnInsert: { createdAt: new Date() },
  };

  const result = await standingsCollection.updateOne(filter, update, {
    upsert: true,
  });

  const wasInserted = result.upsertedCount > 0;
  return { wasInserted, modifiedCount: result.modifiedCount };
}

// ── updateMany — desativação em lote ─────────────────────────────────────────

async function deactivatePlayersByTeam(teamId) {
  const filter = { teamId, isActive: true };
  const patch = {
    $set: {
      isActive: false,
      deactivatedAt: new Date(),
    },
  };

  const result = await playersCollection.updateMany(filter, patch);
  const modifiedCount = result.modifiedCount;
  return modifiedCount;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

await updateManager("66f1a2b3c4d5e6f7a8b9c0d1", "player:99");
await incrementGoals("66f1player0000000000000009", 2);
await saveStandings("66f1a2b3c4d5e6f7a8b9c0d1", "2026", 45);
await deactivatePlayersByTeam("66f1a2b3c4d5e6f7a8b9c0d1");
