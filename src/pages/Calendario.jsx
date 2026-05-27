import React, { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Database,
  ShieldCheck,
  Target,
  Wallet,
  BookOpen,
} from "lucide-react";

/* =========================================================
   JC TRADER - CALENDÁRIO + DIÁRIO
   Usa entradas salvas no localStorage
========================================================= */

const JC_MESES = [
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

const JC_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function jcNum(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  let text = String(value ?? "")
    .replace("R$", "")
    .replace(/\s/g, "")
    .trim();

  if (!text) return 0;

  // Caso BR: 1.543,12
  if (text.includes(",") && text.includes(".")) {
    text = text.replace(/\./g, "").replace(",", ".");
  }
  // Caso BR simples: 1543,12
  else if (text.includes(",")) {
    text = text.replace(",", ".");
  }
  // Caso já esteja em formato JS: 1543.12
  else {
    text = text;
  }

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function jcMoney(value) {
  const n = jcNum(value);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseDateUniversalJC(value) {
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

function useEntradasLocalStorage() {
  const [entradas] = useState(() => {
    try {
      const keys = ["entradas", "jc_entradas", "meuapp_entradas"];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  return entradas;
}

function DadosStatCard({ title, value, icon: Icon, tone = "blue" }) {
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

function CalendarioVisual({ entradas }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  function mudarMes(delta) {
    const base = new Date(ano, mes, 1);
    base.setMonth(base.getMonth() + delta);
    setMes(base.getMonth());
    setAno(base.getFullYear());
  }

  const anosDisponiveis = useMemo(() => {
    const lista = [];
    for (
      let anoItem = hoje.getFullYear() - 3;
      anoItem <= hoje.getFullYear() + 3;
      anoItem += 1
    ) {
      lista.push(anoItem);
    }
    return lista;
  }, []);

  const mapaDias = useMemo(() => {
    const acc = {};

    entradas.forEach((entrada) => {
      const data = parseDateUniversalJC(entrada.data);
      if (!data) return;
      if (data.getMonth() !== mes || data.getFullYear() !== ano) return;

      const dia = data.getDate();

      if (!acc[dia]) {
        acc[dia] = {
          stake: 0,
          lucro: 0,
          qtd: 0,
        };
      }

      acc[dia].stake += jcNum(entrada.stake);
      acc[dia].lucro += jcNum(entrada.lucro);
      acc[dia].qtd += 1;
    });

    for (const dia in acc) {
      acc[dia].roi = acc[dia].stake
        ? (acc[dia].lucro / acc[dia].stake) * 100
        : 0;
    }

    return acc;
  }, [entradas, mes, ano]);

  const diasCalendario = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < primeiroDiaSemana; i += 1) {
      cells.push({ vazio: true, key: `empty-${i}` });
    }

    for (let dia = 1; dia <= totalDias; dia += 1) {
      const info = mapaDias[dia] || {
        stake: 0,
        lucro: 0,
        qtd: 0,
        roi: 0,
      };

      cells.push({
        dia,
        ...info,
        key: `dia-${dia}`,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ vazio: true, key: `end-${cells.length}` });
    }

    return cells;
  }, [mapaDias, mes, ano]);

  const totaisMes = useMemo(() => {
    let stake = 0;
    let lucro = 0;
    let qtd = 0;

    Object.values(mapaDias).forEach((dia) => {
      stake += dia.stake;
      lucro += dia.lucro;
      qtd += dia.qtd;
    });

    const roi = stake ? (lucro / stake) * 100 : 0;

    return {
      stake,
      lucro,
      qtd,
      roi,
    };
  }, [mapaDias]);

  function cellClass(cell) {
    if (!cell.qtd) return "border-zinc-800 bg-zinc-950 text-zinc-600";
    if (cell.lucro > 0)
      return "border-emerald-400/30 bg-emerald-500/20 text-emerald-100";
    if (cell.lucro < 0)
      return "border-red-400/30 bg-red-500/20 text-red-100";
    return "border-yellow-400/30 bg-yellow-500/20 text-yellow-100";
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Mês
          </p>
          <p className="mt-1 text-2xl font-black text-zinc-50">
            {JC_MESES[mes]} / {ano}
          </p>
        </div>

        <DadosStatCard
          title="ROI do mês"
          value={`${totaisMes.roi.toFixed(2)}%`}
          icon={Activity}
          tone={totaisMes.roi >= 0 ? "green" : "red"}
        />

        <DadosStatCard
          title="Lucro"
          value={jcMoney(totaisMes.lucro)}
          icon={Wallet}
          tone={totaisMes.lucro >= 0 ? "green" : "red"}
        />

        <DadosStatCard
          title="Apostas"
          value={totaisMes.qtd}
          icon={Database}
          tone="blue"
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            onClick={() => mudarMes(-1)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900"
          >
            ◀ Mês anterior
          </button>

          <div className="flex items-center justify-center gap-2">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none"
            >
              {JC_MESES.map((nome, index) => (
                <option key={nome} value={index}>
                  {nome}
                </option>
              ))}
            </select>

            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-bold text-zinc-100 outline-none"
            >
              {anosDisponiveis.map((anoItem) => (
                <option key={anoItem} value={anoItem}>
                  {anoItem}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => mudarMes(1)}
            className="rounded-xl border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-black text-zinc-100 hover:bg-zinc-900"
          >
            Próximo mês ▶
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-wide text-zinc-500">
          {JC_SEMANA.map((dia, index) => (
            <div key={`${dia}-${index}`}>{dia}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {diasCalendario.map((cell) => {
            if (cell.vazio) {
              return (
                <div
                  key={cell.key}
                  className="h-24 rounded-2xl border border-zinc-900 bg-black/40"
                />
              );
            }

            return (
              <div
                key={cell.key}
                title={`ROI: ${cell.roi.toFixed(2)}% | Apostas: ${
                  cell.qtd
                } | Lucro: ${jcMoney(cell.lucro)} | Stake: ${jcMoney(
                  cell.stake
                )}`}
                className={`flex h-24 flex-col justify-between rounded-2xl border p-3 shadow-sm ${cellClass(
                  cell
                )}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">{cell.dia}</span>
                  <span className="text-xs font-black">
                    {cell.qtd ? `${cell.qtd}x` : ""}
                  </span>
                </div>

                <div className="text-center text-sm font-black">
                  {cell.qtd
                    ? `${cell.roi > 0 ? "+" : ""}${cell.roi.toFixed(1)}%`
                    : "—"}
                </div>

                <div className="truncate text-center text-[11px] font-bold opacity-90">
                  {cell.qtd ? jcMoney(cell.lucro) : "sem entrada"}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DiarioMensal({ entradas }) {
  const anoAtual = new Date().getFullYear();

  function entradasDoMes(mesIndex) {
    return entradas.filter((entrada) => {
      const data = parseDateUniversalJC(entrada.data);
      return (
        data &&
        data.getFullYear() === anoAtual &&
        data.getMonth() === mesIndex
      );
    });
  }

  function gerarDias(mesIndex) {
    const ultimoDia = new Date(anoAtual, mesIndex + 1, 0).getDate();

    return Array.from({ length: ultimoDia }, (_, index) => {
      const dia = index + 1;

      const doDia = entradas.filter((entrada) => {
        const data = parseDateUniversalJC(entrada.data);
        return (
          data &&
          data.getFullYear() === anoAtual &&
          data.getMonth() === mesIndex &&
          data.getDate() === dia
        );
      });

      const total = doDia.reduce(
        (acc, entrada) => acc + jcNum(entrada.lucro),
        0
      );

      return {
        dia,
        semana: new Date(anoAtual, mesIndex, dia).toLocaleDateString("pt-BR", {
          weekday: "short",
        }),
        total,
        qtd: doDia.length,
      };
    });
  }

  function resumoMensal(mesIndex) {
    const doMes = entradasDoMes(mesIndex);

    const total = doMes.reduce(
      (acc, entrada) => acc + jcNum(entrada.lucro),
      0
    );

    const greens = doMes.filter((entrada) => jcNum(entrada.lucro) > 0).length;
    const reds = doMes.filter((entrada) => jcNum(entrada.lucro) < 0).length;
    const neutros = doMes.filter((entrada) => jcNum(entrada.lucro) === 0).length;

    const stake = doMes.reduce(
      (acc, entrada) => acc + jcNum(entrada.stake),
      0
    );

    const roi = stake ? (total / stake) * 100 : 0;

    return {
      total,
      greens,
      reds,
      neutros,
      stake,
      roi,
      qtd: doMes.length,
    };
  }

  const cardsMensais = JC_MESES.map((nome, index) => ({
    nome,
    ...resumoMensal(index),
  }));

  const totalGanho = entradas
    .filter((entrada) => jcNum(entrada.lucro) > 0)
    .reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0);

  const totalPerdido = Math.abs(
    entradas
      .filter((entrada) => jcNum(entrada.lucro) < 0)
      .reduce((acc, entrada) => acc + jcNum(entrada.lucro), 0)
  );

  const stakeMedia = entradas.length
    ? entradas.reduce((acc, entrada) => acc + jcNum(entrada.stake), 0) /
      entradas.length
    : 0;

  const balanco = totalGanho - totalPerdido;

  const grupos = [
    [0, 1, 2, 3],
    [4, 5, 6, 7],
    [8, 9, 10, 11],
  ];

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <DadosStatCard
          title="Total Ganho"
          value={jcMoney(totalGanho)}
          icon={ShieldCheck}
          tone="green"
        />

        <DadosStatCard
          title="Total Perdido"
          value={jcMoney(-totalPerdido)}
          icon={Target}
          tone="red"
        />

        <DadosStatCard
          title="Balanço"
          value={jcMoney(balanco)}
          icon={Wallet}
          tone={balanco >= 0 ? "green" : "red"}
        />

        <DadosStatCard
          title="Stake Média"
          value={jcMoney(stakeMedia)}
          icon={BarChart3}
          tone="blue"
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-black text-zinc-50">
          Resumo mensal
        </h2>

        <div className="flex flex-wrap gap-2">
          {cardsMensais.map((mes) => (
            <div
              key={mes.nome}
              className={`rounded-full border px-4 py-2 text-sm font-black ${
                mes.total > 0
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : mes.total < 0
                  ? "border-red-400/30 bg-red-500/10 text-red-300"
                  : "border-yellow-400/30 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              {mes.nome.slice(0, 3)}: {mes.total >= 0 ? "+" : ""}
              {jcMoney(mes.total)}
            </div>
          ))}
        </div>
      </section>

      {grupos.map((grupo, grupoIndex) => (
        <section
          key={grupoIndex}
          className="grid grid-cols-1 gap-3 xl:grid-cols-4"
        >
          {grupo.map((mesIndex) => {
            const resumo = resumoMensal(mesIndex);

            return (
              <div
                key={mesIndex}
                className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111111] shadow-sm"
              >
                <div className="border-b border-zinc-800 p-3 text-center">
                  <h3 className="text-lg font-black text-zinc-50">
                    {JC_MESES[mesIndex]}
                  </h3>

                  <p
                    className={`text-sm font-bold ${
                      resumo.total >= 0 ? "text-emerald-300" : "text-red-300"
                    }`}
                  >
                    {jcMoney(resumo.total)} • ROI {resumo.roi.toFixed(1)}%
                  </p>
                </div>

                <div className="max-h-[420px] overflow-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {gerarDias(mesIndex).map((dia) => (
                        <tr
                          key={dia.dia}
                          className="border-b border-zinc-800 last:border-0"
                        >
                          <td className="px-3 py-2 font-bold text-zinc-300">
                            {String(dia.dia).padStart(2, "0")}/
                            {String(mesIndex + 1).padStart(2, "0")}
                          </td>

                          <td className="px-3 py-2 text-zinc-500">
                            {dia.semana}
                          </td>

                          <td className="px-3 py-2 text-center">
                            {dia.total > 0
                              ? "🟢"
                              : dia.total < 0
                              ? "🔴"
                              : "—"}
                          </td>

                          <td
                            className={`px-3 py-2 text-right font-black ${
                              dia.total > 0
                                ? "text-emerald-300"
                                : dia.total < 0
                                ? "text-red-300"
                                : "text-zinc-600"
                            }`}
                          >
                            {dia.total === 0
                              ? ""
                              : `${dia.total > 0 ? "+" : ""}${jcMoney(
                                  dia.total
                                )}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-400">
                  <span className="text-emerald-300">
                    🟢 {resumo.greens}
                  </span>
                  <span className="ml-3 text-red-300">🔴 {resumo.reds}</span>
                  <span className="ml-3 text-yellow-300">
                    🟡 {resumo.neutros}
                  </span>
                  <span className="ml-3">Pics: {resumo.qtd}</span>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

export default function Calendario() {
  const entradas = useEntradasLocalStorage();
  const [abaInterna, setAbaInterna] = useState("calendario");

  return (
    <div className="space-y-4 text-zinc-100">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-400">
          JC Trader clássico
        </p>

        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-50">
          {abaInterna === "calendario" ? (
            <CalendarDays className="h-7 w-7 text-sky-400" />
          ) : (
            <BookOpen className="h-7 w-7 text-violet-400" />
          )}
          {abaInterna === "calendario" ? "Calendário" : "Diário"}
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          {abaInterna === "calendario"
            ? "Calendário mensal com ROI, lucro e quantidade de entradas por dia."
            : "Visão diária dos lucros e perdas por mês, usando as entradas cadastradas."}
        </p>
      </header>

      <section className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setAbaInterna("calendario")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            abaInterna === "calendario"
              ? "bg-sky-500 text-white"
              : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          📅 Calendário
        </button>

        <button
          type="button"
          onClick={() => setAbaInterna("diario")}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            abaInterna === "diario"
              ? "bg-violet-500 text-white"
              : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          📖 Diário
        </button>
      </section>

      {abaInterna === "calendario" ? (
        <CalendarioVisual entradas={entradas} />
      ) : (
        <DiarioMensal entradas={entradas} />
      )}
    </div>
  );
}