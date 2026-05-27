import { Star } from "lucide-react";

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
  const firstUpper = String(key || "").charAt(0) + String(key || "").slice(1).toLowerCase();

  return [
    `/${folder}/${firstUpper}.png`,
    `/${folder}/${lower}.jpg`,
    `/${folder}/${firstUpper}.jpg`,
    `/${folder}/${lower}.bmp`,
    `/${folder}/${firstUpper}.bmp`,
    fallback,
  ];
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

      <td className="px-2 py-3 font-bold">{game.Time}</td>

      <td className="w-[120px] whitespace-nowrap px-2 py-3 text-zinc-300">
        <div className="flex items-center gap-2">
          <img
            src={`/logos/leagues/${String(game.LeagueKey || "").toLowerCase()}.png`}
            alt={game.League}
            onError={(e) => {
              const attempts = logoFallback(
                game.LeagueKey,
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
          <span>{game.League}</span>
        </div>
      </td>

      <td className="w-[160px] px-3 py-3 text-right">
        <div className="truncate font-black text-white">{game.Home}</div>
      </td>

      <td className="w-[80px] px-2 py-3">
        <div className="flex items-center justify-center gap-2">
          <img
            src={`/logos/${String(game.HomeKey || "").toLowerCase()}.png`}
            alt={game.Home}
            onError={(e) => {
              const attempts = logoFallback(
                game.HomeKey,
                "logos",
                `https://placehold.co/22x22/111111/00d2ff?text=${game.Home?.charAt(0) || "H"}`
              );

              const current = Number(e.currentTarget.dataset.try || 0);

              if (current < attempts.length) {
                e.currentTarget.dataset.try = String(current + 1);
                e.currentTarget.src = attempts[current];
                return;
              }
            }}
            className="h-7 w-7 object-contain"
          />

          <span className="text-zinc-500">x</span>

          <img
            src={`/logos/${String(game.AwayKey || "").toLowerCase()}.png`}
            alt={game.Away}
            onError={(e) => {
              const attempts = logoFallback(
                game.AwayKey,
                "logos",
                `https://placehold.co/22x22/111111/ff4d4d?text=${game.Away?.charAt(0) || "A"}`
              );

              const current = Number(e.currentTarget.dataset.try || 0);

              if (current < attempts.length) {
                e.currentTarget.dataset.try = String(current + 1);
                e.currentTarget.src = attempts[current];
                return;
              }
            }}
            className="h-7 w-7 object-contain"
          />
        </div>
      </td>

      <td className="w-[160px] px-3 py-3 text-left">
        <div className="truncate font-black text-white">{game.Away}</div>
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