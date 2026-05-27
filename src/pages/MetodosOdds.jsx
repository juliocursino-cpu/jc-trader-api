import React, { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Flame,
  LineChart,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";

/* =========================================================
   JC TRADER - MÉTODOS, ODDS & ANÁLISE
   Versão limpa SEM Recharts
========================================================= */

const METODOS_FIXOS = [
  "Casa",
  "Fora",
  "Draw",
  "Vovô",
  "0x1",
  "1x0",
  "P.A",
  "Gol. Casa",
  "Gol. Fora",
  "Over",
  "Under",
];

const MERCADOS_FIXOS = ["Match Odds", "Correct Score", "Over", "Under"];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function numClassic(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let text = String(value ?? "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  if (!text) return 0;

  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function moneyClassic(value) {
  return numClassic(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseDateClassic(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [ano, mes, dia] = text.slice(0, 10).split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [dia, mes, ano] = text.split("/").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function useClassicEntradas() {
  const [entradas] = useState(() => {
    try {
      const keys = ["entradas", "jc_entradas", "meuapp_entradas"];

      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }

      return [];
    } catch {
      return [];
    }
  });

  return entradas;
}

function faixaOddClassic(odd) {
  const n = numClassic(odd);

  if (!n) return "Sem odd";
  if (n < 1.3) return "1.01 a 1.29";
  if (n < 1.6) return "1.30 a 1.59";
  if (n < 2) return "1.60 a 1.99";
  if (n < 3) return "2.00 a 2.99";
  if (n < 5) return "3.00 a 4.99";
  if (n < 10) return "5.00 a 9.99";
  return "10+";
}

function buildGroupedStats(data, getKey, labelKey = "nome") {
  const map = new Map();

  data.forEach((entrada) => {
    const nome = getKey(entrada) || "Sem informação";

    if (!map.has(nome)) {
      map.set(nome, {
        [labelKey]: nome,
        total: 0,
        investimento: 0,
        lucro: 0,
        green: 0,
        red: 0,
        void: 0,
        back: 0,
        lay: 0,
        roi: 0,
        winrate: 0,
      });
    }

    const row = map.get(nome);
    const stake = numClassic(entrada.stake);
    const lucro = numClassic(entrada.lucro);
    const resultado = String(entrada.resultado || "").toLowerCase();
    const modo = String(entrada.modo || "").toLowerCase();

    row.total += 1;
    row.investimento += stake;
    row.lucro += lucro;

    if (resultado === "green") row.green += 1;
    if (resultado === "red") row.red += 1;
    if (resultado === "void") row.void += 1;

    if (modo === "back") row.back += 1;
    if (modo === "lay") row.lay += 1;
  });

  return [...map.values()].map((row) => ({
    ...row,
    roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
    winrate: row.total ? (row.green / row.total) * 100 : 0,
  }));
}

function classifyPerformance(roi, winrate, total) {
  if (total < 5) return <span className="text-zinc-400">Pouca amostra</span>;
  if (roi >= 10 && winrate >= 60) return <span className="text-emerald-300">Excelente</span>;
  if (roi > 0 && winrate >= 50) return <span className="text-sky-300">Bom</span>;
  if (roi < 0) return <span className="text-red-300">Ruim</span>;
  return <span className="text-yellow-300">Neutro</span>;
}

function DadosStatCard({ title, value, icon: Icon, tone = "blue" }) {
  const toneClass = {
    green: "text-emerald-300",
    red: "text-red-300",
    blue: "text-sky-300",
    yellow: "text-yellow-300",
    violet: "text-violet-300",
    orange: "text-orange-300",
    fuchsia: "text-fuchsia-300",
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">{title}</p>
          <p className={`mt-2 text-2xl font-black ${toneClass[tone] || toneClass.blue}`}>
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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-fuchsia-500"
      >
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </label>
  );
}

function DarkTable({ title, subtitle, headers, rows, empty = "Sem dados para exibir." }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-black text-zinc-50">{title}</h2>
        {subtitle && <p className="text-sm text-zinc-500">{subtitle}</p>}
      </div>

      <div className="overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              {headers.map((header) => (
                <th key={header} className="px-3 py-3 font-black">{header}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-950/70">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-3 py-3 text-zinc-300">{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-3 py-8 text-center text-sm font-semibold text-zinc-500">
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

function MiniBarRanking({ data, title = "Ranking visual", valueKey = "lucro" }) {
  const top = data.slice(0, 12);
  const maxAbs = Math.max(
    ...top.map((item) => Math.abs(numClassic(item[valueKey]))),
    1
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-lg font-black text-zinc-50">{title}</h2>
        <p className="text-sm text-zinc-500">Top 12 por resultado</p>
      </div>

      <div className="space-y-3">
        {top.map((item, index) => {
          const nome = item.nome || item.name || item.label || `Item ${index + 1}`;
          const value = numClassic(item[valueKey]);
          const width = Math.max(8, (Math.abs(value) / maxAbs) * 100);
          const positive = value >= 0;

          return (
            <div key={`${nome}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate text-zinc-300">{nome}</span>
                <span className={positive ? "text-emerald-300" : "text-red-300"}>
                  {valueKey === "roi" ? `${value.toFixed(1)}%` : moneyClassic(value)}
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className={`h-full rounded-full ${positive ? "bg-emerald-500" : "bg-red-500"}`}
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

function MetodosResumo({ parsed }) {
  const [view, setView] = useState("Métodos");
  const [busca, setBusca] = useState("");

  const metodoStats = useMemo(() => {
    const stats = buildGroupedStats(parsed, (e) => e.metodo || "Sem Método", "nome");

    METODOS_FIXOS.forEach((metodo) => {
      if (!stats.find((item) => item.nome === metodo)) {
        stats.push({
          nome: metodo,
          total: 0,
          investimento: 0,
          lucro: 0,
          green: 0,
          red: 0,
          void: 0,
          back: 0,
          lay: 0,
          roi: 0,
          winrate: 0,
        });
      }
    });

    return stats.sort((a, b) => b.lucro - a.lucro);
  }, [parsed]);

  const oddStats = useMemo(
    () => buildGroupedStats(parsed, (e) => faixaOddClassic(e.odd), "nome").sort((a, b) => b.lucro - a.lucro),
    [parsed]
  );

  const mercadoStats = useMemo(() => {
    const stats = buildGroupedStats(parsed, (e) => e.mercado || "Sem Mercado", "nome");

    MERCADOS_FIXOS.forEach((mercado) => {
      if (!stats.find((item) => item.nome === mercado)) {
        stats.push({
          nome: mercado,
          total: 0,
          investimento: 0,
          lucro: 0,
          green: 0,
          red: 0,
          void: 0,
          back: 0,
          lay: 0,
          roi: 0,
          winrate: 0,
        });
      }
    });

    return stats.sort((a, b) => b.lucro - a.lucro);
  }, [parsed]);

  const diaSemanaStats = useMemo(() => {
    const base = DIAS_SEMANA.map((d) => ({
      nome: d,
      total: 0,
      investimento: 0,
      lucro: 0,
      green: 0,
      red: 0,
      void: 0,
      back: 0,
      lay: 0,
      roi: 0,
      winrate: 0,
    }));

    parsed.forEach((entrada) => {
      if (!entrada.data) return;

      const row = base[entrada.data.getDay()];
      const result = String(entrada.resultado || "").toLowerCase();
      const modo = String(entrada.modo || "").toLowerCase();

      row.total += 1;
      row.investimento += entrada.stake;
      row.lucro += entrada.lucro;

      if (result === "green") row.green += 1;
      if (result === "red") row.red += 1;
      if (result === "void") row.void += 1;

      if (modo === "back") row.back += 1;
      if (modo === "lay") row.lay += 1;
    });

    return base.map((row) => ({
      ...row,
      roi: row.investimento ? (row.lucro / row.investimento) * 100 : 0,
      winrate: row.total ? (row.green / row.total) * 100 : 0,
    }));
  }, [parsed]);

  const activeData =
    view === "Métodos"
      ? metodoStats
      : view === "Odds"
      ? oddStats
      : view === "Mercados"
      ? mercadoStats
      : diaSemanaStats;

  const filtered = activeData.filter((item) =>
    String(item.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  const best = filtered[0] || { nome: "—", lucro: 0 };
  const worst = filtered.length ? filtered[filtered.length - 1] : { nome: "—", lucro: 0 };

  const totalLucro = filtered.reduce((acc, item) => acc + item.lucro, 0);
  const totalInvest = filtered.reduce((acc, item) => acc + item.investimento, 0);
  const roiGeral = totalInvest ? (totalLucro / totalInvest) * 100 : 0;

  const rows = filtered.map((item) => [
    item.nome,
    <span className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>{moneyClassic(item.lucro)}</span>,
    <span className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}>{item.roi.toFixed(1)}%</span>,
    `${item.winrate.toFixed(1)}%`,
    item.total,
    <span className="text-blue-300">{item.back}</span>,
    <span className="text-pink-300">{item.lay}</span>,
    <span className="text-emerald-300">{item.green}</span>,
    <span className="text-red-300">{item.red}</span>,
    <span className="text-yellow-300">{item.void}</span>,
    classifyPerformance(item.roi, item.winrate, item.total),
  ]);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard title="Melhor" value={best.nome} icon={Trophy} tone="green" />
        <DadosStatCard title="Pior" value={worst.nome} icon={Target} tone="red" />
        <DadosStatCard title="Lucro Geral" value={moneyClassic(totalLucro)} icon={Wallet} tone={totalLucro >= 0 ? "green" : "red"} />
        <DadosStatCard title="ROI Geral" value={`${roiGeral.toFixed(1)}%`} icon={Activity} tone={roiGeral >= 0 ? "green" : "red"} />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect
            label="Analisar por"
            value={view}
            onChange={setView}
            options={["Métodos", "Odds", "Mercados", "Dia da Semana"]}
          />

          <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400 md:col-span-3">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar método, mercado, odd..."
                className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-fuchsia-500"
              />
            </div>
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking data={filtered} title={`Lucro por ${view}`} valueKey="lucro" />
        <MiniBarRanking data={filtered} title={`ROI por ${view}`} valueKey="roi" />
      </section>

      <DarkTable
        title={`Desempenho por ${view}`}
        subtitle="Lucro, ROI, winrate, back/lay e classificação"
        headers={["Nome", "Lucro", "ROI", "Winrate", "Total", "Back", "Lay", "Green", "Red", "Void", "Classe"]}
        rows={rows}
      />
    </div>
  );
}

function AnaliseResumo({ parsed }) {
  const equityData = useMemo(() => {
    const byDay = {};

    parsed.forEach((entrada) => {
      if (!entrada.ymd) return;
      byDay[entrada.ymd] = (byDay[entrada.ymd] || 0) + entrada.lucro;
    });

    let acc = 0;

    return Object.keys(byDay)
      .sort()
      .map((date) => {
        acc += byDay[date];
        return {
          nome: date,
          lucro: acc,
        };
      });
  }, [parsed]);

  const metodoStats = useMemo(
    () =>
      buildGroupedStats(parsed, (e) => e.metodo, "nome").sort(
        (a, b) => b.lucro - a.lucro
      ),
    [parsed]
  );

  const mercadoStats = useMemo(
    () =>
      buildGroupedStats(parsed, (e) => e.mercado, "nome").sort(
        (a, b) => b.lucro - a.lucro
      ),
    [parsed]
  );

  const oddStats = useMemo(
    () =>
      buildGroupedStats(parsed, (e) => faixaOddClassic(e.odd), "nome").sort(
        (a, b) => b.lucro - a.lucro
      ),
    [parsed]
  );

  const totais = useMemo(() => {
    const investimento = parsed.reduce((acc, item) => acc + item.stake, 0);
    const lucro = parsed.reduce((acc, item) => acc + item.lucro, 0);
    const green = parsed.filter((item) => item.resultado === "green").length;
    const red = parsed.filter((item) => item.resultado === "red").length;
    const voids = parsed.filter((item) => item.resultado === "void").length;

    const roi = investimento ? (lucro / investimento) * 100 : 0;
    const winrate = parsed.length ? (green / parsed.length) * 100 : 0;

    const profitGross = parsed
      .filter((item) => item.lucro > 0)
      .reduce((acc, item) => acc + item.lucro, 0);

    const lossGross = Math.abs(
      parsed
        .filter((item) => item.lucro < 0)
        .reduce((acc, item) => acc + item.lucro, 0)
    );

    const profitFactor = lossGross
      ? profitGross / lossGross
      : profitGross
      ? profitGross
      : 0;

    let acc = 0;
    let peak = 0;
    let drawdown = 0;

    parsed
      .slice()
      .sort((a, b) => a.data - b.data)
      .forEach((item) => {
        acc += item.lucro;
        peak = Math.max(peak, acc);
        drawdown = Math.min(drawdown, acc - peak);
      });

    const consistency = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          winrate * 0.45 +
            Math.max(0, roi) * 1.1 +
            Math.min(30, profitFactor * 8)
        )
      )
    );

    return {
      investimento,
      lucro,
      green,
      red,
      voids,
      roi,
      winrate,
      profitFactor,
      drawdown,
      consistency,
    };
  }, [parsed]);

  const outliers = metodoStats
    .filter((item) => item.total >= 5 && Math.abs(item.roi) >= 10)
    .sort((a, b) => Math.abs(b.roi) - Math.abs(a.roi));

  const kellyRows = metodoStats
    .map((item) => {
      const odds = parsed
        .filter((e) => e.metodo === item.nome)
        .map((e) => e.odd)
        .filter(Boolean);

      const oddMed = odds.length
        ? odds.reduce((a, b) => a + b, 0) / odds.length
        : 0;

      const p = item.winrate / 100;
      const b = Math.max(0, oddMed - 1);
      const kelly = b > 0 ? Math.max(0, (b * p - (1 - p)) / b) : 0;

      return {
        ...item,
        oddMed,
        kelly,
        kelly25: kelly * 0.25,
      };
    })
    .sort((a, b) => b.kelly25 - a.kelly25)
    .slice(0, 8);

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <DadosStatCard
          title="Lucro"
          value={moneyClassic(totais.lucro)}
          icon={Wallet}
          tone={totais.lucro >= 0 ? "green" : "red"}
        />

        <DadosStatCard
          title="ROI"
          value={`${totais.roi.toFixed(1)}%`}
          icon={Activity}
          tone={totais.roi >= 0 ? "green" : "red"}
        />

        <DadosStatCard
          title="Winrate"
          value={`${totais.winrate.toFixed(1)}%`}
          icon={Trophy}
          tone="blue"
        />

        <DadosStatCard
          title="Profit Factor"
          value={totais.profitFactor.toFixed(2)}
          icon={BarChart3}
          tone="blue"
        />

        <DadosStatCard
          title="Drawdown"
          value={moneyClassic(totais.drawdown)}
          icon={Flame}
          tone="red"
        />

        <DadosStatCard
          title="Consistência"
          value={`${totais.consistency}/100`}
          icon={ShieldCheck}
          tone={
            totais.consistency >= 70
              ? "green"
              : totais.consistency >= 45
              ? "yellow"
              : "red"
          }
        />

        <DadosStatCard
          title="Greens"
          value={totais.green}
          icon={ShieldCheck}
          tone="green"
        />

        <DadosStatCard
          title="Reds"
          value={totais.red}
          icon={Target}
          tone="red"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking
          data={equityData}
          title="Equity acumulada"
          valueKey="lucro"
        />

        <MiniBarRanking
          data={[
            { nome: "Green", lucro: totais.green },
            { nome: "Red", lucro: -totais.red },
            { nome: "Void", lucro: totais.voids },
          ]}
          title="Distribuição dos resultados"
          valueKey="lucro"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking
          data={metodoStats}
          title="Métodos por resultado"
          valueKey="lucro"
        />

        <MiniBarRanking
          data={mercadoStats}
          title="Mercados por resultado"
          valueKey="lucro"
        />
      </section>

      <DarkTable
        title="Winrate x Faixa de Odd"
        subtitle="Distribuição de performance por faixa"
        headers={["Faixa", "Lucro", "ROI", "Winrate", "Total", "Green", "Red"]}
        rows={oddStats.map((item) => [
          item.nome,
          <span
            className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}
          >
            {moneyClassic(item.lucro)}
          </span>,
          <span
            className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}
          >
            {item.roi.toFixed(1)}%
          </span>,
          `${item.winrate.toFixed(1)}%`,
          item.total,
          <span className="text-emerald-300">{item.green}</span>,
          <span className="text-red-300">{item.red}</span>,
        ])}
      />

      <DarkTable
        title="Kelly sugerida por método"
        subtitle="Uso conservador: 1/4 Kelly"
        headers={[
          "Método",
          "Odd média",
          "Winrate",
          "Kelly",
          "1/4 Kelly",
          "Entradas",
        ]}
        rows={kellyRows.map((item) => [
          item.nome,
          item.oddMed.toFixed(2),
          `${item.winrate.toFixed(1)}%`,
          `${(item.kelly * 100).toFixed(1)}%`,
          <span className="text-emerald-300">
            {(item.kelly25 * 100).toFixed(1)}%
          </span>,
          item.total,
        ])}
      />

      <DarkTable
        title="Alertas de Outliers"
        subtitle="Métodos com ROI muito alto ou muito negativo"
        headers={["Método", "Lucro", "ROI", "Winrate", "Entradas", "Classe"]}
        rows={outliers.map((item) => [
          item.nome,
          <span
            className={item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}
          >
            {moneyClassic(item.lucro)}
          </span>,
          <span
            className={item.roi >= 0 ? "text-emerald-300" : "text-red-300"}
          >
            {item.roi.toFixed(1)}%
          </span>,
          `${item.winrate.toFixed(1)}%`,
          item.total,
          classifyPerformance(item.roi, item.winrate, item.total),
        ])}
        empty="Nenhum outlier com os critérios atuais."
      />
    </div>
  );
}

export default function MetodosOdds() {
  const entradas = useClassicEntradas();
  const [abaInterna, setAbaInterna] = useState("metodos");

  const parsed = useMemo(() => {
    return entradas
      .map((entrada) => {
        const data = parseDateClassic(entrada.data);

        return {
          ...entrada,
          data,
          ymd: data
            ? `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(
                2,
                "0"
              )}-${String(data.getDate()).padStart(2, "0")}`
            : null,
          lucro: numClassic(entrada.lucro),
          stake: numClassic(entrada.stake),
          odd: numClassic(entrada.odd),
          metodo: entrada.metodo || "Sem Método",
          mercado: entrada.mercado || "Sem Mercado",
          resultado: String(entrada.resultado || "").toLowerCase(),
          modo: entrada.modo || "",
        };
      })
      .filter((entrada) => entrada.data);
  }, [entradas]);

  return (
    <div className="space-y-4 text-zinc-100">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-fuchsia-400">
          JC Trader clássico
        </p>

        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-50">
          {abaInterna === "metodos" ? (
            <BarChart3 className="h-7 w-7 text-fuchsia-400" />
          ) : (
            <LineChart className="h-7 w-7 text-orange-400" />
          )}
          Métodos, Odds & Análise
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Análise por método, odd, mercado, dia da semana, equity, drawdown,
          Kelly e consistência.
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAbaInterna("metodos")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            abaInterna === "metodos"
              ? "bg-fuchsia-500 text-white"
              : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          📊 Métodos & Odds
        </button>

        <button
          type="button"
          onClick={() => setAbaInterna("analise")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            abaInterna === "analise"
              ? "bg-orange-500 text-white"
              : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          📈 Análise
        </button>
      </section>

      {abaInterna === "metodos" ? (
        <MetodosResumo parsed={parsed} />
      ) : (
        <AnaliseResumo parsed={parsed} />
      )}
    </div>
  );
}