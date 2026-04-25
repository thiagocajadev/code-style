import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });

client.on("error", (error) => console.error("Redis error:", error));
await client.connect();

const STATS_TTL_SECONDS = 3600; // 1h

// ── salvar objeto como hash ───────────────────────────────────────────────────

async function saveTeamStats(teamId, season, stats) {
  const hashKey = `team:stats:${teamId}:${season}`;

  await client.hSet(hashKey, {
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    goalsFor: stats.goalsFor,
    goalsAgainst: stats.goalsAgainst,
    points: stats.points,
  });

  await client.expire(hashKey, STATS_TTL_SECONDS);
}

// ── ler campo específico ──────────────────────────────────────────────────────

async function fetchTeamPoints(teamId, season) {
  const hashKey = `team:stats:${teamId}:${season}`;

  const points = await client.hGet(hashKey, "points");
  return points ? Number(points) : null;
}

// ── ler objeto completo ───────────────────────────────────────────────────────

async function fetchTeamStats(teamId, season) {
  const hashKey = `team:stats:${teamId}:${season}`;

  const hashFields = await client.hGetAll(hashKey);

  if (Object.keys(hashFields).length === 0) {
    return null;
  }

  const stats = {
    wins: Number(hashFields.wins),
    draws: Number(hashFields.draws),
    losses: Number(hashFields.losses),
    goalsFor: Number(hashFields.goalsFor),
    goalsAgainst: Number(hashFields.goalsAgainst),
    points: Number(hashFields.points),
  };

  return stats;
}

// ── atualizar campo específico ────────────────────────────────────────────────

export async function incrementTeamWins(teamId, season) {
  const hashKey = `team:stats:${teamId}:${season}`;

  await client.hIncrBy(hashKey, "wins", 1);
  await client.hIncrBy(hashKey, "points", 3);
}

// ── ler múltiplos campos ──────────────────────────────────────────────────────

async function fetchTeamRecord(teamId, season) {
  const hashKey = `team:stats:${teamId}:${season}`;

  const [wins, draws, losses] = await client.hmGet(hashKey, [
    "wins",
    "draws",
    "losses",
  ]);

  const record = {
    wins: Number(wins ?? 0),
    draws: Number(draws ?? 0),
    losses: Number(losses ?? 0),
  };

  return record;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

await saveTeamStats("42", "2026", {
  wins: 18,
  draws: 6,
  losses: 4,
  goalsFor: 52,
  goalsAgainst: 23,
  points: 60,
});

const points = await fetchTeamPoints("42", "2026");
const stats = await fetchTeamStats("42", "2026");
const record = await fetchTeamRecord("42", "2026");

console.log({ points, stats, record });

await client.disconnect();
