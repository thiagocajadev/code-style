import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });

client.on("error", (error) => console.error("Redis error:", error));
await client.connect();

const CACHE_TTL_SECONDS = 300;

// ── cache-aside ───────────────────────────────────────────────────────────────

async function findTeamCached(teamId, fetchFromDatabase) {
  const cacheKey = `team:profile:${teamId}`;
  const cached = await client.get(cacheKey);

  if (cached) {
    const team = JSON.parse(cached);
    return team;
  }

  const team = await fetchFromDatabase(teamId);

  if (team) {
    await client.set(cacheKey, JSON.stringify(team), { EX: CACHE_TTL_SECONDS });
  }

  return team;
}

// ── invalidação de cache ──────────────────────────────────────────────────────

export async function invalidateTeamCache(teamId) {
  const cacheKey = `team:profile:${teamId}`;

  await client.del(cacheKey);
}

// ── contador atômico ──────────────────────────────────────────────────────────

async function incrementMatchViews(matchId) {
  const counterKey = `match:views:${matchId}`;

  const newTotal = await client.incr(counterKey);
  await client.expire(counterKey, 60 * 60 * 24); // expira em 24h

  return newTotal;
}

// ── múltiplos valores ─────────────────────────────────────────────────────────

async function findMultipleTeams(teamIds) {
  const keys = teamIds.map((id) => `team:profile:${id}`);
  const cached = await client.mGet(keys);

  const teams = cached
    .map((value, index) => ({
      teamId: teamIds[index],
      team: value ? JSON.parse(value) : null,
    }))
    .filter((entry) => entry.team !== null);

  return teams;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

const team = await findTeamCached("42", async (id) => {
  return { id, name: "São Paulo FC", city: "São Paulo" };
});

const views = await incrementMatchViews("1099");
const teams = await findMultipleTeams(["42", "43", "44"]);

console.log({ team, views, teams });

await client.disconnect();
