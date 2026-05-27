import {
  toNumber,
} from "./normalize";

// ======================================================
// HELPERS
// ======================================================

function avg(values = []) {
  if (!values.length) return 0;

  return (
    values.reduce(
      (acc, value) =>
        acc + value,
      0
    ) / values.length
  );
}

function clamp(
  value,
  min = 5,
  max = 95
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

// ======================================================
// FILTRAR JOGOS
// ======================================================

function getHomeMatches(matches, teamKey, leagueKey) {
  return matches
    .filter(
      (m) =>
        m.HomeKey === teamKey &&
        m.LeagueKey === leagueKey &&
        m.Goals_H_FT !== undefined &&
        m.Goals_A_FT !== undefined
    )
    .sort((a, b) => new Date(b.Date) - new Date(a.Date))
    .slice(0, 10);
}

function getAwayMatches(matches, teamKey, leagueKey) {
  return matches
    .filter(
      (m) =>
        m.AwayKey === teamKey &&
        m.LeagueKey === leagueKey &&
        m.Goals_H_FT !== undefined &&
        m.Goals_A_FT !== undefined
    )
    .sort((a, b) => new Date(b.Date) - new Date(a.Date))
    .slice(0, 10);
}

// ======================================================
// OVER 1.5
// ======================================================

function calcOver15(
  homeMatches,
  awayMatches
) {
  const homeRate =
    homeMatches.filter(
      (m) =>
        m.Goals_H_FT +
          m.Goals_A_FT >=
        2
    ).length /
    Math.max(
      homeMatches.length,
      1
    );

  const awayRate =
    awayMatches.filter(
      (m) =>
        m.Goals_H_FT +
          m.Goals_A_FT >=
        2
    ).length /
    Math.max(
      awayMatches.length,
      1
    );

  return clamp(
    avg([
      homeRate * 100,
      awayRate * 100,
    ])
  );
}

// ======================================================
// OVER HT
// ======================================================

function calcOverHT(
  homeMatches,
  awayMatches
) {
  const homeRate =
    homeMatches.filter(
      (m) =>
        m.Goals_H_HT +
          m.Goals_A_HT >=
        1
    ).length /
    Math.max(
      homeMatches.length,
      1
    );

  const awayRate =
    awayMatches.filter(
      (m) =>
        m.Goals_H_HT +
          m.Goals_A_HT >=
        1
    ).length /
    Math.max(
      awayMatches.length,
      1
    );

  return clamp(
    avg([
      homeRate * 100,
      awayRate * 100,
    ])
  );
}

// ======================================================
// LAY 0X1
// ======================================================

function calcLay01(
  homeMatches,
  awayMatches
) {
  const homeRate =
    homeMatches.filter(
      (m) =>
        !(
          m.Goals_H_FT === 0 &&
          m.Goals_A_FT === 1
        )
    ).length /
    Math.max(
      homeMatches.length,
      1
    );

  const awayRate =
    awayMatches.filter(
      (m) =>
        !(
          m.Goals_H_FT === 0 &&
          m.Goals_A_FT === 1
        )
    ).length /
    Math.max(
      awayMatches.length,
      1
    );

  return clamp(
    avg([
      homeRate * 100,
      awayRate * 100,
    ])
  );
}

// ======================================================
// LAY 1X0
// ======================================================

function calcLay10(
  homeMatches,
  awayMatches
) {
  const homeRate =
    homeMatches.filter(
      (m) =>
        !(
          m.Goals_H_FT === 1 &&
          m.Goals_A_FT === 0
        )
    ).length /
    Math.max(
      homeMatches.length,
      1
    );

  const awayRate =
    awayMatches.filter(
      (m) =>
        !(
          m.Goals_H_FT === 1 &&
          m.Goals_A_FT === 0
        )
    ).length /
    Math.max(
      awayMatches.length,
      1
    );

  return clamp(
    avg([
      homeRate * 100,
      awayRate * 100,
    ])
  );
}

// ======================================================
// EV
// ======================================================

function calcEV(
  probability,
  odd
) {
  if (!odd || odd <= 1)
    return false;

  const implied =
    (1 / odd) * 100;

  return probability > implied;
}

// ======================================================
// ENGINE
// ======================================================

export function enrichGames(
  todayGames = [],
  matches = []
) {
  return todayGames.map((game) => {
    let homeMatches =
  getHomeMatches(
    matches,
    game.HomeKey,
    game.LeagueKey
  );

let awayMatches =
  getAwayMatches(
    matches,
    game.AwayKey,
    game.LeagueKey
  );

// ======================================
// FALLBACK SEM LIGA
// ======================================

if (homeMatches.length < 5) {
  homeMatches = matches
    .filter(
      (m) =>
        m.HomeKey ===
          game.HomeKey &&
        m.Goals_H_FT !==
          undefined
    )
    .sort(
      (a, b) =>
        new Date(b.Date) -
        new Date(a.Date)
    )
    .slice(0, 10);
}

if (awayMatches.length < 5) {
  awayMatches = matches
    .filter(
      (m) =>
        m.AwayKey ===
          game.AwayKey &&
        m.Goals_A_FT !==
          undefined
    )
    .sort(
      (a, b) =>
        new Date(b.Date) -
        new Date(a.Date)
    )
    .slice(0, 10);
}

    // ==========================================
    // IA
    // ==========================================

    const probOver15 =
      calcOver15(
        homeMatches,
        awayMatches
      );

    const probHT =
      calcOverHT(
        homeMatches,
        awayMatches
      );

    const probLay01 =
      calcLay01(
        homeMatches,
        awayMatches
      );

    const probLay10 =
      calcLay10(
        homeMatches,
        awayMatches
      );

    // ==========================================
    // EV
    // ==========================================

    const plusEv01 =
      calcEV(
        probLay01,
        game.Odd_CS_0x1_Lay
      );

    // ==========================================
    // SCORE
    // ==========================================

    const baseCount = homeMatches.length + awayMatches.length;
const baseScore = Math.min((baseCount / 20) * 100, 100);

const score = clamp(
  probOver15 * 0.25 +
    probHT * 0.20 +
    probLay01 * 0.20 +
    probLay10 * 0.20 +
    baseScore * 0.15
);

    return {
  ...game,

  probOver15,
  probHT,
  probLay01,
  probLay10,

  plusEv01,

  baseCount,
  baseCasa: homeMatches.length,
  baseFora: awayMatches.length,

  score: clamp(score),
};
  });
}