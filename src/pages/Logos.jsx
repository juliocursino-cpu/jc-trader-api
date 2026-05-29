// Arquivo Logos.jsx ajustado para SQL + logos locais
import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";

import { fetchTodayGames, fetchMatches } from "../services/api";
import { normalizeGame, normalizeKey } from "../services/normalize";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "https://jc-trader-api.onrender.com/api";

function logoPath(key) {
  return `/logos/${String(key || "").toLowerCase()}.png`;
}

function normalizeLogoSQL(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export default function Logos() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("Todas");
  const [sqlLogos, setSqlLogos] = useState([]);

  async function loadTeams() {
    setLoading(true);

    try {
      const map = new Map();

      try {
        const logosResponse = await fetch(`${API_BASE}/logos`);
        const logosData = await logosResponse.json();

        if (logosData.ok) {
          setSqlLogos(logosData.logos || []);

          logosData.logos.forEach((logo) => {
            addTeam(
              map,
              logo.nome,
              normalizeKey(logo.nome),
              "SQL"
            );
          });
        }
      } catch (err) {
        console.warn("Erro ao carregar logos SQL", err);
      }

      const apiPayload = await fetchTodayGames();
      const apiGames = (apiPayload.jogos || []).map(normalizeGame);

      apiGames.forEach((game) => {
        addTeam(map, game.Home, game.HomeKey, "API");
        addTeam(map, game.Away, game.AwayKey, "API");
      });

      const matchesPayload = await fetchMatches();
      const matches = (matchesPayload.matches || []).map(normalizeGame);

      matches.forEach((game) => {
        addTeam(map, game.Home, game.HomeKey, "Banco");
        addTeam(map, game.Away, game.AwayKey, "Banco");
      });

      setTeams(
        [...map.values()].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const text =
        `${team.name} ${team.key} ${team.sources.join(" ")}`
          .toLowerCase();

      if (query && !text.includes(query.toLowerCase())) {
        return false;
      }

      if (
        source !== "Todas" &&
        !team.sources.includes(source)
      ) {
        return false;
      }

      return true;
    });
  }, [teams, query, source]);

  const sources = useMemo(() => {
    const all = teams.flatMap((team) => team.sources);

    return ["Todas", ...new Set(all)];
  }, [teams]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div>
          <p className="text-xs font-black tracking-[4px] text-cyan-300">
            JC TRADER
          </p>

          <h1 className="text-3xl font-black">
            Logos
          </h1>
        </div>

        <button
          onClick={loadTeams}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black"
        >
          <RefreshCcw size={16} />

          {loading
            ? "Atualizando..."
            : "Atualizar"}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-black px-3">
            <Search
              size={16}
              className="text-zinc-500"
            />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Buscar logo..."
              className="h-10 flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          <select
            value={source}
            onChange={(e) =>
              setSource(e.target.value)
            }
            className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm"
          >
            {sources.map((item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-xl border border-zinc-700 bg-black px-3 text-sm font-black text-zinc-300">
            {filteredTeams.length} / {teams.length} logos
          </div>
        </div>
      </div>

      <div className="max-h-[720px] overflow-auto rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <table className="w-full min-w-[950px] text-sm">
          <thead className="sticky top-0 z-10 bg-[#0b0b0b] text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-3 text-left">Logo</th>
              <th className="px-3 py-3 text-left">Time</th>
              <th className="px-3 py-3 text-left">Key</th>
              <th className="px-3 py-3 text-left">Origem</th>
              <th className="px-3 py-3 text-left">SQL</th>
            </tr>
          </thead>

          <tbody>
            {filteredTeams.map((team) => (
              <LogoRow
                key={team.key}
                team={team}
                sqlLogos={sqlLogos}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function addTeam(map, name, key, source) {
  if (!name || !key) return;

  if (!map.has(key)) {
    map.set(key, {
      name,
      key,
      file: `${String(key).toLowerCase()}.png`,
      sources: [source],
    });

    return;
  }

  const current = map.get(key);

  if (!current.sources.includes(source)) {
    current.sources.push(source);
  }
}

function LogoRow({ team, sqlLogos }) {
  const [src, setSrc] = useState(
    logoPath(team.key)
  );

  useEffect(() => {
    const sqlId = normalizeLogoSQL(team.name);

    const found = sqlLogos.find(
      (logo) =>
        logo.tipo === "time" &&
        logo.id === sqlId
    );

    if (found?.imagem_base64) {
      setSrc(found.imagem_base64);
    } else {
      setSrc(logoPath(team.key));
    }
  }, [team, sqlLogos]);

  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-900/70">
      <td className="px-3 py-3">
        <img
          src={src}
          alt={team.name}
          onError={(e) => {
            e.currentTarget.src =
              "https://placehold.co/32x32/111111/00d2ff?text=?";
          }}
          className="h-8 w-8 object-contain"
        />
      </td>

      <td className="px-3 py-3 font-black text-white">
        {team.name}
      </td>

      <td className="px-3 py-3 text-cyan-300">
        {team.key}
      </td>

      <td className="px-3 py-3 text-zinc-400">
        {team.sources.join(" • ")}
      </td>

      <td className="px-3 py-3">
        {sqlLogos.some(
          (logo) =>
            logo.id ===
            normalizeLogoSQL(team.name)
        ) ? (
          <span className="text-emerald-300">
            ✅ SQL
          </span>
        ) : (
          <span className="text-zinc-500">
            Local
          </span>
        )}
      </td>
    </tr>
  );
}
