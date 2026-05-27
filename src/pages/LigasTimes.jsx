import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  ShieldCheck,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";

/* =========================================================
   JC TRADER - LIGAS & TIMES
========================================================= */

function moneyClassic(value) {
  const n = Number(value || 0);

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numClassic(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const s = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const n = Number(s);

  return Number.isFinite(n) ? n : 0;
}

function DadosStatCard({
  title,
  value,
  icon: Icon,
  tone = "blue",
}) {
  const toneClass = {
    green: "text-emerald-300",
    red: "text-red-300",
    blue: "text-sky-300",
    yellow: "text-yellow-300",
    violet: "text-violet-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            {title}
          </p>

          <p
            className={`mt-2 text-2xl font-black ${
              toneClass[tone] || toneClass.blue
            }`}
          >
            {value}
          </p>
        </div>

        {Icon && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2 text-zinc-400">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
      {label}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
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
    const lucro = numClassic(entrada.lucro);
    const stake = numClassic(entrada.stake);
    const resultado = String(entrada.resultado || "").toLowerCase();
    const modo = String(entrada.modo || "").toLowerCase();

    row.investimento += stake;
    row.lucro += lucro;
    row.pic += 1;

    if (resultado === "green") row.green += 1;
    if (resultado === "red") row.red += 1;
    if (resultado === "void") row.void += 1;

    if (modo === "back") row.back += 1;
    if (modo === "lay") row.lay += 1;
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.pic ? (row.green / row.pic) * 100 : 0,
    }))
    .sort((a, b) => b.lucro - a.lucro);
}

function MiniBarRanking({
  data,
  labelKey = "nome",
  valueKey = "lucro",
  title = "Ranking visual",
}) {
  const top = data.slice(0, 14);

  const maxAbs = Math.max(
    ...top.map((item) => Math.abs(Number(item[valueKey] || 0))),
    1
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <h2 className="text-lg font-black text-zinc-50">{title}</h2>
      <p className="mb-3 text-sm text-zinc-500">Top 14 por resultado</p>

      <div className="space-y-3">
        {top.map((item, index) => {
          const value = Number(item[valueKey] || 0);
          const positive = value >= 0;
          const width = Math.max(6, (Math.abs(value) / maxAbs) * 100);

          return (
            <div key={`${item[labelKey]}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate text-zinc-300">{item[labelKey]}</span>

                <span
                  className={positive ? "text-emerald-300" : "text-red-300"}
                >
                  {moneyClassic(value)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-950">
                <div
                  className={`h-full rounded-full ${
                    positive ? "bg-emerald-500" : "bg-red-500"
                  }`}
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

function LigasTimesResumo({ entradas }) {
  const [view, setView] = useState("Ligas");
  const [busca, setBusca] = useState("");

  const [tipoTime, setTipoTime] = useState("Mandante");

  const ligasStats = useMemo(
    () => buildResumoPorCampo(entradas, "liga", "nome"),
    [entradas]
  );

  const timesStats = useMemo(() => {
  if (tipoTime === "Mandante") {
    return buildResumoPorCampo(entradas, "casa", "nome");
  }

  if (tipoTime === "Visitante") {
    return buildResumoPorCampo(entradas, "visitante", "nome");
  }

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

    const item = map.get(row.nome);
    item.investimento += row.investimento;
    item.lucro += row.lucro;
    item.pic += row.pic;
    item.green += row.green;
    item.red += row.red;
    item.void += row.void;
    item.back += row.back;
    item.lay += row.lay;
  });

  return [...map.values()]
    .map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.pic ? (row.green / row.pic) * 100 : 0,
    }))
    .sort((a, b) => b.lucro - a.lucro);
}, [entradas, tipoTime]);
  const activeData = view === "Ligas" ? ligasStats : timesStats;

  const filtered = activeData.filter((item) =>
    String(item.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  const best = filtered[0] || { nome: "—", lucro: 0 };
  const worst = filtered.length ? filtered[filtered.length - 1] : { nome: "—", lucro: 0 };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Melhor" value={best.nome} icon={Trophy} tone="green" />
        <DadosStatCard
          title="Pior"
          value={worst.nome}
          icon={Target}
          tone="red"
        />
        <DadosStatCard
          title="Lucro Geral"
          value={moneyClassic(filtered.reduce((acc, i) => acc + i.lucro, 0))}
          icon={Wallet}
          tone={
            filtered.reduce((acc, i) => acc + i.lucro, 0) >= 0 ? "green" : "red"
          }
        />
        <DadosStatCard
          title="ROI Médio"
          value={`${(
            filtered.reduce((acc, i) => acc + i.roi, 0) /
            (filtered.length || 1)
          ).toFixed(1)}%`}
          icon={Activity}
          tone={
            filtered.reduce((acc, i) => acc + i.roi, 0) >= 0 ? "green" : "red"
          }
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
  <FilterSelect
    label="Consulta"
    value={view}
    onChange={setView}
    options={["Ligas", "Times"]}
  />

  {view === "Times" && (
    <FilterSelect
      label="Tipo"
      value={tipoTime}
      onChange={setTipoTime}
      options={["Mandante", "Visitante", "Geral"]}
    />
  )}
</div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400 md:col-span-3">
            Buscar
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar liga ou time..."
              className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500"
            />
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking
          data={filtered}
          title={view === "Ligas" ? "Top Ligas" : "Top Times"}
          valueKey="lucro"
        />
      </section>

      <DarkTable
        title={view === "Ligas" ? "Resumo Ligas" : "Resumo Times"}
        subtitle="Lucro, ROI, entradas, back/lay, green/red/void"
        headers={["Nome", "Lucro", "ROI", "Entradas", "Back", "Lay", "Green", "Red", "Void"]}
        rows={filtered.map((item) => [
          item.nome,
          <span className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>
            {moneyClassic(item.lucro)}
          </span>,
          <span className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}>
            {item.roi.toFixed(1)}%
          </span>,
          item.pic,
          item.back,
          item.lay,
          item.green,
          item.red,
          item.void,
        ])}
      />
    </div>
  );
}

function DarkTable({
  title,
  subtitle,
  headers,
  rows,
  empty = "Nenhum dado encontrado.",
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <div>
          <h2 className="text-lg font-black text-zinc-50">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
        </div>

        <div className="text-xs font-bold text-zinc-500">
          {rows.length} linhas
        </div>
      </div>

      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[1000px] border-collapse text-center text-sm">
          <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={`px-3 py-3 ${
                    index === 0 ? "text-left" : ""
                  }`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-zinc-800 hover:bg-cyan-500/10"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-3 py-2 ${
                        cellIndex === 0
                          ? "text-left font-bold text-cyan-300"
                          : "font-semibold text-zinc-300"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="px-4 py-10 text-center text-zinc-500"
                >
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

export default function LigasTimes() {
  const [entradas, setEntradas] = useState([]);

  useEffect(() => {
    function carregarEntradas() {
      try {
        const raw =
          localStorage.getItem("entradas") ||
          localStorage.getItem("jc_entradas") ||
          localStorage.getItem("meuapp_entradas");

        setEntradas(raw ? JSON.parse(raw) : []);
      } catch {
        setEntradas([]);
      }
    }

    carregarEntradas();
    window.addEventListener("storage", carregarEntradas);

    return () => {
      window.removeEventListener("storage", carregarEntradas);
    };
  }, []);

  return (
    <div className="space-y-4 text-zinc-100">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
          JC Trader clássico
        </p>

        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-50">
          <ShieldCheck className="h-7 w-7 text-cyan-400" />
          Ligas & Times
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Consulta unificada por liga e time, baseada nas entradas cadastradas.
        </p>
      </header>

      <LigasTimesResumo entradas={entradas} />
    </div>
  );
}