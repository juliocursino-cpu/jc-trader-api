export default function ScannerFilters({ filters, setFilters, leagues }) {
  function update(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <select value={filters.period} onChange={(e) => update("period", e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm">
          <option value="all">Hoje + Amanhã</option>
          <option value="today">Hoje</option>
          <option value="tomorrow">Amanhã</option>
        </select>

        <select value={filters.league} onChange={(e) => update("league", e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm">
          <option value="Todas">Todas as ligas</option>
          {leagues.map((league) => <option key={league} value={league}>{league}</option>)}
        </select>

        <select value={filters.market} onChange={(e) => update("market", e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm">
          <option value="all">Todos mercados</option>
          <option value="Odd_H_Back">1 Casa</option>
          <option value="Odd_D_Back">X Empate</option>
          <option value="Odd_A_Back">2 Fora</option>
          <option value="Odd_Over05HT">Over 0.5 HT</option>
          <option value="Odd_Over15FT">Over 1.5 FT</option>
          <option value="Odd_CS_0x1_Lay">Lay 0x1</option>
          <option value="Odd_CS_1x0_Lay">Lay 1x0</option>
          <option value="Odd_CS_Goleada_H_Lay">Lay G. Casa</option>
          <option value="Odd_CS_Goleada_A_Lay">Lay G. Fora</option>
        </select>

        <input value={filters.minOdd} onChange={(e) => update("minOdd", e.target.value)} placeholder="Odd mín." className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm" />

        <input value={filters.maxOdd} onChange={(e) => update("maxOdd", e.target.value)} placeholder="Odd máx." className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm" />

        <select value={filters.favorite} onChange={(e) => update("favorite", e.target.value)} className="rounded-xl border border-zinc-700 bg-black px-3 py-2 text-sm">
          <option value="all">Todos</option>
          <option value="fav">Favoritos</option>
        </select>

        <button
          onClick={() =>
            setFilters({
              period: "all",
              league: "Todas",
              favorite: "all",
              market: "all",
              minOdd: "",
              maxOdd: "",
            })
          }
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-bold hover:bg-zinc-800 md:col-span-6"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}