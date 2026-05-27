import express from "express";
import { pool } from "./db.js";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import { parse } from "csv-parse/sync";
import { parse as parseStream } from "csv-parse";
import crypto from "crypto";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "15mb" }));

const TOKEN = process.env.FUT_TOKEN || "";
const PORT = process.env.PORT || 3001;

function normalizeLeague(name = "") {
  return String(name)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function normalizeTeam(name = "") {
  return String(name)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function getResultado(casa, fora) {
  if (casa == null || fora == null) return null;
  if (casa > fora) return "CASA";
  if (casa < fora) return "FORA";
  return "EMPATE";
}

function first(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

async function fetchFootstatsCsvRecordsLimited(limit = 100) {
  const response = await fetch(
    "https://api.futpythontrader.com/api/dados/footystats/download/",
    {
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro FootStats CSV: ${response.status} - ${text}`);
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let csvText = "";
  let linhas = 0;

  while (linhas <= limit) {
    const { value, done } = await reader.read();
    if (done) break;

    csvText += value;
    linhas = csvText.split("\n").length;
  }

  csvText = csvText.split("\n").slice(0, limit + 1).join("\n");

  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ",",
    bom: true,
    relax_column_count: true,
    trim: true,
  });
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function brDateToIso(value) {
  if (!value) return null;

  const raw = String(value).trim();

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${y}-${String(br[2]).padStart(2, "0")}-${String(br[1]).padStart(2, "0")}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];

  return null;
}

function parseScore(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d+)\s*[xX\-:]\s*(\d+)/);
  if (!match) return null;

  return {
    casa: Number(match[1]),
    fora: Number(match[2]),
  };
}

function makeIdOriginal({ data, liga, casa, fora, fonte }) {
  return crypto
    .createHash("md5")
    .update(`${data}|${liga}|${casa}|${fora}|${fonte}`)
    .digest("hex");
}

function normalizeFootstatsRow(row) {
  const data = brDateToIso(first(row, ["Data", "Date", "date", "data"]));

  const hora = first(row, [
    "Hora",
    "Time",
    "time",
    "Kick Off",
    "Kickoff",
    "hora",
  ]);

  const liga = String(first(row, [
    "Liga",
    "League",
    "league",
    "Competição",
    "Competicao",
  ]) || "").trim();

  const casa = String(first(row, [
    "Home",
    "Casa",
    "Mandante",
    "home",
    "home_team",
    "Home Team",
    "Time Casa",
  ]) || "").trim();

  const fora = String(first(row, [
    "Away",
    "Fora",
    "Visitante",
    "away",
    "away_team",
    "Away Team",
    "Time Fora",
  ]) || "").trim();

  const htDirect = first(row, [
    "HT",
    "ht",
    "HalfTime",
    "Resultado HT",
    "score_ht",
    "ht_score",
  ]);

  const ftDirect = first(row, [
    "FT",
    "ft",
    "FullTime",
    "Resultado FT",
    "Score",
    "score",
    "ft_score",
  ]);

  const htHomeRaw = first(row, [
    "Goals_H_HT",
    "HT_Home",
    "HT Home",
    "HTHG",
    "home_ht_goals",
    "home_ht",
  ]);

  const htAwayRaw = first(row, [
    "Goals_A_HT",
    "HT_Away",
    "HT Away",
    "HTAG",
    "away_ht_goals",
    "away_ht",
  ]);

  const ftHomeRaw = first(row, [
    "Goals_H_FT",
    "FT_Home",
    "FT Home",
    "FTHG",
    "home_goals",
    "home_score",
    "hg",
  ]);

  const ftAwayRaw = first(row, [
    "Goals_A_FT",
    "FT_Away",
    "FT Away",
    "FTAG",
    "away_goals",
    "away_score",
    "ag",
  ]);

  const htScore = parseScore(htDirect);
  const ftScore = parseScore(ftDirect);

  const gols_ht_casa = htScore?.casa ?? toNumber(htHomeRaw);
  const gols_ht_fora = htScore?.fora ?? toNumber(htAwayRaw);
  const gols_ft_casa = ftScore?.casa ?? toNumber(ftHomeRaw);
  const gols_ft_fora = ftScore?.fora ?? toNumber(ftAwayRaw);

  const odd_casa = toNumber(first(row, ["Odd Casa", "odds_ft_1", "Home Odds", "Odds_H", "odd_casa"]));
  const odd_empate = toNumber(first(row, ["Odd Empate", "odds_ft_x", "Draw Odds", "Odds_D", "odd_empate"]));
  const odd_fora = toNumber(first(row, ["Odd Fora", "odds_ft_2", "Away Odds", "Odds_A", "odd_fora"]));

  const minutos_gols = first(row, [
    "minutos_gols",
    "Minutos dos Gols",
    "Goal Timings",
    "Goals Timings",
  ]);

  const status = gols_ft_casa != null && gols_ft_fora != null ? "finished" : "scheduled";

  return {
    data,
    hora: hora || null,
    liga,
    liga_normalizada: normalizeLeague(liga),
    time_casa: casa,
    time_fora: fora,
    time_casa_normalizado: normalizeTeam(casa),
    time_fora_normalizado: normalizeTeam(fora),
    gols_ht_casa,
    gols_ht_fora,
    gols_ft_casa,
    gols_ft_fora,
    odd_casa,
    odd_empate,
    odd_fora,
    odd_over_05_ht: toNumber(first(row, ["odd_over_05_ht", "Over 0.5 HT", "Over05HT"])),
    odd_over_15_ft: toNumber(first(row, ["odd_over_15_ft", "Over 1.5 FT", "Over15FT"])),
    odd_over_25_ft: toNumber(first(row, ["odd_over_25_ft", "Over 2.5 FT", "Over25FT"])),
    odd_under_25_ft: toNumber(first(row, ["odd_under_25_ft", "Under 2.5 FT", "Under25FT"])),
    minutos_gols: minutos_gols ? JSON.stringify({ raw: minutos_gols }) : null,
    resultado_ht: getResultado(gols_ht_casa, gols_ht_fora),
    resultado_ft: getResultado(gols_ft_casa, gols_ft_fora),
    status,
  };
}

async function fetchFootstatsCsvRecords() {
  const response = await fetch(
    "https://api.futpythontrader.com/api/dados/footystats/download/",
    {
      headers: {
        Authorization: `Token ${TOKEN}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro FootStats CSV: ${response.status} - ${text}`);
  }

  const csvText = await response.text();

  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ",",
    bom: true,
    relax_column_count: true,
    trim: true,
  });
}

async function upsertMatch(game) {
  const id_original = makeIdOriginal({
    data: game.data,
    liga: game.liga,
    casa: game.time_casa,
    fora: game.time_fora,
    fonte: "FootStats",
  });

  const query = `
    INSERT INTO matches (
      data,
      hora,
      liga,
      liga_normalizada,
      time_casa,
      time_fora,
      time_casa_normalizado,
      time_fora_normalizado,
      gols_ht_casa,
      gols_ht_fora,
      gols_ft_casa,
      gols_ft_fora,
      odd_casa,
      odd_empate,
      odd_fora,
      odd_over_05_ht,
      odd_over_15_ft,
      odd_over_25_ft,
      odd_under_25_ft,
      minutos_gols,
      id_original,
      fonte,
      resultado_ht,
      resultado_ft,
      status
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25
    )
    ON CONFLICT (id_original, fonte)
    DO UPDATE SET
      data = EXCLUDED.data,
      hora = EXCLUDED.hora,
      liga = EXCLUDED.liga,
      liga_normalizada = EXCLUDED.liga_normalizada,
      time_casa = EXCLUDED.time_casa,
      time_fora = EXCLUDED.time_fora,
      time_casa_normalizado = EXCLUDED.time_casa_normalizado,
      time_fora_normalizado = EXCLUDED.time_fora_normalizado,
      gols_ht_casa = EXCLUDED.gols_ht_casa,
      gols_ht_fora = EXCLUDED.gols_ht_fora,
      gols_ft_casa = EXCLUDED.gols_ft_casa,
      gols_ft_fora = EXCLUDED.gols_ft_fora,
      odd_casa = EXCLUDED.odd_casa,
      odd_empate = EXCLUDED.odd_empate,
      odd_fora = EXCLUDED.odd_fora,
      odd_over_05_ht = EXCLUDED.odd_over_05_ht,
      odd_over_15_ft = EXCLUDED.odd_over_15_ft,
      odd_over_25_ft = EXCLUDED.odd_over_25_ft,
      odd_under_25_ft = EXCLUDED.odd_under_25_ft,
      minutos_gols = EXCLUDED.minutos_gols,
      resultado_ht = EXCLUDED.resultado_ht,
      resultado_ft = EXCLUDED.resultado_ft,
      status = EXCLUDED.status,
      updated_at = NOW()
  `;

  const values = [
    game.data,
    game.hora,
    game.liga,
    game.liga_normalizada,
    game.time_casa,
    game.time_fora,
    game.time_casa_normalizado,
    game.time_fora_normalizado,
    game.gols_ht_casa,
    game.gols_ht_fora,
    game.gols_ft_casa,
    game.gols_ft_fora,
    game.odd_casa,
    game.odd_empate,
    game.odd_fora,
    game.odd_over_05_ht,
    game.odd_over_15_ft,
    game.odd_over_25_ft,
    game.odd_under_25_ft,
    game.minutos_gols,
    id_original,
    "FootStats",
    game.resultado_ht,
    game.resultado_ft,
    game.status,
  ];

  await pool.query(query, values);
}

app.get("/api/admin/setup-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      ok: true,
      server_time: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/admin/import-footstats-test", async (req, res) => {
  try {
    const offset = req.query.offset || 0;
    const limit = req.query.limit || 500;

    const response = await fetch(
      `http://localhost:${PORT}/api/admin/import-footstats?offset=${offset}&limit=${limit}`,
      {
        method: "POST",
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.post("/api/admin/import-footstats", async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 500);

    const records = await fetchFootstatsCsvRecordsLimited(offset + limit);
    const batch = records.slice(offset, offset + limit);

    let inseridosOuAtualizados = 0;
    let ignorados = 0;

    for (const row of batch) {
      const game = normalizeFootstatsRow(row);

if (!game.data || !game.liga || !game.time_casa || !game.time_fora) {
  ignorados++;
  continue;
}

if (game.data < "2024-01-01") {
  ignorados++;
  continue;
}

await upsertMatch(game);
inseridosOuAtualizados++;
    }

    await pool.query(
      `
      INSERT INTO import_logs (
        fonte,
        liga,
        periodo_inicio,
        periodo_fim,
        total_recebidos,
        total_inseridos,
        total_atualizados
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      `,
      [
        "FootStats",
        "TODAS",
        null,
        null,
        batch.length,
        inseridosOuAtualizados,
        0,
      ]
    );

    res.json({
      ok: true,
      fonte: "FootStats via FutPythonTrader CSV",
      offset,
      limit,
      total_lido_ate: records.length,
      total_lote: batch.length,
      inseridos_ou_atualizados: inseridosOuAtualizados,
      ignorados,
    });
  } catch (err) {
    console.error("Erro /api/admin/import-footstats:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

function formatarData(date) {
  return date.toISOString().split("T")[0];
}

function gerarDatasJanela() {
  const datas = [];
  const hoje = new Date();

  for (let i = -5; i <= 5; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    datas.push(formatarData(d));
  }

  return datas;
}

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, mensagem: "Servidor JC Trader online" });
});

app.get("/api/jogos", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.futpythontrader.com/api/dados/betfair/",
      {
        headers: { Authorization: `Token ${TOKEN}` },
        params: req.query,
        timeout: 30000,
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      erro: "Erro ao buscar API",
      detalhe: err.response?.data || err.message,
    });
  }
});

app.get("/api/historico", async (req, res) => {

  const limit = Math.min(parseInt(req.query.limit || "3000"), 3000);
  res.status(503).json({
    erro: "Histórico completo temporariamente desativado no Render Free",
    detalhe:
      "Essa rota carrega muitos dados e estoura a memória do plano gratuito. Agora usaremos o banco próprio matches.",
  });
});

app.get("/api/jogos-do-dia/:fonte/:data", async (req, res) => {
  try {
    const { fonte, data } = req.params;

    const response = await axios.get(
      `https://api.futpythontrader.com/api/dados/jogos-do-dia/${fonte}/${data}/`,
      {
        headers: { Authorization: `Token ${TOKEN}` },
        params: req.query,
        timeout: 30000,
      }
    );

    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      erro: "Erro ao buscar jogos do dia",
      detalhe: err.response?.data || err.message,
    });
  }
});

app.get("/api/jogos-janela/:fonte", async (req, res) => {
  try {
    const { fonte } = req.params;
    const datas = gerarDatasJanela();

    const resultados = await Promise.allSettled(
      datas.map((data) =>
        axios.get(
          `https://api.futpythontrader.com/api/dados/jogos-do-dia/${fonte}/${data}/`,
          {
            headers: { Authorization: `Token ${TOKEN}` },
            params: req.query,
            timeout: 30000,
          }
        )
      )
    );

    const jogos = resultados.flatMap((resultado) => {
      if (resultado.status !== "fulfilled") return [];

      const payload = resultado.value.data;

      if (Array.isArray(payload?.dados)) return payload.dados;
      if (Array.isArray(payload?.jogos)) return payload.jogos;
      if (Array.isArray(payload?.data)) return payload.data;
      if (Array.isArray(payload)) return payload;

      return [];
    });

    const unique = new Map();

    jogos.forEach((game) => {
      const key = [
        game.ID_Evento || "",
        game.Date || game.data || "",
        game.Time || game.hora || "",
        game.Home || game.home || "",
        game.Away || game.away || "",
      ].join("-");

      unique.set(key, game);
    });

    const ordered = [...unique.values()].sort((a, b) => {
      const da = new Date(
        `${a.Date || a.data}T${String(a.Time || a.hora || "00:00").slice(0, 5)}`
      );

      const db = new Date(
        `${b.Date || b.data}T${String(b.Time || b.hora || "00:00").slice(0, 5)}`
      );

      return da - db;
    });

    res.json({
      total: ordered.length,
      jogos: ordered.slice(0, 400),
    });
  } catch (err) {
    res.status(500).json({
      erro: "Erro ao buscar janela de jogos",
      detalhe: err.response?.data || err.message,
    });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 200), 1000);
    const result = await pool.query(
      `
      SELECT *
      FROM matches
      ORDER BY data DESC, hora DESC NULLS LAST
      LIMIT $1
      `,
      [limit]
    );

    res.json({
      ok: true,
      total: result.rows.length,
      matches: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/matches/today", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM matches
      WHERE data = CURRENT_DATE
      ORDER BY hora ASC NULLS LAST
      `
    );

    res.json({
      ok: true,
      total: result.rows.length,
      matches: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/matches/future", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM matches
      WHERE data >= CURRENT_DATE
      ORDER BY data ASC, hora ASC NULLS LAST
      LIMIT 500
      `
    );

    res.json({
      ok: true,
      total: result.rows.length,
      matches: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/leagues", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        liga,
        liga_normalizada,
        COUNT(*)::int AS total_jogos
      FROM matches
      GROUP BY liga, liga_normalizada
      ORDER BY liga ASC
      `
    );

    res.json({
      ok: true,
      total: result.rows.length,
      leagues: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/teams", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT time, time_normalizado, COUNT(*)::int AS total_jogos
      FROM (
        SELECT time_casa AS time, time_casa_normalizado AS time_normalizado FROM matches
        UNION ALL
        SELECT time_fora AS time, time_fora_normalizado AS time_normalizado FROM matches
      ) t
      GROUP BY time, time_normalizado
      ORDER BY time ASC
      `
    );

    res.json({
      ok: true,
      total: result.rows.length,
      teams: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/footstats/resultados", async (req, res) => {
  try {
    	const allRecords = await fetchFootstatsCsvRecords();
	const limit = Number(req.query.limit || 500);
	const records = allRecords.slice(0, limit);

    const resultados = records
      .map(normalizeFootstatsRow)
      .filter((item) => item.data && item.time_casa && item.time_fora);

    res.json({
      ok: true,
      total: resultados.length,
      resultados,
    });
  } catch (error) {
    console.error("Erro /api/footstats/resultados:", error);

    res.status(500).json({
      ok: false,
      error: "Erro interno ao processar resultados Footstats",
      details: String(error.message || error),
    });
  }
});

let footstatsTabelaCache = null;
let footstatsTabelaCacheTime = 0;
const FOOTSTATS_TABELA_CACHE_MS = 30 * 60 * 1000;

function parseFtScoreToNumbersFromMatch(game) {
  if (game.gols_ft_casa == null || game.gols_ft_fora == null) return null;

  return {
    home: Number(game.gols_ft_casa),
    away: Number(game.gols_ft_fora),
  };
}

function emptyStandingRow(team) {
  return {
    time: team,
    p: 0,
    j: 0,
    v: 0,
    e: 0,
    d: 0,
    gm: 0,
    gs: 0,
    sg: 0,
    forma: [],
  };
}

function addStandingResult(row, goalsFor, goalsAgainst) {
  row.j += 1;
  row.gm += goalsFor;
  row.gs += goalsAgainst;
  row.sg = row.gm - row.gs;

  if (goalsFor > goalsAgainst) {
    row.v += 1;
    row.p += 3;
    row.forma.push("V");
  } else if (goalsFor === goalsAgainst) {
    row.e += 1;
    row.p += 1;
    row.forma.push("E");
  } else {
    row.d += 1;
    row.forma.push("D");
  }
}

function buildStandingTable(games, mode) {
  const teams = new Map();

  function getTeam(team) {
    if (!teams.has(team)) teams.set(team, emptyStandingRow(team));
    return teams.get(team);
  }

  games.forEach((game) => {
    const score = parseFtScoreToNumbersFromMatch(game);
    if (!score || !game.time_casa || !game.time_fora) return;

    if (mode === "geral" || mode === "casa") {
      addStandingResult(getTeam(game.time_casa), score.home, score.away);
    }

    if (mode === "geral" || mode === "fora") {
      addStandingResult(getTeam(game.time_fora), score.away, score.home);
    }
  });

  return [...teams.values()]
    .map((row) => ({
      ...row,
      forma: row.forma.filter(Boolean).slice(-5).reverse(),
    }))
    .sort((a, b) =>
      b.p - a.p ||
      b.v - a.v ||
      b.sg - a.sg ||
      b.gm - a.gm ||
      a.time.localeCompare(b.time)
    )
    .map((row, index) => ({ pos: index + 1, ...row }));
}

function buildTablesFromMatches(matches) {
  const grouped = new Map();

  matches
    .filter((game) => game.liga && game.time_casa && game.time_fora && game.gols_ft_casa != null && game.gols_ft_fora != null)
    .forEach((game) => {
      if (!grouped.has(game.liga)) grouped.set(game.liga, []);
      grouped.get(game.liga).push(game);
    });

  const ligas = [...grouped.keys()].sort((a, b) => a.localeCompare(b));
  const tabelas = {};

  ligas.forEach((liga) => {
    const games = grouped.get(liga);

    tabelas[liga] = {
      liga,
      totalJogos: games.length,
      geral: buildStandingTable(games, "geral"),
      casa: buildStandingTable(games, "casa"),
      fora: buildStandingTable(games, "fora"),
    };
  });

  return { ligas, tabelas };
}

app.get("/api/footstats/tabelas", async (req, res) => {
  try {
    const now = Date.now();

    if (footstatsTabelaCache && now - footstatsTabelaCacheTime < FOOTSTATS_TABELA_CACHE_MS) {
      return res.json({
        ok: true,
        cache: true,
        atualizadoEm: new Date(footstatsTabelaCacheTime).toISOString(),
        ...footstatsTabelaCache,
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM matches
      WHERE gols_ft_casa IS NOT NULL
        AND gols_ft_fora IS NOT NULL
      ORDER BY data DESC
      `
    );

    const built = buildTablesFromMatches(result.rows);

    footstatsTabelaCache = {
      totalJogos: result.rows.length,
      ...built,
    };

    footstatsTabelaCacheTime = now;

    res.json({
      ok: true,
      cache: false,
      atualizadoEm: new Date(footstatsTabelaCacheTime).toISOString(),
      ...footstatsTabelaCache,
    });
  } catch (error) {
    console.error("Erro /api/footstats/tabelas:", error);

    res.status(500).json({
      ok: false,
      error: "Erro interno ao processar tabelas Footstats",
      details: String(error.message || error),
    });
  }
});

app.get("/api/admin/create-tables", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        hora TIME,
        liga TEXT NOT NULL,
        liga_normalizada TEXT,
        time_casa TEXT NOT NULL,
        time_fora TEXT NOT NULL,
        time_casa_normalizado TEXT,
        time_fora_normalizado TEXT,
        gols_ht_casa INTEGER,
        gols_ht_fora INTEGER,
        gols_ft_casa INTEGER,
        gols_ft_fora INTEGER,
        odd_casa NUMERIC(10,2),
        odd_empate NUMERIC(10,2),
        odd_fora NUMERIC(10,2),
        odd_over_05_ht NUMERIC(10,2),
        odd_over_15_ft NUMERIC(10,2),
        odd_over_25_ft NUMERIC(10,2),
        odd_under_25_ft NUMERIC(10,2),
        minutos_gols JSONB,
        id_original TEXT,
        fonte TEXT DEFAULT 'FootStats',
        resultado_ht TEXT,
        resultado_ft TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (id_original, fonte)
      );

      CREATE TABLE IF NOT EXISTS import_logs (
        id SERIAL PRIMARY KEY,
        fonte TEXT,
        liga TEXT,
        periodo_inicio DATE,
        periodo_fim DATE,
        total_recebidos INTEGER DEFAULT 0,
        total_inseridos INTEGER DEFAULT 0,
        total_atualizados INTEGER DEFAULT 0,
        erro TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    res.json({
      ok: true,
      message: "Tabelas criadas/verificadas com sucesso",
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

app.get("/api/matches-futuros", async (req, res) => {
  try {
    const dias = Number(req.query.dias || 2);

    const sql = `
      SELECT *
      FROM matches
      WHERE data::date >= CURRENT_DATE
        AND data::date <= CURRENT_DATE + ($1 || ' days')::interval
      ORDER BY data ASC, hora ASC
      LIMIT 1000
    `;

    const result = await pool.query(sql, [dias]);

    res.json({
      ok: true,
      total: result.rows.length,
      matches: result.rows,
    });
  } catch (error) {
    console.error("Erro /api/matches-futuros:", error);
    res.status(500).json({
      ok: false,
      error: "Erro ao buscar jogos futuros",
      details: error.message,
    });
  }
});

app.get("/api/matches-historico", async (req, res) => {
  try {
    const sql = `
      SELECT *
      FROM matches
      WHERE data::date < CURRENT_DATE
        AND status = 'finished'
      ORDER BY data DESC
      LIMIT 80000
    `;

    const result = await pool.query(sql);

    res.json({
      ok: true,
      total: result.rows.length,
      matches: result.rows,
    });
  } catch (error) {
    console.error("Erro /api/matches-historico:", error);
    res.status(500).json({
      ok: false,
      error: "Erro ao buscar histórico",
      details: error.message,
    });
  }
});

// ======================================================
// ENTRADAS - SALVAR NO POSTGRESQL/NEON
// ======================================================

async function ensureEntradasTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entradas (
      id TEXT PRIMARY KEY,
      data TEXT,
      liga TEXT,
      casa TEXT,
      visitante TEXT,
      modo TEXT,
      metodo TEXT,
      mercado TEXT,
      odd NUMERIC,
      stake NUMERIC,
      lucro NUMERIC,
      resultado TEXT,
      observacao TEXT,
      sync_status TEXT DEFAULT 'sql',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

app.get("/api/entradas", async (req, res) => {
  try {
    await ensureEntradasTable();

    const result = await pool.query(`
      SELECT *
      FROM entradas
      ORDER BY data DESC NULLS LAST, created_at DESC
    `);

    res.json({
      ok: true,
      total: result.rows.length,
      entradas: result.rows,
    });
  } catch (error) {
    console.error("Erro GET /api/entradas:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/entradas", async (req, res) => {
  try {
    await ensureEntradasTable();

    const item = req.body || {};

    const id =
      item.id ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const result = await pool.query(
      `
      INSERT INTO entradas (
        id, data, liga, casa, visitante, modo, metodo,
        mercado, odd, stake, lucro, resultado, observacao,
        sync_status, created_at, updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        'sql', COALESCE($14, NOW()), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        liga = EXCLUDED.liga,
        casa = EXCLUDED.casa,
        visitante = EXCLUDED.visitante,
        modo = EXCLUDED.modo,
        metodo = EXCLUDED.metodo,
        mercado = EXCLUDED.mercado,
        odd = EXCLUDED.odd,
        stake = EXCLUDED.stake,
        lucro = EXCLUDED.lucro,
        resultado = EXCLUDED.resultado,
        observacao = EXCLUDED.observacao,
        sync_status = 'sql',
        updated_at = NOW()
      RETURNING *;
      `,
      [
        String(id),
        item.data || "",
        item.liga || "",
        item.casa || "",
        item.visitante || item.fora || "",
        item.modo || "",
        item.metodo || "",
        item.mercado || "",
        item.odd || 0,
        item.stake || 0,
        item.lucro || 0,
        item.resultado || "",
        item.observacao || "",
        item.created_at || null,
      ]
    );

    res.json({
      ok: true,
      entrada: result.rows[0],
    });
  } catch (error) {
    console.error("Erro POST /api/entradas:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.delete("/api/entradas/:id", async (req, res) => {
  try {
    await ensureEntradasTable();

    await pool.query(
      `DELETE FROM entradas WHERE id = $1`,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro DELETE /api/entradas:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});


// ======================================================
// LOGOS - SQL / NEON
// ======================================================

async function ensureLogosTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      tipo TEXT DEFAULT 'time',
      imagem_base64 TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

function normalizeLogoId(value = "") {
  return String(value)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

app.get("/api/logos", async (req, res) => {
  try {
    await ensureLogosTable();

    const result = await pool.query(`
      SELECT *
      FROM logos
      ORDER BY tipo ASC, nome ASC
    `);

    res.json({
      ok: true,
      total: result.rows.length,
      logos: result.rows,
    });
  } catch (error) {
    console.error("Erro GET /api/logos:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.post("/api/logos", async (req, res) => {
  try {
    await ensureLogosTable();

    const {
      nome,
      tipo,
      imagem_base64,
    } = req.body || {};

    if (!nome || !imagem_base64) {
      return res.status(400).json({
        ok: false,
        error: "Nome e imagem são obrigatórios.",
      });
    }

    const id = normalizeLogoId(nome);

    const result = await pool.query(
      `
      INSERT INTO logos (
        id,
        nome,
        tipo,
        imagem_base64,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        nome = EXCLUDED.nome,
        tipo = EXCLUDED.tipo,
        imagem_base64 = EXCLUDED.imagem_base64,
        updated_at = NOW()
      RETURNING *;
      `,
      [
        id,
        nome,
        tipo || "time",
        imagem_base64,
      ]
    );

    res.json({
      ok: true,
      logo: result.rows[0],
    });
  } catch (error) {
    console.error("Erro POST /api/logos:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.delete("/api/logos/:id", async (req, res) => {
  try {
    await ensureLogosTable();

    await pool.query(
      `DELETE FROM logos WHERE id = $1`,
      [req.params.id]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error("Erro DELETE /api/logos:", error);

    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});



app.listen(PORT, () => {
  console.log("INICIANDO BACKEND API...");
  console.log("============================");
  console.log(`Servidor rodando na porta ${PORT}`);
});