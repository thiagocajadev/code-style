import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', (error) => console.error('Redis error:', error));
await client.connect();

const LEADERBOARD_KEY = 'season:2026:top-scorers';

// ── registrar gols de um jogador ──────────────────────────────────────────────

async function registerGoals(playerId, goals) {
  const newTotal = await client.zIncrBy(LEADERBOARD_KEY, goals, `player:${playerId}`);

  return newTotal;
}

// ── buscar top N artilheiros ──────────────────────────────────────────────────

async function fetchTopScorers(count = 10) {
  const topScorers = await client.zRangeWithScores(
    LEADERBOARD_KEY,
    0,
    count - 1,
    { REV: true },
  );

  return topScorers;
}

// ── posição de um jogador no ranking ─────────────────────────────────────────

async function fetchPlayerRank(playerId) {
  const rank = await client.zRevRank(LEADERBOARD_KEY, `player:${playerId}`);

  if (rank === null) {
    return null;
  }

  const position = rank + 1; // rank é 0-based; posição é 1-based

  return position;
}

// ── total de gols de um jogador ───────────────────────────────────────────────

async function fetchPlayerGoals(playerId) {
  const score = await client.zScore(LEADERBOARD_KEY, `player:${playerId}`);

  return score ?? 0;
}

// ── jogadores em um intervalo de gols ─────────────────────────────────────────

async function fetchScorersByGoalRange(minGoals, maxGoals) {
  const scorers = await client.zRangeByScoreWithScores(
    LEADERBOARD_KEY,
    minGoals,
    maxGoals,
  );

  return scorers;
}

// ── tabela de classificação por pontos ────────────────────────────────────────

const STANDINGS_KEY = 'season:2026:standings';

async function updateStandings(teamId, points) {
  await client.zAdd(STANDINGS_KEY, { score: points, value: `team:${teamId}` });
}

async function fetchStandings() {
  const standings = await client.zRangeWithScores(
    STANDINGS_KEY,
    0,
    -1,
    { REV: true },
  );

  const table = standings.map((entry, index) => ({
    position: index + 1,
    teamId: entry.value.replace('team:', ''),
    points: entry.score,
  }));

  return table;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

await registerGoals('7', 2);
await registerGoals('9', 3);
await registerGoals('11', 1);
await registerGoals('7', 1);

const topScorers = await fetchTopScorers(5);
const rank = await fetchPlayerRank('7');
const goals = await fetchPlayerGoals('7');

await updateStandings('42', 60);
await updateStandings('43', 55);
await updateStandings('44', 52);

const standings = await fetchStandings();

console.log({ topScorers, rank, goals, standings });

await client.disconnect();
