import { database } from "./db.js";

const teamsCollection = database.collection("teams");
const playersCollection = database.collection("players");

// ── findOne ───────────────────────────────────────────────────────────────────

async function findTeamById(teamId) {
  const filter = { _id: teamId };
  const projection = {
    name: 1,
    city: 1,
    foundedYear: 1,
    homeStadium: 1,
    _id: 0,
  };

  const team = await teamsCollection.findOne(filter, { projection });
  return team;
}

// ── find com filtro ───────────────────────────────────────────────────────────

async function findPlayersByTeam(teamId) {
  const filter = { teamId, isActive: true };
  const projection = {
    name: 1,
    position: 1,
    squadNumber: 1,
    nationality: 1,
    _id: 1,
  };

  const players = await playersCollection
    .find(filter, { projection })
    .sort({ squadNumber: 1 })
    .toArray();

  return players;
}

// ── find com texto ────────────────────────────────────────────────────────────

async function searchTeamsByName(searchTerm) {
  const filter = { $text: { $search: searchTerm } };
  const projection = {
    name: 1,
    city: 1,
    _id: 1,
    score: { $meta: "textScore" },
  };

  const sort = { score: { $meta: "textScore" } };

  const teams = await teamsCollection
    .find(filter, { projection })
    .sort(sort)
    .limit(10)
    .toArray();

  return teams;
}

// ── paginação ─────────────────────────────────────────────────────────────────

async function fetchTeamsPaged(page, pageSize) {
  const filter = { isActive: true };
  const projection = { name: 1, city: 1, foundedYear: 1, _id: 1 };
  const skip = (page - 1) * pageSize;

  const [teams, total] = await Promise.all([
    teamsCollection
      .find(filter, { projection })
      .sort({ name: 1 })
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    teamsCollection.countDocuments(filter),
  ]);

  const hasNextPage = skip + teams.length < total;
  return { teams, total, hasNextPage };
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

const team = await findTeamById("66f1a2b3c4d5e6f7a8b9c0d1");
const players = await findPlayersByTeam("66f1a2b3c4d5e6f7a8b9c0d1");
const searchResults = await searchTeamsByName("São Paulo");
const page = await fetchTeamsPaged(1, 20);

console.log({ team, playerCount: players.length, searchResults, page });
