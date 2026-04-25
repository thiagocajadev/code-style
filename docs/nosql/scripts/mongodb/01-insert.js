import { database } from "./db.js";

const teamsCollection = database.collection("teams");
const playersCollection = database.collection("players");

// ── insertOne ─────────────────────────────────────────────────────────────────

async function createTeam(team) {
  const document = {
    ...team,
    isActive: true,
    createdAt: new Date(),
  };

  const result = await teamsCollection.insertOne(document);
  const insertedId = result.insertedId;
  return insertedId;
}

// ── insertMany ────────────────────────────────────────────────────────────────

async function createPlayers(players) {
  const documents = players.map((player) => ({
    ...player,
    isActive: true,
    createdAt: new Date(),
  }));

  const result = await playersCollection.insertMany(documents, {
    ordered: false,
  });

  const insertedCount = result.insertedCount;
  return insertedCount;
}

// ── bulkWrite ─────────────────────────────────────────────────────────────────

export async function applyTransferWindow(transfers) {
  const operations = transfers.map((transfer) => ({
    updateOne: {
      filter: { _id: transfer.playerId },
      update: {
        $set: {
          teamId: transfer.newTeamId,
          transferredAt: new Date(),
        },
      },
    },
  }));

  const result = await playersCollection.bulkWrite(operations, {
    ordered: false,
  });

  const modifiedCount = result.modifiedCount;
  return modifiedCount;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

const teamId = await createTeam({
  name: "São Paulo FC",
  city: "São Paulo",
  foundedYear: 1930,
  homeStadium: "Morumbi",
});

const insertedCount = await createPlayers([
  {
    teamId,
    name: "Jonathan Calleri",
    position: "Forward",
    squadNumber: 9,
    nationality: "Argentine",
  },
  {
    teamId,
    name: "Cicinho",
    position: "Right Back",
    squadNumber: 2,
    nationality: "Brazilian",
  },
  {
    teamId,
    name: "Diego Lugano",
    position: "Centre Back",
    squadNumber: 5,
    nationality: "Uruguayan",
  },
]);

console.log({ teamId, insertedCount });
