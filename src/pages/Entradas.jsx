import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Database,
  ShieldCheck,
  Target,
  Activity,
  Trophy,
  Wallet,
  BarChart3,
  Upload,
  Download,
  Trash2,
  Plus,
  RefreshCcw,
} from "lucide-react";

// ======================================================
// CONFIG
// ======================================================

const API_BASE =
  import.meta.env.DEV
    ? "http://localhost:3001/api"
    : "https://jc-trader-api.onrender.com/api";

// ======================================================
// LOGOS
// ======================================================

function normalizeKey(value) {
  return String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bFC\b/g, "")
    .replace(/\bCF\b/g, "")
    .replace(/\bCLUB\b/g, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

function logoPath(key) {
  return `/logos/${String(key || "").toLowerCase()}.png`;
}

function leagueLogoPath(key) {
  return `/logos/leagues/${String(key || "").toLowerCase()}.png`;
}


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

function logoFallback(key, folder, fallback) {
  const clean = String(key || "");
  const lower = clean.toLowerCase();
  const firstUpper =
    clean.charAt(0) + clean.slice(1).toLowerCase();

  return [
    `/${folder}/${firstUpper}.png`,
    `/${folder}/${lower}.jpg`,
    `/${folder}/${firstUpper}.jpg`,
    `/${folder}/${lower}.bmp`,
    `/${folder}/${firstUpper}.bmp`,
    fallback,
  ];
}

function TeamLogo({ name }) {
  const key = normalizeKey(name);

  return (
    <img
      src={logoPath(key)}
      alt={name}
      onError={(e) => {
        const attempts = logoFallback(
          key,
          "logos",
          `https://placehold.co/22x22/111111/00d2ff?text=${String(name || "T").charAt(0)}`
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

function LeagueLogo({ name }) {
  const key = normalizeKey(name);
  const [src, setSrc] = useState(leagueLogoPath(key));

  useEffect(() => {
    async function buscarLogo() {
      const logos = await carregarLogosSQL();
      const id = normalizeLogoSQL(name);

      const found = logos.find(
        (logo) => logo.tipo === "liga" && logo.id === id
      );

      if (found?.imagem_base64) {
        setSrc(found.imagem_base64);
      } else {
        setSrc(leagueLogoPath(key));
      }
    }

    buscarLogo();
  }, [name, key]);

  return (
    <img
      src={src}
      alt={name}
      onError={(e) => {
        const attempts = logoFallback(key, "logos/leagues", "");

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

// ======================================================
// HELPERS
// ======================================================

const MESES_ENTRADAS = [
  { v: "Todos", l: "Todos" },
  { v: "1", l: "Janeiro" },
  { v: "2", l: "Fevereiro" },
  { v: "3", l: "Março" },
  { v: "4", l: "Abril" },
  { v: "5", l: "Maio" },
  { v: "6", l: "Junho" },
  { v: "7", l: "Julho" },
  { v: "8", l: "Agosto" },
  { v: "9", l: "Setembro" },
  { v: "10", l: "Outubro" },
  { v: "11", l: "Novembro" },
  { v: "12", l: "Dezembro" },
];

function parseDataLocalEntrada(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return new Date(+br[3], +br[2] - 1, +br[1]);

    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  return null;
}

function formatarDataEntrada(value) {
  const d = parseDataLocalEntrada(value);
  if (!d) return "";

  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function entradaNumber(value) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function dinheiroBR(value) {
  return entradaNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function EntradaInput({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-400">
      {label}
      {children}
    </label>
  );
}

function StatCard({ title, value, icon: Icon, tone = "default" }) {
  const toneClass =
    tone === "green"
      ? "text-emerald-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "profit"
      ? entradaNumber(String(value).replace("R$", "")) >= 0
        ? "text-emerald-300"
        : "text-red-300"
      : "text-zinc-50";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[2px] text-zinc-500">
          {title}
        </p>
        <Icon size={18} className="text-zinc-500" />
      </div>

      <div className={`text-2xl font-black ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

export default function Entradas() {

  // ======================================================
  // REFS
  // ======================================================

  const fileInputRef = useRef(null);

  // ======================================================
  // STATES
  // ======================================================

  const [entradas, setEntradas] = useState(() => {
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

  const [dadosBase, setDadosBase] =
    useState({
      ligas: [],
      times: [],
      metodos: [],
      mercados: [],
    });

  const [form, setForm] = useState({
    data: "",
    liga: "",
    casa: "",
    visitante: "",
    modo: "Back",
    metodo: "",
    mercado: "",
    odd: "",
    stake: "",
    lucro: "",
    resultado: "Green",
  });

  const [mesFiltro, setMesFiltro] =
    useState("Todos");

  const [busca, setBusca] =
    useState("");

  const [entradaFilters, setEntradaFilters] =
    useState({
      dataInicio: "",
      dataFim: "",
      liga: "Todas",
      modo: "Todos",
      metodo: "Todos",
      resultado: "Todos",
    });

  const [dbStatus, setDbStatus] =
    useState("Conectando ao SQL...");

  // ======================================================
  // STORAGE + SQL
  // ======================================================

  useEffect(() => {

    localStorage.setItem(
      "entradas",
      JSON.stringify(entradas)
    );

  }, [entradas]);

  useEffect(() => {

    let ativo = true;

    async function carregarEntradasSQL() {

      try {

        setDbStatus("Sincronizando com SQL...");

        const response =
          await fetch(`${API_BASE}/entradas`);

        const data =
          await response.json();

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Erro ao carregar entradas.");
        }

        if (!ativo) return;

        const entradasSQL =
          Array.isArray(data.entradas)
            ? data.entradas.map((item) => ({
                ...item,
                id: String(item.id),
                odd: String(item.odd ?? ""),
                stake: String(item.stake ?? ""),
                lucro: String(item.lucro ?? ""),
                sync_status: "sql",
              }))
            : [];

        setEntradas(entradasSQL);
        setDbStatus(`SQL conectado • ${entradasSQL.length} entradas`);

      } catch (error) {

        if (!ativo) return;

        console.warn(
          "SQL offline. Mantendo dados locais.",
          error
        );

        setDbStatus("SQL offline • usando dados locais");

      }
    }

    carregarEntradasSQL();

    return () => {
      ativo = false;
    };

  }, []);

  // ======================================================
  // DADOS.JSON
  // ======================================================

  useEffect(() => {

    async function carregarDadosJson() {

      try {

        const response =
          await fetch("/dados.json");

        const data =
          await response.json();

        setDadosBase({
          ligas: data.ligas || [],
          times: data.times || [],
          metodos: data.metodos || [],
          mercados: data.mercados || [],
        });

      } catch {

        console.log(
          "dados.json não carregado"
        );

      }
    }

    carregarDadosJson();

  }, []);

  // ======================================================
  // OPTIONS
  // ======================================================

  const ligasOptions = useMemo(() => {

    const local =
      entradas
        .map((item) => item.liga)
        .filter(Boolean);

    return [
      ...new Set([
        ...dadosBase.ligas,
        ...local,
      ]),
    ].sort((a, b) =>
      a.localeCompare(b)
    );

  }, [entradas, dadosBase.ligas]);

  const timesOptions = useMemo(() => {

    const local = [];

    entradas.forEach((item) => {

      if (item.casa)
        local.push(item.casa);

      if (item.visitante)
        local.push(item.visitante);

    });

    return [
      ...new Set([
        ...dadosBase.times,
        ...local,
      ]),
    ].sort((a, b) =>
      a.localeCompare(b)
    );

  }, [entradas, dadosBase.times]);

  const metodosOptions = useMemo(() => {

    const local =
      entradas
        .map((item) => item.metodo)
        .filter(Boolean);

    return [
      ...new Set([
        ...dadosBase.metodos,
        ...local,
      ]),
    ].sort((a, b) =>
      a.localeCompare(b)
    );

  }, [entradas, dadosBase.metodos]);

  const mercadosOptions = useMemo(() => {

    const local =
      entradas
        .map((item) => item.mercado)
        .filter(Boolean);

    return [
      ...new Set([
        ...dadosBase.mercados,
        ...local,
      ]),
    ].sort((a, b) =>
      a.localeCompare(b)
    );

  }, [entradas, dadosBase.mercados]);

  // ======================================================
  // FILTROS
  // ======================================================

  const filtradas = useMemo(() => {

    const termo =
      busca
        .trim()
        .toLowerCase();

    return entradas
      .filter((item) => {

        const d =
          parseDataLocalEntrada(
            item.data
          );

        if (
          mesFiltro !== "Todos" &&
          (!d ||
            d.getMonth() + 1 !==
              Number(mesFiltro))
        ) {
          return false;
        }

        if (
          entradaFilters.dataInicio &&
          String(item.data || "").slice(0, 10) <
            entradaFilters.dataInicio
        ) {
          return false;
        }

        if (
          entradaFilters.dataFim &&
          String(item.data || "").slice(0, 10) >
            entradaFilters.dataFim
        ) {
          return false;
        }

        if (
          entradaFilters.liga !== "Todas" &&
          item.liga !==
            entradaFilters.liga
        ) {
          return false;
        }

        if (
          entradaFilters.modo !== "Todos" &&
          item.modo !==
            entradaFilters.modo
        ) {
          return false;
        }

        if (
          entradaFilters.metodo !== "Todos" &&
          item.metodo !==
            entradaFilters.metodo
        ) {
          return false;
        }

        if (
          entradaFilters.resultado !== "Todos" &&
          item.resultado !==
            entradaFilters.resultado
        ) {
          return false;
        }

        if (!termo)
          return true;

        return [
          item.liga,
          item.casa,
          item.visitante,
          item.modo,
          item.metodo,
          item.mercado,
          item.resultado,
        ]
          .join(" ")
          .toLowerCase()
          .includes(termo);

      })

      .sort((a, b) => {

        const da =
          parseDataLocalEntrada(a.data)
            ?.getTime() || 0;

        const db =
          parseDataLocalEntrada(b.data)
            ?.getTime() || 0;

        return db - da;

      });

  }, [
    entradas,
    busca,
    mesFiltro,
    entradaFilters,
  ]);

  // ======================================================
  // RESUMO
  // ======================================================

  const resumo = useMemo(() => {

    const total =
      filtradas.length;

    const greens =
      filtradas.filter(
        (item) =>
          String(
            item.resultado
          ).toLowerCase() === "green"
      ).length;

    const reds =
      filtradas.filter(
        (item) =>
          String(
            item.resultado
          ).toLowerCase() === "red"
      ).length;

    const voids =
      filtradas.filter(
        (item) =>
          String(
            item.resultado
          ).toLowerCase() === "void"
      ).length;

    const lucro =
      filtradas.reduce(
        (acc, item) =>
          acc +
          entradaNumber(item.lucro),
        0
      );

    const stake =
      filtradas.reduce(
        (acc, item) =>
          acc +
          entradaNumber(item.stake),
        0
      );

    const winrate =
      total
        ? (greens / total) * 100
        : 0;

    const roi =
      stake
        ? (lucro / stake) * 100
        : 0;

    return {
      total,
      greens,
      reds,
      voids,
      lucro,
      stake,
      winrate,
      roi,
    };

  }, [filtradas]);


  // ======================================================
  // ACTIONS
  // ======================================================

  function updateForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function updateEntradaFilter(key, value) {
    setEntradaFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function abrirCalendario(event) {
    const input = event.currentTarget;

    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  }

  function limparFiltrosEntradas() {
    setMesFiltro("Todos");
    setBusca("");

    setEntradaFilters({
      dataInicio: "",
      dataFim: "",
      liga: "Todas",
      modo: "Todos",
      metodo: "Todos",
      resultado: "Todos",
    });
  }

  async function salvarEntradaSQL(entrada) {

    const response =
      await fetch(`${API_BASE}/entradas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entrada),
      });

    const data =
      await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Erro ao salvar entrada no SQL.");
    }

    return {
      ...data.entrada,
      id: String(data.entrada.id),
      odd: String(data.entrada.odd ?? entrada.odd ?? ""),
      stake: String(data.entrada.stake ?? entrada.stake ?? ""),
      lucro: String(data.entrada.lucro ?? entrada.lucro ?? ""),
      sync_status: "sql",
    };
  }

  async function adicionarEntrada() {
    if (!form.data) {
      alert("Informe a data da entrada.");
      return;
    }

    const nova = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ...form,
      odd: String(form.odd || ""),
      stake: String(form.stake || ""),
      lucro: String(form.lucro || ""),
      sync_status: "salvando",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setEntradas((prev) => [...prev, nova]);

    setForm({
      data: "",
      liga: "",
      casa: "",
      visitante: "",
      modo: "Back",
      metodo: "",
      mercado: "",
      odd: "",
      stake: "",
      lucro: "",
      resultado: "Green",
    });

    try {

      setDbStatus("Salvando entrada no SQL...");

      const salva =
        await salvarEntradaSQL(nova);

      setEntradas((prev) =>
        prev.map((item) =>
          item.id === nova.id ? salva : item
        )
      );

      setDbStatus("Entrada salva no SQL.");

    } catch (error) {

      console.warn(
        "Erro ao salvar entrada no SQL.",
        error
      );

      setEntradas((prev) =>
        prev.map((item) =>
          item.id === nova.id
            ? {
                ...item,
                sync_status: "pendente",
              }
            : item
        )
      );

      setDbStatus("SQL offline • entrada salva localmente");

    }
  }

  async function excluirEntrada(id) {
    const anterior = entradas;

    setEntradas((prev) =>
      prev.filter((item) => item.id !== id)
    );

    try {

      setDbStatus("Excluindo entrada do SQL...");

      const response =
        await fetch(`${API_BASE}/entradas/${id}`, {
          method: "DELETE",
        });

      const data =
        await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Erro ao excluir entrada.");
      }

      setDbStatus("Entrada excluída do SQL.");

    } catch (error) {

      console.warn(
        "Erro ao excluir entrada no SQL.",
        error
      );

      setEntradas(anterior);
      setDbStatus("Erro ao excluir no SQL • dados restaurados");

    }
  }

  async function limparTudo() {
    if (
      !window.confirm(
        "Tem certeza que deseja excluir TODAS as entradas?"
      )
    ) {
      return;
    }

    const anterior = entradas;

    setEntradas([]);
    localStorage.removeItem("entradas");

    try {

      setDbStatus("Excluindo entradas do SQL...");

      await Promise.all(
        anterior
          .filter((item) => item.id)
          .map((item) =>
            fetch(`${API_BASE}/entradas/${item.id}`, {
              method: "DELETE",
            })
          )
      );

      setDbStatus("Todas as entradas foram excluídas do SQL.");

    } catch (error) {

      console.warn(
        "Erro ao limpar entradas no SQL.",
        error
      );

      setEntradas(anterior);
      setDbStatus("Erro ao limpar SQL • dados restaurados");

    }
  }
  function normalizarEntradaImportada(row) {
    const dataRaw =
      row.Data ??
      row.data ??
      row.DATA ??
      row.Date ??
      row.date ??
      "";

    let data = "";

    if (typeof dataRaw === "number") {
      const parsed =
        XLSX.SSF.parse_date_code(dataRaw);

      if (parsed) {
        data = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
          parsed.d
        ).padStart(2, "0")}`;
      }
    } else {
      const rawText = String(dataRaw).trim();

      const parsedDate =
        parseDataLocalEntrada(rawText);

      if (parsedDate) {
        data = `${parsedDate.getFullYear()}-${String(
          parsedDate.getMonth() + 1
        ).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
      } else if (rawText.match(/^\d{4}-\d{2}-\d{2}/)) {
        data = rawText.slice(0, 10);
      }
    }

    const resultadoRaw = String(
      row.Resultado ??
        row.resultado ??
        row.RESULTADO ??
        "Green"
    ).trim();

    const resultado =
      resultadoRaw.toLowerCase() === "red"
        ? "Red"
        : resultadoRaw.toLowerCase() === "void"
        ? "Void"
        : "Green";

    const modoRaw = String(
      row.Modo ??
        row.modo ??
        row.MODO ??
        "Back"
    ).trim();

    const modo =
      modoRaw.toLowerCase() === "lay"
        ? "Lay"
        : "Back";

    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      data,
      liga: String(
        row.Liga ??
          row.liga ??
          row.LIGA ??
          ""
      ).trim(),
      casa: String(
        row.Casa ??
          row.casa ??
          row.Home ??
          row.HOME ??
          ""
      ).trim(),
      visitante: String(
        row.Visitante ??
          row.visitante ??
          row.Fora ??
          row.Away ??
          row.AWAY ??
          ""
      ).trim(),
      modo,
      metodo: String(
        row.Método ??
          row.Metodo ??
          row.metodo ??
          row.METODO ??
          ""
      ).trim(),
      mercado: String(
        row.Mercado ??
          row.mercado ??
          row.MERCADO ??
          ""
      ).trim(),
      odd: String(
        row.Odd ??
          row.odd ??
          row.ODD ??
          ""
      ).replace(",", "."),
      stake: String(
        row.Stake ??
          row.stake ??
          row.STAKE ??
          ""
      ).replace(",", "."),
      lucro: String(
        row.Lucro ??
          row.lucro ??
          row.LUCRO ??
          ""
      ).replace(",", "."),
      resultado,
      sync_status: "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async function importarExcel(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
        });

      const sheetName =
        workbook.SheetNames[0];

      const sheet =
        workbook.Sheets[sheetName];

      const rows =
        XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        });

      const novas =
        rows
          .map(normalizarEntradaImportada)
          .filter((item) => item.data);

      if (!novas.length) {
        alert(
          "Nenhuma entrada válida encontrada. Confira se a planilha tem uma coluna Data."
        );
        return;
      }

      setEntradas((prev) => [
        ...prev,
        ...novas.map((item) => ({
          ...item,
          sync_status: "salvando",
        })),
      ]);

      try {

        setDbStatus(`Importando ${novas.length} entradas para o SQL...`);

        const salvas =
          await Promise.all(
            novas.map((item) =>
              salvarEntradaSQL({
                ...item,
                sync_status: "salvando",
              })
            )
          );

        setEntradas((prev) => {
          const idsImportados =
            new Set(novas.map((item) => item.id));

          return [
            ...prev.filter((item) => !idsImportados.has(item.id)),
            ...salvas,
          ];
        });

        setDbStatus(`${salvas.length} entradas importadas no SQL.`);

        alert(
          `${salvas.length} entradas importadas e salvas no SQL.`
        );

      } catch (error) {

        console.warn(
          "Erro ao salvar importação no SQL.",
          error
        );

        setEntradas((prev) =>
          prev.map((item) =>
            novas.some((nova) => nova.id === item.id)
              ? {
                  ...item,
                  sync_status: "pendente",
                }
              : item
          )
        );

        setDbStatus("SQL offline • importação salva localmente");

        alert(
          `${novas.length} entradas importadas localmente. SQL não respondeu.`
        );

      }

    } catch {

      alert(
        "Erro ao importar planilha. Verifique o formato do arquivo."
      );

    } finally {

      event.target.value = "";

    }
  }

  function exportarExcel() {
    const exportData =
      filtradas.map((item, index) => ({
        Pic: index + 1,
        Data: formatarDataEntrada(item.data),
        Liga: item.liga,
        Casa: item.casa,
        Visitante: item.visitante,
        Modo: item.modo,
        Método: item.metodo,
        Mercado: item.mercado,
        Odd: entradaNumber(item.odd),
        Stake: entradaNumber(item.stake),
        Lucro: entradaNumber(item.lucro),
        Resultado: item.resultado,
      }));

    const ws =
      XLSX.utils.json_to_sheet(exportData);

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Entradas"
    );

    XLSX.writeFile(
      wb,
      `entradas_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <header className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
              JC TRADER CLÁSSICO
            </p>

            <h1 className="text-3xl font-black text-zinc-50">
              Entradas
            </h1>

            <p className="mt-1 text-sm text-zinc-400">
              Cadastro manual, importação Excel, filtros e sincronização com SQL.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={adicionarEntrada}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
            >
              <Plus size={16} />
              Adicionar
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-black text-white hover:bg-purple-700"
            >
              <Upload size={16} />
              Importar
            </button>

            <button
              onClick={exportarExcel}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              <Download size={16} />
              Exportar
            </button>

            <button
              onClick={limparTudo}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
            >
              <Trash2 size={16} />
              Limpar
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={importarExcel}
              className="hidden"
            />
          </div>
        </div>
      </header>

      {/* CARDS */}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard title="Entradas" value={resumo.total} icon={Database} />
        <StatCard title="Greens" value={resumo.greens} icon={ShieldCheck} tone="green" />
        <StatCard title="Reds" value={resumo.reds} icon={Target} tone="red" />
        <StatCard title="Voids" value={resumo.voids} icon={Activity} tone="yellow" />
        <StatCard title="Winrate" value={`${resumo.winrate.toFixed(1)}%`} icon={Trophy} />
        <StatCard title="Lucro" value={dinheiroBR(resumo.lucro)} icon={Wallet} tone={resumo.lucro >= 0 ? "green" : "red"} />
        <StatCard title="ROI" value={`${resumo.roi.toFixed(1)}%`} icon={BarChart3} tone={resumo.roi >= 0 ? "green" : "red"} />
      </section>

      {/* FORM */}

      <section className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
          <p className="text-xs font-semibold text-zinc-400">
            Banco local: {ligasOptions.length} ligas • {timesOptions.length} times
          </p>

          <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-300">
            <RefreshCcw size={13} />
            {dbStatus}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <EntradaInput label="Data">
            <input
              type="date"
              value={form.data}
              onClick={abrirCalendario}
              onFocus={abrirCalendario}
              onChange={(e) => updateForm("data", e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Liga">
            <input
              list="entradas-ligas"
              value={form.liga}
              onChange={(e) => updateForm("liga", e.target.value)}
              placeholder="Liga"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Casa">
            <input
              list="entradas-times"
              value={form.casa}
              onChange={(e) => updateForm("casa", e.target.value)}
              placeholder="Casa"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Visitante">
            <input
              list="entradas-times"
              value={form.visitante}
              onChange={(e) => updateForm("visitante", e.target.value)}
              placeholder="Visitante"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Modo">
            <select
              value={form.modo}
              onChange={(e) => updateForm("modo", e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            >
              <option>Back</option>
              <option>Lay</option>
            </select>
          </EntradaInput>

          <EntradaInput label="Resultado">
            <select
              value={form.resultado}
              onChange={(e) => updateForm("resultado", e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            >
              <option>Green</option>
              <option>Red</option>
              <option>Void</option>
            </select>
          </EntradaInput>

          <EntradaInput label="Método">
            <input
              list="entradas-metodos"
              value={form.metodo}
              onChange={(e) => updateForm("metodo", e.target.value)}
              placeholder="Método"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Mercado">
            <input
              list="entradas-mercados"
              value={form.mercado}
              onChange={(e) => updateForm("mercado", e.target.value)}
              placeholder="Mercado"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Odd">
            <input
              type="number"
              value={form.odd}
              onChange={(e) => updateForm("odd", e.target.value)}
              placeholder="Odd"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Stake">
            <input
              type="number"
              value={form.stake}
              onChange={(e) => updateForm("stake", e.target.value)}
              placeholder="Stake"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Lucro">
            <input
              type="number"
              value={form.lucro}
              onChange={(e) => updateForm("lucro", e.target.value)}
              placeholder="Lucro"
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            />
          </EntradaInput>

          <EntradaInput label="Mês">
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
            >
              {MESES_ENTRADAS.map((item) => (
                <option key={item.v} value={item.v}>
                  {item.l}
                </option>
              ))}
            </select>
          </EntradaInput>
        </div>

        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-black text-zinc-100">
                Filtros da tabela
              </h2>
              <p className="text-xs text-zinc-500">
                Filtre sem alterar os dados cadastrados.
              </p>
            </div>

            <button
              onClick={limparFiltrosEntradas}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-black text-zinc-300 hover:bg-zinc-900"
            >
              Limpar filtros
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <EntradaInput label="Data inicial">
              <input
                type="date"
                value={entradaFilters.dataInicio}
                onClick={abrirCalendario}
                onFocus={abrirCalendario}
                onChange={(e) => updateEntradaFilter("dataInicio", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              />
            </EntradaInput>

            <EntradaInput label="Data final">
              <input
                type="date"
                value={entradaFilters.dataFim}
                onClick={abrirCalendario}
                onFocus={abrirCalendario}
                onChange={(e) => updateEntradaFilter("dataFim", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              />
            </EntradaInput>

            <EntradaInput label="Liga">
              <select
                value={entradaFilters.liga}
                onChange={(e) => updateEntradaFilter("liga", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              >
                <option>Todas</option>
                {ligasOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </EntradaInput>

            <EntradaInput label="Modo">
              <select
                value={entradaFilters.modo}
                onChange={(e) => updateEntradaFilter("modo", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              >
                <option>Todos</option>
                <option>Back</option>
                <option>Lay</option>
              </select>
            </EntradaInput>

            <EntradaInput label="Método">
              <select
                value={entradaFilters.metodo}
                onChange={(e) => updateEntradaFilter("metodo", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              >
                <option>Todos</option>
                {metodosOptions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </EntradaInput>

            <EntradaInput label="Resultado">
              <select
                value={entradaFilters.resultado}
                onChange={(e) => updateEntradaFilter("resultado", e.target.value)}
                className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
              >
                <option>Todos</option>
                <option>Green</option>
                <option>Red</option>
                <option>Void</option>
              </select>
            </EntradaInput>
          </div>
        </div>

        <div className="mt-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por liga, time, método, mercado ou resultado..."
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-500"
          />
        </div>

        <datalist id="entradas-ligas">
          {ligasOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <datalist id="entradas-times">
          {timesOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <datalist id="entradas-metodos">
          {metodosOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>

        <datalist id="entradas-mercados">
          {mercadosOptions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </section>

      {/* TABLE */}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b0b] shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h2 className="text-lg font-black text-zinc-50">
              Tabela de Entradas
            </h2>
            <p className="text-sm text-zinc-500">
              Exibindo {filtradas.length} registros
            </p>
          </div>

          <div className="text-xs font-bold text-emerald-300">
            {dbStatus}
          </div>
        </div>

        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1550px] border-collapse text-center text-sm">
            <thead className="sticky top-0 z-10 bg-[#1c1c1c] text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3">Pic</th>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3 text-right">Casa</th>
                <th className="px-3 py-3">x</th>
                <th className="px-3 py-3 text-left">Visitante</th>
                <th className="px-3 py-3">Modo</th>
                <th className="px-3 py-3">Método</th>
                <th className="px-3 py-3">Mercado</th>
                <th className="px-3 py-3">Odd</th>
                <th className="px-3 py-3">Stake</th>
                <th className="px-3 py-3">Lucro</th>
                <th className="px-3 py-3">%</th>
                <th className="px-3 py-3">Resultado</th>
                <th className="px-3 py-3">Sync</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>

            <tbody>
              {filtradas.map((item, index) => {
                const stake = entradaNumber(item.stake);
                const lucro = entradaNumber(item.lucro);
                const perc = stake ? Math.round((lucro / stake) * 100) : 0;
                const resultLower = String(item.resultado || "").toLowerCase();

                return (
                  <tr
                    key={item.id || index}
                    className="border-b border-zinc-800 hover:bg-emerald-500/10"
                  >
                    <td className="px-3 py-2 font-black text-zinc-300">
                      {index + 1}
                    </td>

                    <td className="px-3 py-2 font-semibold text-zinc-200">
                      {formatarDataEntrada(item.data)}
                    </td>

                    <td className="px-3 py-2 font-semibold text-blue-300">
                      <div className="flex items-center text-left gap-2">
                        <LeagueLogo name={item.liga} />
                        <span>{item.liga || "—"}</span>
                      </div>
                    </td>

                    <td className="px-3 py-2 text-right font-bold text-zinc-50">
                      {item.casa || "—"}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <TeamLogo name={item.casa} />
                        <span className="text-zinc-500">x</span>
                        <TeamLogo name={item.visitante} />
                      </div>
                    </td>

                    <td className="px-3 py-2 text-left font-bold text-zinc-50">
                      {item.visitante || "—"}
                    </td>

                    <td className={`px-3 py-2 font-black ${item.modo === "Back" ? "text-blue-300" : "text-pink-300"}`}>
                      {item.modo || "—"}
                    </td>

                    <td className="px-3 py-2 font-bold text-emerald-300">
                      {item.metodo || "—"}
                    </td>

                    <td className="px-3 py-2 font-bold text-zinc-300">
                      {item.mercado || "—"}
                    </td>

                    <td className="px-3 py-2 font-bold text-yellow-200">
                      {item.odd || "—"}
                    </td>

                    <td className="px-3 py-2 font-bold text-zinc-300">
                      {dinheiroBR(stake)}
                    </td>

                    <td className={`px-3 py-2 font-black ${lucro > 0 ? "text-emerald-300" : lucro < 0 ? "text-red-300" : "text-zinc-400"}`}>
                      {lucro > 0 ? "+" : lucro < 0 ? "-" : ""}
                      {dinheiroBR(Math.abs(lucro))}
                    </td>

                    <td className={`px-3 py-2 font-black ${perc > 0 ? "text-emerald-300" : perc < 0 ? "text-red-300" : "text-zinc-400"}`}>
                      {perc}%
                    </td>

                    <td className={`px-3 py-2 font-black ${resultLower === "green" ? "text-emerald-300" : resultLower === "red" ? "text-red-300" : "text-yellow-300"}`}>
                      {item.resultado || "—"}
                    </td>

                    <td className="px-3 py-2 text-xs font-bold text-zinc-500">
                      {item.sync_status || "local"}
                    </td>

                    <td className="px-3 py-2">
                      <button
                        onClick={() => excluirEntrada(item.id)}
                        className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-200 hover:bg-red-500/20"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filtradas.length && (
                <tr>
                  <td
                    colSpan="16"
                    className="px-4 py-10 text-center text-zinc-500"
                  >
                    Nenhuma entrada cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}