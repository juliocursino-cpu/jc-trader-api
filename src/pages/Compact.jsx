import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Database, Star } from "lucide-react";
import { fetchFutureMatches, fetchHistoricalMatches } from "../services/api";
import { buildCompactGames } from "../services/compactEngine";

// ======================================================
// CONFIG
// ======================================================

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

// ======================================================
// LOGOS SQL + FALLBACK LOCAL
// ======================================================

let LOGOS_CACHE = null;

async function carregarLogosSQL() {
  if (LOGOS_CACHE) return LOGOS_CACHE;

  try {
    const response = await fetch(`${API_BASE}/logos`);
    const data = await response.json();

    LOGOS_CACHE = data.ok ? data.logos || [] : [];
    return LOGOS_CACHE;
  } catch {
    LOGOS_CACHE = [];
    return [];
  }
}

function normalizeLogoSQL(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function logo(key) {
  return `/logos/${String(key || "").toLowerCase()}.png`;
}

function leagueLogo(key) {
  return `/logos/leagues/${String(key || "").toLowerCase()}.png`;
}

function SQLLogo({ name, logoKey, tipo = "time", fallbackColor = "00d2ff" }) {
  const [src, setSrc] = useState(
    tipo === "liga"
      ? leagueLogo(logoKey)
      : logo(logoKey)
  );

  useEffect(() => {
    let ativo = true;

    async function buscarLogo() {
      const logos = await carregarLogosSQL();
      const id = normalizeLogoSQL(name);

      const found = logos.find(
        (item) =>
          item.tipo === tipo &&
          item.id === id
      );

      if (!ativo) return;

      if (found?.imagem_base64) {
        setSrc(found.imagem_base64);
      } else {
        setSrc(
          tipo === "liga"
            ? leagueLogo(logoKey)
            : logo(logoKey)
        );
      }
    }

    buscarLogo();

    return () => {
      ativo = false;
    };
  }, [name, logoKey, tipo]);

  return (
    <img
      src={src}
      alt={name}
      onError={(e) => {
        if (tipo === "liga") {
          e.currentTarget.style.display = "none";
          return;
        }

        e.currentTarget.src =
          `https://placehold.co/22x22/111111/${fallbackColor}?text=${String(name || "?").charAt(0)}`;
      }}
      className={
        tipo === "liga"
          ? "h-5 w-5 object-contain"
          : "h-7 w-7 object-contain"
      }
    />
  );
}

// ======================================================
// HELPERS
// ======================================================

function pct(value) {
  return `${Math.round(Number(value || 0))}%`;
}

function cellColor(value) {
  if (value >= 80) return "text-emerald-300";
  if (value >= 60) return "text-yellow-300";
  return "text-red-300";
}

function ProbCell({ value }) {
  return (
    <td className={`px-2 py-3 text-center font-black ${cellColor(value)}`}>
      {pct(value)}
    </td>
  );
}

export default function Compact() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    league: "Todas",
    favorite: "all",
    minScore: "",
    minBase: "",
    market: "all",
    minProb: "",
  });

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("jc_compact_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  function toggleFavorite(id) {
    const updated = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("jc_compact_favorites", JSON.stringify(updated));

    setGames((prev) =>
      prev.map((game) =>
        game.id === id ? { ...game, favorite: !game.favorite } : game
      )
    );
  }

  async function loadData() {
    setLoading(true);

    try {
      const futurePayload = await fetchFutureMatches();
      const historyPayload = await fetchHistoricalMatches();

      const compact = buildCompactGames(
        futurePayload.matches || [],
        historyPayload.matches || []
      ).map((game) => ({
        ...game,
        favorite: favorites.includes(String(game.id)),
      }));

      setGames(compact);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const leagues = useMemo(
    () => [...new Set(games.map((g) => g.League).filter(Boolean))],
    [games]
  );

  const filteredGames = useMemo(() => {
    let list = [...games];

    if (filters.league !== "Todas") {
      list = list.filter((g) => g.League === filters.league);
    }

    if (filters.favorite === "fav") {
      list = list.filter((g) => g.favorite);
    }

    if (filters.minScore) {
      list = list.filter((g) => g.score >= Number(filters.minScore));
    }

    if (filters.minBase) {
      list = list.filter((g) => g.baseTotal >= Number(filters.minBase));
    }

    if (filters.market !== "all" && filters.minProb) {
      list = list.filter((g) => Number(g[filters.market] || 0) >= Number(filters.minProb));
    }

    return list.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.score - a.score;
    });
  }, [games, filters]);

  const favoriteCount = filteredGames.filter((g) => g.favorite).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div>
          <p className="text-xs font-black tracking-[4px] text-cyan-300">
            JC TRADER
          </p>
          <h1 className="text-3xl font-black">Compact</h1>
          <p className="text-sm text-zinc-500">
            Probabilidades calculadas com o banco próprio.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black"
        >
          <RefreshCcw size={16} />
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card title="Jogos" value={filteredGames.length} />
        <Card title="Ligas" value={leagues.length} />
        <Card title="Favoritos" value={favoriteCount} />
        <Card title="Fonte" value="Banco" />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <select
            value={filters.league}
            onChange={(e) => setFilters((p) => ({ ...p, league: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="Todas">Todas as ligas</option>
            {leagues.map((league) => (
              <option key={league} value={league}>{league}</option>
            ))}
          </select>

          <select
            value={filters.market}
            onChange={(e) => setFilters((p) => ({ ...p, market: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="all">Todos mercados</option>
            <option value="overHT">Over 0.5 HT</option>
            <option value="over15">Over 1.5 FT</option>
            <option value="lay01">Lay 0x1</option>
            <option value="lay10">Lay 1x0</option>
            <option value="layGHome">Lay G. Casa</option>
            <option value="layGAway">Lay G. Fora</option>
          </select>

          <input
            value={filters.minProb}
            onChange={(e) => setFilters((p) => ({ ...p, minProb: e.target.value }))}
            placeholder="Prob. mín."
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          />

          <input
            value={filters.minScore}
            onChange={(e) => setFilters((p) => ({ ...p, minScore: e.target.value }))}
            placeholder="Score mín."
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          />

          <input
            value={filters.minBase}
            onChange={(e) => setFilters((p) => ({ ...p, minBase: e.target.value }))}
            placeholder="Base mín."
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          />

          <select
            value={filters.favorite}
            onChange={(e) => setFilters((p) => ({ ...p, favorite: e.target.value }))}
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            <option value="all">Todos</option>
            <option value="fav">Favoritos</option>
          </select>

          <button
            onClick={() =>
              setFilters({
                league: "Todas",
                favorite: "all",
                minScore: "",
                minBase: "",
                market: "all",
                minProb: "",
              })
            }
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-bold hover:bg-zinc-800 md:col-span-6"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="max-h-[680px] overflow-auto rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <table className="w-max min-w-[1650px] table-auto text-sm">
          <thead className="sticky top-0 z-20 bg-[#0b0b0b] text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="px-2 py-3"></th>
              <th className="w-[90px] px-2 py-3 text-left">Date</th>
              <th className="w-[60px] px-2 py-3 text-left">Hour</th>
              <th className="w-[180px] px-2 py-3 text-left">League</th>
              <th className="w-[210px] px-2 py-3 text-right">Home</th>
              <th className="w-[90px] px-2 py-3 text-center">x</th>
              <th className="w-[210px] px-2 py-3 text-left">Away</th>
              <th className="px-2 py-3">Over 0.5 HT</th>
              <th className="px-2 py-3">Over 1.5 FT</th>
              <th className="px-2 py-3">Lay 0x1</th>
              <th className="px-2 py-3">Lay 1x0</th>
              <th className="px-2 py-3">Lay G. Casa</th>
              <th className="px-2 py-3">Lay G. Fora</th>
              <th className="px-2 py-3">Placar</th>
              <th className="px-2 py-3">Base</th>
              <th className="px-2 py-3">Score</th>
            </tr>
          </thead>

          <tbody>
            {filteredGames.map((game) => (
              <tr key={game.id} className="border-b border-zinc-900 hover:bg-zinc-900/70">
                <td className="px-2 py-3 text-center">
                  <button onClick={() => toggleFavorite(String(game.id))}>
                    <Star
                      size={18}
                      className={
                        game.favorite
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-zinc-500 hover:text-yellow-400"
                      }
                    />
                  </button>
                </td>

                <td className="w-[90px] whitespace-nowrap px-2 py-3 font-bold">
                  {game.Date}
                </td>
                <td className="w-[60px] whitespace-nowrap px-2 py-3 font-bold">
                  {game.Time}
                </td>

                <td className="w-[180px] whitespace-nowrap px-2 py-3 text-zinc-300">
                  <div className="flex items-center gap-2">
                    <SQLLogo
                      name={game.League}
                      logoKey={game.LeagueKey}
                      tipo="liga"
                    />
                    {game.League}
                  </div>
                </td>

                <td className="w-[210px] px-3 py-3 text-right font-black">
                  {game.Home}
                </td>

                <td className="w-[90px] px-2 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <SQLLogo
                      name={game.Home}
                      logoKey={game.HomeKey}
                      tipo="time"
                      fallbackColor="00d2ff"
                    />
                    <span className="text-zinc-500">x</span>
                    <SQLLogo
                      name={game.Away}
                      logoKey={game.AwayKey}
                      tipo="time"
                      fallbackColor="ff4d4d"
                    />
                  </div>
                </td>

                <td className="w-[210px] px-3 py-3 text-left font-black">
                  {game.Away}
                </td>

                <ProbCell value={game.overHT} />
                <ProbCell value={game.over15} />
                <ProbCell value={game.lay01} />
                <ProbCell value={game.lay10} />
                <ProbCell value={game.layGHome} />
                <ProbCell value={game.layGAway} />

                <td className="px-2 py-3 text-center font-black text-cyan-300">
                  {game.likelyScore}
                </td>

                <td className="px-2 py-3 text-center text-zinc-400">
                  {game.baseCasa}+{game.baseFora}/20
                </td>

                <td className="px-2 py-3 text-center font-black text-blue-300">
                  {game.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
          {title}
        </p>
        <Database size={18} className="text-zinc-500" />
      </div>

      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}
