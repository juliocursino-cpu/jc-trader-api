import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  RefreshCcw,
  Search,
  Trophy,
  Database,
  Target,
  BarChart3,
  ShieldCheck,
  Settings,
  Wallet,
  Users,
  Activity,
  Bell,
  AlertTriangle,
  Cpu,
  CalendarDays,
  Save,
  Trash2,
  PlusCircle,
} from "lucide-react";

const API_BASE_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001/api"
    : "https://jc-trader-api.onrender.com/api";

const TODAY_WINDOW_DAYS = 1;

const INITIAL_FILTERS = {
  date: "",
  league: "Todas",
  method: "Todos",
  seal: "Todos",
  minScore: "",
};

const SEAL_OPTIONS = [
  "Todos",
  "🔥 Excelente",
  "✅ Bom",
  "⚠️ Médio",
  "❌ Evitar",
];

const METHOD_OPTIONS = [
  "Todos",
  "Lay 0x1",
  "Lay 1x0",
  "Lay Draw",
  "Lay Goleada",
  "Lay Zebra",
  "Over HT",
  "Over 1.5 FT",
];

const DEFAULT_METHODS = [
  "Lay 0x1",
  "Lay 1x0",
  "Lay Draw",
  "Lay Goleada",
  "Lay Zebra",
  "Over HT",
  "Over 1.5 FT",
];

const MAIN_LEAGUES = [
  "BRAZIL SERIE A",
  "BRAZIL SERIE B",
  "PREMIER LEAGUE",
  "LA LIGA",
  "SERIE A",
  "BUNDESLIGA",
  "LIGUE 1",
  "PORTUGAL PRIMEIRA LIGA",
  "ARGENTINA PRIMERA",
  "USA MLS",
  "UEFA CHAMPIONS LEAGUE",
  "UEFA EUROPA LEAGUE",
  "COPA LIBERTADORES",
  "COPA SUDAMERICANA",
];

// ======================================================
// UTILITÁRIOS GERAIS
// ======================================================

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pct(value) {
  const n = safeNumber(value);
  return `${n.toFixed(1)}%`;
}

function money(value) {
  const n = safeNumber(value);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizeLeagueName(value) {
  const name = normalizeText(value);

  const map = {
    "BRAZIL 1": "BRAZIL SERIE A",
    "BRAZIL SERIE A": "BRAZIL SERIE A",
    "BRAZIL 2": "BRAZIL SERIE B",
    "BRAZIL SERIE B": "BRAZIL SERIE B",
    "ENGLAND PREMIER LEAGUE": "PREMIER LEAGUE",
    "ENGLAND CHAMPIONSHIP": "CHAMPIONSHIP",
    "SPAIN LA LIGA": "LA LIGA",
    "ITALY SERIE A": "SERIE A",
    "GERMANY BUNDESLIGA": "BUNDESLIGA",
    "FRANCE LIGUE 1": "LIGUE 1",
    "PORTUGAL LIGA": "PORTUGAL PRIMEIRA LIGA",
  };

  return map[name] || name;
}

function parseGameDate(value) {
  if (!value) return null;

  if (value instanceof Date) return value;

  const raw = String(value);

  if (raw.includes("/")) {
    const [d, m, y] = raw.split("/");
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateBR(value) {
  const date = parseGameDate(value);
  if (!date) return "-";

  return date.toLocaleDateString("pt-BR");
}

function isTodayOrTomorrow(value) {
  const date = parseGameDate(value);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const limit = new Date(today);
  limit.setDate(today.getDate() + TODAY_WINDOW_DAYS);
  limit.setHours(23, 59, 59, 999);

  return date >= today && date <= limit;
}

function extractGames(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.jogos)) return payload.jogos;
  if (Array.isArray(payload?.matches)) return payload.matches;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function normalizeGame(game = {}) {
  return {
    id:
      game.id ||
      game.Id ||
      `${game.Date || game.date}-${game.Home || game.home}-${game.Away || game.away}`,
    Date: game.Date || game.date || game.data || game.match_date,
    Time: game.Time || game.time || game.hora || "",
    League: normalizeLeagueName(
      game.League || game.league || game.Country || game.competition || ""
    ),
    Home: game.Home || game.home || game.home_team || game.Team_H || "",
    Away: game.Away || game.away || game.away_team || game.Team_A || "",
    Goals_H_FT: safeNumber(game.Goals_H_FT ?? game.goals_h_ft ?? game.hg, null),
    Goals_A_FT: safeNumber(game.Goals_A_FT ?? game.goals_a_ft ?? game.ag, null),
    Goals_H_HT: safeNumber(game.Goals_H_HT ?? game.goals_h_ht ?? game.hthg, null),
    Goals_A_HT: safeNumber(game.Goals_A_HT ?? game.goals_a_ht ?? game.htag, null),
    Odd_H: safeNumber(game.Odd_H ?? game.odd_h ?? game.home_odd, null),
    Odd_D: safeNumber(game.Odd_D ?? game.odd_d ?? game.draw_odd, null),
    Odd_A: safeNumber(game.Odd_A ?? game.odd_a ?? game.away_odd, null),
    Odd_Lay_01: safeNumber(game.Odd_Lay_01 ?? game.odd_lay_01, null),
    Odd_Lay_10: safeNumber(game.Odd_Lay_10 ?? game.odd_lay_10, null),
  };
}
// ======================================================
// MOTOR DE ESTATÍSTICAS E MÉTODOS
// ======================================================

function hasFinalScore(game) {
  return game.Goals_H_FT !== null && game.Goals_A_FT !== null;
}

function getTeamHistory(games, team, league, side = "all", limit = 10) {
  const teamNorm = normalizeText(team);
  const leagueNorm = normalizeLeagueName(league);

  return games
    .filter((g) => hasFinalScore(g))
    .filter((g) => normalizeLeagueName(g.League) === leagueNorm)
    .filter((g) => {
      const home = normalizeText(g.Home);
      const away = normalizeText(g.Away);

      if (side === "home") return home === teamNorm;
      if (side === "away") return away === teamNorm;
      return home === teamNorm || away === teamNorm;
    })
    .sort((a, b) => {
      const da = parseGameDate(a.Date)?.getTime() || 0;
      const db = parseGameDate(b.Date)?.getTime() || 0;
      return db - da;
    })
    .slice(0, limit);
}

function calcTeamStats(history, team) {
  const teamNorm = normalizeText(team);

  if (!history.length) {
    return {
      games: 0,
      avgGoalsFor: 0,
      avgGoalsAgainst: 0,
      over05HT: 0,
      over15FT: 0,
      cleanSheet: 0,
      failedToScore: 0,
      drawRate: 0,
      winRate: 0,
      loseRate: 0,
      score01AgainstRate: 0,
      score10AgainstRate: 0,
    };
  }

  let goalsFor = 0;
  let goalsAgainst = 0;
  let over05HT = 0;
  let over15FT = 0;
  let cleanSheet = 0;
  let failedToScore = 0;
  let draws = 0;
  let wins = 0;
  let losses = 0;
  let score01Against = 0;
  let score10Against = 0;

  history.forEach((g) => {
    const isHome = normalizeText(g.Home) === teamNorm;

    const gf = isHome ? g.Goals_H_FT : g.Goals_A_FT;
    const ga = isHome ? g.Goals_A_FT : g.Goals_H_FT;

    const htTotal = safeNumber(g.Goals_H_HT) + safeNumber(g.Goals_A_HT);
    const ftTotal = safeNumber(g.Goals_H_FT) + safeNumber(g.Goals_A_FT);

    goalsFor += gf;
    goalsAgainst += ga;

    if (htTotal >= 1) over05HT++;
    if (ftTotal >= 2) over15FT++;
    if (ga === 0) cleanSheet++;
    if (gf === 0) failedToScore++;
    if (gf === ga) draws++;
    if (gf > ga) wins++;
    if (gf < ga) losses++;

    if (isHome && g.Goals_H_FT === 0 && g.Goals_A_FT === 1) score01Against++;
    if (!isHome && g.Goals_H_FT === 1 && g.Goals_A_FT === 0) score10Against++;
  });

  const total = history.length;

  return {
    games: total,
    avgGoalsFor: goalsFor / total,
    avgGoalsAgainst: goalsAgainst / total,
    over05HT: (over05HT / total) * 100,
    over15FT: (over15FT / total) * 100,
    cleanSheet: (cleanSheet / total) * 100,
    failedToScore: (failedToScore / total) * 100,
    drawRate: (draws / total) * 100,
    winRate: (wins / total) * 100,
    loseRate: (losses / total) * 100,
    score01AgainstRate: (score01Against / total) * 100,
    score10AgainstRate: (score10Against / total) * 100,
  };
}

function classifySeal(score) {
  if (score >= 78) return "🔥 Excelente";
  if (score >= 65) return "✅ Bom";
  if (score >= 50) return "⚠️ Médio";
  return "❌ Evitar";
}

function calcLikelyScore(homeStats, awayStats) {
  const homeExpected =
    homeStats.avgGoalsFor * 0.65 + awayStats.avgGoalsAgainst * 0.35;
  const awayExpected =
    awayStats.avgGoalsFor * 0.65 + homeStats.avgGoalsAgainst * 0.35;

  const h = Math.max(0, Math.min(4, Math.round(homeExpected)));
  const a = Math.max(0, Math.min(4, Math.round(awayExpected)));

  return `${h}x${a}`;
}

function calcMethodScores(game, historicalGames) {
  const homeHistory = getTeamHistory(
    historicalGames,
    game.Home,
    game.League,
    "home",
    10
  );

  const awayHistory = getTeamHistory(
    historicalGames,
    game.Away,
    game.League,
    "away",
    10
  );

  const homeStats = calcTeamStats(homeHistory, game.Home);
  const awayStats = calcTeamStats(awayHistory, game.Away);

  const sampleQuality = Math.min(100, ((homeStats.games + awayStats.games) / 20) * 100);

  const homeStrength =
    homeStats.winRate * 0.35 +
    homeStats.over15FT * 0.2 +
    homeStats.avgGoalsFor * 12 -
    homeStats.failedToScore * 0.15;

  const awayWeakness =
    awayStats.loseRate * 0.35 +
    awayStats.avgGoalsAgainst * 14 +
    awayStats.failedToScore * 0.15;

  const drawRisk = (homeStats.drawRate + awayStats.drawRate) / 2;

  const overHTScore =
    (homeStats.over05HT * 0.45 + awayStats.over05HT * 0.45) +
    sampleQuality * 0.1;

  const overFTScore =
    (homeStats.over15FT * 0.45 + awayStats.over15FT * 0.45) +
    sampleQuality * 0.1;

  const lay01Score =
    homeStrength * 0.45 +
    awayWeakness * 0.35 +
    overFTScore * 0.15 +
    sampleQuality * 0.05 -
    drawRisk * 0.1;

  const awayStrength =
    awayStats.winRate * 0.35 +
    awayStats.over15FT * 0.2 +
    awayStats.avgGoalsFor * 12 -
    awayStats.failedToScore * 0.15;

  const homeWeakness =
    homeStats.loseRate * 0.35 +
    homeStats.avgGoalsAgainst * 14 +
    homeStats.failedToScore * 0.15;

  const lay10Score =
    awayStrength * 0.45 +
    homeWeakness * 0.35 +
    overFTScore * 0.15 +
    sampleQuality * 0.05 -
    drawRisk * 0.1;

  const layDrawScore =
    Math.max(0, 100 - drawRisk) * 0.45 +
    overFTScore * 0.35 +
    sampleQuality * 0.2;

  const layGoleadaScore =
    Math.abs(homeStats.avgGoalsFor - awayStats.avgGoalsAgainst) < 1.2
      ? 65
      : 48;

  const layZebraScore =
    Math.max(homeStrength, awayStrength) * 0.55 +
    Math.max(homeWeakness, awayWeakness) * 0.25 +
    sampleQuality * 0.2;

  const methods = [
    {
      method: "Lay 0x1",
      score: Math.max(0, Math.min(100, lay01Score)),
      reason: "Casa forte/visitante frágil contra cenário 0x1.",
    },
    {
      method: "Lay 1x0",
      score: Math.max(0, Math.min(100, lay10Score)),
      reason: "Visitante com força ou mandante vulnerável contra cenário 1x0.",
    },
    {
      method: "Lay Draw",
      score: Math.max(0, Math.min(100, layDrawScore)),
      reason: "Baixa tendência de empate somada a bom índice de gols.",
    },
    {
      method: "Lay Goleada",
      score: Math.max(0, Math.min(100, layGoleadaScore)),
      reason: "Proteção contra placar elástico fora do padrão estatístico.",
    },
    {
      method: "Lay Zebra",
      score: Math.max(0, Math.min(100, layZebraScore)),
      reason: "Diferença de força entre favorito e azarão.",
    },
    {
      method: "Over HT",
      score: Math.max(0, Math.min(100, overHTScore)),
      reason: "Alta frequência de gol no primeiro tempo.",
    },
    {
      method: "Over 1.5 FT",
      score: Math.max(0, Math.min(100, overFTScore)),
      reason: "Alta frequência de pelo menos 2 gols no jogo.",
    },
  ].map((item) => ({
    ...item,
    score: Number(item.score.toFixed(1)),
    seal: classifySeal(item.score),
  }));

  const best = [...methods].sort((a, b) => b.score - a.score)[0];

  return {
    ...game,
    homeStats,
    awayStats,
    methods,
    bestMethod: best?.method || "-",
    bestScore: best?.score || 0,
    seal: best?.seal || "❌ Evitar",
    likelyScore: calcLikelyScore(homeStats, awayStats),
    sampleQuality,
  };
}

// ======================================================
// COMPONENTE PRINCIPAL
// ======================================================

export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");

  const [todayGames, setTodayGames] = useState([]);
  const [historicalGames, setHistoricalGames] = useState([]);
  const [opportunities, setOpportunities] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [entries, setEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jc_entries") || "[]");
    } catch {
      return [];
    }
  });

  const [bank, setBank] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("jc_bank") || "[]");
    } catch {
      return [];
    }
  });

  const isLoadingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem("jc_entries", JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("jc_bank", JSON.stringify(bank));
  }, [bank]);

  async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro ${response.status}: ${text}`);
    }

    return response.json();
  }

  async function loadHistoricalDatabase() {
    setLoadingHistory(true);

    try {
      const payload = await fetchJson(`${API_BASE_URL}/historico?limit=30000`);
      const games = extractGames(payload).map(normalizeGame).filter(hasFinalScore);

      setHistoricalGames(games);
      return games;
    } catch (err) {
      console.error(err);
      setError(
        "Não consegui carregar o histórico. Verifique se a rota /api/historico está ativa no backend."
      );
      return [];
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadTodayAndTomorrowGames() {
    if (isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      let history = historicalGames;

      if (!history.length) {
        history = await loadHistoricalDatabase();
      }

      const payload = await fetchJson(`${API_BASE_URL}/jogos-janela/betfair`);
      const games = extractGames(payload)
        .map(normalizeGame)
        .filter((game) => isTodayOrTomorrow(game.Date));

      const enriched = games
        .map((game) => calcMethodScores(game, history))
        .sort((a, b) => b.bestScore - a.bestScore);

      setTodayGames(games);
      setOpportunities(enriched);
    } catch (err) {
      console.error(err);
      setError(
        "Não consegui carregar os jogos de hoje/amanhã. Verifique Render, rota /api/jogos-janela/betfair e CORS."
      );
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }

  useEffect(() => {
    loadTodayAndTomorrowGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leagues = useMemo(() => {
    const list = opportunities.map((g) => g.League).filter(Boolean);
    return ["Todas", ...Array.from(new Set(list)).sort()];
  }, [opportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((game) => {
      if (
        appliedFilters.league !== "Todas" &&
        game.League !== appliedFilters.league
      ) {
        return false;
      }

      if (
        appliedFilters.method !== "Todos" &&
        game.bestMethod !== appliedFilters.method
      ) {
        return false;
      }

      if (
        appliedFilters.seal !== "Todos" &&
        game.seal !== appliedFilters.seal
      ) {
        return false;
      }

      if (
        appliedFilters.minScore &&
        game.bestScore < Number(appliedFilters.minScore)
      ) {
        return false;
      }

      if (
        appliedFilters.date &&
        formatDateBR(game.Date) !== formatDateBR(appliedFilters.date)
      ) {
        return false;
      }

      return true;
    });
  }, [opportunities, appliedFilters]);

  const bestHomeOpportunities = useMemo(() => {
    return filteredOpportunities.filter((g) =>
      ["🔥 Excelente", "✅ Bom"].includes(g.seal)
    );
  }, [filteredOpportunities]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="flex">
        <aside className="min-h-screen w-64 border-r border-zinc-800 bg-[#0b0b0b] p-4">
          <h1 className="mb-1 text-2xl font-bold text-cyan-300">JC Trader</h1>
          <p className="mb-6 text-xs text-zinc-400">
            Scanner • Placar • Métodos • Banco
          </p>

          <nav className="space-y-2">
            <MenuButton active={activeTab === "inicio"} onClick={() => setActiveTab("inicio")} icon={<Trophy size={18} />} label="Início" />
            <MenuButton active={activeTab === "scanner"} onClick={() => setActiveTab("scanner")} icon={<Search size={18} />} label="Scanner" />
            <MenuButton active={activeTab === "placar"} onClick={() => setActiveTab("placar")} icon={<Target size={18} />} label="Placar" />
            <MenuButton active={activeTab === "tabelas"} onClick={() => setActiveTab("tabelas")} icon={<BarChart3 size={18} />} label="Tabelas" />
            <MenuButton active={activeTab === "ligas"} onClick={() => setActiveTab("ligas")} icon={<Users size={18} />} label="Ligas & Times" />
            <MenuButton active={activeTab === "entradas"} onClick={() => setActiveTab("entradas")} icon={<Activity size={18} />} label="Entradas" />
            <MenuButton active={activeTab === "alertas"} onClick={() => setActiveTab("alertas")} icon={<Bell size={18} />} label="Alertas" />
            <MenuButton active={activeTab === "banco"} onClick={() => setActiveTab("banco")} icon={<Wallet size={18} />} label="Banco" />
            <MenuButton active={activeTab === "config"} onClick={() => setActiveTab("config")} icon={<Settings size={18} />} label="Config" />
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Header
            loading={loading}
            loadingHistory={loadingHistory}
            onRefresh={loadTodayAndTomorrowGames}
          />

          {error && (
            <div className="mb-4 rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={18} />
                Atenção
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {activeTab === "inicio" && (
            <InicioPage
              opportunities={bestHomeOpportunities}
              loading={loading}
            />
          )}

          {activeTab === "scanner" && (
            <ScannerPage
              opportunities={filteredOpportunities}
              filters={filters}
              setFilters={setFilters}
              applyFilters={() => setAppliedFilters(filters)}
              clearFilters={() => {
                setFilters(INITIAL_FILTERS);
                setAppliedFilters(INITIAL_FILTERS);
              }}
              leagues={leagues}
            />
          )}

          {activeTab === "placar" && (
            <PlacarPage opportunities={filteredOpportunities} />
          )}

          {activeTab === "tabelas" && (
            <PlaceholderPage
              title="Tabelas"
              description="Aqui entra a tabela por liga com base no banco próprio."
            />
          )}

          {activeTab === "ligas" && (
            <PlaceholderPage
              title="Ligas & Times"
              description="Aqui entram filtros manuais e estatísticas por liga/time."
            />
          )}

          {activeTab === "entradas" && (
            <EntradasPage entries={entries} setEntries={setEntries} />
          )}

          {activeTab === "alertas" && (
            <PlaceholderPage
              title="Alertas"
              description="Estrutura pronta para alertas internos e Telegram futuramente."
            />
          )}

          {activeTab === "banco" && (
            <BancoPage bank={bank} setBank={setBank} />
          )}

          {activeTab === "config" && (
            <ConfigPage
              reload={loadTodayAndTomorrowGames}
              entries={entries}
              bank={bank}
              setEntries={setEntries}
              setBank={setBank}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ======================================================
// COMPONENTES BASE
// ======================================================

function MenuButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-cyan-500/20 text-cyan-300"
          : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Header({ loading, loadingHistory, onRefresh }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold">Painel JC Trader API</h2>
        <p className="text-sm text-zinc-400">
          Jogos de hoje/amanhã, banco próprio e engine de métodos.
        </p>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading || loadingHistory}
        className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
      >
        <RefreshCcw size={16} />
        {loading || loadingHistory ? "Carregando..." : "Atualizar"}
      </button>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
      <div className="mb-3 flex items-center justify-between text-zinc-400">
        <span className="text-sm">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function InicioPage({ opportunities, loading }) {
  const excellent = opportunities.filter((g) => g.seal === "🔥 Excelente");
  const good = opportunities.filter((g) => g.seal === "✅ Bom");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard title="Oportunidades" value={opportunities.length} icon={<Target size={18} />} />
        <StatCard title="Excelentes" value={excellent.length} icon={<ShieldCheck size={18} />} />
        <StatCard title="Boas" value={good.length} icon={<Trophy size={18} />} />
        <StatCard title="Status" value={loading ? "Carregando" : "Online"} icon={<Cpu size={18} />} />
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
        <h3 className="mb-3 text-lg font-semibold">
          Melhores oportunidades de hoje/amanhã
        </h3>

        <OpportunityTable games={opportunities.slice(0, 20)} compact />
      </section>
    </div>
  );
}

function ScannerPage({
  opportunities,
  filters,
  setFilters,
  applyFilters,
  clearFilters,
  leagues,
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
        <h3 className="mb-4 text-lg font-semibold">Filtros manuais</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          />

          <select
            value={filters.league}
            onChange={(e) => setFilters((f) => ({ ...f, league: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            {leagues.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>

          <select
            value={filters.method}
            onChange={(e) => setFilters((f) => ({ ...f, method: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          <select
            value={filters.seal}
            onChange={(e) => setFilters((f) => ({ ...f, seal: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            {SEAL_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Score mínimo"
            value={filters.minScore}
            onChange={(e) =>
              setFilters((f) => ({ ...f, minScore: e.target.value }))
            }
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={applyFilters}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Aplicar filtros
          </button>

          <button
            onClick={clearFilters}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-300"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
        <h3 className="mb-3 text-lg font-semibold">Scanner de jogos</h3>
        <OpportunityTable games={opportunities} />
      </section>
    </div>
  );
}

function OpportunityTable({ games, compact = false }) {
  if (!games.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
        Nenhum jogo encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="border-b border-zinc-800 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-3">Data</th>
            <th className="px-3 py-3">Hora</th>
            <th className="px-3 py-3">Liga</th>
            <th className="px-3 py-3">Jogo</th>
            <th className="px-3 py-3">Método</th>
            <th className="px-3 py-3">Score</th>
            <th className="px-3 py-3">Selo</th>
            <th className="px-3 py-3">Placar provável</th>
            {!compact && <th className="px-3 py-3">Motivo</th>}
          </tr>
        </thead>

        <tbody>
          {games.map((game, index) => {
            const best =
              game.methods?.find((m) => m.method === game.bestMethod) ||
              game.methods?.[0];

            return (
              <tr key={`${game.id}-${index}`} className="border-b border-zinc-900">
                <td className="px-3 py-3">{formatDateBR(game.Date)}</td>
                <td className="px-3 py-3">{game.Time || "-"}</td>
                <td className="px-3 py-3 text-zinc-400">{game.League}</td>
                <td className="px-3 py-3 font-medium">
                  {game.Home} <span className="text-zinc-500">x</span> {game.Away}
                </td>
                <td className="px-3 py-3 text-cyan-300">{game.bestMethod}</td>
                <td className="px-3 py-3 font-bold">{game.bestScore}</td>
                <td className="px-3 py-3">{game.seal}</td>
                <td className="px-3 py-3">{game.likelyScore}</td>
                {!compact && (
                  <td className="px-3 py-3 text-zinc-400">
                    {best?.reason || "-"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PlacarPage({ opportunities }) {
  const layGames = opportunities
    .filter((game) => ["Lay 0x1", "Lay 1x0"].includes(game.bestMethod))
    .sort((a, b) => b.bestScore - a.bestScore);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
        <h3 className="mb-2 text-lg font-semibold">
          Placar provável — foco Lay 0x1 / Lay 1x0
        </h3>
        <p className="mb-4 text-sm text-zinc-400">
          Usa força casa/fora, histórico recente na liga, risco de 0x1/1x0 e confiança estatística.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {layGames.slice(0, 18).map((game, index) => (
            <div
              key={`${game.id}-placar-${index}`}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              <div className="mb-2 text-xs text-zinc-500">
                {formatDateBR(game.Date)} • {game.Time || "-"} • {game.League}
              </div>

              <div className="mb-3 font-semibold">
                {game.Home} <span className="text-zinc-500">x</span> {game.Away}
              </div>

              <div className="mb-3 rounded-xl bg-zinc-900 p-3 text-center">
                <div className="text-xs text-zinc-400">Placar FT provável</div>
                <div className="text-3xl font-bold text-cyan-300">
                  {game.likelyScore}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <InfoBox label="Método" value={game.bestMethod} />
                <InfoBox label="Confiança" value={`${game.bestScore}%`} />
                <InfoBox label="Selo" value={game.seal} />
                <InfoBox label="Amostra" value={`${Math.round(game.sampleQuality)}%`} />
                <InfoBox
                  label="Casa Over 1.5"
                  value={pct(game.homeStats?.over15FT)}
                />
                <InfoBox
                  label="Fora Over 1.5"
                  value={pct(game.awayStats?.over15FT)}
                />
              </div>
            </div>
          ))}
        </div>

        {!layGames.length && (
          <div className="rounded-xl border border-zinc-800 bg-black p-4 text-sm text-zinc-400">
            Nenhum jogo Lay 0x1/1x0 encontrado com os filtros atuais.
          </div>
        )}
      </section>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f0f] p-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function EntradasPage({ entries, setEntries }) {
  return (
    <PlaceholderPage
      title="Entradas"
      description={`Entradas salvas: ${entries.length}. Próximo ajuste: botão adicionar junto aos comandos, filtro mês e calendário único.`}
    />
  );
}

function BancoPage({ bank, setBank }) {
  return (
    <PlaceholderPage
      title="Banco"
      description={`Movimentações salvas: ${bank.length}. Depósitos, saques e saldo serão mantidos aqui.`}
    />
  );
}

function ConfigPage({ reload, entries, bank, setEntries, setBank }) {
  function exportBackup() {
    const data = {
      entries,
      bank,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "jc-trader-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetLocalData() {
    if (!window.confirm("Deseja apagar Entradas e Banco deste dispositivo?")) return;

    setEntries([]);
    setBank([]);
    localStorage.removeItem("jc_entries");
    localStorage.removeItem("jc_bank");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-4">
        <h3 className="mb-3 text-lg font-semibold">Configurações</h3>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={reload}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-black"
          >
            <RefreshCcw size={16} />
            Recarregar jogos
          </button>

          <button
            onClick={exportBackup}
            className="flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
          >
            <Save size={16} />
            Exportar backup
          </button>

          <button
            onClick={resetLocalData}
            className="flex items-center gap-2 rounded-xl border border-red-800 px-4 py-2 text-sm text-red-300"
          >
            <Trash2 size={16} />
            Reset local
          </button>
        </div>
      </section>
    </div>
  );
}

function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-6">
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </section>
  );
}
