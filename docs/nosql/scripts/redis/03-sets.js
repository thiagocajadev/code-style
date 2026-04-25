import { createClient } from "redis";

const client = createClient({ url: process.env.REDIS_URL });

client.on("error", (error) => console.error("Redis error:", error));
await client.connect();

// ── times favoritos de um usuário ────────────────────────────────────────────

async function addFavoriteTeam(userId, teamId) {
  const setKey = `user:favorites:${userId}`;

  const isNew = await client.sAdd(setKey, `team:${teamId}`);
  return isNew === 1;
}

export async function removeFavoriteTeam(userId, teamId) {
  const setKey = `user:favorites:${userId}`;

  const wasRemoved = await client.sRem(setKey, `team:${teamId}`);
  return wasRemoved === 1;
}

export async function fetchFavoriteTeams(userId) {
  const setKey = `user:favorites:${userId}`;

  const favorites = await client.sMembers(setKey);
  return favorites;
}

async function isFavoriteTeam(userId, teamId) {
  const setKey = `user:favorites:${userId}`;

  const isFavorite = await client.sIsMember(setKey, `team:${teamId}`);
  return isFavorite;
}

// ── interseção — times favoritos em comum ────────────────────────────────────

async function findCommonFavorites(userId1, userId2) {
  const key1 = `user:favorites:${userId1}`;
  const key2 = `user:favorites:${userId2}`;

  const commonFavorites = await client.sInter([key1, key2]);
  return commonFavorites;
}

// ── times que um usuário segue mas o outro não ────────────────────────────────

async function findExclusiveFavorites(userId1, userId2) {
  const key1 = `user:favorites:${userId1}`;
  const key2 = `user:favorites:${userId2}`;

  const exclusiveFavorites = await client.sDiff([key1, key2]);
  return exclusiveFavorites;
}

// ── membros online em uma partida ao vivo ────────────────────────────────────

async function joinLiveMatch(matchId, userId) {
  const setKey = `match:live:viewers:${matchId}`;

  await client.sAdd(setKey, userId);
  await client.expire(setKey, 60 * 60 * 4); // expira em 4h
}

async function fetchLiveViewerCount(matchId) {
  const setKey = `match:live:viewers:${matchId}`;

  const count = await client.sCard(setKey);
  return count;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

await addFavoriteTeam("user:100", "42");
await addFavoriteTeam("user:100", "43");
await addFavoriteTeam("user:101", "42");
await addFavoriteTeam("user:101", "99");

const isFavorite = await isFavoriteTeam("user:100", "42");
const common = await findCommonFavorites("user:100", "user:101");
const exclusive = await findExclusiveFavorites("user:100", "user:101");

await joinLiveMatch("1099", "user:100");
const viewerCount = await fetchLiveViewerCount("1099");

console.log({ isFavorite, common, exclusive, viewerCount });

await client.disconnect();
