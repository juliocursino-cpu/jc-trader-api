import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Database,
  Download,
  Landmark,
  Plus,
  RefreshCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";

/* =========================================================
   JC TRADER - BANCO
   Controle de depósitos, saques e saldo por bookmaker
========================================================= */

const BOOKMAKERS_PADRAO = ["Betfair", "Fulltbet", "Bet365", "Bolsa"];

function numClassic(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function moneyClassic(value) {
  return numClassic(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateClassic(value) {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value);

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  return null;
}

function ResultCard({ title, value, icon: Icon, tone = "blue" }) {
  const tones = {
    green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-400/30 bg-red-500/10 text-red-300",
    blue: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    yellow: "border-yellow-400/30 bg-yellow-500/10 text-yellow-300",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone] || tones.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-80">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>

        {Icon && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-2">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-bold text-zinc-400 ${className}`}>
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-emerald-500";

function MiniBarRanking({ data, title = "Ranking visual" }) {
  const top = data.slice(0, 12);

  const maxAbs = Math.max(
    ...top.map((item) => Math.abs(Number(item.lucro || 0))),
    1
  );

  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
      <h2 className="text-lg font-black text-zinc-50">{title}</h2>
      <p className="mb-3 text-sm text-zinc-500">Top 12 por saldo</p>

      <div className="space-y-3">
        {top.map((item, index) => {
          const value = Number(item.lucro || 0);
          const positive = value >= 0;
          const width = Math.max(6, (Math.abs(value) / maxAbs) * 100);

          return (
            <div key={`${item.nome}-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="truncate text-zinc-300">{item.nome}</span>
                <span className={positive ? "text-emerald-300" : "text-red-300"}>
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

        <div className="text-xs font-bold text-zinc-500">{rows.length} linhas</div>
      </div>

      <div className="max-h-[620px] overflow-auto">
        <table className="w-full min-w-[950px] border-collapse text-center text-sm">
          <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={`px-3 py-3 ${index === 0 ? "text-left" : ""}`}
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
                  className="border-b border-zinc-800 hover:bg-emerald-500/10"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`px-3 py-2 ${
                        cellIndex === 0
                          ? "text-left font-bold text-emerald-300"
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

export default function Banco() {
  const [transacoes, setTransacoes] = useState(() => {
    try {
      const saved = localStorage.getItem("banco");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bookmakers, setBookmakers] = useState(BOOKMAKERS_PADRAO);

  const [form, setForm] = useState({
    tipo: "Depósito",
    valor: "",
    bookmaker: "Betfair",
    data: hojeISO(),
    obs: "",
  });

  useEffect(() => {
    localStorage.setItem("banco", JSON.stringify(transacoes));
  }, [transacoes]);

  useEffect(() => {
    async function loadDados() {
      try {
        const response = await fetch("/dados.json");
        const data = await response.json();
        const casas = data.casas || data.bookmakers || BOOKMAKERS_PADRAO;

        setBookmakers(casas);
        setForm((prev) => ({
          ...prev,
          bookmaker: prev.bookmaker || casas[0] || "Betfair",
        }));
      } catch {
        setBookmakers(BOOKMAKERS_PADRAO);
      }
    }

    loadDados();
  }, []);

  const totalDepositos = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === "Depósito")
      .reduce((acc, t) => acc + numClassic(t.valor), 0);
  }, [transacoes]);

  const totalSaques = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === "Saque")
      .reduce((acc, t) => acc + numClassic(t.valor), 0);
  }, [transacoes]);

  const saldo = totalSaques - totalDepositos;

  const resumoBook = useMemo(() => {
    const map = new Map();

    transacoes.forEach((t) => {
      const book = t.bookmaker || "Sem bookmaker";

      if (!map.has(book)) {
        map.set(book, {
          bookmaker: book,
          deposito: 0,
          saque: 0,
          saldo: 0,
          qtd: 0,
        });
      }

      const row = map.get(book);
      const valor = numClassic(t.valor);

      if (t.tipo === "Depósito") row.deposito += valor;
      if (t.tipo === "Saque") row.saque += valor;

      row.saldo = row.saque - row.deposito;
      row.qtd += 1;
    });

    return [...map.values()].sort((a, b) => b.saldo - a.saldo);
  }, [transacoes]);

  const resumoMensal = useMemo(() => {
    const meses = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    const ano = new Date().getFullYear();

    const base = meses.map((mes) => ({
      mes,
      deposito: 0,
      saque: 0,
      saldo: 0,
    }));

    transacoes.forEach((t) => {
      const d = parseDateClassic(t.data);
      if (!d || d.getFullYear() !== ano) return;

      const row = base[d.getMonth()];
      const valor = numClassic(t.valor);

      if (t.tipo === "Depósito") row.deposito += valor;
      if (t.tipo === "Saque") row.saque += valor;

      row.saldo = row.saque - row.deposito;
    });

    return base;
  }, [transacoes]);

  function adicionar() {
    const valor = numClassic(form.valor);

    if (!valor || valor <= 0) {
      alert("Digite um valor válido.");
      return;
    }

    const nova = {
      ...form,
      valor,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      criadoEm: new Date().toISOString(),
    };

    setTransacoes((prev) => [...prev, nova]);

    setForm((prev) => ({
      ...prev,
      valor: "",
      obs: "",
    }));
  }

  function excluir(id) {
    if (!window.confirm("Deseja excluir esta transação?")) return;
    setTransacoes((prev) => prev.filter((t) => t.id !== id));
  }

  function limparTudo() {
    if (!window.confirm("Deseja excluir todas as transações do banco?")) return;
    setTransacoes([]);
  }

  function exportarExcel() {
    const dados = transacoes.map((t) => ({
      Data: t.data,
      Tipo: t.tipo,
      Valor: numClassic(t.valor),
      Bookmaker: t.bookmaker,
      Observacao: t.obs || "",
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Banco");
    XLSX.writeFile(wb, "Banco_JC_Trader.xlsx");
  }

  return (
    <div className="space-y-4 text-zinc-100">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
          JC Trader clássico
        </p>

        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-50">
          <Landmark className="h-7 w-7 text-emerald-400" />
          Banco
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Controle de depósitos, saques, saldo por bookmaker e evolução mensal.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <ResultCard
          title="Depósitos"
          value={moneyClassic(totalDepositos)}
          icon={Database}
          tone="blue"
        />

        <ResultCard
          title="Saques"
          value={moneyClassic(totalSaques)}
          icon={Wallet}
          tone="green"
        />

        <ResultCard
          title="Saldo"
          value={moneyClassic(saldo)}
          icon={Activity}
          tone={saldo >= 0 ? "green" : "red"}
        />

        <ResultCard
          title="Registros"
          value={transacoes.length}
          icon={BarChart3}
          tone="violet"
        />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <Field label="Tipo">
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className={inputClass}
            >
              <option>Depósito</option>
              <option>Saque</option>
            </select>
          </Field>

          <Field label="Valor">
            <input
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              type="number"
              placeholder="0,00"
              className={inputClass}
            />
          </Field>

          <Field label="Data">
            <input
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              type="date"
              className={inputClass}
            />
          </Field>

          <Field label="Bookmaker">
            <select
              value={form.bookmaker}
              onChange={(e) =>
                setForm({ ...form, bookmaker: e.target.value })
              }
              className={inputClass}
            >
              {bookmakers.map((casa) => (
                <option key={casa} value={casa}>
                  {casa}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observação" className="md:col-span-2">
            <input
              value={form.obs}
              onChange={(e) => setForm({ ...form, obs: e.target.value })}
              placeholder="Ex: ajuste de banca, transferência, retirada..."
              className={inputClass}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={adicionar}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500"
          >
            <Plus className="mr-2 inline h-4 w-4" />
            Adicionar
          </button>

          <button
            type="button"
            onClick={exportarExcel}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-500"
          >
            <Download className="mr-2 inline h-4 w-4" />
            Exportar
          </button>

          <button
            type="button"
            onClick={limparTudo}
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-500"
          >
            <RefreshCcw className="mr-2 inline h-4 w-4" />
            Limpar
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <MiniBarRanking
          data={resumoBook.map((item) => ({
            nome: item.bookmaker,
            lucro: item.saldo,
          }))}
          title="Saldo por bookmaker"
        />

        <MiniBarRanking
          data={resumoMensal.map((item) => ({
            nome: item.mes,
            lucro: item.saldo,
          }))}
          title="Saldo mensal"
        />
      </section>

      <DarkTable
        title="Resumo por Bookmaker"
        subtitle="Depósitos, saques, saldo e quantidade de movimentações"
        headers={["Bookmaker", "Depósitos", "Saques", "Saldo", "Mov."]}
        rows={resumoBook.map((item) => [
          item.bookmaker,
          <span className="text-sky-300">
            {moneyClassic(item.deposito)}
          </span>,
          <span className="text-emerald-300">
            {moneyClassic(item.saque)}
          </span>,
          <span
            className={item.saldo >= 0 ? "text-emerald-300" : "text-red-300"}
          >
            {moneyClassic(item.saldo)}
          </span>,
          item.qtd,
        ])}
      />

      <DarkTable
        title="Transações"
        subtitle="Histórico completo de movimentações"
        headers={["Data", "Tipo", "Valor", "Bookmaker", "Observação", "Ação"]}
        rows={transacoes
          .slice()
          .sort((a, b) => String(b.data).localeCompare(String(a.data)))
          .map((t) => [
            t.data,
            t.tipo,
            <span
              className={
                t.tipo === "Depósito" ? "text-sky-300" : "text-emerald-300"
              }
            >
              {moneyClassic(t.valor)}
            </span>,
            t.bookmaker,
            t.obs || "—",
            <button
              type="button"
              onClick={() => excluir(t.id)}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20"
            >
              <Trash2 className="mr-1 inline h-3 w-3" />
              Excluir
            </button>,
          ])}
      />
    </div>
  );
}