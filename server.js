import express from "express";
import cors from "cors";
import axios from "axios";
import "dotenv/config";
import { parse } from "csv-parse/sync";

const app = express();

app.use(cors());
app.use(express.json());

const TOKEN = "d128d3a3e828ca5fd800f73170dc215dfc589a1c";

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
  res.status(503).json({
    erro: "Histórico completo temporariamente desativado no Render Free",
    detalhe:
      "Essa rota carrega muitos dados e estoura a memória do plano gratuito. Publicaremos primeiro as rotas leves e depois otimizaremos o histórico em cache/paginação.",
  });
});

    const dadosCompletos = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      trim: true,
    });

    const dados = dadosCompletos.slice(-limit);

    res.json({
      totalOriginal: dadosCompletos.length,
      total: dados.length,
      limit,
      dados,
    });
  } catch (err) {
    console.log("Erro /api/historico:", err.response?.data || err.message);

    res.status(500).json({
      erro: "Erro ao buscar histórico CSV",
      detalhe: err.response?.data || err.message,
    });
  }
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

// ===================== FOOTSTATS RESULTADOS - COMPACT =====================

const FUT_TOKEN = process.env.FUT_TOKEN || "";

function firstFootstats(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function brDateFootstats(value) {
  if (!value) return "";

  const raw = String(value).trim();

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${String(br[1]).padStart(2, "0")}/${String(br[2]).padStart(2, "0")}/${y}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;

  return raw;
}

function scoreFootstats(home, away) {
  if (home === "" || away === "") return "";
  const h = Number(String(home).replace(",", "."));
  const a = Number(String(away).replace(",", "."));
  if (!Number.isFinite(h) || !Number.isFinite(a)) return "";
  return `${h}x${a}`;
}

function filtrarPorTemporada(item, temporada) {
  if (!temporada || temporada === "Todas") return true;

  const partes = String(item.data).split("/");
  const mes = Number(partes[1]);
  const ano = Number(partes[2]);

  if (!ano || !mes) return false;

  if (/^\d{4}$/.test(temporada)) {
    return ano === Number(temporada);
  }

  if (/^\d{4}\/\d{4}$/.test(temporada)) {
    const [anoInicio, anoFim] = temporada.split("/").map(Number);
    return (ano === anoInicio && mes >= 7) || (ano === anoFim && mes <= 6);
  }

  return true;
}

function parseScoreFootstats(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d+)\s*[xX\-:]\s*(\d+)/);
  if (!match) return "";
  return `${Number(match[1])}x${Number(match[2])}`;
}

function normalizeFootstatsRow(row) {
  const data = brDateFootstats(
    firstFootstats(row, ["Data", "Date", "date", "data"])
  );

  const liga = firstFootstats(row, [
    "Liga",
    "League",
    "league",
    "Competição",
    "Competicao",
  ]);

  const casa = firstFootstats(row, [
    "Home",
    "Casa",
    "Mandante",
    "home",
    "home_team",
    "Home Team",
    "Time Casa",
  ]);

  const fora = firstFootstats(row, [
    "Away",
    "Fora",
    "Visitante",
    "away",
    "away_team",
    "Away Team",
    "Time Fora",
  ]);

  const htDirect = firstFootstats(row, [
    "HT",
    "ht",
    "HalfTime",
    "Resultado HT",
    "score_ht",
    "ht_score",
  ]);

  const ftDirect = firstFootstats(row, [
    "FT",
    "ft",
    "FullTime",
    "Resultado FT",
    "Score",
    "score",
    "ft_score",
  ]);

  const htHome = firstFootstats(row, [
    "Goals_H_HT",
    "HT_Home",
    "HT Home",
    "HTHG",
    "home_ht_goals",
    "home_ht",
  ]);

  const htAway = firstFootstats(row, [
    "Goals_A_HT",
    "HT_Away",
    "HT Away",
    "HTAG",
    "away_ht_goals",
    "away_ht",
  ]);

  const ftHome = firstFootstats(row, [
    "Goals_H_FT",
    "FT_Home",
    "FT Home",
    "FTHG",
    "home_goals",
    "home_score",
    "hg",
  ]);

  const ftAway = firstFootstats(row, [
    "Goals_A_FT",
    "FT_Away",
    "FT Away",
    "FTAG",
    "away_goals",
    "away_score",
    "ag",
  ]);

  const htScore =
    parseScoreFootstats(htDirect) || scoreFootstats(htHome, htAway);

  const ftScore =
    parseScoreFootstats(ftDirect) || scoreFootstats(ftHome, ftAway);

  return {
    data,
    liga: String(liga || "").trim(),
    casa: String(casa || "").trim(),
    fora: String(fora || "").trim(),
    htScore,
    ftScore,
  };
}

  

app.get("/api/footstats/resultados", async (req, res) => {
  try {
    

    const response = await fetch(
  "https://api.futpythontrader.com/api/dados/footystats/download/",
  {
    headers: {
      Authorization: `Token ${FUT_TOKEN}`,
    },
  }
);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Erro ao buscar CSV da Footstats",
        status: response.status,
      });
    }

    const csvText = await response.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
      bom: true,
      relax_column_count: true,
      trim: true,
    });

	console.log("COLUNAS FOOTSTATS:", Object.keys(records[0] || {}));
        console.log("PRIMEIRA LINHA FOOTSTATS:", records[0]);


    const resultados = records
      .map(normalizeFootstatsRow)
      .filter((item) => item.data && item.casa && item.fora && (item.htScore || item.ftScore));

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


// ===================== FOOTSTATS TABELAS - CLASSIFICAÇÃO =====================

let footstatsTabelaCache = null;
let footstatsTabelaCacheTime = 0;
const FOOTSTATS_TABELA_CACHE_MS = 30 * 60 * 1000;

function parseFootstatsDateToTime(value) {
  if (!value) return 0;
  const raw = String(value).trim();
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) {
    const y = br[3].length === 2 ? `20${br[3]}` : br[3];
    return new Date(Number(y), Number(br[2]) - 1, Number(br[1])).getTime();
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])).getTime();
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFtScoreToNumbers(value) {
  if (!value) return null;

  const raw = String(value)
    .replace("FT", "")
    .replace(/\s+/g, "")
    .trim();

  const match = raw.match(/(\d+)[xX\-:](\d+)/);

  if (!match) return null;

  const home = Number(match[1]);
  const away = Number(match[2]);

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return null;
  }

  return {
    home,
    away,
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
    const score = parseFtScoreToNumbers(game.ftScore);
    if (!score || !game.casa || !game.fora) return;

   const casa = String(game.casa || "").trim();
const fora = String(game.fora || "").trim();

const golsCasa = Number(score.home);
const golsFora = Number(score.away);

if (!casa || !fora) return;

if (mode === "geral" || mode === "casa") {
  addStandingResult(getTeam(casa), golsCasa, golsFora);
}

if (mode === "geral" || mode === "fora") {
  addStandingResult(getTeam(fora), golsFora, golsCasa);
}
  });

  return [...teams.values()]
    .map((row) => ({
  ...row,
  forma: row.forma
    .filter(Boolean)
    .slice(-5)
    .reverse(),
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

function buildFootstatsTables(resultados) {
  const grouped = new Map();

  resultados
    .filter((game) => game.liga && game.casa && game.fora && parseFtScoreToNumbers(game.ftScore))
    .sort((a, b) => parseFootstatsDateToTime(b.data) - parseFootstatsDateToTime(a.data))
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

    const response = await fetch(
      "https://api.futpythontrader.com/api/dados/footystats/download/",
      {
        headers: {
          Authorization: `Token ${FUT_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "Erro ao buscar CSV da Footstats",
        status: response.status,
      });
    }

    const csvText = await response.text();
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ",",
      bom: true,
      relax_column_count: true,
      trim: true,
    });

    const temporada = req.query.temporada || "2026";

const resultados = records
  .map(normalizeFootstatsRow)
  .filter((item) => item.data && item.casa && item.fora && item.ftScore)
  .filter((item) => filtrarPorTemporada(item, temporada));

    const built = buildFootstatsTables(resultados);

    footstatsTabelaCache = {
      totalJogos: resultados.length,
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

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});