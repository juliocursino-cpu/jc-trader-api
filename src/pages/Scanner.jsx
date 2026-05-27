import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Database, Star } from "lucide-react";

import { fetchTodayGames } from "../services/api";
import { normalizeGame } from "../services/normalize";

import ScannerFilters from "../components/ScannerFilters";
import GameRow from "../components/GameRow";

export default function Scanner() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
  period: "all",
  league: "Todas",
  favorite: "all",
  market: "all",
  minOdd: "",
  maxOdd: "",
});

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("jc_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  function toggleFavorite(id) {
    const updated = favorites.includes(id)
      ? favorites.filter((fav) => fav !== id)
      : [...favorites, id];

    setFavorites(updated);
    localStorage.setItem("jc_favorites", JSON.stringify(updated));

    setGames((prev) =>
      prev.map((game) =>
        game.id === id ? { ...game, favorite: !game.favorite } : game
      )
    );
  }

  async function loadData() {
    try {
      setLoading(true);

      const todayPayload = await fetchTodayGames();
      const rawGames = (todayPayload.jogos || []).map(normalizeGame);

      const hoje = new Date();
      const amanha = new Date();
      amanha.setDate(hoje.getDate() + 1);

      function toISO(date) {
        return date.toISOString().slice(0, 10);
      }

      const datasPermitidas = [toISO(hoje), toISO(amanha)];

      let selectedGames = rawGames.filter((game) =>
        datasPermitidas.includes(String(game.Date).slice(0, 10))
      );

      if (!selectedGames.length) {
        const availableDates = [
          ...new Set(rawGames.map((g) => String(g.Date).slice(0, 10))),
        ]
          .filter(Boolean)
          .sort()
          .slice(0, 2);

        selectedGames = rawGames.filter((game) =>
          availableDates.includes(String(game.Date).slice(0, 10))
        );
      }

      const withFavorites = selectedGames.map((game, index) => {
        const id =
          game.ID_Evento ||
          game.id ||
          `${game.Date}-${game.Time}-${game.Home}-${game.Away}-${index}`;

        return {
          ...game,
          id,
          favorite: favorites.includes(id),
        };
      });

      setGames(withFavorites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const leagues = useMemo(() => {
    return [...new Set(games.map((g) => g.League).filter(Boolean))];
  }, [games]);

  const filteredGames = useMemo(() => {
    let filtered = [...games];

    const datasDisponiveis = [
      ...new Set(games.map((g) => String(g.Date).slice(0, 10))),
    ]
      .filter(Boolean)
      .sort();

    const dataHojeScanner = datasDisponiveis[0];
    const dataAmanhaScanner = datasDisponiveis[1];

    if (filters.period === "today") {
      filtered = filtered.filter(
        (g) => String(g.Date).slice(0, 10) === dataHojeScanner
      );
    }

    if (filters.period === "tomorrow") {
      filtered = filtered.filter(
        (g) => String(g.Date).slice(0, 10) === dataAmanhaScanner
      );
    }

    if (filters.league !== "Todas") {
      filtered = filtered.filter((g) => g.League === filters.league);
    }


    if (filters.market !== "all") {
  const min = Number(String(filters.minOdd).replace(",", "."));
  const max = Number(String(filters.maxOdd).replace(",", "."));

  filtered = filtered.filter((g) => {
    const odd = Number(g[filters.market]);

    if (!Number.isFinite(odd) || odd <= 0) return false;
    if (Number.isFinite(min) && odd < min) return false;
    if (Number.isFinite(max) && odd > max) return false;

    return true;
  });
}

    if (filters.favorite === "fav") {
      filtered = filtered.filter((g) => g.favorite);
    }

    filtered.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;

      const da = new Date(`${a.Date}T${a.Time || "00:00"}`);
      const db = new Date(`${b.Date}T${b.Time || "00:00"}`);

      return da - db;
    });

    return filtered;
  }, [games, filters]);

  const favoriteCount = filteredGames.filter((g) => g.favorite).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div>
          <p className="text-xs font-black tracking-[4px] text-cyan-300">
            JC TRADER
          </p>
          <h1 className="text-3xl font-black">Scanner</h1>
          <p className="text-sm text-zinc-500">
            Odds Betfair dos jogos de hoje e amanhã
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        <TopCard title="Jogos" value={filteredGames.length} icon={Database} />
        <TopCard title="Favoritos" value={favoriteCount} icon={Star} />
      </div>

      <ScannerFilters
        filters={filters}
        setFilters={setFilters}
        leagues={leagues}
      />

      <div className="max-h-[680px] overflow-auto rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
  <table className="w-full min-w-[1650px] table-auto text-sm">
          <thead className="sticky top-0 z-20 bg-[#0b0b0b]">
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="px-2 py-3"></th>
              <th className="w-[95px] px-2 py-3 text-left">Date</th>
<th className="w-[70px] px-2 py-3 text-left">Hour</th>
<th className="w-[90px] px-2 py-3 text-left">League</th>
<th className="w-[160px] px-2 py-3 text-right">Home</th>
<th className="w-[100px] px-2 py-3 text-center">x</th>
<th className="w-[160px] px-2 py-3 text-left">Away</th>
              <th className="px-2 py-3">1</th>
              <th className="px-2 py-3">X</th>
              <th className="px-2 py-3">2</th>
              <th className="px-2 py-3">Over 0.5 HT</th>
              <th className="px-2 py-3">Over 1.5 FT</th>
              <th className="px-2 py-3">Lay 0x1</th>
              <th className="px-2 py-3">Lay 1x0</th>
              <th className="px-2 py-3">Lay G. Casa</th>
              <th className="px-2 py-3">Lay G. Fora</th>
            </tr>
          </thead>

          <tbody>
            {filteredGames.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                toggleFavorite={toggleFavorite}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TopCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
          {title}
        </p>
        <Icon size={18} className="text-zinc-500" />
      </div>

      <div className="text-3xl font-black">{value}</div>
    </div>
  );
}