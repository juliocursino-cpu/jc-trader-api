import { useEffect, useMemo, useState } from "react";

import {
  Database,
  ShieldCheck,
  Target,
  Wallet,
  Activity,
  Trophy,
  Flame,
  BarChart3,
} from "lucide-react";

// ======================================================
// HELPERS
// ======================================================

function parseDataDados(value) {

  if (!value)
    return null;

  if (typeof value === "string") {

    const br =
      value.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
      );

    if (br)
      return new Date(
        +br[3],
        +br[2] - 1,
        +br[1]
      );

    const iso =
      value.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );

    if (iso)
      return new Date(
        +iso[1],
        +iso[2] - 1,
        +iso[3]
      );
  }

  if (
    value instanceof Date &&
    !Number.isNaN(value.getTime())
  ) {
    return value;
  }

  return null;
}

function entradaNumber(value) {

  const n =
    Number(
      String(value || "")
        .replace(",", ".")
    );

  return Number.isFinite(n)
    ? n
    : 0;
}

function moneyDados(value) {

  const n =
    Number(value || 0);

  return n.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

// ======================================================
// COMPONENTS
// ======================================================

function DadosStatCard({
  title,
  value,
  icon: Icon,
  tone = "default",
}) {

  const colorClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "profit"
      ? String(value).includes("-")
        ? "text-red-300"
        : "text-emerald-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-zinc-50";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            {title}
          </p>

          <p className={`mt-1 text-2xl font-black ${colorClass}`}>
            {value}
          </p>

        </div>

        {Icon && (

          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-2">

            <Icon
              size={18}
              className="text-zinc-400"
            />

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
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-blue-500"
      >

        {options.map((item) => (
          <option
            key={item}
            value={item}
          >
            {item}
          </option>
        ))}

      </select>

    </label>
  );
}

function DadosMiniChart({ data }) {

  if (!data.length) {

    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-800 bg-[#111111] text-sm font-semibold text-zinc-500">
        Sem dados para gráfico.
      </div>
    );
  }

  const width = 1100;
  const height = 280;
  const paddingX = 24;
  const paddingY = 26;

  const values =
    data.map(
      (item) => item.evolucao
    );

  const min =
    Math.min(...values, 0);

  const max =
    Math.max(...values, 0);

  const range =
    max - min || 1;

  const last =
    data[data.length - 1];

  const positive =
    last.evolucao >= 0;

  const points =
    data.map((item, index) => {

      const x =
        paddingX +
        (index /
          Math.max(
            data.length - 1,
            1
          )) *
          (width - paddingX * 2);

      const y =
        height -
        paddingY -
        ((item.evolucao - min) /
          range) *
          (height - paddingY * 2);

      return { x, y };

    });

  function smoothPathFromPoints(
    localPoints
  ) {

    if (localPoints.length < 2)
      return "";

    const d = [
      `M ${localPoints[0].x} ${localPoints[0].y}`,
    ];

    for (
      let i = 0;
      i < localPoints.length - 1;
      i += 1
    ) {

      const p0 =
        localPoints[i - 1] ||
        localPoints[i];

      const p1 =
        localPoints[i];

      const p2 =
        localPoints[i + 1];

      const p3 =
        localPoints[i + 2] ||
        p2;

      const cp1x =
        p1.x +
        (p2.x - p0.x) / 6;

      const cp1y =
        p1.y +
        (p2.y - p0.y) / 6;

      const cp2x =
        p2.x -
        (p3.x - p1.x) / 6;

      const cp2y =
        p2.y -
        (p3.y - p1.y) / 6;

      d.push(
        `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      );
    }

    return d.join(" ");
  }

  const linePath =
    smoothPathFromPoints(points);

  const areaPath =
    `${linePath}
     L ${points[points.length - 1].x} ${height - paddingY}
     L ${points[0].x} ${height - paddingY}
     Z`;

  const stroke =
    positive
      ? "#22c55e"
      : "#ef4444";

  const gradientId =
    positive
      ? "dadosGradientGreen"
      : "dadosGradientRed";

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">

      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">

        <div>

          <h2 className="text-lg font-black text-zinc-50">
            Evolução acumulada
          </h2>

          <p className="text-sm text-zinc-500">
            Resultado mensal acumulado
          </p>

        </div>

        <div
          className={`text-sm font-black ${
            positive
              ? "text-emerald-300"
              : "text-red-300"
          }`}
        >
          Acumulado:
          {" "}
          {moneyDados(last.evolucao)}
        </div>

      </div>

      <div className="overflow-x-auto rounded-xl bg-gradient-to-b from-zinc-950 to-[#0b0b0b]">

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-72 min-w-[900px]"
        >

          <defs>

            <linearGradient
              id="dadosGradientGreen"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#22c55e"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="#22c55e"
                stopOpacity="0.03"
              />
            </linearGradient>

            <linearGradient
              id="dadosGradientRed"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#ef4444"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="#ef4444"
                stopOpacity="0.03"
              />
            </linearGradient>

          </defs>

          <path
            d={areaPath}
            fill={`url(#${gradientId})`}
          />

          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="3"
            strokeLinecap="round"
          />

          {points.map((point, index) => (

            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={stroke}
              opacity="0.65"
            />

          ))}

          <text
            x={paddingX + 4}
            y={24}
            fill="#a1a1aa"
            fontSize="12"
          >
            Máx: {moneyDados(max)}
          </text>

          <text
            x={paddingX + 4}
            y={height - 10}
            fill="#a1a1aa"
            fontSize="12"
          >
            Mín: {moneyDados(min)}
          </text>

        </svg>

      </div>

    </section>
  );
}

// ======================================================
// PAGE
// ======================================================

export default function Dados() {

  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const [entradas, setEntradas] =
    useState(() => {

      try {

        const saved =
          localStorage.getItem("entradas");

        return saved
          ? JSON.parse(saved)
          : [];

      } catch {

        return [];

      }
    });

  const [mesFiltro, setMesFiltro] =
    useState("Todos");

  const [metaMensal, setMetaMensal] =
    useState(() => {
      return (
        Number(
          localStorage.getItem("metaMensal")
        ) || 1000
      );
    });

  useEffect(() => {

    function syncEntradas() {

      try {

        const saved =
          localStorage.getItem("entradas");

        setEntradas(
          saved
            ? JSON.parse(saved)
            : []
        );

      } catch {

        setEntradas([]);

      }
    }

    syncEntradas();

    window.addEventListener(
      "storage",
      syncEntradas
    );

    return () =>
      window.removeEventListener(
        "storage",
        syncEntradas
      );

  }, []);

  useEffect(() => {

    localStorage.setItem(
      "metaMensal",
      String(metaMensal)
    );

  }, [metaMensal]);

  // ======================================================
  // RESUMO MENSAL
  // ======================================================

  const resumoMensal = useMemo(() => {

    const base =
      meses.map((mes, index) => {

        const entradasMes =
          entradas.filter((entrada) => {

            const d =
              parseDataDados(
                entrada.data
              );

            return (
              d &&
              d.getMonth() === index
            );
          });

        const investimento =
          entradasMes.reduce(
            (acc, entrada) =>
              acc +
              entradaNumber(
                entrada.stake
              ),
            0
          );

        const lucro =
          entradasMes.reduce(
            (acc, entrada) =>
              acc +
              entradaNumber(
                entrada.lucro
              ),
            0
          );

        const green =
          entradasMes.filter(
            (entrada) =>
              String(
                entrada.resultado
              ).toLowerCase() === "green"
          ).length;

        const red =
          entradasMes.filter(
            (entrada) =>
              String(
                entrada.resultado
              ).toLowerCase() === "red"
          ).length;

        const voids =
          entradasMes.filter(
            (entrada) =>
              String(
                entrada.resultado
              ).toLowerCase() === "void"
          ).length;

        const back =
          entradasMes.filter(
            (entrada) =>
              entrada.modo === "Back"
          ).length;

        const lay =
          entradasMes.filter(
            (entrada) =>
              entrada.modo === "Lay"
          ).length;

        const lucroBack =
          entradasMes
            .filter(
              (entrada) =>
                entrada.modo === "Back"
            )
            .reduce(
              (acc, entrada) =>
                acc +
                entradaNumber(
                  entrada.lucro
                ),
              0
            );

        const lucroLay =
          entradasMes
            .filter(
              (entrada) =>
                entrada.modo === "Lay"
            )
            .reduce(
              (acc, entrada) =>
                acc +
                entradaNumber(
                  entrada.lucro
                ),
              0
            );

        const investBack =
          entradasMes
            .filter(
              (entrada) =>
                entrada.modo === "Back"
            )
            .reduce(
              (acc, entrada) =>
                acc +
                entradaNumber(
                  entrada.stake
                ),
              0
            );

        const investLay =
          entradasMes
            .filter(
              (entrada) =>
                entrada.modo === "Lay"
            )
            .reduce(
              (acc, entrada) =>
                acc +
                entradaNumber(
                  entrada.stake
                ),
              0
            );

        const roi =
          investimento
            ? (lucro / investimento) *
              100
            : 0;

        const winrate =
          entradasMes.length
            ? (green /
                entradasMes.length) *
              100
            : 0;

        const ticketMedio =
          entradasMes.length
            ? investimento /
              entradasMes.length
            : 0;

        return {
          mes,
          investimento,
          lucro,
          roi,
          winrate,
          pic: entradasMes.length,
          green,
          red,
          void: voids,
          back,
          lay,
          lucroBack,
          lucroLay,
          investBack,
          investLay,
          roiBack: investBack
            ? (lucroBack /
                investBack) *
              100
            : 0,
          roiLay: investLay
            ? (lucroLay /
                investLay) *
              100
            : 0,
          ticketMedio,
        };

      });

    let acumulado = 0;

    return base.map((item) => {

      acumulado += item.lucro;

      return {
        ...item,
        evolucao: acumulado,
      };

    });

  }, [entradas]);

  // ======================================================
  // GRÁFICO
  // ======================================================

  const dadosGrafico = useMemo(() => {
    if (mesFiltro === "Todos") {
      return resumoMensal.map((item) => ({
        label: item.mes,
        evolucao: item.evolucao,
      }));
    }

    const idxMes = meses.indexOf(mesFiltro);

    const entradasMes = entradas.filter((entrada) => {
      const d = parseDataDados(entrada.data);
      return d && d.getMonth() === idxMes;
    });

    const agrupado = {};

    entradasMes.forEach((entrada) => {
      const d = parseDataDados(entrada.data);
      if (!d) return;

      const dia = d.getDate();

      agrupado[dia] =
        (agrupado[dia] || 0) +
        entradaNumber(entrada.lucro);
    });

    let acumulado = 0;

    return Object.entries(agrupado)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([dia, lucro]) => {
        acumulado += lucro;

        return {
          label: `${dia}/${idxMes + 1}`,
          evolucao: acumulado,
        };
      });
  }, [mesFiltro, entradas, resumoMensal]);

  // ======================================================
  // TOTAIS
  // ======================================================

  const totais = useMemo(() => {
    const total = entradas.length;

    const green = entradas.filter(
      (entrada) =>
        String(entrada.resultado).toLowerCase() === "green"
    ).length;

    const red = entradas.filter(
      (entrada) =>
        String(entrada.resultado).toLowerCase() === "red"
    ).length;

    const voids = entradas.filter(
      (entrada) =>
        String(entrada.resultado).toLowerCase() === "void"
    ).length;

    const investimento = entradas.reduce(
      (acc, entrada) => acc + entradaNumber(entrada.stake),
      0
    );

    const lucro = entradas.reduce(
      (acc, entrada) => acc + entradaNumber(entrada.lucro),
      0
    );

    const winrate = total ? (green / total) * 100 : 0;
    const roi = investimento ? (lucro / investimento) * 100 : 0;

    const backQtd = entradas.filter((entrada) => entrada.modo === "Back").length;
    const layQtd = entradas.filter((entrada) => entrada.modo === "Lay").length;

    const lucroGreen = entradas
      .filter((entrada) => entradaNumber(entrada.lucro) > 0)
      .reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0);

    const lucroRed = Math.abs(
      entradas
        .filter((entrada) => entradaNumber(entrada.lucro) < 0)
        .reduce((acc, entrada) => acc + entradaNumber(entrada.lucro), 0)
    );

    const profitFactor = lucroRed
      ? lucroGreen / lucroRed
      : lucroGreen
      ? lucroGreen
      : 0;

    const ticketMedio = total ? investimento / total : 0;
    const lucroMedio = total ? lucro / total : 0;

    let acumulado = 0;
    let pico = 0;
    let drawdown = 0;

    [...entradas]
      .sort(
        (a, b) =>
          (parseDataDados(a.data)?.getTime() || 0) -
          (parseDataDados(b.data)?.getTime() || 0)
      )
      .forEach((entrada) => {
        acumulado += entradaNumber(entrada.lucro);
        pico = Math.max(pico, acumulado);
        drawdown = Math.min(drawdown, acumulado - pico);
      });

    const mesesComJogo = resumoMensal.filter((item) => item.pic > 0);

    const melhorMes = mesesComJogo.length
      ? [...mesesComJogo].sort((a, b) => b.lucro - a.lucro)[0]
      : null;

    const piorMes = mesesComJogo.length
      ? [...mesesComJogo].sort((a, b) => a.lucro - b.lucro)[0]
      : null;

    return {
      total,
      green,
      red,
      voids,
      investimento,
      lucro,
      winrate,
      roi,
      backQtd,
      layQtd,
      profitFactor,
      ticketMedio,
      lucroMedio,
      drawdown,
      melhorMes,
      piorMes,
    };
  }, [entradas, resumoMensal]);

  const progressoMeta = metaMensal ? (totais.lucro / metaMensal) * 100 : 0;
  const restanteMeta = metaMensal - totais.lucro;

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-400">
            JC Trader clássico
          </p>
          <h1 className="text-3xl font-black text-zinc-50">Dados</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Dashboard geral das entradas cadastradas.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <DadosStatCard title="Entradas" value={totais.total} icon={Database} />
        <DadosStatCard title="Greens" value={totais.green} icon={ShieldCheck} tone="green" />
        <DadosStatCard title="Reds" value={totais.red} icon={Target} tone="red" />
        <DadosStatCard title="Lucro Total" value={moneyDados(totais.lucro)} icon={Wallet} tone="profit" />
        <DadosStatCard title="ROI" value={`${totais.roi.toFixed(1)}%`} icon={Activity} tone={totais.roi >= 0 ? "green" : "red"} />
        <DadosStatCard title="Winrate" value={`${totais.winrate.toFixed(1)}%`} icon={Trophy} />
        <DadosStatCard title="Back / Lay" value={`${totais.backQtd} / ${totais.layQtd}`} icon={BarChart3} tone="blue" />
        <DadosStatCard title="Drawdown" value={moneyDados(totais.drawdown)} icon={Flame} tone="red" />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <InfoCard title="Investimento" value={moneyDados(totais.investimento)} />
        <InfoCard title="Profit Factor" value={totais.profitFactor.toFixed(2)} />
        <InfoCard title="Ticket Médio" value={moneyDados(totais.ticketMedio)} />
        <InfoCard
          title="Lucro Médio/Pic"
          value={moneyDados(totais.lucroMedio)}
          positive={totais.lucroMedio >= 0}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <MonthCard
          title="Melhor mês"
          month={totais.melhorMes?.mes || "—"}
          value={totais.melhorMes ? moneyDados(totais.melhorMes.lucro) : moneyDados(0)}
          type="green"
        />

        <MonthCard
          title="Pior mês"
          month={totais.piorMes?.mes || "—"}
          value={totais.piorMes ? moneyDados(totais.piorMes.lucro) : moneyDados(0)}
          type="red"
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <FilterSelect
            label="Filtrar gráfico por mês"
            value={mesFiltro}
            onChange={setMesFiltro}
            options={["Todos", ...meses]}
          />
        </div>
      </section>

      <DadosMiniChart data={dadosGrafico} />

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-zinc-50">Meta Mensal</h2>
            <p className="text-sm text-zinc-500">Controle da meta financeira mensal</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-400">Meta:</span>

            <input
              type="number"
              value={metaMensal}
              onChange={(e) => setMetaMensal(Number(e.target.value))}
              className="h-10 w-36 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-center text-sm font-bold text-zinc-100 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="h-5 overflow-hidden rounded-full bg-zinc-900">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressoMeta >= 100
                ? "bg-emerald-500"
                : progressoMeta >= 60
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{
              width: `${Math.min(Math.max(progressoMeta, 0), 100)}%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-2 text-sm font-bold md:flex-row md:items-center md:justify-between">
          <span className={restanteMeta <= 0 ? "text-emerald-300" : "text-zinc-400"}>
            {restanteMeta <= 0 ? "Meta batida ✅" : `Restante: ${moneyDados(restanteMeta)}`}
          </span>

          <span className={totais.lucro >= 0 ? "text-emerald-300" : "text-red-300"}>
            {moneyDados(totais.lucro)} / {moneyDados(metaMensal)} ({progressoMeta.toFixed(1)}%)
          </span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">Evolução mensal</h2>
            <p className="text-sm text-zinc-500">Resumo mensal das entradas</p>
          </div>

          <div className="text-xs font-bold text-zinc-500">
            Base: entradas cadastradas
          </div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1450px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 text-left">Mês</th>
                <th className="px-3 py-3">Investimento</th>
                <th className="px-3 py-3">Lucro</th>
                <th className="px-3 py-3">ROI</th>
                <th className="px-3 py-3">Winrate</th>
                <th className="px-3 py-3">Pic</th>
                <th className="px-3 py-3">Green</th>
                <th className="px-3 py-3">Red</th>
                <th className="px-3 py-3">Void</th>
                <th className="px-3 py-3">Back</th>
                <th className="px-3 py-3">Lay</th>
                <th className="px-3 py-3">ROI Back</th>
                <th className="px-3 py-3">ROI Lay</th>
                <th className="px-3 py-3">Ticket Médio</th>
                <th className="px-3 py-3">Evolução</th>
              </tr>
            </thead>

            <tbody>
              {resumoMensal.map((item) => (
                <tr key={item.mes} className="border-b border-zinc-800 hover:bg-blue-500/10">
                  <td className="px-3 py-2 text-left font-bold text-blue-300">{item.mes}</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{moneyDados(item.investimento)}</td>
                  <td className={`px-3 py-2 font-black ${item.lucro >= 0 ? "text-emerald-300" : "text-red-300"}`}>{moneyDados(item.lucro)}</td>
                  <td className={`px-3 py-2 font-black ${item.roi >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roi.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{item.winrate.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-200">{item.pic}</td>
                  <td className="px-3 py-2 font-bold text-emerald-300">{item.green}</td>
                  <td className="px-3 py-2 font-bold text-red-300">{item.red}</td>
                  <td className="px-3 py-2 font-bold text-yellow-300">{item.void}</td>
                  <td className="px-3 py-2 font-bold text-blue-300">{item.back}</td>
                  <td className="px-3 py-2 font-bold text-pink-300">{item.lay}</td>
                  <td className={`px-3 py-2 font-black ${item.roiBack >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roiBack.toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-black ${item.roiLay >= 0 ? "text-emerald-300" : "text-red-300"}`}>{item.roiLay.toFixed(1)}%</td>
                  <td className="px-3 py-2 font-bold text-zinc-300">{moneyDados(item.ticketMedio)}</td>
                  <td className={`px-3 py-2 font-black ${item.evolucao >= 0 ? "text-emerald-300" : "text-red-300"}`}>{moneyDados(item.evolucao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InfoCard({ title, value, positive = true }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <p className={`mt-1 text-2xl font-black ${positive ? "text-zinc-50" : "text-red-300"}`}>
        {value}
      </p>
    </div>
  );
}

function MonthCard({ title, month, value, type }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        type === "green"
          ? "border-emerald-400/30 bg-emerald-500/10"
          : "border-red-400/30 bg-red-500/10"
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.22em] ${
          type === "green" ? "text-emerald-300" : "text-red-300"
        }`}
      >
        {title}
      </p>

      <h2 className="mt-1 text-xl font-black text-zinc-50">
        {month}
      </h2>

      <p
        className={`text-sm font-bold ${
          type === "green" ? "text-emerald-300" : "text-red-300"
        }`}
      >
        {value}
      </p>
    </div>
  );
}