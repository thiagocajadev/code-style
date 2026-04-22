import { database } from './db.js';

const teamsCollection = database.collection('teams');
const matchEventsCollection = database.collection('match_events');

// ── top scorers por temporada ─────────────────────────────────────────────────

async function fetchTopScorersBySeason(season, limit = 10) {
  const pipeline = [
    { $match: { season, goals: { $gt: 0 } } },

    {
      $group: {
        _id: '$playerId',
        totalGoals: { $sum: '$goals' },
        matchesPlayed: { $sum: 1 },
      },
    },

    { $sort: { totalGoals: -1 } },
    { $limit: limit },

    {
      $lookup: {
        from: 'players',
        localField: '_id',
        foreignField: '_id',
        as: 'player',
      },
    },

    { $unwind: '$player' },

    {
      $project: {
        playerName: '$player.name',
        position: '$player.position',
        totalGoals: 1,
        matchesPlayed: 1,
        _id: 0,
      },
    },
  ];

  const topScorers = await matchEventsCollection.aggregate(pipeline).toArray();

  return topScorers;
}

// ── relatório de times com elenco ─────────────────────────────────────────────

async function fetchTeamRosters() {
  const pipeline = [
    { $match: { isActive: true } },

    {
      $lookup: {
        from: 'players',
        let: { teamRef: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$teamId', '$$teamRef'] },
              isActive: true,
            },
          },
          {
            $project: {
              name: 1,
              position: 1,
              squadNumber: 1,
              _id: 0,
            },
          },
          { $sort: { squadNumber: 1 } },
        ],
        as: 'players',
      },
    },

    {
      $project: {
        name: 1,
        city: 1,
        playerCount: { $size: '$players' },
        players: 1,
        _id: 0,
      },
    },

    { $sort: { name: 1 } },
  ];

  const rosters = await teamsCollection.aggregate(pipeline).toArray();

  return rosters;
}

// ── gols por cidade (aggregation com $group duplo) ───────────────────────────

async function computeGoalsByCity(season) {
  const pipeline = [
    { $match: { season } },

    {
      $lookup: {
        from: 'teams',
        localField: 'teamId',
        foreignField: '_id',
        as: 'team',
      },
    },

    { $unwind: '$team' },

    {
      $group: {
        _id: '$team.city',
        totalGoals: { $sum: '$goals' },
        teamCount: { $addToSet: '$teamId' },
      },
    },

    {
      $project: {
        city: '$_id',
        totalGoals: 1,
        teamCount: { $size: '$teamCount' },
        _id: 0,
      },
    },

    { $sort: { totalGoals: -1 } },
  ];

  const goalsByCity = await matchEventsCollection.aggregate(pipeline).toArray();

  return goalsByCity;
}

// ── exemplo de uso ────────────────────────────────────────────────────────────

const topScorers = await fetchTopScorersBySeason('2026', 5);
const rosters = await fetchTeamRosters();
const goalsByCity = await computeGoalsByCity('2026');

console.log({ topScorers, rosters, goalsByCity });
