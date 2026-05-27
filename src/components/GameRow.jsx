import { useEffect, useState } from "react";
import { Star } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3001/api";

// ======================================================
// CACHE GLOBAL DOS LOGOS SQL
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

function fmt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toFixed(2) : "—";
}

function OddCell({ value, color = "text-cyan-300" }) {
  return (
    <td className={`px-2 py-3 text-center font-black ${color}`}>
      {fmt(value)}
    </td>
  );
}

function logoFallback(key, folder, fallback) {
  const lower = String(key || "").toLowerCase();
  const firstUpper =
    String(key || "").charAt(0) +
    String(key || "").slice(1).toLowerCase();

  return [
    `/${folder}/${firstUpper}.png`,
    `/${folder}/${lower}.jpg`,
    `/${folder}/${firstUpper}.jpg`,
    `/${folder}/${lower}.bmp`,
    `/${folder}/${firstUpper}.bmp`,
    fallback,
  ];
}

function LocalTeamLogo({ name, logoKey, fallbackColor = "00d2ff" }) {
  const fallbackText = String(name || "?").charAt(0);

  return (
    <img
      src={`/logos/${String(logoKey || "").toLowerCase()}.png`}
      alt={name}
      onError={(e) => {
        const attempts = logoFallback(
          logoKey,
          "logos",
          `https://placehold.co/22x22/111111/${fallbackColor}?text=${fallbackText}`
        );

        const current = Number(e.currentTarget.dataset.try || 0);

        if (current < attempts.length) {
          e.currentTarget.dataset.try = String(current + 1);
          e.currentTarget.src = attempts[current];
        }
      }}
      className="h-7 w-7 object-contain"
    />
  );
}

function LocalLeagueLogo({ name, logoKey }) {
  return (
    <img
      src={`/logos/leagues/${String(logoKey || "").toLowerCase()}.png`}
      alt={name}
      onError={(e) => {
        const attempts = logoFallback(
          logoKey,
          "logos/leagues",
          ""
        );

        const current = Number(e.currentTarget.dataset.try || 0);

        if (current < attempts.length && attempts[current]) {
          e.currentTarget.dataset.try = String(current + 1);
          e.currentTarget.src = attempts[current];
          return;
        }

        e.currentTarget.style.display = "none";
      }}
      className="h-5 w-5 object-contain"
    />
  );
}

function SQLLogo({
  name,
  logoKey,
  tipo = "time",
  fallbackColor = "00d2ff",
}) {
  const [sqlSrc, setSqlSrc] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function buscarLogo() {
      const logos = await carregarLogosSQL();

      const id = normalizeLogoSQL(name);

      const idSemUnderline = id.replace(/_/g, "");

const found = logos.find((item) => {
  const logoId = String(item.id || "");
  const logoIdSemUnderline = logoId.replace(/_/g, "");

  return (
    item.tipo === tipo &&
    (
      logoId === id ||
      logoIdSemUnderline === idSemUnderline
    )
  );
});

      if (!ativo) return;

      if (found?.imagem_base64) {
        setSqlSrc(found.imagem_base64);
      } else {
        setSqlSrc(null);
      }

      setLoaded(true);
    }

    buscarLogo();

    return () => {
      ativo = false;
    };
  }, [name, tipo]);

  if (!loaded) {
    return tipo === "liga" ? (
      <LocalLeagueLogo
        name={name}
        logoKey={logoKey}
      />
    ) : (
      <LocalTeamLogo
        name={name}
        logoKey={logoKey}
        fallbackColor={fallbackColor}
      />
    );
  }

  if (sqlSrc) {
    return (
      <img
        src={sqlSrc}
        alt={name}
        className={
          tipo === "liga"
            ? "h-5 w-5 object-contain"
            : "h-7 w-7 object-contain"
        }
      />
    );
  }

  return tipo === "liga" ? (
    <LocalLeagueLogo
      name={name}
      logoKey={logoKey}
    />
  ) : (
    <LocalTeamLogo
      name={name}
      logoKey={logoKey}
      fallbackColor={fallbackColor}
    />
  );
}

export default function GameRow({ game, toggleFavorite }) {
  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-900/70">
      <td className="px-2 py-3 text-center">
        <button onClick={() => toggleFavorite(game.id)}>
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

      <td className="px-2 py-3 font-bold">
        {game.Time}
      </td>

      <td className="w-[120px] whitespace-nowrap px-2 py-3 text-zinc-300">
        <div className="flex items-center gap-2">
          <SQLLogo
            name={game.League}
            logoKey={game.LeagueKey}
            tipo="liga"
          />

          <span>{game.League}</span>
        </div>
      </td>

      <td className="w-[160px] px-3 py-3 text-right">
        <div className="truncate font-black text-white">
          {game.Home}
        </div>
      </td>

      <td className="w-[80px] px-2 py-3">
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

      <td className="w-[160px] px-3 py-3 text-left">
        <div className="truncate font-black text-white">
          {game.Away}
        </div>
      </td>

      <OddCell value={game.Odd_H_Back} color="text-cyan-300" />
      <OddCell value={game.Odd_D_Back} color="text-yellow-300" />
      <OddCell value={game.Odd_A_Back} color="text-red-300" />
      <OddCell value={game.Odd_Over05HT} color="text-emerald-300" />
      <OddCell value={game.Odd_Over15FT} color="text-emerald-300" />
      <OddCell value={game.Odd_CS_0x1_Lay} color="text-pink-300" />
      <OddCell value={game.Odd_CS_1x0_Lay} color="text-pink-300" />
      <OddCell value={game.Odd_CS_Goleada_H_Lay} color="text-orange-300" />
      <OddCell value={game.Odd_CS_Goleada_A_Lay} color="text-orange-300" />
    </tr>
  );
}
