import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { RefreshCcw, Search, Trophy, Database, Target, Flame, BarChart3, ShieldCheck, Settings, Wallet, Users, Activity, Bell, Zap, AlertTriangle, Cpu } from "lucide-react";

const API_BASE_URL = "http://localhost:3001/api";

const INITIAL_FILTERS = {
  date: "",
  league: "Todas",
  lay01Range: "Todos",
  lay10Range: "Todos",
  overHtRange: "Todos",
  over15Range: "Todos",
  prob01Range: "Todos",
  prob10Range: "Todos",
  seal: "Todos",
};

const RANGE_OPTIONS = [
  "Todos",
  "0 - 30",
  "31 - 50",
  "51 - 70",
  "71 - 100",
];

const ODD_RANGE_OPTIONS = [
  "Todos",
  "5 - 9",
  "10 - 15",
  "16 - 25",
  "26 - 50",
  "51+",
];

const SEAL_OPTIONS = [
  "Todos",
  "🔥 Excelente",
  "✅ Bom",
  "⚠️ Médio",
  "❌ Evitar",
];

const LEAGUE_NORMALIZATION = {
  "ARGENTINA 1": "ARGENTINA PRIMERA",
  "AUSTRALIA 1": "AUSTRALIA A-LEAGUE",
  "AUSTRIA 1": "AUSTRIA BUNDESLIGA",
  "AUSTRIA 2": "AUSTRIA 2. LIGA",

  "BRAZIL 1": "BRAZIL SERIE A",
  "BRAZIL - SERIE A": "BRAZIL SERIE A",
  "BRASIL SERIE A": "BRAZIL SERIE A",
  "BRAZIL SERIE A": "BRAZIL SERIE A",

  "BRAZIL 2": "BRAZIL SERIE B",
  "BRAZIL - SERIE B": "BRAZIL SERIE B",
  "BRASIL SERIE B": "BRAZIL SERIE B",
  "BRAZIL SERIE B": "BRAZIL SERIE B",

  "BULGARIA 1": "BULGARIA FIRST LEAGUE",
  "CHILE 1": "CHILE PRIMERA",
  "CHINA 1": "CHINA SUPER LEAGUE",
  "CZECH 1": "CZECH FIRST LEAGUE",
  "DENMARK 1": "DENMARK SUPERLIGA",
  "EGYPT 1": "EGYPT PREMIER LEAGUE",
  "ESTONIA 1": "ESTONIA MEISTRILIIGA",
  "FINLAND 1": "FINLAND VEIKKAUSLIIGA",

  "FRANCE 1": "LIGUE 1",
  "FRANCE 2": "LIGUE 2",
  "FRANCE 3": "FRANCE NATIONAL",

  "GERMANY 1": "BUNDESLIGA",
  "GERMANY 2": "2. BUNDESLIGA",
  "GERMANY 3": "3. LIGA",

  "GREECE 1": "GREECE SUPER LEAGUE",
  "ICELAND 1": "ICELAND BESTA DEILD",
  "IRELAND 1": "IRELAND PREMIER DIVISION",
  "IRELAND 2": "IRELAND FIRST DIVISION",
  "ISRAEL 1": "ISRAEL PREMIER LEAGUE",

  "ITALY 1": "SERIE A",
  "ITALY 2": "SERIE B",
  "ITALY 3": "SERIE C",

  "SPAIN 1": "LA LIGA",
  "SPAIN 2": "LA LIGA 2",

  "NETHERLANDS 1": "EREDIVISIE",
  "NORWAY 1": "NORWAY ELITESERIEN",
  "NORWAY 2": "NORWAY OBOS-LIGAEN",
  "PARAGUAY 1": "PARAGUAY PRIMERA",
  "POLAND 1": "POLAND EKSTRAKLASA",
  "PORTUGAL 1": "PORTUGAL PRIMEIRA LIGA",
  "PORTUGAL 2": "PORTUGAL LIGA 2",

  "ENGLAND 1": "PREMIER LEAGUE",
  "PREMIER LEAGUE": "PREMIER LEAGUE",

  "ROMANIA 1": "ROMANIA LIGA I",
  "SAUDI ARABIA 1": "SAUDI PRO LEAGUE",
  "SCOTLAND 1": "SCOTLAND PREMIERSHIP",
  "SCOTLAND 2": "SCOTLAND CHAMPIONSHIP",
  "SERBIA 1": "SERBIA SUPERLIGA",
  "SLOVAKIA 1": "SLOVAKIA SUPER LIGA",
  "SLOVENIA 1": "SLOVENIA PRVA LIGA",
  "SWEDEN 1": "SWEDEN ALLSVENSKAN",
  "SWEDEN 2": "SWEDEN SUPERETTAN",
  "SWITZERLAND 1": "SWISS SUPER LEAGUE",
  "SWITZERLAND 2": "SWISS CHALLENGE LEAGUE",
  "TURKEY 1": "TURKEY SUPER LIG",
  "TURKEY 2": "TURKEY 1. LIG",
  "UKRAINE 1": "UKRAINE PREMIER LEAGUE",
  "USA 1": "USA MLS",
};

const MAIN_LEAGUES = [
  "BRAZIL SERIE A",
  "BRAZIL SERIE B",
  "PREMIER LEAGUE",
  "LA LIGA",
  "SERIE A",
  "BUNDESLIGA",
  "LIGUE 1",
  "UEFA CHAMPIONS LEAGUE",
  "UEFA EUROPA LEAGUE",
];

const TEAM_ALIASES = {
  "PSG": "Paris Saint Germain",
  "PARIS SG": "Paris Saint Germain",
  "PARIS SAINT-GERMAIN": "Paris Saint Germain",
  "PARIS SAINT GERMAIN": "Paris Saint Germain",

  "FC BARCELONA": "FC Barcelona",
  "BARCELONA": "FC Barcelona",
  "BARCELONA FC": "FC Barcelona",

  "MAN UTD": "Manchester United",
  "MANCHESTER UTD": "Manchester United",
  "MAN UNITED": "Manchester United",

  "MAN CITY": "Manchester City",
  "MANCHESTER CITY FC": "Manchester City",

  "BAYERN": "FC Bayern München",
  "BAYERN MUNICH": "FC Bayern München",
  "BAYERN MÜNCHEN": "FC Bayern München",

  "INTER MILAN": "Inter",
  "INTERNAZIONALE": "Inter",

  "AC MILAN": "Milan",
  "MILAN AC": "Milan",

  "REAL MADRID CF": "Real Madrid",
  "ATLETICO MADRID": "Atlético Madrid",
  "ATLÉTICO MADRID": "Atlético Madrid",
};

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).replace("%", "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function firstValue(obj, keys, fallback = "") {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") return obj[key];
  }
  return fallback;
}

function normalizeLeagueName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return LEAGUE_NORMALIZATION[key] || key;
}

function normalizeTeamName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const key = raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();

  return TEAM_ALIASES[key] || raw;
}

function normalizeGame(game) {
  const rawLeague = firstValue(game, ["League", "Liga", "league", "liga"]);

  return {
    ...game,
    Date: firstValue(game, ["Date", "Data", "date", "data", "data_referencia"]),
    Time: firstValue(game, ["Time", "Hora", "time", "hora"], "00:00"),
    League: normalizeLeagueName(rawLeague),
    Home: normalizeTeamName(
  firstValue(game, ["Home", "Mandante", "home", "mandante", "time_casa"])
),
Away: normalizeTeamName(
  firstValue(game, ["Away", "Visitante", "away", "visitante", "time_fora"])
),
    Odd_H_Back: firstValue(game, ["Odd_H_Back", "Odd Casa", "odd_casa", "oddcasa", "oddHome"], null),
    Odd_D_Back: firstValue(game, ["Odd_D_Back", "Odd Empate", "odd_empate", "oddempate", "oddDraw"], null),
    Odd_A_Back: firstValue(game, ["Odd_A_Back", "Odd Fora", "odd_fora", "oddfora", "oddAway"], null),
    Odd_CS_0x1_Lay: firstValue(game, ["Odd_CS_0x1_Lay", "Odd 0x1 Lay", "odd_0x1_lay", "odd01Lay"], null),
    Odd_CS_1x0_Lay: firstValue(game, ["Odd_CS_1x0_Lay", "Odd 1x0 Lay", "odd_1x0_lay", "odd10Lay"], null),
    Goals_H_HT: firstValue(game, ["Goals_H_HT", "HT_H", "goals_h_ht"], null),
    Goals_A_HT: firstValue(game, ["Goals_A_HT", "HT_A", "goals_a_ht"], null),
    Goals_H_FT: firstValue(game, ["Goals_H_FT", "FT_H", "goals_h_ft"], null),
    Goals_A_FT: firstValue(game, ["Goals_A_FT", "FT_A", "goals_a_ft"], null),
    Goals_Min_H: firstValue(game, ["Goals_Min_H", "gols_min_h", "minutos_gols_casa"], []),
    Goals_Min_A: firstValue(game, ["Goals_Min_A", "gols_min_a", "minutos_gols_fora"], []),
  };
}

function extractGames(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.jogos)) return payload.jogos;
  if (Array.isArray(payload?.dados)) return payload.dados;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function parseGoalMinutes(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  try {
    const parsed = JSON.parse(String(value).replaceAll("'", '"'));
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : [];
  } catch {
    return String(value)
      .replace("[", "")
      .replace("]", "")
      .split(",")
      .map((x) => Number(String(x).trim()))
      .filter(Number.isFinite);
  }
}

function totalHt(game) {
  const h = toNumber(game.Goals_H_HT);
  const a = toNumber(game.Goals_A_HT);
  if (h === null || a === null) return null;
  return h + a;
}

function totalFt(game) {
  const h = toNumber(game.Goals_H_FT);
  const a = toNumber(game.Goals_A_FT);
  if (h === null || a === null) return null;
  return h + a;
}

function hadScoreUntil75(game, targetHome, targetAway) {
  const home = parseGoalMinutes(game.Goals_Min_H).map((minute) => ({ team: "H", minute }));
  const away = parseGoalMinutes(game.Goals_Min_A).map((minute) => ({ team: "A", minute }));
  const events = [...home, ...away].filter((e) => e.minute <= 75).sort((a, b) => a.minute - b.minute);

  let h = 0;
  let a = 0;

  for (const event of events) {
    if (event.team === "H") h += 1;
    if (event.team === "A") a += 1;
    if (h === targetHome && a === targetAway) return true;
  }

  return false;
}


function scoreUntilMinute(game, minuteLimit = 75) {
  const home = parseGoalMinutes(game.Goals_Min_H).map((minute) => ({ team: "H", minute }));
  const away = parseGoalMinutes(game.Goals_Min_A).map((minute) => ({ team: "A", minute }));
  const events = [...home, ...away]
    .filter((event) => event.minute <= minuteLimit)
    .sort((a, b) => a.minute - b.minute);

  let h = 0;
  let a = 0;

  for (const event of events) {
    if (event.team === "H") h += 1;
    if (event.team === "A") a += 1;
  }

  return { h, a, label: `${h}x${a}` };
}

function formatMoney(value) {
  const n = Number(value || 0);
  return `R$ ${n.toFixed(2)}`;
}

function buildEquityCurve(results) {
  let balance = 0;
  return [...results]
    .reverse()
    .map((item, index) => {
      balance += item.profit;
      return {
        index: index + 1,
        balance,
        label: formatDateBR(item.Date),
      };
    });
}

function smoothPathFromPoints(points) {
  if (points.length < 2) return "";

  const d = [`M ${points[0].x} ${points[0].y}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return d.join(" ");
}

function MiniEquityChart({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-[#111111] text-sm font-semibold text-zinc-500">
        Sem dados para montar o gráfico.
      </div>
    );
  }

  const width = 1100;
  const height = 280;
  const paddingX = 20;
  const paddingY = 24;

  const values = data.map((item) => item.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const last = data[data.length - 1];
  const positive = last.balance >= 0;

  const chartPoints = data.map((item, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((item.balance - min) / range) * (height - paddingY * 2);
    return { x, y };
  });

  const linePath = smoothPathFromPoints(chartPoints);
  const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${height - paddingY} L ${chartPoints[0].x} ${height - paddingY} Z`;
  const stroke = positive ? "#22c55e" : "#ef4444";
  const gradientId = positive ? "equityGradientGreen" : "equityGradientRed";

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-zinc-50">Evolução do método</h2>
          <p className="text-sm text-zinc-500">Curva acumulada do backtest</p>
        </div>
        <div className={`text-sm font-black ${positive ? "text-emerald-300" : "text-red-300"}`}>
          Resultado acumulado: {formatMoney(last.balance)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-gradient-to-b from-zinc-950 to-[#0b0b0b]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[900px]">
          <defs>
            <linearGradient id="equityGradientGreen" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="equityGradientRed" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />

          <text x={paddingX + 4} y={24} fill="#a1a1aa" fontSize="12">
            Máx: {formatMoney(max)}
          </text>
          <text x={paddingX + 4} y={height - 10} fill="#a1a1aa" fontSize="12">
            Mín: {formatMoney(min)}
          </text>
        </svg>
      </div>
    </section>
  );
}


function calcPercent(games, predicate) {
  if (!games.length) return null;
  const validGames = games.filter((game) => predicate(game) !== null);
  if (!validGames.length) return null;
  const hits = validGames.filter(predicate).length;
  return (hits / validGames.length) * 100;
}

function getRecentConditionGames(allGames, game, team, condition, limit = 10) {
  const dateLimit = new Date(game.Date);
  const league = game.League;

  return allGames
    .filter((item) => {
      const gameDate = new Date(item.Date);
      if (!team || !league || Number.isNaN(gameDate.getTime())) return false;
      if (gameDate >= dateLimit) return false;
      if (item.League !== league) return false;
      if (condition === "home") return item.Home === team;
      if (condition === "away") return item.Away === team;
      return false;
    })
    .sort((a, b) => new Date(b.Date) - new Date(a.Date))
    .slice(0, limit);
}

function calcGameStats(game, historicalGames) {
  const homeLast10 = getRecentConditionGames(historicalGames, game, game.Home, "home", 10);
  const awayLast10 = getRecentConditionGames(historicalGames, game, game.Away, "away", 10);
  const base = [...homeLast10, ...awayLast10];

  return {
    jogosBaseCasa: homeLast10.length,
    jogosBaseFora: awayLast10.length,
    probOverHt: calcPercent(base, (g) => {
      const total = totalHt(g);
      return total === null ? null : total >= 1;
    }),
    probOver15: calcPercent(base, (g) => {
      const total = totalFt(g);
      return total === null ? null : total >= 2;
    }),
    prob01Ate75: calcPercent(base, (g) => hadScoreUntil75(g, 0, 1)),
    prob10Ate75: calcPercent(base, (g) => hadScoreUntil75(g, 1, 0)),
  };
}

function calcLayScore(prob, odd, baseCasa, baseFora) {
  const probability = toNumber(prob);
  const oddValue = toNumber(odd);
  const totalBase = (baseCasa || 0) + (baseFora || 0);

  if (probability === null || oddValue === null || totalBase < 8) return 0;

  const probScore = clamp(probability);
  const oddScore = oddValue >= 10 ? 100 : clamp((oddValue / 10) * 100);
  const baseScore = clamp((totalBase / 20) * 100);

  return Math.round((probScore * 0.55) + (oddScore * 0.25) + (baseScore * 0.20));
}

function calcScannerScore(game) {
  const scoreLay01 = calcLayScore(game.prob01Ate75, game.Odd_CS_0x1_Lay, game.jogosBaseCasa, game.jogosBaseFora);
  const scoreLay10 = calcLayScore(game.prob10Ate75, game.Odd_CS_1x0_Lay, game.jogosBaseCasa, game.jogosBaseFora);

  const overHt = toNumber(game.probOverHt) ?? 0;
  const over15 = toNumber(game.probOver15) ?? 0;
  const baseTotal = (game.jogosBaseCasa || 0) + (game.jogosBaseFora || 0);
  const baseScore = clamp((baseTotal / 20) * 100);

  const marketScore = Math.max(scoreLay01, scoreLay10);
  const consistencyScore = clamp(((overHt + over15) / 2));

  let finalScore = Math.round(
  (marketScore * 0.65) +
  (consistencyScore * 0.20) +
  (baseScore * 0.15)
);

// bônus para ligas principais
if (MAIN_LEAGUES.includes(game.League)) {
  finalScore += 8;
}

// limite máximo
finalScore = Math.min(finalScore, 100);

  return {
    scoreLay01,
    scoreLay10,
    scannerScore: finalScore,
    bestMarket: scoreLay01 >= scoreLay10 ? "Lay 0x1" : "Lay 1x0",
  };
}


function calcProScore(game) {
  const baseTotal = (game.jogosBaseCasa || 0) + (game.jogosBaseFora || 0);
  const baseScore = clamp((baseTotal / 20) * 100);
  const leagueScore = MAIN_LEAGUES.includes(game.League) ? 100 : 72;

  const overHt = toNumber(game.probOverHt) ?? 0;
  const over15 = toNumber(game.probOver15) ?? 0;
  const lay01 = toNumber(game.scoreLay01) ?? 0;
  const lay10 = toNumber(game.scoreLay10) ?? 0;

  const overScore = Math.round((over15 * 0.62) + (overHt * 0.23) + (baseScore * 0.15));
  const layScore = Math.max(lay01, lay10);
  const consistencyScore = Math.round(((overHt + over15) / 2) * 0.72 + baseScore * 0.28);

  const candidates = [
    { market: "Lay 0x1", score: lay01, odd: game.Odd_CS_0x1_Lay },
    { market: "Lay 1x0", score: lay10, odd: game.Odd_CS_1x0_Lay },
    { market: "Over 1.5 FT", score: overScore, odd: getOver15Odd(game) || "—" },
  ].sort((a, b) => b.score - a.score);

  let scorePro = Math.round(
    (Math.max(layScore, overScore) * 0.52) +
    (consistencyScore * 0.22) +
    (leagueScore * 0.14) +
    (baseScore * 0.12)
  );

  if (MAIN_LEAGUES.includes(game.League)) scorePro += 4;
  if (baseTotal < 10) scorePro -= 8;
  scorePro = clamp(scorePro, 0, 100);

  let alertLevel = "Monitorar";
  if (scorePro >= 88) alertLevel = "ELITE";
  else if (scorePro >= 78) alertLevel = "FORTE";
  else if (scorePro >= 68) alertLevel = "BOM";

  return {
    scorePro,
    proMarket: candidates[0]?.market || game.bestMarket || "—",
    proOdd: candidates[0]?.odd ?? "—",
    proAlertLevel: alertLevel,
    proConsistency: consistencyScore,
  };
}

function enrichOpportunityGames(games, historicalGames) {
  return games
    .map((game) => {
      const stats = calcGameStats(game, historicalGames);
      const scannerScores = calcScannerScore({ ...game, ...stats });
      const proScores = calcProScore({ ...game, ...stats, ...scannerScores });
      return { ...game, ...stats, ...scannerScores, ...proScores };
    })
    .sort((a, b) => (b.scorePro || 0) - (a.scorePro || 0));
}

function groupBestByLeague(games) {
  const grouped = new Map();
  games.forEach((game) => {
    if (!game.League) return;
    if (!grouped.has(game.League)) grouped.set(game.League, { league: game.League, total: 0, score: 0, elite: 0 });
    const row = grouped.get(game.League);
    row.total += 1;
    row.score += game.scorePro || game.scannerScore || 0;
    if ((game.scorePro || 0) >= 85) row.elite += 1;
  });

  return [...grouped.values()]
    .map((row) => ({ ...row, avg: row.total ? row.score / row.total : 0 }))
    .sort((a, b) => b.elite - a.elite || b.avg - a.avg)
    .slice(0, 5);
}

function groupBestByMarket(games) {
  const grouped = new Map();
  games.forEach((game) => {
    const market = game.proMarket || game.bestMarket || "—";
    if (!grouped.has(market)) grouped.set(market, { market, total: 0, score: 0 });
    const row = grouped.get(market);
    row.total += 1;
    row.score += game.scorePro || game.scannerScore || 0;
  });

  return [...grouped.values()]
    .map((row) => ({ ...row, avg: row.total ? row.score / row.total : 0 }))
    .sort((a, b) => b.avg - a.avg || b.total - a.total)
    .slice(0, 4);
}

async function loadTodayOpportunities() {
  const windowResponse = await fetch(`${API_BASE_URL}/jogos-janela/betfair`);
  if (!windowResponse.ok) {
    throw new Error(`Erro jogos ${windowResponse.status}: ${await windowResponse.text()}`);
  }

  const windowPayload = await windowResponse.json();
  const windowGames = extractGames(windowPayload)
    .map(normalizeGame)
    .filter((game) => isTodayOrTomorrow(game.Date));

  const historicalResponse = await fetch(`${API_BASE_URL}/historico?limit=8000`);
  if (!historicalResponse.ok) {
    throw new Error(`Erro histórico ${historicalResponse.status}: ${await historicalResponse.text()}`);
  }

  const historicalPayload = await historicalResponse.json();

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const historicalGames = extractGames(historicalPayload)
    .map(normalizeGame)
    .filter((game) => {
      const gameDate = new Date(game.Date);
      return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
    });

  const unique = new Map();

  windowGames.forEach((game) => {
    const key = `${game.ID_Evento || game.id || ""}-${game.Date}-${game.Time}-${game.Home}-${game.Away}`;
    unique.set(key, game);
  });

  const games = [...unique.values()].sort((a, b) => {
    const da = new Date(`${a.Date}T${formatTime(a.Time) === "—" ? "00:00" : formatTime(a.Time)}`);
    const db = new Date(`${b.Date}T${formatTime(b.Time) === "—" ? "00:00" : formatTime(b.Time)}`);
    return da - db;
  });

  const enrichedGames = games
    .map((game) => {
      const stats = calcGameStats(game, historicalGames);
      const scores = calcScannerScore({ ...game, ...stats });

      return {
        ...game,
        ...stats,
        ...scores,
        scorePro: scores.scannerScore,
        marketPro: scores.bestMarket,
      };
    })
    .sort((a, b) => (b.scorePro || 0) - (a.scorePro || 0));

  return enrichedGames
    .filter((game) => (game.scorePro || 0) >= 70)
    .slice(0, 12);
}

function OpportunityRow({ game, index }) {
  const score = game.scorePro ?? game.scannerScore ?? 0;
  const seal = getSeal(score);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-[#0d0d0d] p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-sm font-black text-zinc-300">
          #{index + 1}
        </div>
        <div>
          <h3 className="text-lg font-black text-white">{game.Home} x {game.Away}</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {formatDateBR(game.Date)} às {formatTime(game.Time)} • {game.League || "—"}
          </p>
          <p className="mt-1 text-xs font-bold text-zinc-500">
            Base: {game.jogosBaseCasa}+{game.jogosBaseFora}/20 • Consistência: {game.proConsistency ?? "—"}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-xs font-black ${seal.className}`}>{seal.label}</span>
        <span className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-sm font-black text-cyan-200">
          {game.proMarket || game.bestMarket}
        </span>
        <span className="rounded-xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-sm font-black text-pink-200">
          Odd {formatOdd(game.proOdd)}
        </span>
        <span className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-sm font-black text-orange-200">
          Score PRO {score}/100
        </span>
      </div>
    </div>
  );
}

function getSeal(score) {
  if (score >= 85) return { label: "🔥 Excelente", className: "border-orange-400 bg-orange-500/15 text-orange-200" };
  if (score >= 70) return { label: "✅ Bom", className: "border-emerald-400 bg-emerald-500/15 text-emerald-200" };
  if (score >= 50) return { label: "⚠️ Médio", className: "border-yellow-400 bg-yellow-500/15 text-yellow-100" };
  return { label: "❌ Evitar", className: "border-red-400 bg-red-500/15 text-red-200" };
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)}%`;
}

function formatOdd(value) {
  const n = toNumber(value);
  return n === null ? "—" : n.toFixed(2);
}

function formatDateBR(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}`;
}

function toISODateLocal(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayAndTomorrowISO() {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  return [toISODateLocal(today), toISODateLocal(tomorrow)];
}

function isTodayOrTomorrow(value) {
  const date = String(value || "").slice(0, 10);
  return getTodayAndTomorrowISO().includes(date);
}

function isToday(value) {
  return String(value || "").slice(0, 10) === toISODateLocal(new Date());
}

function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

function inPercentRange(value, range) {
  if (range === "Todos") return true;
  const n = toNumber(value);
  if (n === null) return false;
  if (range === "0 - 30") return n >= 0 && n <= 30;
  if (range === "31 - 50") return n >= 31 && n <= 50;
  if (range === "51 - 70") return n >= 51 && n <= 70;
  if (range === "71 - 100") return n >= 71 && n <= 100;
  return true;
}

function inOddRange(value, range) {
  if (range === "Todos") return true;
  const n = toNumber(value);
  if (n === null) return false;
  if (range === "5 - 9") return n >= 5 && n <= 9;
  if (range === "10 - 15") return n >= 10 && n <= 15;
  if (range === "16 - 25") return n >= 16 && n <= 25;
  if (range === "26 - 50") return n >= 26 && n <= 50;
  if (range === "51+") return n >= 51;
  return true;
}

function cellClass(type, value) {
  if (type === "home" || type === "away") return "bg-blue-500/20 text-blue-100 border border-blue-400/30";
  if (type === "draw") return "bg-zinc-500/20 text-zinc-100 border border-zinc-400/30";
  if (type === "lay") return "bg-pink-500/20 text-pink-100 border border-pink-400/30";
  if (type === "score") {
    const n = toNumber(value);
    if (n >= 85) return "bg-orange-500/20 text-orange-100 border border-orange-400/30";
    if (n >= 70) return "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30";
    if (n >= 50) return "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30";
    return "bg-red-500/20 text-red-100 border border-red-400/30";
  }
  if (type === "percent") {
    const n = toNumber(value);
    if (n === null) return "bg-zinc-900 text-zinc-500 border border-zinc-800";
    if (n <= 30) return "bg-red-500/20 text-red-100 border border-red-400/30";
    if (n <= 50) return "bg-yellow-500/20 text-yellow-100 border border-yellow-400/30";
    return "bg-emerald-500/20 text-emerald-100 border border-emerald-400/30";
  }
  return "bg-zinc-950 text-zinc-100 border border-zinc-800";
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option || "Todas"}</option>
        ))}
      </select>
    </label>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
          <p className="text-2xl font-bold text-zinc-50">{value}</p>
        </div>
        <Icon size={22} className="text-zinc-500" />
      </div>
    </div>
  );
}

function ScannerPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [games, setGames] = useState([]);
  const [historicalGames, setHistoricalGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchGames() {
    setLoading(true);
    setError("");

    try {
      const windowResponse = await fetch(`${API_BASE_URL}/jogos-janela/betfair`);
      if (!windowResponse.ok) throw new Error(`Erro ${windowResponse.status}: ${await windowResponse.text()}`);
      const windowPayload = await windowResponse.json();
      const windowGames = extractGames(windowPayload).map(normalizeGame);

      console.log(
  "LIGAS RECEBIDAS DA API:",
  [...new Set(windowGames.map((g) => g.League).filter(Boolean))].sort()
);

      const historicalResponse = await fetch(`${API_BASE_URL}/historico?limit=8000`);
      if (!historicalResponse.ok) throw new Error(`Erro histórico ${historicalResponse.status}: ${await historicalResponse.text()}`);
      const historicalPayload = await historicalResponse.json();
      const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

const history = extractGames(historicalPayload)
  .map(normalizeGame)
  .filter((game) => {
    const gameDate = new Date(game.Date);
    return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
  });

      const uniqueWindow = new Map();
      windowGames.forEach((game) => {
        const key = `${game.ID_Evento || game.id || ""}-${game.Date}-${game.Time}-${game.Home}-${game.Away}`;
        uniqueWindow.set(key, game);
      });

      const orderedWindow = [...uniqueWindow.values()]
  .filter((game) => isTodayOrTomorrow(game.Date))
  .sort((a, b) => {
          const da = new Date(`${a.Date}T${formatTime(a.Time) === "—" ? "00:00" : formatTime(a.Time)}`);
          const db = new Date(`${b.Date}T${formatTime(b.Time) === "—" ? "00:00" : formatTime(b.Time)}`);
          return da - db;
        });

      setGames(orderedWindow);
      setHistoricalGames(history);
      setFilters((prev) => ({ ...prev, date: prev.date || "" }));
    } catch (err) {
      setError(err.message || "Erro ao buscar dados da API.");
      setGames([]);
      setHistoricalGames([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGames();
  }, []);

  const enrichedGames = useMemo(() => {
    return enrichOpportunityGames(games, historicalGames);
  }, [games, historicalGames]);

  const dates = useMemo(() => {
    return [...new Set(games.map((game) => game.Date).filter(Boolean))].sort();
  }, [games]);

  const leagues = useMemo(() => {
    return ["Todas", ...new Set(games.map((game) => game.League).filter(Boolean))].sort((a, b) => {
      if (a === "Todas") return -1;
      if (b === "Todas") return 1;
      return a.localeCompare(b);
    });
  }, [games]);

  const filteredGames = useMemo(() => {
    return enrichedGames.filter((game) => {
      if (filters.date && game.Date !== filters.date) return false;
      if (filters.league !== "Todas" && game.League !== filters.league) return false;
      if (!inOddRange(game.Odd_CS_0x1_Lay, filters.lay01Range)) return false;
      if (!inOddRange(game.Odd_CS_1x0_Lay, filters.lay10Range)) return false;
      if (!inPercentRange(game.probOverHt, filters.overHtRange)) return false;
      if (!inPercentRange(game.probOver15, filters.over15Range)) return false;
      if (!inPercentRange(game.prob01Ate75, filters.prob01Range)) return false;
      if (!inPercentRange(game.prob10Ate75, filters.prob10Range)) return false;
      if (filters.seal !== "Todos" && getSeal(game.scannerScore).label !== filters.seal) return false;
      return true;
    });
  }, [enrichedGames, filters]);

  const topGame = filteredGames[0];
  const excellentGames = filteredGames.filter((game) => game.scannerScore >= 85).length;

  return (
    <div className="space-y-4">
        <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">JC Trader</p>
              <h1 className="text-3xl font-black text-zinc-50">Scanner</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Ranking automático com carregamento leve: somente jogos de hoje e amanhã.
              </p>
            </div>

            <button
              onClick={fetchGames}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Atualizando" : "Atualizar API"}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <StatCard title="Jogos carregados" value={games.length} icon={Database} />
          <StatCard title="Jogos filtrados" value={filteredGames.length} icon={Search} />
          <StatCard title="Ligas principais" value={Math.max(leagues.length - 1, 0)} icon={Trophy} />
          <StatCard title="Histórico" value={historicalGames.length} icon={Target} />
          <StatCard title="Excelentes" value={excellentGames} icon={Flame} />
        </section>

        {topGame && (
          <section className="rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-zinc-950 p-4 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Melhor oportunidade filtrada</p>
                <h2 className="text-xl font-black text-zinc-50">
                  {topGame.Home} x {topGame.Away}
                </h2>
                <p className="text-sm text-zinc-400">
                  {formatDateBR(topGame.Date)} às {formatTime(topGame.Time)} • {topGame.League} • Melhor mercado: {topGame.bestMarket}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-sm font-black ${getSeal(topGame.scannerScore).className}`}>
                  {getSeal(topGame.scannerScore).label}
                </span>
                <span className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-sm font-black text-blue-100">
                  Score {topGame.scannerScore}/100
                </span>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <FilterSelect label="Data" value={filters.date} onChange={(v) => updateFilter("date", v)} options={dates.length ? ["", ...dates] : [""]} />
            <FilterSelect label="Liga" value={filters.league} onChange={(v) => updateFilter("league", v)} options={leagues} />
            <FilterSelect label="Lay 0x1" value={filters.lay01Range} onChange={(v) => updateFilter("lay01Range", v)} options={ODD_RANGE_OPTIONS} />
            <FilterSelect label="Lay 1x0" value={filters.lay10Range} onChange={(v) => updateFilter("lay10Range", v)} options={ODD_RANGE_OPTIONS} />
            <FilterSelect label="Over HT" value={filters.overHtRange} onChange={(v) => updateFilter("overHtRange", v)} options={RANGE_OPTIONS} />
            <FilterSelect label="Over 1.5 FT" value={filters.over15Range} onChange={(v) => updateFilter("over15Range", v)} options={RANGE_OPTIONS} />
            <FilterSelect label="0x1 até 75'" value={filters.prob01Range} onChange={(v) => updateFilter("prob01Range", v)} options={RANGE_OPTIONS} />
            <FilterSelect label="1x0 até 75'" value={filters.prob10Range} onChange={(v) => updateFilter("prob10Range", v)} options={RANGE_OPTIONS} />
            <FilterSelect
  label="Selo"
  value={filters.seal}
  onChange={(v) => updateFilter("seal", v)}
  options={SEAL_OPTIONS}
/>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-800 p-4">
            <div>
              <h2 className="text-lg font-black text-zinc-50">Ranking Scanner</h2>
              <p className="text-sm text-zinc-500">Exibindo {filteredGames.length} registros ordenados por score</p>
            </div>
            <div className="text-xs font-bold text-zinc-500">Dark Mode • Ligas principais • Score automático</div>
          </div>

          <div className="max-h-[680px] overflow-auto">
            <table className="w-full min-w-[1580px] border-collapse text-center text-sm">
              <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Selo</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Mercado</th>
                  <th className="px-3 py-3 text-left">Data</th>
                  <th className="px-3 py-3">Hora</th>
                  <th className="px-3 py-3">Liga</th>
                  <th className="px-3 py-3 text-left">Casa</th>
                  <th className="px-3 py-3 text-left">Fora</th>
                  <th className="px-3 py-3">Back Casa</th>
                  <th className="px-3 py-3">Empate</th>
                  <th className="px-3 py-3">Back Fora</th>
                  <th className="px-3 py-3">Over HT</th>
                  <th className="px-3 py-3">Over 1.5</th>
                  <th className="px-3 py-3">0x1 75'</th>
                  <th className="px-3 py-3">1x0 75'</th>
                  <th className="px-3 py-3">Lay 0x1</th>
                  <th className="px-3 py-3">Lay 1x0</th>
                  <th className="px-3 py-3">Score 0x1</th>
                  <th className="px-3 py-3">Score 1x0</th>
                  <th className="px-3 py-3">Base</th>
                </tr>
              </thead>

              <tbody>
                {filteredGames.map((game, index) => {
                  const seal = getSeal(game.scannerScore);

                  return (
                    <tr
                      key={`${game.Date}-${game.Time}-${game.Home}-${game.Away}-${index}`}
                      className="border-b border-zinc-800 hover:bg-blue-500/10"
                    >
                      <td className="px-3 py-2 font-black text-zinc-300">#{index + 1}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${seal.className}`}>
                          {seal.label}
                        </span>
                      </td>
                      <td className={`px-3 py-2 font-black ${cellClass("score", game.scannerScore)}`}>{game.scannerScore}/100</td>
                      <td className="px-3 py-2 font-bold text-blue-300">{game.bestMarket}</td>
                      <td className="px-3 py-2 text-left font-semibold">{formatDateBR(game.Date)}</td>
                      <td className="px-3 py-2">{formatTime(game.Time)}</td>
                      <td className="px-3 py-2 font-semibold text-blue-300">{game.League || "—"}</td>
                      <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Home || "—"}</td>
                      <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Away || "—"}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("home")}`}>{formatOdd(game.Odd_H_Back)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("draw")}`}>{formatOdd(game.Odd_D_Back)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("away")}`}>{formatOdd(game.Odd_A_Back)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("percent", game.probOverHt)}`}>{formatPercent(game.probOverHt)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("percent", game.probOver15)}`}>{formatPercent(game.probOver15)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("percent", game.prob01Ate75)}`}>{formatPercent(game.prob01Ate75)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("percent", game.prob10Ate75)}`}>{formatPercent(game.prob10Ate75)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("lay")}`}>{formatOdd(game.Odd_CS_0x1_Lay)}</td>
                      <td className={`px-3 py-2 font-bold ${cellClass("lay")}`}>{formatOdd(game.Odd_CS_1x0_Lay)}</td>
                      <td className={`px-3 py-2 font-black ${cellClass("score", game.scoreLay01)}`}>{game.scoreLay01}/100</td>
                      <td className={`px-3 py-2 font-black ${cellClass("score", game.scoreLay10)}`}>{game.scoreLay10}/100</td>
                      <td className="px-3 py-2 font-bold text-zinc-400">{game.jogosBaseCasa}+{game.jogosBaseFora}/20</td>
                    </tr>
                  );
                })}

                {!filteredGames.length && (
                  <tr>
                    <td colSpan="21" className="px-4 py-10 text-center text-zinc-500">
                      Nenhum jogo encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
    </div>
  );
}


const BACKTEST_METHODS = [
  "Lay Draw",
  "Lay 0x1",
  "Lay 1x0",
  "Over 1.5 FT",
  "Back Casa",
  "Back Fora",
];

const EXIT_MODE_OPTIONS = [
  "Automático",
  "HT",
  "75min",
  "FT",
];

const INITIAL_BACKTEST_FILTERS = {
  method: "Lay Draw",
  league: "Todas",
  exitMode: "Automático",
  minOdd: "1.50",
  maxOdd: "50",
  minHomeOdd: "",
  minDrawOdd: "",
  minAwayOdd: "",
  stake: "10",
};

function getLayDrawOdd(game) {
  return firstValue(game, ["Odd_D_Lay", "Odd Draw Lay", "odd_draw_lay", "oddDrawLay", "Odd_D_Back", "Odd Empate", "odd_empate"], null);
}

function getOver15Odd(game) {
  return firstValue(game, ["Odd_Over15", "Odd_Over_15", "Over15", "Over 1.5", "odd_over15", "oddOver15"], null);
}

function getBackOddByMethod(game, method) {
  if (method === "Lay Draw") return getLayDrawOdd(game);
  if (method === "Lay 0x1") return game.Odd_CS_0x1_Lay;
  if (method === "Lay 1x0") return game.Odd_CS_1x0_Lay;
  if (method === "Over 1.5 FT") return getOver15Odd(game);
  if (method === "Back Casa") return game.Odd_H_Back;
  if (method === "Back Fora") return game.Odd_A_Back;
  return null;
}

function resolveExitMode(method, selectedExitMode) {
  if (selectedExitMode && selectedExitMode !== "Automático") return selectedExitMode;
  if (method === "Lay Draw") return "HT";
  if (method === "Lay 0x1" || method === "Lay 1x0") return "75min";
  return "FT";
}

function simulateBacktestGame(game, method, stake, selectedExitMode = "Automático") {
  const odd = toNumber(getBackOddByMethod(game, method));

  const hFT = toNumber(game.Goals_H_FT);
  const aFT = toNumber(game.Goals_A_FT);

  const hHT = toNumber(game.Goals_H_HT);
  const aHT = toNumber(game.Goals_A_HT);

  if (odd === null || hFT === null || aFT === null || odd <= 1) return null;

  const exitMode = resolveExitMode(method, selectedExitMode);
  const score75 = scoreUntilMinute(game, 75);

  let green = false;
  let profit = 0;
  let exitScore = `${hFT}x${aFT}`;
  let exitNote = "FT";

  // LAY DRAW: saída correta no intervalo.
  if (method === "Lay Draw") {
    if (hHT === null || aHT === null) return null;

    exitScore = `${hHT}x${aHT}`;
    exitNote = "HT";

    if (hHT !== aHT) {
      green = true;
      profit = stake * 0.12;
    } else if (hHT === 0 && aHT === 0) {
      green = false;
      profit = -(stake * 0.10);
    } else {
      green = false;
      profit = -(stake * 0.20);
    }
  }

  // LAY 0x1: por padrão fecha aos 75min.
  if (method === "Lay 0x1") {
    if (exitMode === "75min") {
      exitScore = score75.label;
      exitNote = "75min";

      if (score75.h === 0 && score75.a === 1) {
        green = false;
        profit = -(stake * 0.50);
      } else if (score75.h === 0 && score75.a === 0) {
        green = false;
        profit = -(stake * 0.16);
      } else {
        green = true;
        profit = stake / odd;
      }
    } else {
      green = !(hFT === 0 && aFT === 1);
      profit = green ? stake / odd : -stake;
      exitScore = `${hFT}x${aFT}`;
      exitNote = "FT";
    }
  }

  // LAY 1x0: por padrão fecha aos 75min.
  if (method === "Lay 1x0") {
    if (exitMode === "75min") {
      exitScore = score75.label;
      exitNote = "75min";

      if (score75.h === 1 && score75.a === 0) {
        green = false;
        profit = -(stake * 0.50);
      } else if (score75.h === 0 && score75.a === 0) {
        green = false;
        profit = -(stake * 0.16);
      } else {
        green = true;
        profit = stake / odd;
      }
    } else {
      green = !(hFT === 1 && aFT === 0);
      profit = green ? stake / odd : -stake;
      exitScore = `${hFT}x${aFT}`;
      exitNote = "FT";
    }
  }

  // BACK / OVER.
  if (method === "Over 1.5 FT") {
    green = hFT + aFT >= 2;
    profit = green ? stake * odd : -stake;
    exitScore = `${hFT}x${aFT}`;
    exitNote = "FT";
  }

  if (method === "Back Casa") {
    green = hFT > aFT;
    profit = green ? stake * odd : -stake;
    exitScore = `${hFT}x${aFT}`;
    exitNote = "FT";
  }

  if (method === "Back Fora") {
    green = aFT > hFT;
    profit = green ? stake * odd : -stake;
    exitScore = `${hFT}x${aFT}`;
    exitNote = "FT";
  }

  return {
    ...game,
    method,
    odd,
    stake,
    green,
    profit,
    result: green ? "GREEN" : "RED",
    scoreFT: `${hFT}x${aFT}`,
    scoreHT: hHT !== null && aHT !== null ? `${hHT}x${aHT}` : "—",
    score75: score75.label,
    exitMode,
    exitScore,
    exitNote,
    homeOdd: toNumber(game.Odd_H_Back),
    drawOdd: toNumber(game.Odd_D_Back),
    awayOdd: toNumber(game.Odd_A_Back),
  };
}
function BacktestPage() {
  const [filters, setFilters] = useState(INITIAL_BACKTEST_FILTERS);
  const [history, setHistory] = useState([]);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function updateBacktestFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchBacktestHistory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/historico?limit=12000`);
      if (!response.ok) throw new Error(`Erro histórico ${response.status}: ${await response.text()}`);
      const payload = await response.json();

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const normalized = extractGames(payload)
        .map(normalizeGame)
        .filter((game) => {
          const gameDate = new Date(game.Date);
          return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
        })
        .sort((a, b) => new Date(b.Date) - new Date(a.Date));

      setHistory(normalized);
      setAppliedFilters({ ...filters });
    } catch (err) {
      setError(err.message || "Erro ao carregar histórico do backtest.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  const leagues = useMemo(() => {
    return ["Todas", ...new Set(history.map((game) => game.League).filter(Boolean))].sort((a, b) => {
      if (a === "Todas") return -1;
      if (b === "Todas") return 1;
      return a.localeCompare(b);
    });
  }, [history]);

  const results = useMemo(() => {
    if (!appliedFilters) return [];

    const active = appliedFilters;
    const stake = toNumber(active.stake) || 10;
    const minOdd = toNumber(active.minOdd) || 1;
    const maxOdd = toNumber(active.maxOdd) || 1000;
    const minHomeOdd = toNumber(active.minHomeOdd);
    const minDrawOdd = toNumber(active.minDrawOdd);
    const minAwayOdd = toNumber(active.minAwayOdd);

    return history
      .filter((game) => active.league === "Todas" || game.League === active.league)
      .filter((game) => {
        const homeOdd = toNumber(game.Odd_H_Back);
        const drawOdd = toNumber(game.Odd_D_Back);
        const awayOdd = toNumber(game.Odd_A_Back);

        if (minHomeOdd !== null && (homeOdd === null || homeOdd < minHomeOdd)) return false;
        if (minDrawOdd !== null && (drawOdd === null || drawOdd < minDrawOdd)) return false;
        if (minAwayOdd !== null && (awayOdd === null || awayOdd < minAwayOdd)) return false;

        return true;
      })
      .map((game) => simulateBacktestGame(game, active.method, stake, active.exitMode))
      .filter(Boolean)
      .filter((game) => game.odd >= minOdd && game.odd <= maxOdd)
      .sort((a, b) => new Date(b.Date) - new Date(a.Date));
  }, [history, appliedFilters]);

  const equityCurve = useMemo(() => buildEquityCurve(results), [results]);

  const summary = useMemo(() => {
    const total = results.length;
    const greens = results.filter((item) => item.green).length;
    const reds = total - greens;
    const profit = results.reduce((acc, item) => acc + item.profit, 0);
    const invested = results.reduce((acc, item) => acc + item.stake, 0);
    const winrate = total ? (greens / total) * 100 : 0;
    const roi = invested ? (profit / invested) * 100 : 0;

    let peak = 0;
    let balance = 0;
    let maxDrawdown = 0;
    [...results].reverse().forEach((item) => {
      balance += item.profit;
      peak = Math.max(peak, balance);
      maxDrawdown = Math.min(maxDrawdown, balance - peak);
    });

    return { total, greens, reds, profit, invested, winrate, roi, maxDrawdown };
  }, [results]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Backtest</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Teste dos últimos 2 anos por método, odds, liga e stake. Inclui Lay Draw.
            </p>
          </div>

          <button
            onClick={fetchBacktestHistory}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Calculando" : "Aplicar filtros"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-9 rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <FilterSelect label="Método" value={filters.method} onChange={(v) => updateBacktestFilter("method", v)} options={BACKTEST_METHODS} />
        <FilterSelect label="Saída" value={filters.exitMode} onChange={(v) => updateBacktestFilter("exitMode", v)} options={EXIT_MODE_OPTIONS} />
        <FilterSelect label="Liga" value={filters.league} onChange={(v) => updateBacktestFilter("league", v)} options={leagues} />
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Odd método mín.
          <input value={filters.minOdd} onChange={(e) => updateBacktestFilter("minOdd", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Odd método máx.
          <input value={filters.maxOdd} onChange={(e) => updateBacktestFilter("maxOdd", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Odd casa mín.
          <input value={filters.minHomeOdd} onChange={(e) => updateBacktestFilter("minHomeOdd", e.target.value)} placeholder="Opcional" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Odd empate mín.
          <input value={filters.minDrawOdd} onChange={(e) => updateBacktestFilter("minDrawOdd", e.target.value)} placeholder="Opcional" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Odd fora mín.
          <input value={filters.minAwayOdd} onChange={(e) => updateBacktestFilter("minAwayOdd", e.target.value)} placeholder="Opcional" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
          Respons./Stake
          <input value={filters.stake} onChange={(e) => updateBacktestFilter("stake", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </label>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard title="Entradas" value={summary.total} icon={Database} />
        <StatCard title="Greens" value={summary.greens} icon={ShieldCheck} />
        <StatCard title="Reds" value={summary.reds} icon={Target} />
        <StatCard title="Winrate" value={`${summary.winrate.toFixed(1)}%`} icon={Trophy} />
        <StatCard title="Lucro" value={`R$ ${summary.profit.toFixed(2)}`} icon={Wallet} />
        <StatCard title="ROI" value={`${summary.roi.toFixed(1)}%`} icon={Activity} />
        <StatCard title="Drawdown" value={`R$ ${summary.maxDrawdown.toFixed(2)}`} icon={BarChart3} />
      </section>

      <MiniEquityChart data={equityCurve} />

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Resultado do Backtest</h2>
            <p className="text-sm text-zinc-500">{appliedFilters ? `${results.length} entradas encontradas para ${appliedFilters.method}` : "Selecione os filtros e clique em Aplicar filtros"}</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">Fonte Lay: Betfair • Base: últimos 2 anos</div>
        </div>

        <div className="max-h-[650px] overflow-auto">
          <table className="w-full min-w-[1250px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 text-left">Data</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Fora</th>
                <th className="px-3 py-3">HT</th>
                <th className="px-3 py-3">75'</th>
                <th className="px-3 py-3">FT</th>
                <th className="px-3 py-3">Saída</th>
                <th className="px-3 py-3">Método</th>
                <th className="px-3 py-3">Odd método</th>
                <th className="px-3 py-3">Casa</th>
                <th className="px-3 py-3">Empate</th>
                <th className="px-3 py-3">Fora</th>
                <th className="px-3 py-3">Resp./Stake</th>
                <th className="px-3 py-3">Resultado</th>
                <th className="px-3 py-3">Lucro/Prejuízo</th>
              </tr>
            </thead>
            <tbody>
              {results.map((game, index) => (
                <tr key={`${game.Date}-${game.Home}-${game.Away}-${index}`} className="border-b border-zinc-800 hover:bg-emerald-500/10">
                  <td className="px-3 py-2 text-left font-semibold">{formatDateBR(game.Date)}</td>
                  <td className="px-3 py-2 font-semibold text-blue-300">{game.League || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Home || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Away || "—"}</td>
                  <td className="px-3 py-2 font-black text-zinc-300">{game.scoreHT}</td>
                  <td className="px-3 py-2 font-black text-zinc-300">{game.score75}</td>
                  <td className="px-3 py-2 font-black text-zinc-200">{game.scoreFT}</td>
                  <td className="px-3 py-2 font-bold text-yellow-200">{game.exitNote} {game.exitScore}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{game.method}</td>
                  <td className="px-3 py-2 font-bold text-pink-200">{game.odd.toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold text-blue-200">{game.homeOdd !== null ? game.homeOdd.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{game.drawOdd !== null ? game.drawOdd.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 font-bold text-blue-200">{game.awayOdd !== null ? game.awayOdd.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">R$ {game.stake.toFixed(2)}</td>
                  <td className={`px-3 py-2 font-black ${game.green ? "text-emerald-300" : "text-red-300"}`}>{game.result}</td>
                  <td className={`px-3 py-2 font-black ${game.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>R$ {game.profit.toFixed(2)}</td>
                </tr>
              ))}

              {!results.length && (
                <tr>
                  <td colSpan="10" className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma entrada encontrada. Ajuste método, odd ou liga.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}



function HomePage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function fetchDashboard() {
    setLoading(true);
    setError("");

    try {
      const opportunities = await loadTodayOpportunities();
      setGames(opportunities);
      setLoaded(true);
    } catch (err) {
      setError(err.message || "Erro ao carregar dashboard.");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }

  const todayGames = useMemo(() => games.filter((game) => isToday(game.Date)), [games]);
  const eliteGames = useMemo(() => games.filter((game) => (game.scorePro || 0) >= 85), [games]);
  const strongGames = useMemo(() => games.filter((game) => (game.scorePro || 0) >= 75), [games]);
  const topGames = useMemo(() => games.slice(0, 5), [games]);
  const bestLeagues = useMemo(() => groupBestByLeague(games), [games]);
  const bestMarkets = useMemo(() => groupBestByMarket(games), [games]);
  const leader = topGames[0];
  const avgScore = games.length ? games.reduce((acc, game) => acc + (game.scorePro || 0), 0) / games.length : 0;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-blue-500/10 via-[#111111] to-zinc-950 p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-400">JC Trader Professional</p>
            <h1 className="mt-2 text-4xl font-black text-zinc-50">Dashboard Inteligente</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Visão executiva do dia com Score PRO, oportunidades elite, radar de ligas e alertas. Clique para carregar somente jogos de hoje e amanhã.
            </p>
          </div>

          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Analisando" : loaded ? "Atualizar Dashboard" : "Carregar Dashboard"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <StatCard title="Jogos hoje" value={todayGames.length} icon={Database} />
        <StatCard title="Elite" value={eliteGames.length} icon={Flame} />
        <StatCard title="Fortes" value={strongGames.length} icon={Zap} />
        <StatCard title="Score médio" value={games.length ? avgScore.toFixed(0) : "—"} icon={Cpu} />
        <StatCard title="Melhor liga" value={bestLeagues[0]?.league || "—"} icon={Trophy} />
        <StatCard title="Mercado top" value={bestMarkets[0]?.market || "—"} icon={Target} />
      </section>

      {leader && (
        <section className="rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/10 to-zinc-950 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-300">Melhor oportunidade do dia</p>
              <h2 className="mt-1 text-2xl font-black text-white">{leader.Home} x {leader.Away}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {formatDateBR(leader.Date)} às {formatTime(leader.Time)} • {leader.League} • {leader.proMarket}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-sm font-black text-orange-200">
                Score PRO {leader.scorePro}/100
              </span>
              <span className="rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 py-2 text-sm font-black text-pink-200">
                Odd {formatOdd(leader.proOdd)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-50">Melhores Oportunidades do Dia</h2>
              <p className="text-sm text-zinc-500">Top 5 por Score PRO IA</p>
            </div>
            <div className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">IA ELITE</div>
          </div>

          <div className="space-y-3">
            {topGames.map((game, index) => <OpportunityRow key={`${game.Date}-${game.Home}-${game.Away}-${index}`} game={game} index={index} />)}
            {!topGames.length && (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-zinc-800 bg-[#0d0d0d] text-sm font-bold text-zinc-500">
                Clique em Carregar Dashboard para analisar os jogos do dia.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <h2 className="text-xl font-black text-zinc-50">Radar IA</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-sm font-bold text-emerald-300">Ligas mais fortes</p>
              <div className="mt-2 space-y-2">
                {bestLeagues.map((row) => (
                  <div key={row.league} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{row.league}</span>
                    <span className="font-black text-emerald-300">{row.avg.toFixed(0)}</span>
                  </div>
                ))}
                {!bestLeagues.length && <p className="text-sm text-zinc-500">Aguardando análise.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-4">
              <p className="text-sm font-bold text-cyan-300">Mercados em destaque</p>
              <div className="mt-2 space-y-2">
                {bestMarkets.map((row) => (
                  <div key={row.market} className="flex items-center justify-between text-sm">
                    <span className="font-bold text-white">{row.market}</span>
                    <span className="font-black text-cyan-300">{row.avg.toFixed(0)}</span>
                  </div>
                ))}
                {!bestMarkets.length && <p className="text-sm text-zinc-500">Aguardando análise.</p>}
              </div>
            </div>

            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-4">
              <p className="text-sm font-bold text-yellow-300">Critério de alerta</p>
              <h3 className="mt-1 text-lg font-black text-white">Score PRO ≥ 85</h3>
              <p className="mt-1 text-xs font-bold text-zinc-400">Priorize jogos com base histórica suficiente e odd válida.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function LigasPage() {
  const [history, setHistory] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("Lay 0x1");
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchLeagueHistory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/historico?limit=12000`);
      if (!response.ok) throw new Error(`Erro histórico ${response.status}: ${await response.text()}`);
      const payload = await response.json();

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const normalized = extractGames(payload)
        .map(normalizeGame)
        .filter((game) => {
          const gameDate = new Date(game.Date);
          return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
        });

      setHistory(normalized);
      setHasRun(true);
    } catch (err) {
      setError(err.message || "Erro ao carregar ligas.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  const leagueRows = useMemo(() => {
    if (!hasRun) return [];
    const stake = 10;
    const grouped = new Map();

    history.forEach((game) => {
      if (!game.League) return;

      const result = simulateBacktestGame(game, selectedMethod, stake, "Automático");
      if (!result) return;

      if (!grouped.has(game.League)) {
        grouped.set(game.League, {
          league: game.League,
          total: 0,
          greens: 0,
          reds: 0,
          profit: 0,
          invested: 0,
          homeWins: 0,
          draws: 0,
          awayWins: 0,
          over15Hits: 0,
          overHtHits: 0,
        });
      }

      const row = grouped.get(game.League);
      const hFT = toNumber(game.Goals_H_FT);
      const aFT = toNumber(game.Goals_A_FT);
      const hHT = toNumber(game.Goals_H_HT);
      const aHT = toNumber(game.Goals_A_HT);

      row.total += 1;
      row.greens += result.green ? 1 : 0;
      row.reds += result.green ? 0 : 1;
      row.profit += result.profit;
      row.invested += stake;

      if (hFT !== null && aFT !== null) {
        if (hFT > aFT) row.homeWins += 1;
        if (hFT === aFT) row.draws += 1;
        if (aFT > hFT) row.awayWins += 1;
        if (hFT + aFT >= 2) row.over15Hits += 1;
      }

      if (hHT !== null && aHT !== null && hHT + aHT >= 1) {
        row.overHtHits += 1;
      }
    });

    return [...grouped.values()]
      .map((row) => {
        const winrate = row.total ? (row.greens / row.total) * 100 : 0;
        const roi = row.invested ? (row.profit / row.invested) * 100 : 0;
        const homeWinRate = row.total ? (row.homeWins / row.total) * 100 : 0;
        const drawRate = row.total ? (row.draws / row.total) * 100 : 0;
        const awayWinRate = row.total ? (row.awayWins / row.total) * 100 : 0;
        const over15Rate = row.total ? (row.over15Hits / row.total) * 100 : 0;
        const overHtRate = row.total ? (row.overHtHits / row.total) * 100 : 0;

        let grade = "❌ Evitar";
        if (roi >= 8 && winrate >= 70 && row.total >= 50) grade = "🔥 Excelente";
        else if (roi >= 3 && winrate >= 60 && row.total >= 30) grade = "✅ Boa";
        else if (roi >= 0 && row.total >= 20) grade = "⚠️ Média";

        return {
          ...row,
          winrate,
          roi,
          homeWinRate,
          drawRate,
          awayWinRate,
          over15Rate,
          overHtRate,
          grade,
        };
      })
      .sort((a, b) => b.roi - a.roi);
  }, [history, selectedMethod, hasRun]);

  const topLeague = leagueRows[0];
  const totalLeagues = leagueRows.length;
  const positiveLeagues = leagueRows.filter((row) => row.roi > 0).length;
  const totalGames = leagueRows.reduce((acc, row) => acc + row.total, 0);
  const avgRoi = leagueRows.length
    ? leagueRows.reduce((acc, row) => acc + row.roi, 0) / leagueRows.length
    : 0;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Ligas</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Ranking por liga usando os últimos 2 anos, com ROI, winrate, volume e comportamento de gols.
            </p>
          </div>

          <button
            onClick={fetchLeagueHistory}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-purple-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Atualizando" : "Atualizar Ligas"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <StatCard title="Ligas" value={totalLeagues} icon={Trophy} />
        <StatCard title="Jogos Base" value={totalGames} icon={Database} />
        <StatCard title="Ligas Positivas" value={positiveLeagues} icon={ShieldCheck} />
        <StatCard title="ROI Médio" value={`${avgRoi.toFixed(1)}%`} icon={Activity} />
        <StatCard title="Método" value={selectedMethod} icon={BarChart3} />
      </section>

      {topLeague && (
        <section className="rounded-2xl border border-purple-400/30 bg-gradient-to-r from-purple-500/10 to-zinc-950 p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">Melhor liga do método</p>
              <h2 className="text-xl font-black text-zinc-50">{topLeague.league}</h2>
              <p className="text-sm text-zinc-400">
                {topLeague.total} entradas • Winrate {topLeague.winrate.toFixed(1)}% • ROI {topLeague.roi.toFixed(1)}%
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-1 text-sm font-black text-purple-100">
                {topLeague.grade}
              </span>
              <span className={`rounded-full border px-3 py-1 text-sm font-black ${topLeague.profit >= 0 ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" : "border-red-400/40 bg-red-500/15 text-red-100"}`}>
                {formatMoney(topLeague.profit)}
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect label="Método analisado" value={selectedMethod} onChange={setSelectedMethod} options={BACKTEST_METHODS} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Ranking de Ligas</h2>
            <p className="text-sm text-zinc-500">Ordenado por ROI para o método {selectedMethod}</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">Base: últimos 2 anos</div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1450px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3 text-left">Liga</th>
                <th className="px-3 py-3">Classe</th>
                <th className="px-3 py-3">Jogos</th>
                <th className="px-3 py-3">Greens</th>
                <th className="px-3 py-3">Reds</th>
                <th className="px-3 py-3">Winrate</th>
                <th className="px-3 py-3">Lucro</th>
                <th className="px-3 py-3">ROI</th>
                <th className="px-3 py-3">Over HT</th>
                <th className="px-3 py-3">Over 1.5</th>
                <th className="px-3 py-3">Casa vence</th>
                <th className="px-3 py-3">Empate</th>
                <th className="px-3 py-3">Fora vence</th>
              </tr>
            </thead>

            <tbody>
              {leagueRows.map((row, index) => (
                <tr key={row.league} className="border-b border-zinc-800 hover:bg-purple-500/10">
                  <td className="px-3 py-2 font-black text-zinc-300">#{index + 1}</td>
                  <td className="px-3 py-2 text-left font-bold text-blue-300">{row.league}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${
                      row.grade.includes("Excelente") ? "border-orange-400/40 bg-orange-500/15 text-orange-100" :
                      row.grade.includes("Boa") ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" :
                      row.grade.includes("Média") ? "border-yellow-400/40 bg-yellow-500/15 text-yellow-100" :
                      "border-red-400/40 bg-red-500/15 text-red-100"
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{row.total}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{row.greens}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{row.reds}</td>
                  <td className="px-3 py-2 font-black text-zinc-100">{row.winrate.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-black ${row.profit >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatMoney(row.profit)}</td>
                  <td className={`px-3 py-2 font-black ${row.roi >= 0 ? "text-emerald-300" : "text-red-300"}`}>{row.roi.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.overHtRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.over15Rate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-blue-200">{row.homeWinRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{row.drawRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-blue-200">{row.awayWinRate.toFixed(1)}%</td>
                </tr>
              ))}

              {!leagueRows.length && (
                <tr>
                  <td colSpan="14" className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma liga encontrada. Atualize a base ou aguarde o carregamento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}



function TimesPage() {
  const [history, setHistory] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("Todos");
  const [selectedLeague, setSelectedLeague] = useState("Todas");
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchTeamsHistory() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/historico?limit=12000`);
      if (!response.ok) throw new Error(`Erro histórico ${response.status}: ${await response.text()}`);
      const payload = await response.json();

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const normalized = extractGames(payload)
        .map(normalizeGame)
        .filter((game) => {
          const gameDate = new Date(game.Date);
          return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
        });

      setHistory(normalized);
      setHasRun(true);
    } catch (err) {
      setError(err.message || "Erro ao carregar times.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  const leagues = useMemo(() => {
    return ["Todas", ...new Set(history.map((game) => game.League).filter(Boolean))].sort((a, b) => {
      if (a === "Todas") return -1;
      if (b === "Todas") return 1;
      return a.localeCompare(b);
    });
  }, [history]);

  const teamOptions = useMemo(() => {
    const filtered = history.filter((game) => selectedLeague === "Todas" || game.League === selectedLeague);
    const teams = new Set();
    filtered.forEach((game) => {
      if (game.Home) teams.add(game.Home);
      if (game.Away) teams.add(game.Away);
    });
    return ["Todos", ...[...teams].sort((a, b) => a.localeCompare(b))];
  }, [history, selectedLeague, hasRun]);

  const teamRows = useMemo(() => {
    const grouped = new Map();

    history
      .filter((game) => selectedLeague === "Todas" || game.League === selectedLeague)
      .forEach((game) => {
        const hFT = toNumber(game.Goals_H_FT);
        const aFT = toNumber(game.Goals_A_FT);
        const hHT = toNumber(game.Goals_H_HT);
        const aHT = toNumber(game.Goals_A_HT);

        if (hFT === null || aFT === null) return;

        const updateTeam = (team, side) => {
          if (!team) return;

          if (!grouped.has(team)) {
            grouped.set(team, {
              team,
              games: 0,
              homeGames: 0,
              awayGames: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              goalsFor: 0,
              goalsAgainst: 0,
              overHt: 0,
              over15: 0,
              over25: 0,
              cleanSheets: 0,
              failedToScore: 0,
            });
          }

          const row = grouped.get(team);
          const isHome = side === "home";
          const gf = isHome ? hFT : aFT;
          const ga = isHome ? aFT : hFT;

          row.games += 1;
          row.homeGames += isHome ? 1 : 0;
          row.awayGames += isHome ? 0 : 1;
          row.goalsFor += gf;
          row.goalsAgainst += ga;

          if (gf > ga) row.wins += 1;
          else if (gf === ga) row.draws += 1;
          else row.losses += 1;

          if (hHT !== null && aHT !== null && hHT + aHT >= 1) row.overHt += 1;
          if (hFT + aFT >= 2) row.over15 += 1;
          if (hFT + aFT >= 3) row.over25 += 1;
          if (ga === 0) row.cleanSheets += 1;
          if (gf === 0) row.failedToScore += 1;
        };

        updateTeam(game.Home, "home");
        updateTeam(game.Away, "away");
      });

    return [...grouped.values()]
      .map((row) => {
        const points = row.wins * 3 + row.draws;
        const ppg = row.games ? points / row.games : 0;
        const winrate = row.games ? (row.wins / row.games) * 100 : 0;
        const overHtRate = row.games ? (row.overHt / row.games) * 100 : 0;
        const over15Rate = row.games ? (row.over15 / row.games) * 100 : 0;
        const over25Rate = row.games ? (row.over25 / row.games) * 100 : 0;
        const avgGF = row.games ? row.goalsFor / row.games : 0;
        const avgGA = row.games ? row.goalsAgainst / row.games : 0;
        const strength = Math.round(clamp((ppg / 3) * 55 + winrate * 0.25 + over15Rate * 0.20));

        let grade = "❌ Fraco";
        if (strength >= 80) grade = "🔥 Muito forte";
        else if (strength >= 65) grade = "✅ Forte";
        else if (strength >= 50) grade = "⚠️ Médio";

        return {
          ...row,
          points,
          ppg,
          winrate,
          overHtRate,
          over15Rate,
          over25Rate,
          avgGF,
          avgGA,
          strength,
          grade,
        };
      })
      .filter((row) => selectedTeam === "Todos" || row.team === selectedTeam)
      .sort((a, b) => b.strength - a.strength);
  }, [history, selectedLeague, selectedTeam]);

  const topTeam = teamRows[0];
  const totalTeams = teamRows.length;
  const totalGames = history.length;
  const avgOver15 = teamRows.length ? teamRows.reduce((acc, row) => acc + row.over15Rate, 0) / teamRows.length : 0;
  const strongTeams = teamRows.filter((row) => row.strength >= 65).length;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Times</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Ranking por equipe com força, casa/fora, gols, over HT/FT e desempenho recente dos últimos 2 anos.
            </p>
          </div>

          <button
            onClick={fetchTeamsHistory}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Atualizando" : "Atualizar Times"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Times" value={totalTeams} icon={Users} />
        <StatCard title="Jogos Base" value={totalGames} icon={Database} />
        <StatCard title="Times Fortes" value={strongTeams} icon={ShieldCheck} />
        <StatCard title="Média Over 1.5" value={`${avgOver15.toFixed(1)}%`} icon={Activity} />
      </section>

      {topTeam && (
        <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 to-zinc-950 p-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">Time mais forte no filtro</p>
              <h2 className="text-xl font-black text-zinc-50">{topTeam.team}</h2>
              <p className="text-sm text-zinc-400">
                {topTeam.games} jogos • PPG {topTeam.ppg.toFixed(2)} • Over 1.5 {topTeam.over15Rate.toFixed(1)}% • Gols pró {topTeam.avgGF.toFixed(2)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-sm font-black text-cyan-100">
                {topTeam.grade}
              </span>
              <span className="rounded-full border border-blue-400/40 bg-blue-500/15 px-3 py-1 text-sm font-black text-blue-100">
                Força {topTeam.strength}/100
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <FilterSelect label="Liga" value={selectedLeague} onChange={(value) => {
            setSelectedLeague(value);
            setSelectedTeam("Todos");
          }} options={leagues} />
          <FilterSelect label="Time" value={selectedTeam} onChange={setSelectedTeam} options={teamOptions} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Ranking de Times</h2>
            <p className="text-sm text-zinc-500">Força calculada por pontos, vitórias e comportamento de gols</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">Base: últimos 2 anos</div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1450px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Rank</th>
                <th className="px-3 py-3 text-left">Time</th>
                <th className="px-3 py-3">Classe</th>
                <th className="px-3 py-3">Força</th>
                <th className="px-3 py-3">Jogos</th>
                <th className="px-3 py-3">Casa</th>
                <th className="px-3 py-3">Fora</th>
                <th className="px-3 py-3">Vitórias</th>
                <th className="px-3 py-3">Empates</th>
                <th className="px-3 py-3">Derrotas</th>
                <th className="px-3 py-3">Winrate</th>
                <th className="px-3 py-3">PPG</th>
                <th className="px-3 py-3">Gols Pró</th>
                <th className="px-3 py-3">Gols Contra</th>
                <th className="px-3 py-3">Over HT</th>
                <th className="px-3 py-3">Over 1.5</th>
                <th className="px-3 py-3">Over 2.5</th>
              </tr>
            </thead>

            <tbody>
              {teamRows.map((row, index) => (
                <tr key={row.team} className="border-b border-zinc-800 hover:bg-cyan-500/10">
                  <td className="px-3 py-2 font-black text-zinc-300">#{index + 1}</td>
                  <td className="px-3 py-2 text-left font-bold text-blue-300">{row.team}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${
                      row.grade.includes("Muito") ? "border-orange-400/40 bg-orange-500/15 text-orange-100" :
                      row.grade.includes("Forte") ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" :
                      row.grade.includes("Médio") ? "border-yellow-400/40 bg-yellow-500/15 text-yellow-100" :
                      "border-red-400/40 bg-red-500/15 text-red-100"
                    }`}>
                      {row.grade}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-black ${cellClass("score", row.strength)}`}>{row.strength}/100</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{row.games}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.homeGames}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.awayGames}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{row.wins}</td>
                  <td className="px-3 py-2 font-bold text-yellow-200">{row.draws}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{row.losses}</td>
                  <td className="px-3 py-2 font-black text-zinc-100">{row.winrate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-black text-blue-200">{row.ppg.toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold text-emerald-200">{row.avgGF.toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold text-red-200">{row.avgGA.toFixed(2)}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.overHtRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.over15Rate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{row.over25Rate.toFixed(1)}%</td>
                </tr>
              ))}

              {!teamRows.length && (
                <tr>
                  <td colSpan="17" className="px-4 py-10 text-center text-zinc-500">
                    Nenhum time encontrado. Ajuste os filtros ou atualize a base.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}



const SCORE_OPTIONS = [
  "0x0",
  "0x1",
  "1x0",
  "1x1",
  "0x2",
  "2x0",
  "1x2",
  "2x1",
  "2x2",
  "0x3",
  "3x0",
];

function countScoreForTeam(history, team, targetH, targetA, mode) {
  return history.filter((game) => {
    const h = toNumber(game.Goals_H_FT);
    const a = toNumber(game.Goals_A_FT);
    if (h === null || a === null) return false;

    if (mode === "home") {
      return game.Home === team && h === targetH && a === targetA;
    }

    if (mode === "away") {
      return game.Away === team && h === targetH && a === targetA;
    }

    return (game.Home === team || game.Away === team) && h === targetH && a === targetA;
  }).length;
}


function calcMostProbableScore(game, history) {
  const homeRecent = getRecentConditionGames(history, game, game.Home, "home", 12);
  const awayRecent = getRecentConditionGames(history, game, game.Away, "away", 12);
  const scoreMap = new Map();

  [...homeRecent, ...awayRecent].forEach((item) => {
    const h = toNumber(item.Goals_H_FT);
    const a = toNumber(item.Goals_A_FT);
    if (h === null || a === null) return;
    const key = `${h}x${a}`;
    scoreMap.set(key, (scoreMap.get(key) || 0) + 1);
  });

  const entries = [...scoreMap.entries()].sort((a, b) => b[1] - a[1]);
  const base = homeRecent.length + awayRecent.length;
  const [score = "—", hits = 0] = entries[0] || [];
  return {
    probableScore: score,
    probableHits: hits,
    probableBase: base,
    probablePercent: base ? (hits / base) * 100 : 0,
  };
}

function PlacarPage() {
  const [games, setGames] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedScore, setSelectedScore] = useState("0x1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchScoreData() {
    setLoading(true);
    setError("");

    try {
      const windowResponse = await fetch(`${API_BASE_URL}/jogos-janela/betfair`);
      if (!windowResponse.ok) throw new Error(`Erro jogos ${windowResponse.status}: ${await windowResponse.text()}`);
      const windowPayload = await windowResponse.json();
      const windowGames = extractGames(windowPayload).map(normalizeGame);

      const historicalResponse = await fetch(`${API_BASE_URL}/historico?limit=12000`);
      if (!historicalResponse.ok) throw new Error(`Erro histórico ${historicalResponse.status}: ${await historicalResponse.text()}`);
      const historicalPayload = await historicalResponse.json();

      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const normalizedHistory = extractGames(historicalPayload)
        .map(normalizeGame)
        .filter((game) => {
          const gameDate = new Date(game.Date);
          return !Number.isNaN(gameDate.getTime()) && gameDate >= twoYearsAgo;
        });

      const uniqueWindow = new Map();
      windowGames.forEach((game) => {
        const key = `${game.ID_Evento || game.id || ""}-${game.Date}-${game.Time}-${game.Home}-${game.Away}`;
        uniqueWindow.set(key, game);
      });

      const orderedWindow = [...uniqueWindow.values()]
        .filter((game) => isToday(game.Date))
        .sort((a, b) => {
          const da = new Date(`${a.Date}T${formatTime(a.Time) === "—" ? "00:00" : formatTime(a.Time)}`);
          const db = new Date(`${b.Date}T${formatTime(b.Time) === "—" ? "00:00" : formatTime(b.Time)}`);
          return da - db;
        });

      setGames(orderedWindow);
      setHistory(normalizedHistory);
      setSelectedDate(toISODateLocal(new Date()));
    } catch (err) {
      setError(err.message || "Erro ao carregar análise de placares.");
      setGames([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchScoreData();
  }, []);

  const dates = useMemo(() => {
    return [...new Set(games.map((game) => game.Date).filter(Boolean))].sort();
  }, [games]);

  const selectedGames = useMemo(() => {
    return games.filter((game) => !selectedDate || game.Date === selectedDate);
  }, [games, selectedDate]);

  const scoreParts = selectedScore.split("x").map(Number);
  const targetH = scoreParts[0] || 0;
  const targetA = scoreParts[1] || 0;

  const scoreRows = useMemo(() => {
    return selectedGames.map((game) => {
      const homeCount = countScoreForTeam(history, game.Home, targetH, targetA, "home");
      const awayCount = countScoreForTeam(history, game.Away, targetH, targetA, "away");
      const h2hCount = history.filter((item) => {
        const h = toNumber(item.Goals_H_FT);
        const a = toNumber(item.Goals_A_FT);
        if (h === null || a === null) return false;

        const sameMatch =
          (item.Home === game.Home && item.Away === game.Away) ||
          (item.Home === game.Away && item.Away === game.Home);

        return sameMatch && h === targetH && a === targetA;
      }).length;

      const totalRare = homeCount + awayCount + h2hCount;

      let confidence = "❌ Baixo";
      let confidenceScore = 0;

      if (totalRare === 0) {
        confidence = "🔥 Muito alto";
        confidenceScore = 100;
      } else if (totalRare <= 2) {
        confidence = "✅ Alto";
        confidenceScore = 82;
      } else if (totalRare <= 5) {
        confidence = "⚠️ Médio";
        confidenceScore = 62;
      } else {
        confidence = "❌ Baixo";
        confidenceScore = 38;
      }

      const probable = calcMostProbableScore(game, history);

      return {
        ...game,
        ...probable,
        homeCount,
        awayCount,
        h2hCount,
        totalRare,
        confidence,
        confidenceScore,
      };
    }).sort((a, b) => b.confidenceScore - a.confidenceScore || a.totalRare - b.totalRare);
  }, [selectedGames, history, targetH, targetA]);

  const singularities = scoreRows.filter((row) => row.totalRare === 0);
  const highConfidence = scoreRows.filter((row) => row.confidenceScore >= 82);
  const totalGames = selectedGames.length;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Placar</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Análise dos jogos do dia por placar: singularidades, raridade em casa/fora e confiança estatística.
            </p>
          </div>

          <button
            onClick={fetchScoreData}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-yellow-500 px-5 text-sm font-black text-black shadow-sm hover:bg-yellow-400 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Atualizando" : "Atualizar Placar"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect label="Data dos jogos" value={selectedDate} onChange={setSelectedDate} options={dates.length ? dates : [toISODateLocal(new Date())]} />
          <FilterSelect label="Placar" value={selectedScore} onChange={setSelectedScore} options={SCORE_OPTIONS} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Jogos do dia" value={totalGames} icon={Database} />
        <StatCard title="Placar" value={selectedScore} icon={Target} />
        <StatCard title="Singularidades" value={singularities.length} icon={Flame} />
        <StatCard title="Confiança Alta" value={highConfidence.length} icon={ShieldCheck} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-yellow-400/30 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-yellow-300">Placar mais provável dos jogos do dia</h2>
            <p className="text-sm text-zinc-400">Calculado pelos placares mais recorrentes dos recortes recentes casa/fora na mesma liga.</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">Base recente • Home/Away</div>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1150px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Hora</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Fora</th>
                <th className="px-3 py-3">Placar provável</th>
                <th className="px-3 py-3">Força</th>
                <th className="px-3 py-3">Base</th>
                <th className="px-3 py-3">Odd H</th>
                <th className="px-3 py-3">Odd D</th>
                <th className="px-3 py-3">Odd A</th>
              </tr>
            </thead>
            <tbody>
              {[...scoreRows].sort((a, b) => b.probablePercent - a.probablePercent).map((game, index) => (
                <tr key={`prob-${game.Date}-${game.Home}-${game.Away}-${index}`} className="border-b border-zinc-800 hover:bg-yellow-500/10">
                  <td className="px-3 py-2 font-semibold">{formatTime(game.Time)}</td>
                  <td className="px-3 py-2 font-semibold text-blue-300">{game.League || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Home || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Away || "—"}</td>
                  <td className="px-3 py-2 text-xl font-black text-yellow-200">{game.probableScore}</td>
                  <td className="px-3 py-2 font-black text-emerald-300">{game.probablePercent.toFixed(0)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.probableHits}/{game.probableBase}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{formatOdd(game.Odd_H_Back)}</td>
                  <td className="px-3 py-2 font-bold text-yellow-300">{formatOdd(game.Odd_D_Back)}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{formatOdd(game.Odd_A_Back)}</td>
                </tr>
              ))}

              {!scoreRows.length && (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-zinc-500">Nenhum jogo encontrado para hoje.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-purple-400/30 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-purple-300">Singularidades</h2>
            <p className="text-sm text-zinc-400">Placares que não apareceram nos recortes Home, Away e H2H dos últimos 2 anos</p>
          </div>
          <div className="text-2xl font-black text-purple-300">{singularities.length}</div>
        </div>

        <div className="max-h-[360px] overflow-auto">
          <table className="w-full min-w-[1100px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Hora</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Fora</th>
                <th className="px-3 py-3">Odd H</th>
                <th className="px-3 py-3">Odd D</th>
                <th className="px-3 py-3">Odd A</th>
                <th className="px-3 py-3">Home 2y</th>
                <th className="px-3 py-3">Away 2y</th>
                <th className="px-3 py-3">H2H 2y</th>
              </tr>
            </thead>

            <tbody>
              {singularities.map((game, index) => (
                <tr key={`${game.Date}-${game.Home}-${game.Away}-${index}`} className="border-b border-zinc-800 hover:bg-purple-500/10">
                  <td className="px-3 py-2 font-semibold">{formatTime(game.Time)}</td>
                  <td className="px-3 py-2 font-semibold text-blue-300">{game.League || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Home || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Away || "—"}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{formatOdd(game.Odd_H_Back)}</td>
                  <td className="px-3 py-2 font-bold text-yellow-300">{formatOdd(game.Odd_D_Back)}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{formatOdd(game.Odd_A_Back)}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.homeCount}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.awayCount}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.h2hCount}</td>
                </tr>
              ))}

              {!singularities.length && (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma singularidade encontrada para o placar selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-emerald-300">Nível de Confiança</h2>
            <p className="text-sm text-zinc-400">Quanto menor a recorrência do placar, maior o nível de confiança estatística</p>
          </div>
          <div className="text-2xl font-black text-emerald-300">{highConfidence.length}</div>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1250px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Hora</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Fora</th>
                <th className="px-3 py-3">Odd H</th>
                <th className="px-3 py-3">Odd D</th>
                <th className="px-3 py-3">Odd A</th>
                <th className="px-3 py-3">Home</th>
                <th className="px-3 py-3">Away</th>
                <th className="px-3 py-3">H2H</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Confiança</th>
              </tr>
            </thead>

            <tbody>
              {scoreRows.map((game, index) => (
                <tr key={`${game.Date}-${game.Home}-${game.Away}-${index}`} className="border-b border-zinc-800 hover:bg-emerald-500/10">
                  <td className="px-3 py-2 font-semibold">{formatTime(game.Time)}</td>
                  <td className="px-3 py-2 font-semibold text-blue-300">{game.League || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Home || "—"}</td>
                  <td className="px-3 py-2 text-left font-bold text-zinc-50">{game.Away || "—"}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{formatOdd(game.Odd_H_Back)}</td>
                  <td className="px-3 py-2 font-bold text-yellow-300">{formatOdd(game.Odd_D_Back)}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{formatOdd(game.Odd_A_Back)}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.homeCount}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.awayCount}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{game.h2hCount}</td>
                  <td className="px-3 py-2 font-black text-zinc-100">{game.totalRare}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${
                      game.confidenceScore >= 95 ? "border-orange-400/40 bg-orange-500/15 text-orange-100" :
                      game.confidenceScore >= 80 ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" :
                      game.confidenceScore >= 60 ? "border-yellow-400/40 bg-yellow-500/15 text-yellow-100" :
                      "border-red-400/40 bg-red-500/15 text-red-100"
                    }`}>
                      {game.confidence}
                    </span>
                  </td>
                </tr>
              ))}

              {!scoreRows.length && (
                <tr>
                  <td colSpan="12" className="px-4 py-8 text-center text-zinc-500">
                    Nenhum jogo encontrado para a data selecionada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}



function ConfigPage() {
  const [apiUrl, setApiUrl] = useState(localStorage.getItem("jc_api_url") || API_BASE_URL);
  const [historyYears, setHistoryYears] = useState(localStorage.getItem("jc_history_years") || "2");
  const [historyLimit, setHistoryLimit] = useState(localStorage.getItem("jc_history_limit") || "12000");
  const [mainLeagueBonus, setMainLeagueBonus] = useState(localStorage.getItem("jc_main_league_bonus") || "8");
  const [scannerMinGames, setScannerMinGames] = useState(localStorage.getItem("jc_scanner_min_games") || "10");
  const [lay75Red, setLay75Red] = useState(localStorage.getItem("jc_lay75_red") || "50");
  const [lay00Red, setLay00Red] = useState(localStorage.getItem("jc_lay00_red") || "16");
  const [layDrawGreen, setLayDrawGreen] = useState(localStorage.getItem("jc_laydraw_green") || "12");
  const [status, setStatus] = useState("Não testado");
  const [statusColor, setStatusColor] = useState("text-zinc-400");

  async function testApi() {
    try {
      setStatus("Testando...");
      setStatusColor("text-yellow-300");

      const response = await fetch(`${apiUrl}/ping`);

      if (!response.ok) {
        throw new Error("offline");
      }

      setStatus("API Online");
      setStatusColor("text-emerald-300");
    } catch {
      setStatus("API Offline");
      setStatusColor("text-red-300");
    }
  }

  function saveConfig() {
    localStorage.setItem("jc_api_url", apiUrl);
    localStorage.setItem("jc_history_years", historyYears);
    localStorage.setItem("jc_history_limit", historyLimit);
    localStorage.setItem("jc_main_league_bonus", mainLeagueBonus);
    localStorage.setItem("jc_scanner_min_games", scannerMinGames);
    localStorage.setItem("jc_lay75_red", lay75Red);
    localStorage.setItem("jc_lay00_red", lay00Red);
    localStorage.setItem("jc_lay_green", layDrawGreen);

    alert("Configurações salvas com sucesso.");
  }

  function clearCache() {
    localStorage.clear();
    alert("Cache/localStorage limpo.");
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Config</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Central de controle do Scanner, Backtest e API.
            </p>
          </div>

          <div className={`text-sm font-black ${statusColor}`}>
            {status}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <h2 className="mb-4 text-lg font-black text-zinc-50">API</h2>

          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              URL Backend
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
              />
            </label>

            <div className="flex gap-2">
              <button
                onClick={testApi}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700"
              >
                Testar API
              </button>

              <button
                onClick={saveConfig}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <h2 className="mb-4 text-lg font-black text-zinc-50">Histórico</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Anos base
              <select
                value={historyYears}
                onChange={(e) => setHistoryYears(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              >
                <option value="1">1 ano</option>
                <option value="2">2 anos</option>
                <option value="3">3 anos</option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Limite histórico
              <select
                value={historyLimit}
                onChange={(e) => setHistoryLimit(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              >
                <option value="8000">8.000</option>
                <option value="12000">12.000</option>
                <option value="20000">20.000</option>
                <option value="999999">Completo</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <h2 className="mb-4 text-lg font-black text-zinc-50">Scanner</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Bônus liga principal
              <input
                value={mainLeagueBonus}
                onChange={(e) => setMainLeagueBonus(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Base mínima jogos
              <input
                value={scannerMinGames}
                onChange={(e) => setScannerMinGames(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
          <h2 className="mb-4 text-lg font-black text-zinc-50">Backtest</h2>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Red 75min (%)
              <input
                value={lay75Red}
                onChange={(e) => setLay75Red(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Red 0x0 (%)
              <input
                value={lay00Red}
                onChange={(e) => setLay00Red(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
              Green LayDraw (%)
              <input
                value={layDrawGreen}
                onChange={(e) => setLayDrawGreen(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5">
        <h2 className="mb-4 text-lg font-black text-zinc-50">Sistema</h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={clearCache}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
          >
            Limpar Cache
          </button>

          <button
            onClick={() => alert("Backup em desenvolvimento")}
            className="rounded-xl bg-zinc-800 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-700"
          >
            Backup
          </button>

          <button
            onClick={() => alert("Restore em desenvolvimento")}
            className="rounded-xl bg-zinc-800 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-700"
          >
            Restore
          </button>
        </div>
      </section>
    </div>
  );
}



const MESES_ENTRADAS = [
  { v: "Todos", l: "Todos" },
  { v: "1", l: "Janeiro" },
  { v: "2", l: "Fevereiro" },
  { v: "3", l: "Março" },
  { v: "4", l: "Abril" },
  { v: "5", l: "Maio" },
  { v: "6", l: "Junho" },
  { v: "7", l: "Julho" },
  { v: "8", l: "Agosto" },
  { v: "9", l: "Setembro" },
  { v: "10", l: "Outubro" },
  { v: "11", l: "Novembro" },
  { v: "12", l: "Dezembro" },
];

function parseDataLocalEntrada(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(+br[3], +br[2] - 1, +br[1]);

    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

function formatarDataEntrada(value) {
  const d = parseDataLocalEntrada(value);
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function entradaNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function dinheiroBR(value) {
  return entradaNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function EntradaInput({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
      {label}
      {children}
    </label>
  );
}


function EntradasPage() {
  const fileInputRef = useRef(null);

  const [entradas, setEntradas] = useState(() => {
    try {
      const saved = localStorage.getItem("entradas");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dadosBase, setDadosBase] = useState({
  ligas: [],
  times: [],
  metodos: [],
  mercados: [],
});

  const [form, setForm] = useState({
    data: "",
    liga: "",
    casa: "",
    visitante: "",
    modo: "Back",
    metodo: "",
    mercado: "",
    odd: "",
    stake: "",
    lucro: "",
    resultado: "Green",
  });

  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [entradaFilters, setEntradaFilters] = useState({
    dataInicio: "",
    dataFim: "",
    liga: "Todas",
    modo: "Todos",
    metodo: "Todos",
    resultado: "Todos",
  });
  const [busca, setBusca] = useState("");
  const [apiOptions, setApiOptions] = useState({ ligas: [], times: [] });
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    const validas = entradas.filter((item) => parseDataLocalEntrada(item.data));
    localStorage.setItem("entradas", JSON.stringify(validas));
  }, [entradas]);

  async function carregarOpcoesDaApi() {
    setLoadingOptions(true);
    try {
      const [windowResponse, historyResponse] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/jogos-janela/betfair`),
        fetch(`${API_BASE_URL}/historico?limit=12000`),
      ]);

      const allGames = [];

      if (windowResponse.status === "fulfilled" && windowResponse.value.ok) {
        const payload = await windowResponse.value.json();
        allGames.push(...extractGames(payload).map(normalizeGame));
      }

      if (historyResponse.status === "fulfilled" && historyResponse.value.ok) {
        const payload = await historyResponse.value.json();
        allGames.push(...extractGames(payload).map(normalizeGame));
      }

      const ligas = [...new Set(allGames.map((game) => game.League).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));

      const timesSet = new Set();
      allGames.forEach((game) => {
        if (game.Home) timesSet.add(game.Home);
        if (game.Away) timesSet.add(game.Away);
      });

      setApiOptions({
        ligas,
        times: [...timesSet].sort((a, b) => a.localeCompare(b)),
      });
    } catch {
      setApiOptions({ ligas: [], times: [] });
    } finally {
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
  async function carregarDadosJson() {
    try {
      const response = await fetch("/dados.json");
      const data = await response.json();

      setDadosBase({
        ligas: data.ligas || [],
        times: data.times || [],
        metodos: data.metodos || [],
        mercados: data.mercados || [],
      });
    } catch {
      console.log("dados.json não carregado");
    }
  }

  carregarDadosJson();
}, []);

  useEffect(() => {
    carregarOpcoesDaApi();
  }, []);

  const LIGAS_FIXAS_ENTRADAS = [
  "AFC Champions",
  "Alemanha",
  "Amistoso",
  "Arábia Saudita",
  "Argentina",
  "Austrália",
  "Áustria",
  "Azerbaijão",
  "Bélgica",
  "Bolívia",
  "Brasil",
  "Bulgaria",
  "Cazaquistão",
  "Chile",
  "Chipre",
  "Colômbia",
  "COMEBOL Copa America",
  "COMEBOL Libertadores",
  "COMEBOL Sul Americana",
  "CONCAF Champions",
  "Coreia do Sul",
  "Costa Rica",
  "Croácia",
  "Dinamarca",
  "Egito",
  "Emirados Árabes",
  "Equador",
  "Escócia",
  "Eslováquia",
  "Eslovênia",
  "Espanha",
  "EUA",
  "FIFA Eliminatórias",
  "FIFA World Cup",
  "FIFA World Cup Club",
  "Finlândia",
  "França",
  "Grécia",
  "Holanda",
  "Inglaterra",
  "Irlanda",
  "Islândia",
  "Israel",
  "Itália",
  "Japão",
  "México",
  "NBA",
  "Noruega",
  "Paraguai",
  "Peru",
  "Polônia",
  "Portugal",
  "Qatar",
  "R. Tcheca",
  "Romênia",
  "Rússia",
  "Sérvia",
  "Suécia",
  "Suíça",
  "Turquia",
  "Ucrânia",
  "UEFA Champions",
  "UEFA Conference",
  "UEFA Eurocopa",
  "UEFA Europe",
  "UEFA Nations League",
  "Uruguai",
  "Venezuela",
  "Wales",
  "Outros",
];

const ligasOptions = useMemo(() => {
  const local = entradas.map((item) => item.liga).filter(Boolean);

  return [...new Set([
    ...dadosBase.ligas,
    ...apiOptions.ligas,
    ...local,
  ])].sort((a, b) => a.localeCompare(b));
}, [entradas, apiOptions.ligas, dadosBase.ligas]);

  

  const timesOptions = useMemo(() => {
  const local = [];

  entradas.forEach((item) => {
    if (item.casa) local.push(item.casa);
    if (item.visitante) local.push(item.visitante);
  });

  return [...new Set([
    ...dadosBase.times,
    ...apiOptions.times,
    ...local,
  ])].sort((a, b) => a.localeCompare(b));
}, [entradas, apiOptions.times, dadosBase.times]);

  const metodosOptions = useMemo(() => {
  const local = entradas.map((item) => item.metodo).filter(Boolean);

  return [...new Set([
    ...dadosBase.metodos,
    ...local,
  ])].sort((a, b) => a.localeCompare(b));
}, [entradas, dadosBase.metodos]);

  const mercadosOptions = useMemo(() => {
  const local = entradas.map((item) => item.mercado).filter(Boolean);

  return [...new Set([
    ...dadosBase.mercados,
    ...local,
  ])].sort((a, b) => a.localeCompare(b));
}, [entradas, dadosBase.mercados]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return entradas
      .filter((item) => {
        const d = parseDataLocalEntrada(item.data);

        if (mesFiltro !== "Todos" && (!d || d.getMonth() + 1 !== Number(mesFiltro))) return false;
        if (entradaFilters.dataInicio && String(item.data || "").slice(0, 10) < entradaFilters.dataInicio) return false;
        if (entradaFilters.dataFim && String(item.data || "").slice(0, 10) > entradaFilters.dataFim) return false;
        if (entradaFilters.liga !== "Todas" && item.liga !== entradaFilters.liga) return false;
        if (entradaFilters.modo !== "Todos" && item.modo !== entradaFilters.modo) return false;
        if (entradaFilters.metodo !== "Todos" && item.metodo !== entradaFilters.metodo) return false;
        if (entradaFilters.resultado !== "Todos" && item.resultado !== entradaFilters.resultado) return false;

        if (!termo) return true;

        return [
          item.liga,
          item.casa,
          item.visitante,
          item.modo,
          item.metodo,
          item.mercado,
          item.resultado,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => {
        const da = parseDataLocalEntrada(a.data)?.getTime() || 0;
        const db = parseDataLocalEntrada(b.data)?.getTime() || 0;
        return db - da;
      });
  }, [entradas, mesFiltro, busca, entradaFilters]);

  const resumo = useMemo(() => {
    const total = filtradas.length;
    const greens = filtradas.filter((item) => String(item.resultado).toLowerCase() === "green").length;
    const reds = filtradas.filter((item) => String(item.resultado).toLowerCase() === "red").length;
    const voids = filtradas.filter((item) => String(item.resultado).toLowerCase() === "void").length;
    const lucro = filtradas.reduce((acc, item) => acc + entradaNumber(item.lucro), 0);
    const stake = filtradas.reduce((acc, item) => acc + entradaNumber(item.stake), 0);
    const winrate = total ? (greens / total) * 100 : 0;
    const roi = stake ? (lucro / stake) * 100 : 0;

    return { total, greens, reds, voids, lucro, stake, winrate, roi };
  }, [filtradas]);

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function abrirCalendario(event) {
    const input = event.currentTarget;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  }

  function updateEntradaFilter(key, value) {
    setEntradaFilters((prev) => ({ ...prev, [key]: value }));
  }

  function limparFiltrosEntradas() {
    setMesFiltro("Todos");
    setBusca("");
    setEntradaFilters({
      dataInicio: "",
      dataFim: "",
      liga: "Todas",
      modo: "Todos",
      metodo: "Todos",
      resultado: "Todos",
    });
  }

  function normalizarEntradaImportada(row) {
    const dataRaw = row.Data ?? row.data ?? row.DATA ?? row.Date ?? row.date ?? "";
    let data = "";

    if (typeof dataRaw === "number") {
      const parsed = XLSX.SSF.parse_date_code(dataRaw);
      if (parsed) {
        data = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      }
    } else {
      const rawText = String(dataRaw).trim();
      const parsedDate = parseDataLocalEntrada(rawText);
      if (parsedDate) {
        data = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
      } else if (rawText.match(/^\d{4}-\d{2}-\d{2}/)) {
        data = rawText.slice(0, 10);
      }
    }

    const resultadoRaw = String(row.Resultado ?? row.resultado ?? row.RESULTADO ?? "Green").trim();
    const resultado =
      resultadoRaw.toLowerCase() === "red"
        ? "Red"
        : resultadoRaw.toLowerCase() === "void"
        ? "Void"
        : "Green";

    const modoRaw = String(row.Modo ?? row.modo ?? row.MODO ?? "Back").trim();
    const modo = modoRaw.toLowerCase() === "lay" ? "Lay" : "Back";

    return {
      id: Date.now() + Math.random(),
      data,
      liga: String(row.Liga ?? row.liga ?? row.LIGA ?? "").trim(),
      casa: normalizeTeamName(String(row.Casa ?? row.casa ?? row.Home ?? row.HOME ?? "").trim()),
visitante: normalizeTeamName(String(row.Visitante ?? row.visitante ?? row.Fora ?? row.Away ?? row.AWAY ?? "").trim()),
      modo,
      metodo: String(row.Método ?? row.Metodo ?? row.metodo ?? row.METODO ?? "").trim(),
      mercado: String(row.Mercado ?? row.mercado ?? row.MERCADO ?? "").trim(),
      odd: String(row.Odd ?? row.odd ?? row.ODD ?? "").replace(",", "."),
      stake: String(row.Stake ?? row.stake ?? row.STAKE ?? "").replace(",", "."),
      lucro: String(row.Lucro ?? row.lucro ?? row.LUCRO ?? "").replace(",", "."),
      resultado,
    };
  }

  async function importarExcel(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const novas = rows
        .map(normalizarEntradaImportada)
        .filter((item) => item.data);

      if (!novas.length) {
        alert("Nenhuma entrada válida encontrada. Confira se a planilha tem uma coluna Data.");
        return;
      }

      setEntradas((prev) => [...prev, ...novas]);
      alert(`${novas.length} entradas importadas com sucesso.`);
    } catch {
      alert("Erro ao importar planilha. Verifique o formato do arquivo.");
    } finally {
      event.target.value = "";
    }
  }

  function adicionarEntrada() {
    if (!form.data) {
      alert("Informe a data da entrada.");
      return;
    }

    const nova = {
      id: Date.now() + Math.random(),
      ...form,
      odd: String(form.odd || ""),
      stake: String(form.stake || ""),
      lucro: String(form.lucro || ""),
    };

    setEntradas((prev) => [...prev, nova]);

    setForm({
      data: "",
      liga: "",
      casa: "",
      visitante: "",
      modo: "Back",
      metodo: "",
      mercado: "",
      odd: "",
      stake: "",
      lucro: "",
      resultado: "Green",
    });
  }

  function excluirEntrada(id) {
    setEntradas((prev) => prev.filter((item) => item.id !== id));
  }

  function limparTudo() {
    if (window.confirm("Tem certeza que deseja excluir TODAS as entradas?")) {
      setEntradas([]);
      localStorage.removeItem("entradas");
    }
  }

  function exportarExcel() {
    const exportData = filtradas.map((item, index) => ({
      Pic: index + 1,
      Data: formatarDataEntrada(item.data),
      Liga: item.liga,
      Casa: item.casa,
      Visitante: item.visitante,
      Modo: item.modo,
      Método: item.metodo,
      Mercado: item.mercado,
      Odd: entradaNumber(item.odd),
      Stake: entradaNumber(item.stake),
      Lucro: entradaNumber(item.lucro),
      Resultado: item.resultado,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Entradas");
    XLSX.writeFile(wb, `entradas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">JC Trader clássico</p>
            <h1 className="text-3xl font-black text-zinc-50">Entradas</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cadastro manual, importação Excel, banco de nomes da API, filtros e resumo operacional.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={adicionarEntrada} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">Adicionar</button>
            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-700">Importar</button>
            <button onClick={exportarExcel} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Exportar</button>
            <button onClick={limparTudo} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700">Limpar</button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importarExcel} className="hidden" />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
  <DadosStatCard
    title="Entradas"
    value={resumo.total}
    icon={Database}
  />

  <DadosStatCard
    title="Greens"
    value={resumo.greens}
    icon={ShieldCheck}
    tone="green"
  />

  <DadosStatCard
    title="Reds"
    value={resumo.reds}
    icon={Target}
    tone="red"
  />

  <DadosStatCard
    title="Voids"
    value={resumo.voids}
    icon={Activity}
    tone="yellow"
  />

  <DadosStatCard
    title="Winrate"
    value={`${resumo.winrate.toFixed(1)}%`}
    icon={Trophy}
  />

  <DadosStatCard
    title="Lucro"
    value={dinheiroBR(resumo.lucro)}
    icon={Wallet}
    tone="profit"
  />

  <DadosStatCard
    title="ROI"
    value={`${resumo.roi.toFixed(1)}%`}
    icon={BarChart3}
    tone={resumo.roi >= 0 ? "green" : "red"}
  />
</section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
          <p className="text-xs font-semibold text-zinc-400">
            Banco de dados: {loadingOptions ? "carregando ligas e times..." : `${ligasOptions.length} ligas • ${timesOptions.length} times`}
          </p>
          <button onClick={carregarOpcoesDaApi} disabled={loadingOptions} className="rounded-lg border border-zinc-700 px-3 py-1 text-xs font-black text-zinc-300 hover:bg-zinc-900 disabled:opacity-60">
            Atualizar nomes
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <EntradaInput label="Data">
            <input type="date" value={form.data} onClick={abrirCalendario} onFocus={abrirCalendario} onChange={(e) => updateForm("data", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Liga">
            <input list="entradas-ligas" placeholder="Liga" value={form.liga} onChange={(e) => updateForm("liga", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Casa">
            <input list="entradas-times" placeholder="Casa" value={form.casa} onChange={(e) => updateForm("casa", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Visitante">
            <input list="entradas-times" placeholder="Visitante" value={form.visitante} onChange={(e) => updateForm("visitante", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Modo">
            <select value={form.modo} onChange={(e) => updateForm("modo", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
              <option>Back</option>
              <option>Lay</option>
            </select>
          </EntradaInput>

          <EntradaInput label="Resultado">
            <select value={form.resultado} onChange={(e) => updateForm("resultado", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
              <option>Green</option>
              <option>Red</option>
              <option>Void</option>
            </select>
          </EntradaInput>

          <EntradaInput label="Método">
            <input list="entradas-metodos" placeholder="Método" value={form.metodo} onChange={(e) => updateForm("metodo", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Mercado">
            <input list="entradas-mercados" placeholder="Mercado" value={form.mercado} onChange={(e) => updateForm("mercado", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Odd">
            <input type="number" placeholder="Odd" value={form.odd} onChange={(e) => updateForm("odd", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Stake">
            <input type="number" placeholder="Stake" value={form.stake} onChange={(e) => updateForm("stake", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Lucro">
            <input type="number" placeholder="Lucro" value={form.lucro} onChange={(e) => updateForm("lucro", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
          </EntradaInput>

          <EntradaInput label="Mês">
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
              {MESES_ENTRADAS.map((item) => <option key={item.v} value={item.v}>{item.l}</option>)}
            </select>
          </EntradaInput>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-black text-zinc-100">Filtros da tabela</h2>
              <p className="text-xs text-zinc-500">Filtre por data, liga, modo, método e resultado sem alterar o cadastro.</p>
            </div>
            <button onClick={limparFiltrosEntradas} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-900">Limpar filtros</button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <EntradaInput label="Data inicial">
              <input type="date" value={entradaFilters.dataInicio} onClick={abrirCalendario} onFocus={abrirCalendario} onChange={(e) => updateEntradaFilter("dataInicio", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
            </EntradaInput>
            <EntradaInput label="Data final">
              <input type="date" value={entradaFilters.dataFim} onClick={abrirCalendario} onFocus={abrirCalendario} onChange={(e) => updateEntradaFilter("dataFim", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
            </EntradaInput>
            <EntradaInput label="Liga">
              <select value={entradaFilters.liga} onChange={(e) => updateEntradaFilter("liga", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
                <option>Todas</option>
                {ligasOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </EntradaInput>
            <EntradaInput label="Modo">
              <select value={entradaFilters.modo} onChange={(e) => updateEntradaFilter("modo", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
                <option>Todos</option>
                <option>Back</option>
                <option>Lay</option>
              </select>
            </EntradaInput>
            <EntradaInput label="Método">
              <select value={entradaFilters.metodo} onChange={(e) => updateEntradaFilter("metodo", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
                <option>Todos</option>
                {metodosOptions.map((item) => <option key={item}>{item}</option>)}
              </select>
            </EntradaInput>
            <EntradaInput label="Resultado">
              <select value={entradaFilters.resultado} onChange={(e) => updateEntradaFilter("resultado", e.target.value)} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500">
                <option>Todos</option>
                <option>Green</option>
                <option>Red</option>
                <option>Void</option>
              </select>
            </EntradaInput>
          </div>
        </div>

        <div className="mt-3">
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por liga, time, método, mercado ou resultado..." className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500" />
        </div>

        <datalist id="entradas-ligas">{ligasOptions.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="entradas-times">{timesOptions.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="entradas-metodos">{metodosOptions.map((item) => <option key={item} value={item} />)}</datalist>
        <datalist id="entradas-mercados">{mercadosOptions.map((item) => <option key={item} value={item} />)}</datalist>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Tabela de Entradas</h2>
            <p className="text-sm text-zinc-500">Exibindo {filtradas.length} registros</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">LocalStorage • Importação/Exportação Excel</div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1450px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Pic</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Visitante</th>
                <th className="px-3 py-3">Modo</th>
                <th className="px-3 py-3">Método</th>
                <th className="px-3 py-3">Mercado</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Stake</th>
                <th className="px-3 py-3">Lucro</th>
                <th className="px-3 py-3">%</th>
                <th className="px-3 py-3">Resultado</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((item, index) => {
                const stake = entradaNumber(item.stake);
                const lucro = entradaNumber(item.lucro);
                const perc = stake ? Math.round((lucro / stake) * 100) : 0;
                const resultLower = String(item.resultado || "").toLowerCase();

                return (
                  <tr key={item.id || index} className="border-b border-zinc-800 hover:bg-emerald-500/10">
                    <td className="px-3 py-2 font-black text-zinc-300">{index + 1}</td>
                    <td className="px-3 py-2 font-semibold text-zinc-200">{formatarDataEntrada(item.data)}</td>
                    <td className="px-3 py-2 font-semibold text-blue-300">{item.liga || "—"}</td>
                    <td className="px-3 py-2 text-left font-bold text-zinc-50">{item.casa || "—"}</td>
                    <td className="px-3 py-2 text-left font-bold text-zinc-50">{item.visitante || "—"}</td>
                    <td className={`px-3 py-2 font-black ${item.modo === "Back" ? "text-blue-300" : "text-pink-300"}`}>{item.modo || "—"}</td>
                    <td className="px-3 py-2 font-bold text-emerald-300">{item.metodo || "—"}</td>
                    <td className="px-3 py-2 font-bold text-zinc-300">{item.mercado || "—"}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{item.odd || "—"}</td>
                    <td className="px-3 py-2 font-bold text-zinc-300">{dinheiroBR(stake)}</td>
                    <td className={`px-3 py-2 font-black ${lucro > 0 ? "text-emerald-300" : lucro < 0 ? "text-red-300" : "text-zinc-400"}`}>
                      {lucro > 0 ? "+" : lucro < 0 ? "-" : ""}{dinheiroBR(Math.abs(lucro))}
                    </td>
                    <td className={`px-3 py-2 font-black ${perc > 0 ? "text-emerald-300" : perc < 0 ? "text-red-300" : "text-zinc-400"}`}>{perc}%</td>
                    <td className={`px-3 py-2 font-black ${resultLower === "green" ? "text-emerald-300" : resultLower === "red" ? "text-red-300" : "text-yellow-300"}`}>{item.resultado || "—"}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => excluirEntrada(item.id)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20">
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filtradas.length && (
                <tr>
                  <td colSpan="14" className="px-4 py-10 text-center text-zinc-500">Nenhuma entrada cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-8 text-center">
      <Icon size={42} className="mx-auto mb-4 text-zinc-500" />
      <h1 className="text-3xl font-black text-zinc-50">{title}</h1>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}


function TabelasPage() {
  const [payload, setPayload] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [temporadaSelecionada, setTemporadaSelecionada] = useState("2026");
  const [mode, setMode] = useState("geral");
  const [searchTeam, setSearchTeam] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchTabelas() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/footstats/tabelas?temporada=${encodeURIComponent(temporadaSelecionada)}`
      );

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setPayload(data);

      const primeiraLiga = data?.ligas?.[0] || "";
      setSelectedLeague((prev) => prev || primeiraLiga);
    } catch (err) {
      setError(err.message || "Erro ao carregar tabelas.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }

  const leagues = useMemo(() => payload?.ligas || [], [payload]);

  const selectedTable = useMemo(() => {
    if (!payload?.tabelas || !selectedLeague) return [];

    const tableByMode = payload.tabelas[selectedLeague]?.[mode] || [];

    return tableByMode.filter((row) =>
      String(row.time || "")
        .toLowerCase()
        .includes(searchTeam.toLowerCase())
    );
  }, [payload, selectedLeague, mode, searchTeam]);

  const leader = selectedTable[0];

  const modeLabel = {
    geral: "Todos",
    casa: "Casa",
    fora: "Fora",
  }[mode];

  function positionClass(pos, total) {
    if (pos <= 4) return "bg-emerald-500 text-white";
    if (pos <= 6) return "bg-cyan-500 text-white";
    if (pos >= total - 3) return "bg-red-500 text-white";
    return "bg-zinc-600 text-white";
  }

  function sgClass(value) {
    const n = Number(value || 0);
    if (n > 0) return "text-emerald-300";
    if (n < 0) return "text-red-300";
    return "text-yellow-300";
  }

  function formClass(letter) {
    if (letter === "V") return "bg-emerald-500 text-white";
    if (letter === "D") return "bg-red-500 text-white";
    return "bg-amber-500 text-white";
  }

  function aproveitamento(row) {
    const jogos = Number(row.j || 0);
    const pontos = Number(row.p || 0);
    if (!jogos) return "0%";
    return `${((pontos / (jogos * 3)) * 100).toFixed(1)}%`;
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
              JC Trader
            </p>
            <h1 className="text-3xl font-black text-zinc-50">Tabelas</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Classificação por liga com dados consolidados do FootStats.
            </p>
          </div>

          <button
            onClick={fetchTabelas}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-bold text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Carregando" : "Carregar Tabelas"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Ligas" value={leagues.length || 0} icon={Trophy} />
        <StatCard title="Jogos base" value={payload?.totalJogos || 0} icon={Database} />
        <StatCard title="Modo" value={modeLabel} icon={BarChart3} />
        <StatCard title="Líder" value={leader?.time || "—"} icon={ShieldCheck} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect
            label="Temporada"
            value={temporadaSelecionada}
            onChange={setTemporadaSelecionada}
            options={["2026", "2025/2026", "2024/2025", "2025", "Todas"]}
          />

          <FilterSelect
            label="Selecionar Liga"
            value={selectedLeague}
            onChange={setSelectedLeague}
            options={leagues.length ? leagues : [""]}
          />

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Buscar time
            <input
              value={searchTeam}
              onChange={(e) => setSearchTeam(e.target.value)}
              placeholder="Ex: Flamengo"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500"
            />
          </label>

          <div className="flex h-10 self-end overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 p-1">
            {[
              ["geral", "Todos"],
              ["casa", "Casa"],
              ["fora", "Fora"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`rounded-lg px-4 text-sm font-black transition ${
                  mode === key
                    ? "bg-cyan-600 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex flex-col gap-1 border-b border-zinc-800 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white">
              Regular Season
            </div>
            <h2 className="mt-3 text-lg font-black text-zinc-50">
              Tabela Classificativa - {selectedLeague || "Selecione uma liga"}
            </h2>
            <p className="text-sm text-zinc-500">
              Visual: {modeLabel} • Temporada: {temporadaSelecionada}
            </p>
          </div>

          <div className="text-xs font-bold text-zinc-500">
            {payload?.atualizadoEm
              ? `Atualizado: ${new Date(payload.atualizadoEm).toLocaleString("pt-BR")}`
              : "Aguardando carregamento"}
          </div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1250px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Posição</th>
                <th className="px-3 py-3 text-left">Equipe</th>
                <th className="px-3 py-3">P</th>
                <th className="px-3 py-3">J</th>
                <th className="px-3 py-3">V</th>
                <th className="px-3 py-3">E</th>
                <th className="px-3 py-3">D</th>
                <th className="px-3 py-3">GM-GS</th>
                <th className="px-3 py-3">SG</th>
                <th className="px-3 py-3">Aprov.</th>
                <th className="px-3 py-3">Forma</th>
                <th className="px-3 py-3">Próximo Jogo</th>
              </tr>
            </thead>

            <tbody>
              {selectedTable.map((row, index) => {
                const pos = index + 1;
                const total = selectedTable.length;

                return (
                  <tr
                    key={`${row.time}-${index}`}
                    className="border-b border-zinc-800 hover:bg-cyan-500/10"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex h-6 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-black ${positionClass(
                          pos,
                          total
                        )}`}
                      >
                        {pos}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-left font-black text-zinc-50">
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                        {String(row.time || "?").slice(0, 2).toUpperCase()}
                      </span>
                      {row.time}
                    </td>

                    <td className="px-3 py-2 font-black text-zinc-50">{row.p}</td>
                    <td className="px-3 py-2 font-bold text-zinc-300">{row.j}</td>
                    <td className="px-3 py-2 font-bold text-emerald-300">{row.v}</td>
                    <td className="px-3 py-2 font-bold text-yellow-300">{row.e}</td>
                    <td className="px-3 py-2 font-bold text-red-300">{row.d}</td>
                    <td className="px-3 py-2 font-bold text-zinc-100">
                      {row.gm}:{row.gs}
                    </td>
                    <td className={`px-3 py-2 font-black ${sgClass(row.sg)}`}>
                      {row.sg}
                    </td>
                    <td className="px-3 py-2 font-black text-cyan-300">
                      {aproveitamento(row)}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex justify-center gap-1">
                        {(row.forma || []).slice(-5).map((item, i) => (
                          <span
                            key={i}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-black ${formClass(
                              item
                            )}`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-3 py-2 font-bold text-zinc-400">
                      {row.proximoJogo || "—"}
                    </td>
                  </tr>
                );
              })}

              {!selectedTable.length && (
                <tr>
                  <td colSpan="12" className="px-4 py-10 text-center text-zinc-500">
                    Nenhuma tabela carregada. Selecione a temporada e clique em Carregar Tabelas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AlertasPage() {
  const [games, setGames] = useState([]);
  const [minScore, setMinScore] = useState("85");
  const [marketFilter, setMarketFilter] = useState("Todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasRun, setHasRun] = useState(false);

  async function fetchAlerts() {
    setLoading(true);
    setError("");

    try {
      const opportunities = await loadTodayOpportunities();
      setGames(opportunities);
      setHasRun(true);
    } catch (err) {
      setError(err.message || "Erro ao carregar alertas.");
      setGames([]);
    } finally {
      setLoading(false);
    }
  }

  const marketOptions = useMemo(() => {
    return ["Todos", ...new Set(games.map((game) => game.proMarket || game.bestMarket).filter(Boolean))];
  }, [games]);

  const alerts = useMemo(() => {
    const scoreLimit = toNumber(minScore) || 85;
    return games
      .filter((game) => (game.scorePro || 0) >= scoreLimit)
      .filter((game) => marketFilter === "Todos" || game.proMarket === marketFilter)
      .sort((a, b) => (b.scorePro || 0) - (a.scorePro || 0));
  }, [games, minScore, marketFilter]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">JC Trader</p>
            <h1 className="text-3xl font-black text-zinc-50">Alertas Elite</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Radar de oportunidades com Score PRO. Use antes de publicar alertas no Telegram/Discord.
            </p>
          </div>

          <button
            onClick={fetchAlerts}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60"
          >
            <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Analisando" : "Gerar Alertas"}
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm font-semibold text-red-200">{error}</div>}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <StatCard title="Jogos analisados" value={games.length} icon={Database} />
        <StatCard title="Alertas" value={alerts.length} icon={Bell} />
        <StatCard title="Score mínimo" value={minScore} icon={Target} />
        <StatCard title="Elite forte" value={alerts.filter((g) => (g.scorePro || 0) >= 90).length} icon={Flame} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Score mínimo
            <input
              value={minScore}
              onChange={(e) => setMinScore(e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-orange-500"
            />
          </label>

          <FilterSelect label="Mercado" value={marketFilter} onChange={setMarketFilter} options={marketOptions} />

          <div className="flex items-end">
            <div className="w-full rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs font-bold text-yellow-200">
              Validação manual obrigatória antes da entrada. Alertas são filtros estatísticos, não garantia de resultado.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-50">Jogos Elite do Dia</h2>
            <p className="text-sm text-zinc-500">
              {hasRun ? `${alerts.length} alerta(s) encontrados` : "Clique em Gerar Alertas"}
            </p>
          </div>
          <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
            SCORE PRO IA
          </span>
        </div>

        <div className="space-y-3">
          {alerts.map((game, index) => <OpportunityRow key={`${game.Date}-${game.Home}-${game.Away}-${index}`} game={game} index={index} />)}
          {!alerts.length && (
            <div className="flex h-44 items-center justify-center rounded-2xl border border-zinc-800 bg-[#0d0d0d] text-center text-sm font-bold text-zinc-500">
              {hasRun ? "Nenhum jogo bateu o score mínimo atual." : "Os alertas aparecerão aqui após a análise."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


function AppLayout() {
  const [activePage, setActivePage] = useState("home");

  const apiMenuItems = [
    { key: "home", label: "Início", icon: Activity },
    { key: "scanner", label: "Scanner", icon: Search },
    { key: "alertas", label: "Alertas", icon: Bell },
    { key: "backtest", label: "Backtest", icon: BarChart3 },
    { key: "ligas", label: "Ligas", icon: Trophy },
    { key: "times", label: "Times", icon: Users },
    { key: "placar", label: "Placar", icon: Target },
    { key: "tabelas", label: "Tabelas", icon: BarChart3 },
    { key: "config", label: "Config", icon: Settings },
  ];

  const classicMenuItems = [
    { key: "entradas", label: "Entradas", icon: ShieldCheck },
    { key: "dados", label: "Dados", icon: Database },
    { key: "diario", label: "Diário", icon: Activity },
    { key: "calendario", label: "Calendário", icon: BarChart3 },
    { key: "ligas-times", label: "Ligas e Times", icon: Users },
    { key: "metodos-odds", label: "Métodos e Odds", icon: Trophy },
    { key: "analise", label: "Análise", icon: Search },
    { key: "banco", label: "Banco", icon: Wallet },
    { key: "compact", label: "Compact", icon: Database },
    { key: "help", label: "Help", icon: Settings },
  ];

const menuItems = [...apiMenuItems, ...classicMenuItems];
  return (
  <div className="min-h-screen bg-black text-zinc-100">

    <div className="flex min-h-screen">

      <aside className="hidden w-56 border-r border-zinc-800 bg-[#070707] p-4 lg:block">

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <div className="flex flex-col items-center">
            <img
              src="/logo.png"
              alt="JC Trader"
              className="h-24 w-24 object-contain"
            />

            <h1 className="mt-3 text-xl font-black text-zinc-50">
              JC Trader
            </h1>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Professional
            </p>
          </div>
        </div>
          <nav className="space-y-2">
            {apiMenuItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActivePage(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                    active
                      ? "border border-blue-400/40 bg-blue-500/20 text-blue-100"
                      : "border border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}

            <div className="my-4 border-t border-zinc-800"></div>
            <p className="px-4 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-600">JC Trader clássico</p>

            {classicMenuItems.map((item) => {
              const Icon = item.icon;
              const active = activePage === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActivePage(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition ${
                    active
                      ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                      : "border border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4 flex gap-2 overflow-auto lg:hidden">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActivePage(item.key)}
                className={`whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-bold ${
                  activePage === item.key
                    ? "border-blue-400/40 bg-blue-500/20 text-blue-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mx-auto max-w-[1700px]">
            {activePage === "home" && <HomePage />}
            {activePage === "scanner" && <ScannerPage />}
            {activePage === "alertas" && <AlertasPage />}
            {activePage === "backtest" && <BacktestPage />}
            {activePage === "ligas" && <LigasPage />}
            {activePage === "times" && <TimesPage />}
            {activePage === "placar" && <PlacarPage />}
            {activePage === "tabelas" && <TabelasPage />}
            {activePage === "config" && <ConfigPage />}
            {activePage === "entradas" && <EntradasPage />}
            {activePage === "dados" && <DadosPage />}
            {activePage === "diario" && <DiarioPage />}
            {activePage === "calendario" && <CalendarioPage />}
            {activePage === "ligas-times" && <LigasTimesClassicPage />}
            {activePage === "help" && <HelpClassicPage />}
            {activePage === "metodos-odds" && <MetodosOddsClassicPage />}
	    {activePage === "analise" && <AnaliseClassicPage />}
            {activePage === "compact" && <CompactPage />}
	    {activePage === "banco" && <BancoClassicPage />}

          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <AppLayout />;
}


function parseDataDados(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(+br[3], +br[2] - 1, +br[1]);

    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  return null;
}

function moneyDados(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}


function DadosStatCard({ title, value, icon: Icon, tone = "default" }) {
  const colorClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "profit"
      ? String(value).includes("-")
        ? "text-red-300"
        : "text-emerald-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-zinc-50";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            {title}
          </p>
          <p className={`mt-1 text-2xl font-black ${colorClass}`}>
            {value}
          </p>
        </div>

        {Icon && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2">
            <Icon size={18} className="text-zinc-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function DadosMiniChart({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-[#111111] text-sm font-semibold text-zinc-500">
        Sem dados para gráfico.
      </div>
    );
  }

  const width = 1100;
  const height = 280;
  const paddingX = 24;
  const paddingY = 26;

  const values = data.map((item) => item.evolucao);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const last = data[data.length - 1];
  const positive = last.evolucao >= 0;

  const points = data.map((item, index) => {
    const x = paddingX + (index / Math.max(data.length - 1, 1)) * (width - paddingX * 2);
    const y = height - paddingY - ((item.evolucao - min) / range) * (height - paddingY * 2);
    return { x, y };
  });

  function smoothPathFromPoints(localPoints) {
    if (localPoints.length < 2) return "";

    const d = [`M ${localPoints[0].x} ${localPoints[0].y}`];

    for (let i = 0; i < localPoints.length - 1; i += 1) {
      const p0 = localPoints[i - 1] || localPoints[i];
      const p1 = localPoints[i];
      const p2 = localPoints[i + 1];
      const p3 = localPoints[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }

    return d.join(" ");
  }

  const linePath = smoothPathFromPoints(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  const stroke = positive ? "#22c55e" : "#ef4444";
  const gradientId = positive ? "dadosGradientGreen" : "dadosGradientRed";

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-black text-zinc-50">Evolução acumulada</h2>
          <p className="text-sm text-zinc-500">Resultado por mês ou por dia no mês selecionado</p>
        </div>
        <div className={`text-sm font-black ${positive ? "text-emerald-300" : "text-red-300"}`}>
          Acumulado: {moneyDados(last.evolucao)}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-gradient-to-b from-zinc-950 to-[#0b0b0b]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-72 min-w-[900px]">
          <defs>
            <linearGradient id="dadosGradientGreen" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="dadosGradientRed" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          {points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="3" fill={stroke} opacity="0.65" />
          ))}

          <text x={paddingX + 4} y={24} fill="#a1a1aa" fontSize="12">
            Máx: {moneyDados(max)}
          </text>
          <text x={paddingX + 4} y={height - 10} fill="#a1a1aa" fontSize="12">
            Mín: {moneyDados(min)}
          </text>
        </svg>
      </div>
    </section>
  );
}

function DadosPage() {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const [entradas, setEntradas] = useState(() => {
    try {
      const saved = localStorage.getItem("entradas");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [mesFiltro, setMesFiltro] = useState("Todos");

  useEffect(() => {
    function syncEntradas() {
      try {
        const saved = localStorage.getItem("entradas");
        setEntradas(saved ? JSON.parse(saved) : []);
      } catch {
        setEntradas([]);
      }
    }

    syncEntradas();
    window.addEventListener("storage", syncEntradas);
    return () => window.removeEventListener("storage", syncEntradas);
  }, []);

  const resumoMensal = useMemo(() => {
    const base = meses.map((mes, index) => {
      const entradasMes = entradas.filter((entrada) => {
        const d = parseDataDados(entrada.data);
        return d && d.getMonth() === index;
      });

      const investimento = entradasMes.reduce((acc, entrada) => acc + entradaNumber(entrada.stake), 0);
      const lucro = entradasMes.reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);
      const green = entradasMes.filter((entrada) => String(entrada.resultado).toLowerCase() === "green").length;
      const red = entradasMes.filter((entrada) => String(entrada.resultado).toLowerCase() === "red").length;
      const voids = entradasMes.filter((entrada) => String(entrada.resultado).toLowerCase() === "void").length;
      const back = entradasMes.filter((entrada) => entrada.modo === "Back").length;
      const lay = entradasMes.filter((entrada) => entrada.modo === "Lay").length;
      const lucroBack = entradasMes.filter((entrada) => entrada.modo === "Back").reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);
      const lucroLay = entradasMes.filter((entrada) => entrada.modo === "Lay").reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);
      const investBack = entradasMes.filter((entrada) => entrada.modo === "Back").reduce((acc, entrada) => acc + entradaNumber(entrada.stake), 0);
      const investLay = entradasMes.filter((entrada) => entrada.modo === "Lay").reduce((acc, entrada) => acc + entradaNumber(entrada.stake), 0);
      const roi = investimento ? (lucro / investimento) * 100 : 0;
      const winrate = entradasMes.length ? (green / entradasMes.length) * 100 : 0;
      const ticketMedio = entradasMes.length ? investimento / entradasMes.length : 0;

      return {
        mes,
        investimento,
        lucro,
        roi,
        winrate,
        pic: entradasMes.length,
        green,
        red,
        void: voids,
        back,
        lay,
        lucroBack,
        lucroLay,
        investBack,
        investLay,
        roiBack: investBack ? (lucroBack / investBack) * 100 : 0,
        roiLay: investLay ? (lucroLay / investLay) * 100 : 0,
        ticketMedio,
      };
    });

    let acumulado = 0;
    return base.map((item) => {
      acumulado += item.lucro;
      return { ...item, evolucao: acumulado };
    });
  }, [entradas]);

  const dadosGrafico = useMemo(() => {
    if (mesFiltro === "Todos") {
      return resumoMensal.map((item) => ({
        label: item.mes,
        evolucao: item.evolucao,
      }));
    }

    const idxMes = meses.indexOf(mesFiltro);
    const entradasMes = entradas.filter((entrada) => {
      const d = parseDataDados(entrada.data);
      return d && d.getMonth() === idxMes;
    });

    const agrupado = {};
    entradasMes.forEach((entrada) => {
      const d = parseDataDados(entrada.data);
      if (!d) return;
      const dia = d.getDate();
      agrupado[dia] = (agrupado[dia] || 0) + entradaNumber(entrada.lucro);
    });

    let acumulado = 0;
    return Object.entries(agrupado)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([dia, lucro]) => {
        acumulado += lucro;
        return {
          label: `${dia}/${idxMes + 1}`,
          evolucao: acumulado,
        };
      });
  }, [mesFiltro, entradas, resumoMensal]);

  const totais = useMemo(() => {
    const total = entradas.length;
    const green = entradas.filter((entrada) => String(entrada.resultado).toLowerCase() === "green").length;
    const red = entradas.filter((entrada) => String(entrada.resultado).toLowerCase() === "red").length;
    const voids = entradas.filter((entrada) => String(entrada.resultado).toLowerCase() === "void").length;
    const investimento = entradas.reduce((acc, entrada) => acc + entradaNumber(entrada.stake), 0);
    const lucro = entradas.reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);
    const winrate = total ? (green / total) * 100 : 0;
    const roi = investimento ? (lucro / investimento) * 100 : 0;
    const backQtd = entradas.filter((entrada) => entrada.modo === "Back").length;
    const layQtd = entradas.filter((entrada) => entrada.modo === "Lay").length;

    const lucroGreen = entradas
      .filter((entrada) => entradaNumber(entrada.lucro) > 0)
      .reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);

    const lucroRed = Math.abs(
      entradas
        .filter((entrada) => entradaNumber(entrada.lucro) < 0)
        .reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0)
    );

    const profitFactor = lucroRed ? lucroGreen / lucroRed : lucroGreen ? lucroGreen : 0;
    const ticketMedio = total ? investimento / total : 0;
    const lucroMedio = total ? lucro / total : 0;

    let acumulado = 0;
    let pico = 0;
    let drawdown = 0;
    [...entradas]
      .sort((a, b) => (parseDataDados(a.data)?.getTime() || 0) - (parseDataDados(b.data)?.getTime() || 0))
      .forEach((entrada) => {
        acumulado += entradaNumber(entrada.lucro);
        pico = Math.max(pico, acumulado);
        drawdown = Math.min(drawdown, acumulado - pico);
      });

    const mesesComJogo = resumoMensal.filter((item) => item.pic > 0);
    const melhorMes = mesesComJogo.length ? [...mesesComJogo].sort((a, b) => b.lucro - a.lucro)[0] : null;
    const piorMes = mesesComJogo.length ? [...mesesComJogo].sort((a, b) => a.lucro - b.lucro)[0] : null;

    return {
      total,
      green,
      red,
      voids,
      investimento,
      lucro,
      winrate,
      roi,
      backQtd,
      layQtd,
      profitFactor,
      ticketMedio,
      lucroMedio,
      drawdown,
      melhorMes,
      piorMes,
    };
  }, [entradas, resumoMensal]);


  const [metaMensal, setMetaMensal] = useState(() => {
    return Number(localStorage.getItem("metaMensal")) || 1000;
  });

  useEffect(() => {
    localStorage.setItem("metaMensal", String(metaMensal));
  }, [metaMensal]);

  const progressoMeta = metaMensal ? (totais.lucro / metaMensal) * 100 : 0;
  const restanteMeta = metaMensal - totais.lucro;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">JC Trader clássico</p>
          <h1 className="text-3xl font-black text-zinc-50">Dados</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Dashboard geral das entradas cadastradas, sem coluna Banca, com evolução, ROI, drawdown e desempenho Back/Lay.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <DadosStatCard title="Entradas" value={totais.total} icon={Database} />
        <DadosStatCard title="Greens" value={totais.green} icon={ShieldCheck} tone="green" />
        <DadosStatCard title="Reds" value={totais.red} icon={Target} tone="red" />
        <DadosStatCard title="Lucro Total" value={moneyDados(totais.lucro)} icon={Wallet} tone="profit" />
        <DadosStatCard title="ROI" value={`${totais.roi.toFixed(1)}%`} icon={Activity} tone={totais.roi >= 0 ? "green" : "red"} />
        <DadosStatCard title="Winrate" value={`${totais.winrate.toFixed(1)}%`} icon={Trophy} />
        <DadosStatCard title="Back / Lay" value={`${totais.backQtd} / ${totais.layQtd}`} icon={BarChart3} tone="blue" />
        <DadosStatCard title="Drawdown" value={moneyDados(totais.drawdown)} icon={Flame} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Investimento</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">{moneyDados(totais.investimento)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Profit Factor</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">{totais.profitFactor.toFixed(2)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Ticket Médio</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">{moneyDados(totais.ticketMedio)}</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Lucro Médio/Pic</p>
          <p className={`mt-1 text-2xl font-black ${totais.lucroMedio >= 0 ? "text-emerald-300" : "text-red-300"}`}>
            {moneyDados(totais.lucroMedio)}
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Melhor mês</p>
          <h2 className="mt-1 text-xl font-black text-zinc-50">{totais.melhorMes?.mes || "—"}</h2>
          <p className="text-sm font-bold text-emerald-300">{totais.melhorMes ? moneyDados(totais.melhorMes.lucro) : moneyDados(0)}</p>
        </div>

        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">Pior mês</p>
          <h2 className="mt-1 text-xl font-black text-zinc-50">{totais.piorMes?.mes || "—"}</h2>
          <p className="text-sm font-bold text-red-300">{totais.piorMes ? moneyDados(totais.piorMes.lucro) : moneyDados(0)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect label="Filtrar gráfico por mês" value={mesFiltro} onChange={setMesFiltro} options={["Todos", ...meses]} />
        </div>
      </section>

      <DadosMiniChart data={dadosGrafico} />

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-50">Meta Mensal</h2>
            <p className="text-sm text-zinc-500">Controle da meta financeira mensal</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-400">Meta:</span>
            <input
              type="number"
              value={metaMensal}
              onChange={(e) => setMetaMensal(Number(e.target.value))}
              className="h-10 w-36 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-center text-sm font-bold text-zinc-100 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="h-5 overflow-hidden rounded-full bg-zinc-900">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressoMeta >= 100
                ? "bg-emerald-500"
                : progressoMeta >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{
              width: `${Math.min(Math.max(progressoMeta, 0), 100)}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 text-sm font-bold md:flex-row md:items-center md:justify-between">
          <span className={restanteMeta <= 0 ? "text-emerald-300" : "text-zinc-400"}>
            {restanteMeta <= 0 ? "Meta batida ✅" : `Restante: ${moneyDados(restanteMeta)}`}
          </span>

          <span className={totais.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>
            {moneyDados(totais.lucro)} / {moneyDados(metaMensal)} ({progressoMeta.toFixed(1)}%)
          </span>
        </div>
      </section>


      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Evolução mensal</h2>
            <p className="text-sm text-zinc-500">Resumo mensal sem coluna Banca</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">Base: entradas cadastradas</div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1450px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 text-left">Mês</th>
                <th className="px-3 py-3">Investimento</th>
                <th className="px-3 py-3">Lucro</th>
                <th className="px-3 py-3">ROI</th>
                <th className="px-3 py-3">Winrate</th>
                <th className="px-3 py-3">Pic</th>
                <th className="px-3 py-3">Green</th>
                <th className="px-3 py-3">Red</th>
                <th className="px-3 py-3">Void</th>
                <th className="px-3 py-3">Back</th>
                <th className="px-3 py-3">Lay</th>
                <th className="px-3 py-3">ROI Back</th>
                <th className="px-3 py-3">ROI Lay</th>
                <th className="px-3 py-3">Ticket Médio</th>
                <th className="px-3 py-3">Evolução</th>
              </tr>
            </thead>

            <tbody>
              {resumoMensal.map((item) => (
                <tr key={item.mes} className="border-b border-zinc-800 hover:bg-blue-500/10">
                  <td className="px-3 py-2 text-left font-bold text-blue-300">{item.mes}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{moneyDados(item.investimento)}</td>
                  <td className={`px-3 py-2 font-black ${item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}`}>{moneyDados(item.lucro)}</td>
                  <td className={`px-3 py-2 font-black ${item.roi >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roi.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{item.winrate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{item.pic}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{item.green}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{item.red}</td>
                  <td className="px-3 py-2 font-bold text-yellow-300">{item.void}</td>
                  <td className="px-3 py-2 font-bold text-blue-300">{item.back}</td>
                  <td className="px-3 py-2 font-bold text-pink-300">{item.lay}</td>
                  <td className={`px-3 py-2 font-black ${item.roiBack >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roiBack.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-black ${item.roiLay >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roiLay.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{moneyDados(item.ticketMedio)}</td>
                  <td className={`px-3 py-2 font-black ${item.evolucao >= 0 ? "text-emerald-300" : "text-red-300"}`}>{moneyDados(item.evolucao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


function parseDateUniversalJC(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === "string") {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  }

  return null;
}

function jcNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const s = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function jcMoney(value) {
  return jcNum(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const JC_MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const JC_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function useEntradasLocalStorage() {
  const [entradas, setEntradas] = useState([]);

  useEffect(() => {
    function carregar() {
      try {
        const raw = localStorage.getItem("entradas");
        const parsed = raw ? JSON.parse(raw) : [];

        const normalizadas = parsed.map((entrada) => ({
          ...entrada,
          stake: jcNum(entrada.stake),
          lucro: jcNum(entrada.lucro),
        }));

        setEntradas(normalizadas);
      } catch {
        setEntradas([]);
      }
    }

    carregar();
    window.addEventListener("storage", carregar);
    return () => window.removeEventListener("storage", carregar);
  }, []);

  return entradas;
}

function DiarioPage() {
  const entradas = useEntradasLocalStorage();
  const anoAtual = new Date().getFullYear();

  function entradasDoMes(mesIndex) {
    return entradas.filter((entrada) => {
      const data = parseDateUniversalJC(entrada.data);
      return data && data.getFullYear() === anoAtual && data.getMonth() === mesIndex;
    });
  }

  function gerarDias(mesIndex) {
    const ultimoDia = new Date(anoAtual, mesIndex + 1, 0).getDate();

    return Array.from({ length: ultimoDia }, (_, index) => {
      const dia = index + 1;
      const doDia = entradas.filter((entrada) => {
        const data = parseDateUniversalJC(entrada.data);
        return data && data.getFullYear() === anoAtual && data.getMonth() === mesIndex && data.getDate() === dia;
      });

      const total = doDia.reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0);

      return {
        dia,
        semana: new Date(anoAtual, mesIndex, dia).toLocaleDateString("pt-BR", { weekday: "short" }),
        total,
        qtd: doDia.length,
      };
    });
  }

  function resumoMensal(mesIndex) {
    const doMes = entradasDoMes(mesIndex);
    const total = doMes.reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0);
    const greens = doMes.filter((entrada) => jcNum(entrada.lucro) > 0).length;
    const reds = doMes.filter((entrada) => jcNum(entrada.lucro) < 0).length;
    const neutros = doMes.filter((entrada) => jcNum(entrada.lucro) === 0).length;
    const stake = doMes.reduce((acc, entrada) => acc + jcNum(entrada.stake), 0);
    const roi = stake ? (total / stake) * 100 : 0;

    return { total, greens, reds, neutros, stake, roi, qtd: doMes.length };
  }

  const cardsMensais = JC_MESES.map((nome, index) => ({
    nome,
    ...resumoMensal(index),
  }));

  const totalGanho = entradas
    .filter((entrada) => jcNum(entrada.lucro) > 0)
    .reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0);

  const totalPerdido = Math.abs(
    entradas
      .filter((entrada) => jcNum(entrada.lucro) < 0)
      .reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0)
  );

  const stakeMedia = entradas.length
    ? entradas.reduce((acc, entrada) => acc + jcNum(entrada.stake), 0) / entradas.length
    : 0;

  const balanco = totalGanho - totalPerdido;

  const grupos = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
  ];

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Diário</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Visão diária dos lucros e perdas por mês, usando as entradas cadastradas.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Total Ganho" value={jcMoney(totalGanho)} icon={ShieldCheck} tone="green" />
        <DadosStatCard title="Total Perdido" value={jcMoney(-totalPerdido)} icon={Target} tone="red" />
        <DadosStatCard title="Balanço" value={jcMoney(balanco)} icon={Wallet} tone={balanco >= 0 ? "green" : "red"} />
        <DadosStatCard title="Stake Média" value={jcMoney(stakeMedia)} icon={BarChart3} tone="blue" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-zinc-50">Resumo mensal</h2>

        <div className="flex flex-wrap gap-2">
          {cardsMensais.map((mes) => (
            <div
              key={mes.nome}
              className={`rounded-full border px-4 py-2 text-sm font-black ${
                mes.total > 0
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : mes.total < 0
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              {mes.nome.slice(0, 3)}: {mes.total >= 0 ? "+" : ""}{jcMoney(mes.total)}
            </div>
          ))}
        </div>
      </section>

      {grupos.map((grupo, grupoIndex) => (
        <section key={grupoIndex} className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          {grupo.map((mesIndex) => {
            const resumo = resumoMensal(mesIndex);

            return (
              <div key={mesIndex} className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
                <div className="border-b border-zinc-800 p-3 text-center">
                  <h3 className="text-lg font-black text-zinc-50">{JC_MESES[mesIndex]}</h3>
                  <p className={`text-sm font-bold ${resumo.total >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                    {jcMoney(resumo.total)} • ROI {resumo.roi.toFixed(1)}%
                  </p>
                </div>

                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {gerarDias(mesIndex).map((dia) => (
                        <tr key={dia.dia} className="border-b border-zinc-800 last:border-0">
                          <td className="px-3 py-2 font-bold text-zinc-300">
                            {String(dia.dia).padStart(2, "0")}/{String(mesIndex + 1).padStart(2, "0")}
                          </td>
                          <td className="px-3 py-2 text-zinc-500">{dia.semana}</td>
                          <td className="px-3 py-2 text-center">
                            {dia.total > 0 ? "🟢" : dia.total < 0 ? "🔴" : "—"}
                          </td>
                          <td className={`px-3 py-2 text-right font-black ${
                            dia.total > 0 ? "text-emerald-300" : dia.total < 0 ? "text-red-300" : "text-zinc-600"
                          }`}>
                            {dia.total === 0 ? "" : `${dia.total > 0 ? "+" : ""}${jcMoney(dia.total)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-400">
                  <span className="text-emerald-300">🟢 {resumo.greens}</span>
                  <span className="ml-3 text-red-300">🔴 {resumo.reds}</span>
                  <span className="ml-3 text-yellow-300">🟡 {resumo.neutros}</span>
                  <span className="ml-3">Pics: {resumo.qtd}</span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function CalendarioPage() {
  const entradas = useEntradasLocalStorage();

  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  function mudarMes(delta) {
    const base = new Date(ano, mes, 1);
    base.setMonth(base.getMonth() + delta);
    setMes(base.getMonth());
    setAno(base.getFullYear());
  }

  const anosDisponiveis = useMemo(() => {
    const lista = [];
    for (let anoItem = hoje.getFullYear() - 3; anoItem <= hoje.getFullYear() + 3; anoItem += 1) {
      lista.push(anoItem);
    }
    return lista;
  }, []);

  const mapaDias = useMemo(() => {
    const acc = {};

    entradas.forEach((entrada) => {
      const data = parseDateUniversalJC(entrada.data);
      if (!data) return;
      if (data.getMonth() !== mes || data.getFullYear() !== ano) return;

      const dia = data.getDate();
      if (!acc[dia]) acc[dia] = { stake: 0, lucro: 0, qtd: 0 };

      acc[dia].stake += jcNum(entrada.stake);
      acc[dia].lucro += jcNum(entrada.lucro);
      acc[dia].qtd += 1;
    });

    for (const dia in acc) {
      acc[dia].roi = acc[dia].stake ? (acc[dia].lucro / acc[dia].stake) * 100 : 0;
    }

    return acc;
  }, [entradas, mes, ano]);

  const diasCalendario = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < primeiroDiaSemana; i += 1) {
      cells.push({ vazio: true, key: `empty-${i}` });
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      const info = mapaDias[dia] || { stake: 0, lucro: 0, qtd: 0, roi: 0 };
      cells.push({ dia, ...info, key: `dia-${dia}` });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ vazio: true, key: `end-${cells.length}` });
    }

    return cells;
  }, [mapaDias, mes, ano]);

  const totaisMes = useMemo(() => {
    let stake = 0;
    let lucro = 0;
    let qtd = 0;

    Object.values(mapaDias).forEach((dia) => {
      stake += dia.stake;
      lucro += dia.lucro;
      qtd += dia.qtd;
    });

    const roi = stake ? (lucro / stake) * 100 : 0;
    return { stake, lucro, qtd, roi };
  }, [mapaDias]);

  function cellClass(cell) {
    if (!cell.qtd) return "border-zinc-800 bg-zinc-950 text-zinc-600";
    if (cell.lucro > 0) return "border-emerald-400/30 bg-emerald-500/20 text-emerald-100";
    if (cell.lucro < 0) return "border-red-400/30 bg-red-500/20 text-red-100";
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-100";
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Calendário</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Calendário mensal com ROI, lucro e quantidade de entradas por dia.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Mês</p>
          <p className="mt-1 text-2xl font-black text-zinc-50">{JC_MESES[mes]} / {ano}</p>
        </div>
        <DadosStatCard title="ROI do mês" value={`${totaisMes.roi.toFixed(2)}%`} icon={Activity} tone={totaisMes.roi >= 0 ? "green" : "red"} />
        <DadosStatCard title="Lucro" value={jcMoney(totaisMes.lucro)} icon={Wallet} tone={totaisMes.lucro >= 0 ? "green" : "red"} />
        <DadosStatCard title="Apostas" value={totaisMes.qtd} icon={Database} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button onClick={() => mudarMes(-1)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900">
            ◀ Mês anterior
          </button>

          <div className="flex items-center justify-center gap-2">
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none">
              {JC_MESES.map((nome, index) => (
                <option key={nome} value={index}>{nome}</option>
              ))}
            </select>

            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none">
              {anosDisponiveis.map((anoItem) => (
                <option key={anoItem} value={anoItem}>{anoItem}</option>
              ))}
            </select>
          </div>

          <button onClick={() => mudarMes(1)} className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900">
            Próximo mês ▶
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-wide text-zinc-500">
          {JC_SEMANA.map((dia, index) => (
            <div key={`${dia}-${index}`}>{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {diasCalendario.map((cell) => {
            if (cell.vazio) {
              return (
                <div key={cell.key} className="h-24 rounded-2xl border border-zinc-900 bg-black/40" />
              );
            }

            return (
              <div
                key={cell.key}
                title={`ROI: ${cell.roi.toFixed(2)}% | Apostas: ${cell.qtd} | Lucro: ${jcMoney(cell.lucro)} | Stake: ${jcMoney(cell.stake)}`}
                className={`flex h-24 flex-col justify-between rounded-2xl border p-3 shadow-sm ${cellClass(cell)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">{cell.dia}</span>
                  <span className="text-xs font-black">{cell.qtd ? `${cell.qtd}x` : ""}</span>
                </div>

                <div className="text-center text-sm font-black">
                  {cell.qtd ? `${cell.roi > 0 ? "+" : ""}${cell.roi.toFixed(1)}%` : "—"}
                </div>

                <div className="truncate text-center text-[11px] font-bold opacity-90">
                  {cell.qtd ? jcMoney(cell.lucro) : "sem entrada"}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ClassicMoney(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ClassicNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function buildResumoPorCampo(entradas, campo, labelKey = "nome") {
  const map = new Map();

  entradas.forEach((entrada) => {
    const nome = entrada[campo] || "Sem informação";

    if (!map.has(nome)) {
      map.set(nome, {
        [labelKey]: nome,
        investimento: 0,
        lucro: 0,
        pic: 0,
        green: 0,
        red: 0,
        void: 0,
        back: 0,
        lay: 0,
      });
    }

    const row = map.get(nome);
    row.investimento += ClassicNumber(entrada.stake);
    row.lucro += ClassicNumber(entrada.lucro);
    row.pic += 1;

    if (String(entrada.resultado).toLowerCase() === "green") row.green += 1;
    if (String(entrada.resultado).toLowerCase() === "red") row.red += 1;
    if (String(entrada.resultado).toLowerCase() === "void") row.void += 1;
    if (entrada.modo === "Back") row.back += 1;
    if (entrada.modo === "Lay") row.lay += 1;
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.pic ? (row.green / row.pic) * 100 : 0,
    }))
    .sort((a, b) => b.lucro - a.lucro);
}

function MiniBarList({ data, labelKey }) {
  const top = data.slice(0, 12);
  const maxAbs = Math.max(...top.map((item) => Math.abs(item.lucro)), 1);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-black text-zinc-50">Ranking visual</h2>
        <p className="text-sm text-zinc-500">Top 12 por lucro/prejuízo</p>
      </div>

      <div className="space-y-3">
        {top.map((item) => {
          const width = Math.max(8, (Math.abs(item.lucro) / maxAbs) * 100);
          const positive = item.lucro >= 0;

          return (
            <div key={item[labelKey]} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate text-zinc-300">{item[labelKey]}</span>
                <span className={positive ? "text-emerald-300" : "text-red-300"}>
                  {ClassicMoney(item.lucro)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}

        {!top.length && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5 text-center text-sm font-semibold text-zinc-500">
            Sem dados para exibir.
          </div>
        )}
      </div>
    </section>
  );
}

function RankingTable({ data, labelKey, labelTitle }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <h2 className="text-lg font-black text-zinc-50">Tabela detalhada</h2>
          <p className="text-sm text-zinc-500">Ordenado por lucro</p>
        </div>
        <div className="text-xs font-bold text-zinc-500">{data.length} registros</div>
      </div>

      <div className="max-h-[680px] overflow-auto">
        <table className="w-full min-w-[1250px] border-collapse text-center text-sm">
          <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
            <tr>
              <th className="px-3 py-3">Rank</th>
              <th className="px-3 py-3 text-left">{labelTitle}</th>
              <th className="px-3 py-3">Investimento</th>
              <th className="px-3 py-3">Lucro</th>
              <th className="px-3 py-3">ROI</th>
              <th className="px-3 py-3">Winrate</th>
              <th className="px-3 py-3">Pic</th>
              <th className="px-3 py-3">Green</th>
              <th className="px-3 py-3">Red</th>
              <th className="px-3 py-3">Void</th>
              <th className="px-3 py-3">Back</th>
              <th className="px-3 py-3">Lay</th>
            </tr>
          </thead>

          <tbody>
            {data.map((item, index) => (
              <tr key={`${item[labelKey]}-${index}`} className="border-b border-zinc-800 hover:bg-blue-500/10">
                <td className="px-3 py-2 font-black text-zinc-300">#{index + 1}</td>
                <td className="px-3 py-2 text-left font-bold text-blue-300">{item[labelKey]}</td>
                <td className="px-3 py-2 font-bold text-zinc-300">{ClassicMoney(item.investimento)}</td>
                <td className={`px-3 py-2 font-black ${item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {ClassicMoney(item.lucro)}
                </td>
                <td className={`px-3 py-2 font-black ${item.roi >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {item.roi.toFixed(1)}%
                </td>
                <td className="px-3 py-2 font-bold text-zinc-200">{item.winrate.toFixed(1)}%</td>
                <td className="px-3 py-2 font-bold text-zinc-200">{item.pic}</td>
                <td className="px-3 py-2 font-bold text-emerald-300">{item.green}</td>
                <td className="px-3 py-2 font-bold text-red-300">{item.red}</td>
                <td className="px-3 py-2 font-bold text-yellow-300">{item.void}</td>
                <td className="px-3 py-2 font-bold text-blue-300">{item.back}</td>
                <td className="px-3 py-2 font-bold text-pink-300">{item.lay}</td>
              </tr>
            ))}

            {!data.length && (
              <tr>
                <td colSpan="12" className="px-4 py-10 text-center text-zinc-500">
                  Nenhum dado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LigasTimesClassicPage() {
  const [entradas, setEntradas] = useState(() => {
    try {
      const saved = localStorage.getItem("entradas");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [modo, setModo] = useState("Ligas");
  const [tipoTime, setTipoTime] = useState("Mandante");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    function syncEntradas() {
      try {
        const saved = localStorage.getItem("entradas");
        setEntradas(saved ? JSON.parse(saved) : []);
      } catch {
        setEntradas([]);
      }
    }

    syncEntradas();
    window.addEventListener("storage", syncEntradas);
    return () => window.removeEventListener("storage", syncEntradas);
  }, []);

  const dados = useMemo(() => {
    if (modo === "Ligas") return buildResumoPorCampo(entradas, "liga", "nome");
    if (tipoTime === "Mandante") return buildResumoPorCampo(entradas, "casa", "nome");
    if (tipoTime === "Visitante") return buildResumoPorCampo(entradas, "visitante", "nome");

    const casa = buildResumoPorCampo(entradas, "casa", "nome");
    const visitante = buildResumoPorCampo(entradas, "visitante", "nome");
    const map = new Map();

    [...casa, ...visitante].forEach((row) => {
      if (!map.has(row.nome)) {
        map.set(row.nome, {
          nome: row.nome,
          investimento: 0,
          lucro: 0,
          pic: 0,
          green: 0,
          red: 0,
          void: 0,
          back: 0,
          lay: 0,
        });
      }

      const target = map.get(row.nome);
      target.investimento += row.investimento;
      target.lucro += row.lucro;
      target.pic += row.pic;
      target.green += row.green;
      target.red += row.red;
      target.void += row.void;
      target.back += row.back;
      target.lay += row.lay;
    });

    return [...map.values()]
      .map((row) => ({
        ...row,
        roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
        winrate: row.pic ? (row.green / row.pic) * 100 : 0,
      }))
      .sort((a, b) => b.lucro - a.lucro);
  }, [entradas, modo, tipoTime]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return dados;
    return dados.filter((item) => item.nome.toLowerCase().includes(termo));
  }, [dados, busca]);

  const melhor = filtrados[0] || { nome: "—", lucro: 0, roi: 0, pic: 0 };
  const pior = filtrados.length ? filtrados[filtrados.length - 1] : { nome: "—", lucro: 0, roi: 0, pic: 0 };
  const totalLucro = filtrados.reduce((acc, item) => acc + item.lucro, 0);
  const totalInvestimento = filtrados.reduce((acc, item) => acc + item.investimento, 0);
  const totalPics = filtrados.reduce((acc, item) => acc + item.pic, 0);
  const roiGeral = totalInvestimento ? (totalLucro / totalInvestimento) * 100 : 0;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Ligas e Times</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Consulta unificada por liga, mandante, visitante ou time geral, baseada nas entradas cadastradas.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Registros" value={filtrados.length} icon={Database} />
        <DadosStatCard title="Pics" value={totalPics} icon={Activity} />
        <DadosStatCard title="Lucro Geral" value={ClassicMoney(totalLucro)} icon={Wallet} tone={totalLucro >= 0 ? "green" : "red"} />
        <DadosStatCard title="ROI Geral" value={`${roiGeral.toFixed(1)}%`} icon={BarChart3} tone={roiGeral >= 0 ? "green" : "red"} />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Melhor resultado</p>
          <h2 className="mt-1 text-xl font-black text-zinc-50">{melhor.nome}</h2>
          <p className="text-sm font-bold text-emerald-300">{ClassicMoney(melhor.lucro)} • ROI {Number(melhor.roi || 0).toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">Pior resultado</p>
          <h2 className="mt-1 text-xl font-black text-zinc-50">{pior.nome}</h2>
          <p className="text-sm font-bold text-red-300">{ClassicMoney(pior.lucro)} • ROI {Number(pior.roi || 0).toFixed(1)}%</p>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect label="Consulta" value={modo} onChange={setModo} options={["Ligas", "Times"]} />

          {modo === "Times" && (
            <FilterSelect label="Tipo" value={tipoTime} onChange={setTipoTime} options={["Mandante", "Visitante", "Geral"]} />
          )}

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400 md:col-span-2">
            Pesquisar
            <input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder={modo === "Ligas" ? "Buscar liga..." : "Buscar time..."}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>
      </section>

      <MiniBarList data={filtrados} labelKey="nome" />

      <RankingTable
        data={filtrados}
        labelKey="nome"
        labelTitle={modo === "Ligas" ? "Liga" : tipoTime === "Mandante" ? "Time mandante" : tipoTime === "Visitante" ? "Time visitante" : "Time"}
      />
    </div>
  );
}

function HelpClassicPage() {
  const [hedge, setHedge] = useState({
    stakeBack: "",
    oddBack: "",
    oddLay: "",
    stakeLay: "",
    oddLay2: "",
    oddBack2: "",
    modo: "back-to-lay",
  });

  const [freebet, setFreebet] = useState({
    stakeBack: "",
    oddBack: "",
    oddLay: "",
    stakeLay: "",
    oddLay2: "",
    oddBack2: "",
    modo: "back-to-lay",
  });

  const [commission, setCommission] = useState({ pct: "", profit: "" });
  const [dutch, setDutch] = useState({ stake: "", odds: [2, 3] });
  const [evCalc, setEvCalc] = useState({ stake: "", odd: "", prob: "" });
  const [split, setSplit] = useState({ stake: "", odd1: "", odd2: "" });

  const hStakeBack = ClassicNumber(hedge.stakeBack);
  const hOddBack = ClassicNumber(hedge.oddBack);
  const hOddLay = ClassicNumber(hedge.oddLay);
  const hStakeLay = ClassicNumber(hedge.stakeLay);
  const hOddLay2 = ClassicNumber(hedge.oddLay2);
  const hOddBack2 = ClassicNumber(hedge.oddBack2);

  let hedgeStake = 0;
  let hedgeProfit = 0;

  if (hedge.modo === "back-to-lay" && hStakeBack && hOddBack && hOddLay) {
    hedgeStake = (hStakeBack * hOddBack) / hOddLay;
    hedgeProfit = hStakeBack * hOddBack - hedgeStake;
  }

  if (hedge.modo === "lay-to-back" && hStakeLay && hOddLay2 && hOddBack2) {
    hedgeStake = (hStakeLay * hOddLay2) / hOddBack2;
    hedgeProfit = hStakeLay * hOddLay2 - hedgeStake;
  }

  let freeStake = 0;
  let freeProfit = 0;

  if (freebet.modo === "back-to-lay" && ClassicNumber(freebet.stakeBack)) {
    freeStake = ClassicNumber(freebet.stakeBack);
    freeProfit = ClassicNumber(freebet.stakeBack);
  }

  if (
    freebet.modo === "lay-to-back" &&
    ClassicNumber(freebet.stakeLay) &&
    ClassicNumber(freebet.oddLay2) &&
    ClassicNumber(freebet.oddBack2) > 1
  ) {
    const liability = ClassicNumber(freebet.stakeLay) * (ClassicNumber(freebet.oddLay2) - 1);
    freeStake = liability / (ClassicNumber(freebet.oddBack2) - 1);
    freeProfit = freeStake;
  }

  const net =
    ClassicNumber(commission.profit) -
    (ClassicNumber(commission.profit) * ClassicNumber(commission.pct)) / 100;

  const validDutchOdds = dutch.odds.filter((odd) => Number(odd) > 1);
  const invSum = validDutchOdds.reduce((acc, odd) => acc + 1 / Number(odd), 0);
  const dutchDist = validDutchOdds.map((odd) => ClassicNumber(dutch.stake) / (Number(odd) * invSum || 1));
  const retornoDutch = dutchDist.length ? dutchDist[0] * validDutchOdds[0] : 0;
  const lucroDutch = retornoDutch - ClassicNumber(dutch.stake);
  const roiDutch = ClassicNumber(dutch.stake) ? (lucroDutch / ClassicNumber(dutch.stake)) * 100 : 0;

  const evStake = ClassicNumber(evCalc.stake);
  const evOdd = ClassicNumber(evCalc.odd);
  const evProb = ClassicNumber(evCalc.prob);
  const evValue = evStake && evOdd && evProb
    ? (evProb / 100) * ((evOdd - 1) * evStake) - (1 - evProb / 100) * evStake
    : 0;
  const evPerc = evStake ? (evValue / evStake) * 100 : 0;

  const splitStake = ClassicNumber(split.stake);
  const splitOdd1 = ClassicNumber(split.odd1);
  const splitOdd2 = ClassicNumber(split.odd2);
  const splitAposta1 = splitStake && splitOdd1 ? splitStake / splitOdd1 : 0;
  const splitAposta2 = splitStake - splitAposta1;
  const splitRetorno2 = splitAposta2 * splitOdd2;
  const splitLiquidoTake = splitRetorno2 - splitStake;
  const splitRoi = splitStake ? (splitLiquidoTake / splitStake) * 100 : 0;

  const inputClass = "h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500";

  function HelpCard({ title, children }) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-black text-zinc-50">{title}</h2>
        {children}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Help</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Calculadoras operacionais: Hedge, Freebet, Comissão, Dutching, +EV e Split Stake.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <HelpCard title="Hedge">
          <div className="mb-3 flex gap-3 text-sm font-bold text-zinc-300">
            <label><input type="radio" checked={hedge.modo === "back-to-lay"} onChange={() => setHedge({ ...hedge, modo: "back-to-lay" })} /> Back → Lay</label>
            <label><input type="radio" checked={hedge.modo === "lay-to-back"} onChange={() => setHedge({ ...hedge, modo: "lay-to-back" })} /> Lay → Back</label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {hedge.modo === "back-to-lay" ? (
              <>
                <input className={inputClass} type="number" placeholder="Stake Back" value={hedge.stakeBack} onChange={(e) => setHedge({ ...hedge, stakeBack: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Back" value={hedge.oddBack} onChange={(e) => setHedge({ ...hedge, oddBack: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Lay" value={hedge.oddLay} onChange={(e) => setHedge({ ...hedge, oddLay: e.target.value })} />
              </>
            ) : (
              <>
                <input className={inputClass} type="number" placeholder="Stake Lay" value={hedge.stakeLay} onChange={(e) => setHedge({ ...hedge, stakeLay: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Lay" value={hedge.oddLay2} onChange={(e) => setHedge({ ...hedge, oddLay2: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Back" value={hedge.oddBack2} onChange={(e) => setHedge({ ...hedge, oddBack2: e.target.value })} />
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DadosStatCard title="Stake saída" value={ClassicMoney(hedgeStake)} icon={Activity} />
            <DadosStatCard title="Lucro" value={ClassicMoney(hedgeProfit)} icon={Wallet} tone={hedgeProfit >= 0 ? "green" : "red"} />
          </div>
        </HelpCard>

        <HelpCard title="Freebet">
          <div className="mb-3 flex gap-3 text-sm font-bold text-zinc-300">
            <label><input type="radio" checked={freebet.modo === "back-to-lay"} onChange={() => setFreebet({ ...freebet, modo: "back-to-lay" })} /> Back → Lay</label>
            <label><input type="radio" checked={freebet.modo === "lay-to-back"} onChange={() => setFreebet({ ...freebet, modo: "lay-to-back" })} /> Lay → Back</label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {freebet.modo === "back-to-lay" ? (
              <>
                <input className={inputClass} type="number" placeholder="Stake Back" value={freebet.stakeBack} onChange={(e) => setFreebet({ ...freebet, stakeBack: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Back" value={freebet.oddBack} onChange={(e) => setFreebet({ ...freebet, oddBack: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Lay" value={freebet.oddLay} onChange={(e) => setFreebet({ ...freebet, oddLay: e.target.value })} />
              </>
            ) : (
              <>
                <input className={inputClass} type="number" placeholder="Stake Lay" value={freebet.stakeLay} onChange={(e) => setFreebet({ ...freebet, stakeLay: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Lay" value={freebet.oddLay2} onChange={(e) => setFreebet({ ...freebet, oddLay2: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Odd Back saída" value={freebet.oddBack2} onChange={(e) => setFreebet({ ...freebet, oddBack2: e.target.value })} />
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DadosStatCard title="Stake saída" value={ClassicMoney(freeStake)} icon={Activity} />
            <DadosStatCard title="Lucro" value={ClassicMoney(freeProfit)} icon={Wallet} tone={freeProfit >= 0 ? "green" : "red"} />
          </div>
        </HelpCard>

        <HelpCard title="Comissão">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={inputClass} type="number" placeholder="Comissão (%)" value={commission.pct} onChange={(e) => setCommission({ ...commission, pct: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Lucro bruto" value={commission.profit} onChange={(e) => setCommission({ ...commission, profit: e.target.value })} />
          </div>

          <div className="mt-4">
            <DadosStatCard title="Líquido" value={ClassicMoney(net)} icon={Wallet} tone={net >= 0 ? "green" : "red"} />
          </div>
        </HelpCard>

        <HelpCard title="Dutching">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className={inputClass} type="number" placeholder="Stake total" value={dutch.stake} onChange={(e) => setDutch({ ...dutch, stake: e.target.value })} />
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700" onClick={() => setDutch({ ...dutch, odds: [...dutch.odds, 0] })}>
              + Odd
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            {dutch.odds.map((odd, index) => (
              <input
                key={index}
                className={inputClass}
                type="number"
                step="0.01"
                placeholder={`Odd ${index + 1}`}
                value={odd}
                onChange={(e) => {
                  const odds = [...dutch.odds];
                  odds[index] = Number(e.target.value);
                  setDutch({ ...dutch, odds });
                }}
              />
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm font-bold text-zinc-300">
            {dutchDist.map((valor, index) => (
              <div key={index}>Seleção {index + 1}: {ClassicMoney(valor)}</div>
            ))}
            <div className={lucroDutch >= 0 ? "text-emerald-300" : "text-red-300"}>
              Resultado: {ClassicMoney(lucroDutch)} ({roiDutch.toFixed(2)}%)
            </div>
          </div>
        </HelpCard>

        <HelpCard title="Valor Esperado (+EV)">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className={inputClass} type="number" placeholder="Stake" value={evCalc.stake} onChange={(e) => setEvCalc({ ...evCalc, stake: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Odd" value={evCalc.odd} onChange={(e) => setEvCalc({ ...evCalc, odd: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Probabilidade (%)" value={evCalc.prob} onChange={(e) => setEvCalc({ ...evCalc, prob: e.target.value })} />
          </div>

          <div className="mt-4">
            <DadosStatCard title="Valor esperado" value={`${ClassicMoney(evValue)} (${evPerc.toFixed(2)}%)`} icon={Activity} tone={evValue >= 0 ? "green" : "red"} />
          </div>
        </HelpCard>

        <HelpCard title="Split Stake">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className={inputClass} type="number" placeholder="Stake total" value={split.stake} onChange={(e) => setSplit({ ...split, stake: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Odd STOP" value={split.odd1} onChange={(e) => setSplit({ ...split, odd1: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Odd TAKE" value={split.odd2} onChange={(e) => setSplit({ ...split, odd2: e.target.value })} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <DadosStatCard title="Aposta STOP" value={ClassicMoney(splitAposta1)} icon={Target} tone="blue" />
            <DadosStatCard title="Aposta TAKE" value={ClassicMoney(splitAposta2)} icon={ShieldCheck} tone="green" />
            <DadosStatCard title="Resultado TAKE" value={`${ClassicMoney(splitLiquidoTake)} (${splitRoi.toFixed(2)}%)`} icon={Wallet} tone={splitLiquidoTake >= 0 ? "green" : "red"} />
          </div>
        </HelpCard>
      </section>
    </div>
  );
}

function moneyClassic(value) {
  const n = Number(value || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numClassic(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function parseDateClassic(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  return null;
}

function useClassicEntradas() {
  const [entradas, setEntradas] = useState([]);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem("entradas");
        setEntradas(raw ? JSON.parse(raw) : []);
      } catch {
        setEntradas([]);
      }
    }

    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  return entradas;
}

function classifyPerformance(roi, winrate, total) {
  if (total >= 10 && roi >= 15 && winrate >= 65) return "🔥 Elite";
  if (total >= 5 && roi >= 5 && winrate >= 55) return "✅ Bom";
  if (roi >= 0) return "⚠️ Médio";
  return "❌ Ruim";
}

function DarkTable({ title, subtitle, headers, rows, empty = "Nenhum dado encontrado." }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <h2 className="text-lg font-black text-zinc-50">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>
        <div className="text-xs font-bold text-zinc-500">{rows.length} linhas</div>
      </div>

      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-center text-sm">
          <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={`px-3 py-3 ${i === 0 ? "text-left" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-zinc-800 hover:bg-blue-500/10">
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-3 py-2 ${ci === 0 ? "text-left font-bold text-blue-300" : "font-semibold text-zinc-300"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-zinc-500">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniBarRanking({ data, labelKey = "nome", valueKey = "lucro", title = "Ranking visual" }) {
  const top = data.slice(0, 14);
  const maxAbs = Math.max(...top.map((item) => Math.abs(Number(item[valueKey] || 0))), 1);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <h2 className="text-lg font-black text-zinc-50">{title}</h2>
      <p className="mb-3 text-sm text-zinc-500">Top 14 por resultado</p>

      <div className="space-y-3">
        {top.map((item) => {
          const value = Number(item[valueKey] || 0);
          const positive = value >= 0;
          const width = Math.max(6, (Math.abs(value) / maxAbs) * 100);

          return (
            <div key={item[labelKey]} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate text-zinc-300">{item[labelKey]}</span>
                <span className={positive ? "text-emerald-300" : "text-red-300"}>{moneyClassic(value)}</span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-950">
                <div className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildGroupedStats(entradas, keyGetter, nameKey = "nome") {
  const map = new Map();

  entradas.forEach((entrada) => {
    const nome = keyGetter(entrada) || "Sem informação";
    if (!map.has(nome)) {
      map.set(nome, {
        [nameKey]: nome,
        total: 0,
        investimento: 0,
        lucro: 0,
        green: 0,
        red: 0,
        void: 0,
        back: 0,
        lay: 0,
      });
    }

    const row = map.get(nome);
    const lucro = numClassic(entrada.lucro);
    const stake = numClassic(entrada.stake);
    const resultado = String(entrada.resultado || "").toLowerCase();

    row.total += 1;
    row.investimento += stake;
    row.lucro += lucro;
    if (resultado === "green") row.green += 1;
    if (resultado === "red") row.red += 1;
    if (resultado === "void") row.void += 1;
    if (entrada.modo === "Back") row.back += 1;
    if (entrada.modo === "Lay") row.lay += 1;
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.total ? (row.green / row.total) * 100 : 0,
      score: Math.round(Math.max(0, Math.min(100, (row.roi || 0) + (row.winrate || 0)))),
    }))
    .sort((a, b) => b.lucro - a.lucro);
}

function faixaOddClassic(odd) {
  const value = numClassic(odd);
  if (!value || value <= 1.5) return "≤ 1.50";
  if (value <= 2) return "1.51 – 2.00";
  if (value <= 2.5) return "2.01 – 2.50";
  if (value <= 3.5) return "2.51 – 3.50";
  if (value <= 5) return "3.51 – 5.00";
  return "≥ 5.01";
}

/* ===================== MÉTODOS & ODDS ===================== */
function MetodosOddsClassicPage() {
  const entradas = useClassicEntradas();
  const [view, setView] = useState("Métodos");
  const [busca, setBusca] = useState("");

  const metodosFixos = ["Casa", "Fora", "Draw", "Vovô", "0x1", "1x0", "P.A", "Gol. Casa", "Gol. Fora", "Over", "Under"];
  const mercadosFixos = ["Match Odds", "Correct Score", "Over", "Under"];

  const metodoStats = useMemo(() => {
    const stats = buildGroupedStats(entradas, (e) => e.metodo || "Sem Método", "nome");
    metodosFixos.forEach((metodo) => {
      if (!stats.find((item) => item.nome === metodo)) {
        stats.push({ nome: metodo, total: 0, investimento: 0, lucro: 0, green: 0, red: 0, void: 0, back: 0, lay: 0, roi: 0, winrate: 0 });
      }
    });
    return stats.sort((a, b) => b.lucro - a.lucro);
  }, [entradas]);

  const oddStats = useMemo(() => buildGroupedStats(entradas, (e) => faixaOddClassic(e.odd), "nome"), [entradas]);

  const mercadoStats = useMemo(() => {
    const stats = buildGroupedStats(entradas, (e) => e.mercado || "Sem Mercado", "nome");
    mercadosFixos.forEach((mercado) => {
      if (!stats.find((item) => item.nome === mercado)) {
        stats.push({ nome: mercado, total: 0, investimento: 0, lucro: 0, green: 0, red: 0, void: 0, back: 0, lay: 0, roi: 0, winrate: 0 });
      }
    });
    return stats.sort((a, b) => b.lucro - a.lucro);
  }, [entradas]);

  const diaSemanaStats = useMemo(() => {
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const base = dias.map((d) => ({ nome: d, total: 0, investimento: 0, lucro: 0, green: 0, red: 0, void: 0, back: 0, lay: 0, roi: 0, winrate: 0 }));

    entradas.forEach((entrada) => {
      const d = parseDateClassic(entrada.data);
      if (!d) return;
      const row = base[d.getDay()];
      const lucro = numClassic(entrada.lucro);
      const stake = numClassic(entrada.stake);
      const result = String(entrada.resultado || "").toLowerCase();
      row.total += 1;
      row.investimento += stake;
      row.lucro += lucro;
      if (result === "green") row.green += 1;
      if (result === "red") row.red += 1;
      if (result === "void") row.void += 1;
      if (entrada.modo === "Back") row.back += 1;
      if (entrada.modo === "Lay") row.lay += 1;
    });

    return base.map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.total ? (row.green / row.total) * 100 : 0,
    }));
  }, [entradas]);

  const activeData = view === "Métodos" ? metodoStats : view === "Odds" ? oddStats : view === "Mercados" ? mercadoStats : diaSemanaStats;
  const filtered = activeData.filter((item) => item.nome.toLowerCase().includes(busca.toLowerCase()));
  const best = filtered[0] || { nome: "—", lucro: 0, roi: 0, winrate: 0, total: 0 };
  const worst = filtered.length ? filtered[filtered.length - 1] : { nome: "—", lucro: 0, roi: 0, winrate: 0, total: 0 };
  const totalLucro = filtered.reduce((acc, item) => acc + item.lucro, 0);
  const totalInvest = filtered.reduce((acc, item) => acc + item.investimento, 0);
  const roiGeral = totalInvest ? (totalLucro / totalInvest) * 100 : 0;

  const rows = filtered.map((item) => [
    item.nome,
    <span className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>{moneyClassic(item.lucro)}</span>,
    <span className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}>{item.roi.toFixed(1)}%</span>,
    `${item.winrate.toFixed(1)}%`,
    item.total,
    <span className="text-blue-300">{item.back}</span>,
    <span className="text-pink-300">{item.lay}</span>,
    <span className="text-emerald-300">{item.green}</span>,
    <span className="text-red-300">{item.red}</span>,
    <span className="text-yellow-300">{item.void}</span>,
    classifyPerformance(item.roi, item.winrate, item.total),
  ]);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Métodos & Odds</h1>
        <p className="mt-1 text-sm text-zinc-400">Análise por método, faixa de odds, mercado e dia da semana.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Melhor" value={best.nome} icon={Trophy} tone="green" />
        <DadosStatCard title="Pior" value={worst.nome} icon={Target} tone="red" />
        <DadosStatCard title="Lucro Geral" value={moneyClassic(totalLucro)} icon={Wallet} tone={totalLucro >= 0 ? "green" : "red"} />
        <DadosStatCard title="ROI Geral" value={`${roiGeral.toFixed(1)}%`} icon={Activity} tone={roiGeral >= 0 ? "green" : "red"} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect label="Analisar por" value={view} onChange={setView} options={["Métodos", "Odds", "Mercados", "Dia da Semana"]} />

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400 md:col-span-3">
            Pesquisar
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar método, mercado, odd..."
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-fuchsia-500"
            />
          </label>
        </div>
      </section>

      <MiniBarRanking data={filtered} />

      <DarkTable
        title={`Desempenho por ${view}`}
        subtitle="Lucro, ROI, winrate, back/lay e classificação"
        headers={["Nome", "Lucro", "ROI", "Winrate", "Total", "Back", "Lay", "Green", "Red", "Void", "Classe"]}
        rows={rows}
      />
    </div>
  );
}

/* ===================== ANÁLISE ===================== */
function AnaliseClassicPage() {
  const entradas = useClassicEntradas();

  const parsed = useMemo(() => {
    return entradas
      .map((entrada) => {
        const data = parseDateClassic(entrada.data);
        return {
          ...entrada,
          data,
          ymd: data ? `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}` : null,
          lucro: numClassic(entrada.lucro),
          stake: numClassic(entrada.stake),
          odd: numClassic(entrada.odd),
          metodo: entrada.metodo || "Sem Método",
          mercado: entrada.mercado || "Sem Mercado",
          resultado: String(entrada.resultado || "").toLowerCase(),
        };
      })
      .filter((entrada) => entrada.data);
  }, [entradas]);

  const equityData = useMemo(() => {
    const byDay = {};
    parsed.forEach((entrada) => {
      byDay[entrada.ymd] = (byDay[entrada.ymd] || 0) + entrada.lucro;
    });

    let acc = 0;
    return Object.keys(byDay)
      .sort()
      .map((date) => {
        acc += byDay[date];
        return { nome: date, lucro: acc };
      });
  }, [parsed]);

  const metodoStats = useMemo(() => buildGroupedStats(parsed, (e) => e.metodo, "nome"), [parsed]);
  const mercadoStats = useMemo(() => buildGroupedStats(parsed, (e) => e.mercado, "nome"), [parsed]);

  const totais = useMemo(() => {
    const investimento = parsed.reduce((acc, item) => acc + item.stake, 0);
    const lucro = parsed.reduce((acc, item) => acc + item.lucro, 0);
    const green = parsed.filter((item) => item.resultado === "green").length;
    const red = parsed.filter((item) => item.resultado === "red").length;
    const roi = investimento ? (lucro / investimento) * 100 : 0;
    const winrate = parsed.length ? (green / parsed.length) * 100 : 0;

    const profitGross = parsed.filter((item) => item.lucro > 0).reduce((acc, item) => acc + item.lucro, 0);
    const lossGross = Math.abs(parsed.filter((item) => item.lucro < 0).reduce((acc, item) => acc + item.lucro, 0));
    const profitFactor = lossGross ? profitGross / lossGross : profitGross ? profitGross : 0;

    let acc = 0;
    let peak = 0;
    let drawdown = 0;
    parsed
      .slice()
      .sort((a, b) => a.data - b.data)
      .forEach((item) => {
        acc += item.lucro;
        peak = Math.max(peak, acc);
        drawdown = Math.min(drawdown, acc - peak);
      });

    const consistency = Math.round(Math.max(0, Math.min(100, winrate * 0.45 + Math.max(0, roi) * 1.1 + Math.min(30, profitFactor * 8))));

    return { investimento, lucro, green, red, roi, winrate, profitFactor, drawdown, consistency };
  }, [parsed]);

  const oddStats = useMemo(() => buildGroupedStats(parsed, (e) => faixaOddClassic(e.odd), "nome"), [parsed]);

  const outliers = metodoStats
    .filter((item) => item.total >= 5 && Math.abs(item.roi) >= 10)
    .sort((a, b) => Math.abs(b.roi) - Math.abs(a.roi));

  const kellyRows = metodoStats
    .map((item) => {
      const odds = parsed.filter((e) => e.metodo === item.nome).map((e) => e.odd).filter(Boolean);
      const oddMed = odds.length ? odds.reduce((a, b) => a + b, 0) / odds.length : 0;
      const p = item.winrate / 100;
      const b = Math.max(0, oddMed - 1);
      const kelly = b > 0 ? Math.max(0, (b * p - (1 - p)) / b) : 0;
      return { ...item, oddMed, kelly, kelly25: kelly * 0.25 };
    })
    .sort((a, b) => b.kelly25 - a.kelly25)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Análise</h1>
        <p className="mt-1 text-sm text-zinc-400">Equity, consistência, drawdown, Kelly, outliers e leitura estatística.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <DadosStatCard title="Lucro" value={moneyClassic(totais.lucro)} icon={Wallet} tone={totais.lucro >= 0 ? "green" : "red"} />
        <DadosStatCard title="ROI" value={`${totais.roi.toFixed(1)}%`} icon={Activity} tone={totais.roi >= 0 ? "green" : "red"} />
        <DadosStatCard title="Winrate" value={`${totais.winrate.toFixed(1)}%`} icon={Trophy} />
        <DadosStatCard title="Profit Factor" value={totais.profitFactor.toFixed(2)} icon={BarChart3} tone="blue" />
        <DadosStatCard title="Drawdown" value={moneyClassic(totais.drawdown)} icon={Flame} tone="red" />
        <DadosStatCard title="Consistência" value={`${totais.consistency}/100`} icon={ShieldCheck} tone={totais.consistency >= 70 ? "green" : totais.consistency >= 45 ? "yellow" : "red"} />
        <DadosStatCard title="Greens" value={totais.green} icon={ShieldCheck} tone="green" />
        <DadosStatCard title="Reds" value={totais.red} icon={Target} tone="red" />
      </section>

      <MiniBarRanking data={equityData} title="Equity acumulada" valueKey="lucro" />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking data={metodoStats} title="Métodos por resultado" />
        <MiniBarRanking data={mercadoStats} title="Mercados por resultado" />
      </section>

      <DarkTable
        title="Winrate x Faixa de Odd"
        subtitle="Distribuição de performance por faixa"
        headers={["Faixa", "Lucro", "ROI", "Winrate", "Total", "Green", "Red"]}
        rows={oddStats.map((item) => [
          item.nome,
          <span className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>{moneyClassic(item.lucro)}</span>,
          <span className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}>{item.roi.toFixed(1)}%</span>,
          `${item.winrate.toFixed(1)}%`,
          item.total,
          <span className="text-emerald-300">{item.green}</span>,
          <span className="text-red-300">{item.red}</span>,
        ])}
      />

      <DarkTable
        title="Kelly sugerida por método"
        subtitle="Uso conservador: 1/4 Kelly"
        headers={["Método", "Odd média", "Winrate", "Kelly", "1/4 Kelly", "Entradas"]}
        rows={kellyRows.map((item) => [
          item.nome,
          item.oddMed.toFixed(2),
          `${item.winrate.toFixed(1)}%`,
          `${(item.kelly * 100).toFixed(1)}%`,
          <span className="text-emerald-300">{(item.kelly25 * 100).toFixed(1)}%</span>,
          item.total,
        ])}
      />

      <DarkTable
        title="Alertas de Outliers"
        subtitle="Métodos com ROI muito alto ou muito negativo"
        headers={["Método", "Lucro", "ROI", "Winrate", "Entradas", "Classe"]}
        rows={outliers.map((item) => [
          item.nome,
          <span className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>{moneyClassic(item.lucro)}</span>,
          <span className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}>{item.roi.toFixed(1)}%</span>,
          `${item.winrate.toFixed(1)}%`,
          item.total,
          classifyPerformance(item.roi, item.winrate, item.total),
        ])}
        empty="Nenhum outlier com os critérios atuais."
      />
    </div>
  );
}

/* ===================== BANCO ===================== */
function BancoClassicPage() {
  const [transacoes, setTransacoes] = useState(() => {
    try {
      const saved = localStorage.getItem("banco");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dadosBase, setDadosBase] = useState({ casas: ["Betfair", "Fulltbet", "Bet365", "Bolsa"] });

  const [form, setForm] = useState({
    tipo: "Depósito",
    valor: "",
    bookmaker: "Betfair",
    data: new Date().toISOString().slice(0, 10),
    obs: "",
  });

  useEffect(() => {
    localStorage.setItem("banco", JSON.stringify(transacoes));
  }, [transacoes]);

  useEffect(() => {
    async function loadDados() {
      try {
        const response = await fetch("/dados.json");
        const data = await response.json();
        const casas = data.casas || data.bookmakers || ["Betfair", "Fulltbet", "Bet365", "Bolsa"];
        setDadosBase({ casas });
        setForm((prev) => ({ ...prev, bookmaker: prev.bookmaker || casas[0] || "Betfair" }));
      } catch {
        setDadosBase({ casas: ["Betfair", "Fulltbet", "Bet365", "Bolsa"] });
      }
    }
    loadDados();
  }, []);

  const totalDepositos = transacoes.filter((t) => t.tipo === "Depósito").reduce((acc, t) => acc + numClassic(t.valor), 0);
  const totalSaques = transacoes.filter((t) => t.tipo === "Saque").reduce((acc, t) => acc + numClassic(t.valor), 0);
  const saldo = totalSaques - totalDepositos;

  const resumoBook = useMemo(() => {
    const map = new Map();
    transacoes.forEach((t) => {
      const book = t.bookmaker || "Sem bookmaker";
      if (!map.has(book)) map.set(book, { bookmaker: book, deposito: 0, saque: 0, saldo: 0 });
      const row = map.get(book);
      if (t.tipo === "Depósito") row.deposito += numClassic(t.valor);
      if (t.tipo === "Saque") row.saque += numClassic(t.valor);
      row.saldo = row.saque - row.deposito;
    });
    return [...map.values()].sort((a, b) => b.saldo - a.saldo);
  }, [transacoes]);

  const resumoMensal = useMemo(() => {
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const ano = new Date().getFullYear();
    const base = meses.map((mes, index) => ({ mes, deposito: 0, saque: 0, saldo: 0 }));

    transacoes.forEach((t) => {
      const d = parseDateClassic(t.data);
      if (!d || d.getFullYear() !== ano) return;
      const row = base[d.getMonth()];
      if (t.tipo === "Depósito") row.deposito += numClassic(t.valor);
      if (t.tipo === "Saque") row.saque += numClassic(t.valor);
      row.saldo = row.saque - row.deposito;
    });

    return base;
  }, [transacoes]);

  function adicionar() {
    if (!form.valor || numClassic(form.valor) <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    setTransacoes((prev) => [...prev, { ...form, id: Date.now() + Math.random() }]);
    setForm((prev) => ({ ...prev, valor: "", obs: "" }));
  }

  function excluir(id) {
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  }

  function limparTudo() {
    if (window.confirm("Deseja excluir todas as transações do banco?")) {
      setTransacoes([]);
    }
  }

  function exportarExcel() {
    const ws = XLSX.utils.json_to_sheet(transacoes);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Banco");
    XLSX.writeFile(wb, "Banco_JC_Trader.xlsx");
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">JC Trader clássico</p>
        <h1 className="text-3xl font-black text-zinc-50">Banco</h1>
        <p className="mt-1 text-sm text-zinc-400">Controle de depósitos, saques, saldo por bookmaker e evolução mensal.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Depósitos" value={moneyClassic(totalDepositos)} icon={Database} tone="blue" />
        <DadosStatCard title="Saques" value={moneyClassic(totalSaques)} icon={Wallet} tone="green" />
        <DadosStatCard title="Saldo" value={moneyClassic(saldo)} icon={Activity} tone={saldo >= 0 ? "green" : "red"} />
        <DadosStatCard title="Registros" value={transacoes.length} icon={BarChart3} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Tipo
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none">
              <option>Depósito</option>
              <option>Saque</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Valor
            <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Data
            <input value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} type="date" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Bookmaker
            <select value={form.bookmaker} onChange={(e) => setForm({ ...form, bookmaker: e.target.value })} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none">
              {dadosBase.casas.map((casa) => <option key={casa}>{casa}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400 md:col-span-2">
            Observação
            <input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={adicionar} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">Adicionar</button>
          <button onClick={exportarExcel} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Exportar</button>
          <button onClick={limparTudo} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700">Limpar</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking data={resumoBook.map((item) => ({ nome: item.bookmaker, lucro: item.saldo }))} title="Saldo por bookmaker" />
        <MiniBarRanking data={resumoMensal.map((item) => ({ nome: item.mes, lucro: item.saldo }))} title="Saldo mensal" />
      </section>

      <DarkTable
        title="Resumo por Bookmaker"
        subtitle="Depósitos, saques e saldo"
        headers={["Bookmaker", "Depósitos", "Saques", "Saldo"]}
        rows={resumoBook.map((item) => [
          item.bookmaker,
          <span className="text-blue-300">{moneyClassic(item.deposito)}</span>,
          <span className="text-emerald-300">{moneyClassic(item.saque)}</span>,
          <span className={item.saldo >= 0 ? "text-emerald-300" : "text-red-300"}>{moneyClassic(item.saldo)}</span>,
        ])}
      />

      <DarkTable
        title="Transações"
        subtitle="Histórico completo"
        headers={["Data", "Tipo", "Valor", "Bookmaker", "Observação", "Ação"]}
        rows={transacoes
          .slice()
          .sort((a, b) => String(b.data).localeCompare(String(a.data)))
          .map((t) => [
            t.data,
            t.tipo,
            <span className={t.tipo === "Depósito" ? "text-blue-300" : "text-emerald-300"}>{moneyClassic(t.valor)}</span>,
            t.bookmaker,
            t.obs || "—",
            <button onClick={() => excluir(t.id)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20">Excluir</button>,
          ])}
      />
    </div>
  );
}

/* ===================== COMPACT — BANCO CORNERPRO ===================== */
function compactNum(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const s = String(value ?? "")
    .replace("%", "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function compactPercent(value) {
  const n = compactNum(value);
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function compactText(value) {
  return String(value ?? "").trim();
}

function compactCleanKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\bFC\b/g, "")
    .replace(/\bSC\b/g, "")
    .replace(/\bCF\b/g, "")
    .replace(/\bAC\b/g, "")
    .replace(/\bCLUB\b/g, "")
    .replace(/\bUNITED\b/g, "UTD")
    .replace(/\bCITY\b/g, "CITY")
    .replace(/\bSAINT\b/g, "ST")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

function compactSimilarity(a, b) {
  const x = compactCleanKey(a);
  const y = compactCleanKey(b);

  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.92;

  const bigrams = (str) => {
    const out = new Set();
    for (let i = 0; i < str.length - 1; i += 1) out.add(str.slice(i, i + 2));
    return out;
  };

  const bx = bigrams(x);
  const by = bigrams(y);
  const inter = [...bx].filter((item) => by.has(item)).length;
  const union = new Set([...bx, ...by]).size || 1;

  return inter / union;
}

function compactDate(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
  }

  if (typeof value === "number" && XLSX?.SSF?.parse_date_code) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
    }
  }

  const raw = String(value).trim();

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${String(br[1]).padStart(2, "0")}/${String(br[2]).padStart(2, "0")}/${y}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  const dateObj = new Date(raw);
  if (!Number.isNaN(dateObj.getTime())) {
    return `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;
  }

  return raw;
}

function compactDateKey(value) {
  const formatted = compactDate(value);
  const br = String(formatted).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!br) return compactCleanKey(formatted);
  return `${br[3]}-${br[2]}-${br[1]}`;
}

function compactDateObj(value) {
  const formatted = compactDate(value);
  const br = String(formatted).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!br) return null;
  return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
}

function compactIsPastOrToday(value) {
  const d = compactDateObj(value);
  if (!d) return false;
  const today = new Date();
  const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d <= limit;
}

function compactHour(value) {
  if (value === null || value === undefined || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hh = Math.floor(totalMinutes / 60) % 24;
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  const raw = String(value).trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${String(match[1]).padStart(2, "0")}:${match[2]}`;

  return raw;
}

function compactSafeLeague(value) {
  if (typeof normalizeLeagueName === "function") return normalizeLeagueName(value);
  return compactText(value);
}

function compactSafeTeam(value) {
  if (typeof normalizeTeamName === "function") return normalizeTeamName(value);
  return compactText(value);
}

function compactFixSavedPercent(value) {
  const n = compactNum(value);
  if (n > 0 && n <= 1) return n * 100;
  return n;
}

function normalizeSavedCompactGame(game) {
  return {
    ...game,
    over05ht: compactFixSavedPercent(game.over05ht),
    over15ft: compactFixSavedPercent(game.over15ft),
    homePct: compactFixSavedPercent(game.homePct),
    awayPct: compactFixSavedPercent(game.awayPct),
    drawPct: compactFixSavedPercent(game.drawPct),
    oddOver05ht: compactNum(game.oddOver05ht),
    oddOver15ft: compactNum(game.oddOver15ft),
    homeOdd: compactNum(game.homeOdd),
    awayOdd: compactNum(game.awayOdd),
    drawOdd: compactNum(game.drawOdd),
    htScore: game.htScore || "",
    ftScore: game.ftScore || "",
    status: game.htScore || game.ftScore ? "Finalizado" : "Pendente",
  };
}

function normalizeCompactArrayRow(row) {
  const data = compactDate(row[0]);
  const hora = compactHour(row[1]);
  const liga = compactSafeLeague(row[2]);
  const casa = compactSafeTeam(row[3]);
  const fora = compactSafeTeam(row[4]);

  return {
    id: Date.now() + Math.random(),
    data,
    hora,
    liga,
    casa,
    fora,

    over05ht: compactPercent(row[5]),
    oddOver05ht: compactNum(row[6]),

    over15ft: compactPercent(row[7]),
    oddOver15ft: compactNum(row[8]),

    homePct: compactPercent(row[9]),
    homeOdd: compactNum(row[10]),

    awayPct: compactPercent(row[11]),
    awayOdd: compactNum(row[12]),

    drawPct: compactPercent(row[13]),
    drawOdd: compactNum(row[14]),

    htScore: "",
    ftScore: "",
    status: "Pendente",
    origem: "CornerPro",
    criadoEm: new Date().toISOString(),
  };
}

function compactGameKey(game) {
  return [
    compactDateKey(game.data),
    compactText(game.hora),
    compactCleanKey(game.liga),
    compactCleanKey(game.casa),
    compactCleanKey(game.fora),
  ].join("|");
}

function compactMatchKey(game) {
  return [
    compactDateKey(game.data),
    compactCleanKey(game.casa),
    compactCleanKey(game.fora),
  ].join("|");
}

function compactPctDisplay(value) {
  return `${Number(compactFixSavedPercent(value) || 0).toFixed(0)}%`;
}

function compactOddDisplay(value) {
  return Number(compactNum(value) || 0).toFixed(2);
}

function compactFirstValue(obj, keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") return obj[key];
  }
  return "";
}

function compactScoreText(home, away) {
  if (home === "" || home === null || home === undefined) return "";
  if (away === "" || away === null || away === undefined) return "";

  const h = compactNum(home);
  const a = compactNum(away);

  return `${h}x${a}`;
}

function compactParseScore(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d+)\s*[xX\-:]\s*(\d+)/);
  if (!match) return "";
  return `${Number(match[1])}x${Number(match[2])}`;
}

function compactNormalizeHistoricGame(row) {
  const data = compactDate(
    compactFirstValue(row, [
      "Date",
      "Data",
      "date",
      "data",
      "Game Date",
      "GameDate",
      "Match Date",
      "match_date",
      "game_date",
    ])
  );

  const casa = compactSafeTeam(
    compactFirstValue(row, [
      "Home",
      "Casa",
      "home",
      "mandante",
      "Mandante",
      "Home Team",
      "HomeTeam",
      "time_casa",
      "home_name",
      "home_team",
    ])
  );

  const fora = compactSafeTeam(
    compactFirstValue(row, [
      "Away",
      "Fora",
      "Visitante",
      "away",
      "visitante",
      "Away Team",
      "AwayTeam",
      "time_fora",
      "away_name",
      "away_team",
    ])
  );

  const htDirect = compactFirstValue(row, [
    "HT",
    "ht",
    "Half Time",
    "HalfTime",
    "Resultado HT",
    "Placar HT",
    "score_ht",
    "ht_score",
  ]);

  const ftDirect = compactFirstValue(row, [
    "FT",
    "ft",
    "Full Time",
    "FullTime",
    "Resultado FT",
    "Placar FT",
    "Score",
    "score",
    "score_ft",
    "ft_score",
  ]);

  const htHome = compactFirstValue(row, [
    "HT_Home",
    "HT Home",
    "HTHG",
    "HT Home Goals",
    "Gols HT Casa",
    "Home HT",
    "home_ht_goals",
    "home_ht",
    "hg_ht",
  ]);

  const htAway = compactFirstValue(row, [
    "HT_Away",
    "HT Away",
    "HTAG",
    "HT Away Goals",
    "Gols HT Fora",
    "Away HT",
    "away_ht_goals",
    "away_ht",
    "ag_ht",
  ]);

  const ftHome = compactFirstValue(row, [
    "FT_Home",
    "FT Home",
    "FTHG",
    "FT Home Goals",
    "Gols Casa",
    "Home Goals",
    "home_goals",
    "Goals_H",
    "home_score",
    "hg",
  ]);

  const ftAway = compactFirstValue(row, [
    "FT_Away",
    "FT Away",
    "FTAG",
    "FT Away Goals",
    "Gols Fora",
    "Away Goals",
    "away_goals",
    "Goals_A",
    "away_score",
    "ag",
  ]);

  const htScore = compactParseScore(htDirect) || compactScoreText(htHome, htAway);
  const ftScore = compactParseScore(ftDirect) || compactScoreText(ftHome, ftAway);

  return {
    data,
    casa,
    fora,
    htScore,
    ftScore,
    raw: row,
  };
}

function CompactPage() {
  const fileInputRef = useRef(null);

  const [games, setGames] = useState(() => {
    try {
      const saved = localStorage.getItem("compact_games");
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map(normalizeSavedCompactGame);
    } catch {
      return [];
    }
  });

  const emptyCompactFilters = {
    busca: "",
    liga: "Todas",
    status: "Todos",
    minHT: "",
    minFT: "",
    minHome: "",
    minDraw: "",
    minAway: "",
  };

  const [draftFilters, setDraftFilters] = useState(emptyCompactFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyCompactFilters);

  const [updatingScores, setUpdatingScores] = useState(false);
  const [diagnostico, setDiagnostico] = useState("");

  useEffect(() => {
    localStorage.setItem("compact_games", JSON.stringify(games));
  }, [games]);

  const ligas = useMemo(() => {
    return [
      "Todas",
      ...new Set(
        games
          .map((game) => game.liga)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      ),
    ];
  }, [games]);

  const filteredGames = useMemo(() => {
    const busca = appliedFilters.busca.trim().toLowerCase();

    return games
      .filter((game) => appliedFilters.liga === "Todas" || game.liga === appliedFilters.liga)
      .filter((game) => appliedFilters.status === "Todos" || game.status === appliedFilters.status)
      .filter((game) => !appliedFilters.minHT || compactNum(game.over05ht) >= compactNum(appliedFilters.minHT))
      .filter((game) => !appliedFilters.minFT || compactNum(game.over15ft) >= compactNum(appliedFilters.minFT))
      .filter((game) => !appliedFilters.minHome || compactNum(game.homePct) >= compactNum(appliedFilters.minHome))
      .filter((game) => !appliedFilters.minDraw || compactNum(game.drawPct) >= compactNum(appliedFilters.minDraw))
      .filter((game) => !appliedFilters.minAway || compactNum(game.awayPct) >= compactNum(appliedFilters.minAway))
      .filter((game) => {
        if (!busca) return true;

        return [
          game.data,
          game.hora,
          game.liga,
          game.casa,
          game.fora,
          game.htScore,
          game.ftScore,
        ]
          .join(" ")
          .toLowerCase()
          .includes(busca);
      });
  }, [games, appliedFilters]);

  const resumo = useMemo(() => {
    const total = games.length;
    const ligasCount = new Set(games.map((game) => game.liga).filter(Boolean)).size;

    const times = new Set();
    games.forEach((game) => {
      if (game.casa) times.add(game.casa);
      if (game.fora) times.add(game.fora);
    });

    const media = (key) => {
      if (!games.length) return 0;
      return games.reduce((acc, game) => acc + compactNum(game[key]), 0) / games.length;
    };

    const finalizados = games.filter((game) => game.htScore || game.ftScore).length;
    const pendentes = games.filter((game) => !game.htScore && !game.ftScore).length;

    return {
      total,
      ligasCount,
      timesCount: times.size,
      avgHT: media("over05ht"),
      avgFT: media("over15ft"),
      avgHomeOdd: media("homeOdd"),
      avgDrawOdd: media("drawOdd"),
      avgAwayOdd: media("awayOdd"),
      finalizados,
      pendentes,
    };
  }, [games]);

  function updateFilter(key, value) {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyCompactFilters() {
    setAppliedFilters(draftFilters);
  }

  function clearCompactFilters() {
    setDraftFilters(emptyCompactFilters);
    setAppliedFilters(emptyCompactFilters);
  }

  function updateGame(id, key, value) {
    setGames((prev) =>
      prev.map((game) => {
        if (game.id !== id) return game;

        const updated = { ...game, [key]: value };
        updated.status = updated.htScore || updated.ftScore ? "Finalizado" : "Pendente";
        return updated;
      })
    );
  }

  function deleteGame(id) {
    setGames((prev) => prev.filter((game) => game.id !== id));
  }

  function clearGames() {
    if (window.confirm("Tem certeza que deseja limpar todo o banco Compact?")) {
      setGames([]);
      localStorage.removeItem("compact_games");
      setDiagnostico("");
    }
  }

  function fixCurrentBase() {
    const fixed = games.map(normalizeSavedCompactGame);
    setGames(fixed);
    alert("Base Compact corrigida. Percentuais e odds foram normalizados.");
  }

  function findFlexibleMatch(game, exactMap, byDateMap) {
    const exact = exactMap.get(compactMatchKey(game));
    if (exact) return { match: exact, type: "exato", score: 1 };

    const dateKey = compactDateKey(game.data);
    const candidates = byDateMap.get(dateKey) || [];

    let best = null;
    let bestScore = 0;

    for (const item of candidates) {
      const homeScore = compactSimilarity(game.casa, item.casa);
      const awayScore = compactSimilarity(game.fora, item.fora);
      const avg = (homeScore + awayScore) / 2;

      if (avg > bestScore) {
        best = item;
        bestScore = avg;
      }
    }

    if (best && bestScore >= 0.72) {
      return { match: best, type: "similaridade", score: bestScore };
    }

    return { match: null, type: "sem_match", score: bestScore };
  }

  async function updateScoresFromApi() {
    if (!games.length) {
      alert("Não há jogos no Compact para atualizar.");
      return;
    }

    setUpdatingScores(true);
    setDiagnostico("Buscando histórico...");

    try {
      const response = await fetch(`${API_BASE_URL}/historico?limit=80000`);

      if (!response.ok) {
        throw new Error("Falha ao buscar histórico.");
      }

      const payload = await response.json();

      const historicoRaw =
        typeof extractGames === "function"
          ? extractGames(payload)
          : Array.isArray(payload)
          ? payload
          : payload.data || payload.games || payload.result || [];

      const historico = historicoRaw
        .map(compactNormalizeHistoricGame)
        .filter((item) => item.data && item.casa && item.fora && (item.htScore || item.ftScore));

      const exactMap = new Map();
      const byDateMap = new Map();
      const dates = new Set();

      historico.forEach((item) => {
        exactMap.set(compactMatchKey(item), item);

        const dateKey = compactDateKey(item.data);
        dates.add(dateKey);

        if (!byDateMap.has(dateKey)) byDateMap.set(dateKey, []);
        byDateMap.get(dateKey).push(item);
      });

      let encontrados = 0;
      let exatos = 0;
      let similares = 0;
      const exemplosSemMatch = [];
      const exemplosComMatch = [];

      const pendentesAntes = games.filter((game) => compactIsPastOrToday(game.data) && (!game.htScore || !game.ftScore)).length;

      setGames((prev) =>
        prev.map((game) => {
          if (!compactIsPastOrToday(game.data)) return game;
          if (game.htScore && game.ftScore) return game;

          const result = findFlexibleMatch(game, exactMap, byDateMap);

          if (!result.match) {
            if (exemplosSemMatch.length < 5) {
              exemplosSemMatch.push(`${game.data} | ${game.casa} x ${game.fora} | melhor score: ${(result.score * 100).toFixed(0)}%`);
            }
            return game;
          }

          encontrados += 1;
          if (result.type === "exato") exatos += 1;
          if (result.type === "similaridade") similares += 1;

          if (exemplosComMatch.length < 5) {
            exemplosComMatch.push(
              `${game.casa} x ${game.fora} → ${result.match.casa} x ${result.match.fora} | ${result.match.htScore || "HT?"} / ${result.match.ftScore || "FT?"} | ${result.type} ${(result.score * 100).toFixed(0)}%`
            );
          }

          const updated = {
            ...game,
            htScore: game.htScore || result.match.htScore || "",
            ftScore: game.ftScore || result.match.ftScore || "",
          };

          updated.status = updated.htScore || updated.ftScore ? "Finalizado" : "Pendente";
          return updated;
        })
      );

      const datasCompact = [...new Set(games.map((game) => compactDateKey(game.data)).filter(Boolean))].sort();
      const datasHistorico = [...dates].sort();

      const texto = [
        `Histórico carregado: ${historico.length} jogos com placar.`,
        `Compact total: ${games.length} jogos.`,
        `Pendentes passados/hoje antes: ${pendentesAntes}.`,
        `Jogos futuros ignorados: ${games.filter((game) => !compactIsPastOrToday(game.data)).length}.`,
        `Placares atualizados: ${encontrados}.`,
        `Matches exatos: ${exatos}.`,
        `Matches por similaridade: ${similares}.`,
        `Datas Compact: ${datasCompact.slice(0, 3).join(", ")}${datasCompact.length > 3 ? "..." : ""}`,
        `Datas Histórico: ${datasHistorico.slice(0, 3).join(", ")}${datasHistorico.length > 3 ? "..." : ""}`,
        "",
        "Exemplos com match:",
        exemplosComMatch.length ? exemplosComMatch.join("\n") : "Nenhum.",
        "",
        "Exemplos sem match:",
        exemplosSemMatch.length ? exemplosSemMatch.join("\n") : "Nenhum.",
      ].join("\n");

      setDiagnostico(texto);
      alert(`${encontrados} placares atualizados. Veja o diagnóstico abaixo dos filtros.`);
    } catch (error) {
      console.error(error);
      const texto = "Não foi possível atualizar os placares. Verifique se o backend está rodando e se /api/historico está funcionando.";
      setDiagnostico(texto);
      alert(texto);
    } finally {
      setUpdatingScores(false);
    }
  }

  async function importCompactFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: true,
      });

      const dataRows = rows.slice(1);

      const normalized = dataRows
        .map(normalizeCompactArrayRow)
        .filter((game) => game.data && game.casa && game.fora);

      if (!normalized.length) {
        alert("Nenhum jogo válido encontrado. Confira a estrutura da planilha.");
        return;
      }

      setGames((prev) => {
        const existingKeys = new Set(prev.map(compactGameKey));
        const novos = normalized.filter((game) => !existingKeys.has(compactGameKey(game)));

        if (!novos.length) {
          alert("Nenhum jogo novo importado. Os jogos dessa planilha já existem no Compact.");
          return prev;
        }

        alert(`${novos.length} jogos novos importados para o Compact.`);
        return [...prev, ...novos];
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao importar a planilha Compact.");
    } finally {
      event.target.value = "";
    }
  }

  function exportCompact() {
    const exportRows = games.map((game) => ({
      Data: game.data,
      Hour: game.hora,
      Competição: game.liga,
      "Equipa Casa": game.casa,
      "Equipa Fora": game.fora,
      "0,5 HT": `${Number(game.over05ht || 0).toFixed(0)}%`,
      "Odd 0,5 HT": Number(game.oddOver05ht || 0).toFixed(2),
      "1,5 FT": `${Number(game.over15ft || 0).toFixed(0)}%`,
      "Odd 1,5 FT": Number(game.oddOver15ft || 0).toFixed(2),
      Home: `${Number(game.homePct || 0).toFixed(0)}%`,
      "Odd Home": Number(game.homeOdd || 0).toFixed(2),
      Away: `${Number(game.awayPct || 0).toFixed(0)}%`,
      "Odd Away": Number(game.awayOdd || 0).toFixed(2),
      Draw: `${Number(game.drawPct || 0).toFixed(0)}%`,
      "Odd Draw": Number(game.drawOdd || 0).toFixed(2),
      HT: game.htScore,
      FT: game.ftScore,
      Status: game.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compact");
    XLSX.writeFile(wb, `compact_jc_trader_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function favoriteType(game) {
    const values = [
      { label: "Home", pct: compactNum(game.homePct), odd: compactNum(game.homeOdd) },
      { label: "Away", pct: compactNum(game.awayPct), odd: compactNum(game.awayOdd) },
      { label: "Draw", pct: compactNum(game.drawPct), odd: compactNum(game.drawOdd) },
    ];

    return values.sort((a, b) => b.pct - a.pct)[0] || { label: "—", pct: 0, odd: 0 };
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">
              JC Trader banco próprio
            </p>
            <h1 className="text-3xl font-black text-zinc-50">Compact</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Banco proprietário de jogos CornerPro com HT/FT editáveis para formar sua base estatística.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black hover:bg-yellow-400">
              Importar
            </button>

            <button onClick={exportCompact} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
              Exportar
            </button>

            <button onClick={updateScoresFromApi} disabled={updatingScores} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60">
              {updatingScores ? "Atualizando..." : "Atualizar Placares"}
            </button>

            <button onClick={fixCurrentBase} className="rounded-xl bg-zinc-700 px-5 py-3 text-sm font-black text-white hover:bg-zinc-600">
              Corrigir Base
            </button>

            <button onClick={clearGames} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700">
              Limpar
            </button>

            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={importCompactFile} className="hidden" />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <DadosStatCard title="Jogos" value={resumo.total} icon={Database} />
        <DadosStatCard title="Ligas" value={resumo.ligasCount} icon={Trophy} />
        <DadosStatCard title="Times" value={resumo.timesCount} icon={Database} />
        <DadosStatCard title="Média 0.5 HT" value={`${resumo.avgHT.toFixed(1)}%`} icon={Activity} tone="yellow" />
        <DadosStatCard title="Média 1.5 FT" value={`${resumo.avgFT.toFixed(1)}%`} icon={BarChart3} tone="green" />
        <DadosStatCard title="Odd Home" value={resumo.avgHomeOdd.toFixed(2)} icon={Target} />
        <DadosStatCard title="Finalizados" value={resumo.finalizados} icon={ShieldCheck} tone="green" />
        <DadosStatCard title="Pendentes" value={resumo.pendentes} icon={Flame} tone="red" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <FilterSelect label="Liga" value={draftFilters.liga} onChange={(value) => updateFilter("liga", value)} options={ligas} />
          <FilterSelect label="Status" value={draftFilters.status} onChange={(value) => updateFilter("status", value)} options={["Todos", "Pendente", "Finalizado"]} />

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Min 0.5 HT %
            <input value={draftFilters.minHT} onChange={(e) => updateFilter("minHT", e.target.value)} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Min 1.5 FT %
            <input value={draftFilters.minFT} onChange={(e) => updateFilter("minFT", e.target.value)} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Min Home %
            <input value={draftFilters.minHome} onChange={(e) => updateFilter("minHome", e.target.value)} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Min Draw %
            <input value={draftFilters.minDraw} onChange={(e) => updateFilter("minDraw", e.target.value)} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Min Away %
            <input value={draftFilters.minAway} onChange={(e) => updateFilter("minAway", e.target.value)} type="number" className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
            Buscar
            <input value={draftFilters.busca} onChange={(e) => updateFilter("busca", e.target.value)} placeholder="time, liga, placar..." className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none" />
          </label>

          <div className="flex flex-col justify-end">
            <button
              onClick={applyCompactFilters}
              className="h-10 rounded-lg bg-yellow-500 px-3 text-sm font-black text-black hover:bg-yellow-400"
            >
              Aplicar Filtros
            </button>
          </div>

          <div className="flex flex-col justify-end">
            <button
              onClick={clearCompactFilters}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm font-black text-zinc-100 hover:bg-zinc-900"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-3 text-xs font-semibold text-zinc-500">
        Os filtros só são aplicados após clicar em <span className="font-black text-yellow-300">Aplicar Filtros</span>. Isso evita travamentos ao digitar ou trocar opções.
      </section>

      {diagnostico && (
        <section className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-black text-yellow-300">Diagnóstico de Placares</h2>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs font-semibold text-zinc-200">
            {diagnostico}
          </pre>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Banco Compact</h2>
            <p className="text-sm text-zinc-500">Exibindo {filteredGames.length} de {games.length} jogos</p>
          </div>
          <div className="text-xs font-bold text-zinc-500">LocalStorage: compact_games</div>
        </div>

        <div className="max-h-[720px] overflow-auto">
          <table className="w-full min-w-[1900px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Hora</th>
                <th className="px-3 py-3">Competição</th>
                <th className="px-3 py-3 text-left">Casa</th>
                <th className="px-3 py-3 text-left">Fora</th>
                <th className="px-3 py-3">0.5 HT</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">1.5 FT</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Home</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Away</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Draw</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Favorito</th>
                <th className="px-3 py-3">HT</th>
                <th className="px-3 py-3">FT</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>

            <tbody>
              {filteredGames.map((game) => {
                const fav = favoriteType(game);

                return (
                  <tr key={game.id} className="border-b border-zinc-800 hover:bg-yellow-500/10">
                    <td className="px-3 py-2 font-bold text-zinc-300">{game.data}</td>
                    <td className="px-3 py-2 font-bold text-zinc-300">{game.hora}</td>
                    <td className="px-3 py-2 font-bold text-blue-300">{game.liga}</td>
                    <td className="px-3 py-2 text-left font-black text-zinc-50">{game.casa}</td>
                    <td className="px-3 py-2 text-left font-black text-zinc-50">{game.fora}</td>

                    <td className="px-3 py-2 font-black text-emerald-300">{compactPctDisplay(game.over05ht)}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{compactOddDisplay(game.oddOver05ht)}</td>

                    <td className="px-3 py-2 font-black text-emerald-300">{compactPctDisplay(game.over15ft)}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{compactOddDisplay(game.oddOver15ft)}</td>

                    <td className="px-3 py-2 font-black text-blue-300">{compactPctDisplay(game.homePct)}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{compactOddDisplay(game.homeOdd)}</td>

                    <td className="px-3 py-2 font-black text-pink-300">{compactPctDisplay(game.awayPct)}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{compactOddDisplay(game.awayOdd)}</td>

                    <td className="px-3 py-2 font-black text-orange-300">{compactPctDisplay(game.drawPct)}</td>
                    <td className="px-3 py-2 font-bold text-yellow-200">{compactOddDisplay(game.drawOdd)}</td>

                    <td className="px-3 py-2 font-black text-zinc-200">
                      {fav.label} {compactPctDisplay(fav.pct)}
                    </td>

                    <td className="px-3 py-2">
                      <input value={game.htScore} onChange={(e) => updateGame(game.id, "htScore", e.target.value)} placeholder="0x0" className="h-9 w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-sm font-black text-zinc-100 outline-none focus:border-yellow-500" />
                    </td>

                    <td className="px-3 py-2">
                      <input value={game.ftScore} onChange={(e) => updateGame(game.id, "ftScore", e.target.value)} placeholder="1x0" className="h-9 w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-center text-sm font-black text-zinc-100 outline-none focus:border-yellow-500" />
                    </td>

                    <td className={`px-3 py-2 font-black ${game.status === "Finalizado" ? "text-emerald-300" : "text-red-300"}`}>
                      {game.status}
                    </td>

                    <td className="px-3 py-2">
                      <button onClick={() => deleteGame(game.id)} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20">
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredGames.length && (
                <tr>
                  <td colSpan="20" className="px-4 py-10 text-center text-zinc-500">
                    Nenhum jogo no Compact. Importe uma planilha CornerPro para iniciar o banco.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
