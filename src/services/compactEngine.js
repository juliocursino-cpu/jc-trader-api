function n(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function pct(total, hits) {
  if (!total) return 0;
  return Math.round((hits / total) * 100);
}

function formatDate(value) {
  return String(value || "").slice(0, 10);
}

function formatTime(value) {
  return String(value || "00:00").slice(0, 5);
}

function normalizeKey(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bFC\b/g, "")
    .replace(/\bCF\b/g, "")
    .replace(/\bCLUB\b/g, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

const LEAGUE_NAMES = {
  NORWAY1: "Norway Eliteserien",
  NORWAY2: "Norway OBOS",
  SOUTHKOREA2: "South Korea K League 2",
  ENGLAND4: "England League Two",
  BULGARIA1: "Bulgaria First League",
  AUSTRIA1: "Austria Bundesliga",
  SWEDEN1: "Sweden Allsvenskan",
  SWEDEN2: "Sweden Superettan",
  BRAZIL1: "Brazil Serie A",
  BRAZIL2: "Brazil Serie B",
  IRELAND1: "Ireland Premier",
  IRELAND2: "Ireland First Division",
  ROMANIA1: "Romania Liga I",
  BOSNIA1: "Bosnia Premier League",
  ICELAND1: "Iceland Besta Deild",
};

function leagueKey(value) {
  return normalizeKey(value);
}

function leagueName(raw, key) {
  return LEAGUE_NAMES[key] || raw || key || "";
}

function normalizeDbGame(game = {}) {
  const lk = leagueKey(game.liga_normalizada || game.liga);

  return {
    ...game,
    Date: formatDate(game.data),
    Time: formatTime(game.hora),
    League: leagueName(game.liga, lk),
    LeagueKey: lk,

    Home: game.time_casa || "",
    Away: game.time_fora || "",
    HomeKey: normalizeKey(game.time_casa_normalizado || game.time_casa),
    AwayKey: normalizeKey(game.time_fora_normalizado || game.time_fora),

    HTH: n(game.gols_ht_casa),
    HTA: n(game.gols_ht_fora),
    FTH: n(game.gols_ft_casa),
    FTA: n(game.gols_ft_fora),
  };
}

function lastHome(history, game, limit = 10) {
  return history
    .filter(
      (m) =>
        m.HomeKey === game.HomeKey &&
        m.LeagueKey === game.LeagueKey &&
        m.Date < game.Date
    )
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, limit);
}

function lastAway(history, game, limit = 10) {
  return history
    .filter(
      (m) =>
        m.AwayKey === game.AwayKey &&
        m.LeagueKey === game.LeagueKey &&
        m.Date < game.Date
    )
    .sort((a, b) => b.Date.localeCompare(a.Date))
    .slice(0, limit);
}

function calcStats(base) {
  const total = base.length;

  return {
    overHT: pct(total, base.filter((g) => g.HTH + g.HTA >= 1).length),
    over15: pct(total, base.filter((g) => g.FTH + g.FTA >= 2).length),
    lay01: pct(total, base.filter((g) => !(g.FTH === 0 && g.FTA === 1)).length),
    lay10: pct(total, base.filter((g) => !(g.FTH === 1 && g.FTA === 0)).length),
    layGHome: pct(total, base.filter((g) => !(g.FTH >= 4 && g.FTA <= 1)).length),
    layGAway: pct(total, base.filter((g) => !(g.FTA >= 4 && g.FTH <= 1)).length),
  };
}

function mostLikelyScore(base) {
  if (!base.length) return "—";

  const map = new Map();

  base.forEach((g) => {
    const score = `${g.FTH}x${g.FTA}`;
    map.set(score, (map.get(score) || 0) + 1);
  });

  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
}

export function buildCompactGames(futureMatches = [], allMatches = []) {
  const future = futureMatches.map(normalizeDbGame);

  const history = allMatches
    .map(normalizeDbGame)
    .filter((g) => g.Date && g.HomeKey && g.AwayKey);

  return future.map((game) => {
    const home = lastHome(history, game, 10);
    const away = lastAway(history, game, 10);
    const base = [...home, ...away];
    const stats = calcStats(base);

    const score = Math.round(
      stats.overHT * 0.15 +
        stats.over15 * 0.2 +
        stats.lay01 * 0.2 +
        stats.lay10 * 0.2 +
        stats.layGHome * 0.125 +
        stats.layGAway * 0.125
    );

    return {
      ...game,
      ...stats,
      likelyScore: mostLikelyScore(base),
      baseCasa: home.length,
      baseFora: away.length,
      baseTotal: base.length,
      score,
      favorite: false,
    };
  });
}