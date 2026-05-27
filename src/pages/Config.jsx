import { useState } from "react";
import {
  RefreshCcw,
  Database,
  Trash2,
  Save,
  RotateCcw,
} from "lucide-react";

const API_BASE =
  import.meta.env.DEV
    ? "http://localhost:3001/api"
    : "https://jc-trader-api.onrender.com/api";

export default function Config() {

  // =========================
  // FOOTSTATS IMPORT
  // =========================

  const [offset, setOffset] = useState(
    localStorage.getItem("jc_import_offset") || "139000"
  );

  const [limit, setLimit] = useState(
    localStorage.getItem("jc_import_limit") || "2000"
  );

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function importarLote() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `${API_BASE}/admin/import-footstats-test?offset=${offset}&limit=${limit}`
      );

      const data = await response.json();

      setResult(data);

      const nextOffset =
        Number(offset) + Number(limit);

      if (data?.ok) {

        setOffset(String(nextOffset));

        localStorage.setItem(
          "jc_import_offset",
          String(nextOffset)
        );

        localStorage.setItem(
          "jc_import_limit",
          String(limit)
        );
      }

    } catch (error) {

      setResult({
        ok: false,
        error: error.message,
      });

    } finally {

      setLoading(false);

    }
  }

  // =========================
  // CONFIGS ANTIGAS
  // =========================

  const [apiUrl, setApiUrl] = useState(
    localStorage.getItem("apiUrl") || ""
  );

  function salvarApiUrl() {

    localStorage.setItem(
      "apiUrl",
      apiUrl
    );

    alert("API salva com sucesso!");
  }

  function limparEntradas() {

    const ok = window.confirm(
      "Deseja realmente limpar todas as entradas?"
    );

    if (!ok) return;

    localStorage.removeItem("entradas");

    alert("Entradas removidas.");
  }

  function limparBanco() {

    const ok = window.confirm(
      "Deseja realmente limpar banco?"
    );

    if (!ok) return;

    localStorage.removeItem("banco");

    alert("Banco removido.");
  }

  function resetarTudo() {

    const ok = window.confirm(
      "Deseja resetar TODOS os dados?"
    );

    if (!ok) return;

    localStorage.clear();

    alert("Tudo resetado.");

    window.location.reload();
  }


  // =========================
  // LOGOS SQL
  // =========================

  const [logoNome, setLogoNome] = useState("");
  const [logoTipo, setLogoTipo] = useState("time");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [logos, setLogos] = useState([]);
  const [logoStatus, setLogoStatus] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);

  async function carregarLogos() {
    try {
      setLogoLoading(true);

      const response = await fetch(`${API_BASE}/logos`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Erro ao carregar logos.");
      }

      setLogos(data.logos || []);
    } catch (error) {
      setLogoStatus(`Erro ao carregar logos: ${error.message}`);
    } finally {
      setLogoLoading(false);
    }
  }

  function selecionarLogo(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setLogoBase64(reader.result);
      setLogoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  }

  async function salvarLogo() {
    if (!logoNome.trim()) {
      setLogoStatus("Informe o nome do time ou da liga.");
      return;
    }

    if (!logoBase64) {
      setLogoStatus("Selecione uma imagem para salvar.");
      return;
    }

    try {
      setLogoLoading(true);
      setLogoStatus("Salvando logo no SQL...");

      const response = await fetch(`${API_BASE}/logos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: logoNome.trim(),
          tipo: logoTipo,
          imagem_base64: logoBase64,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Erro ao salvar logo.");
      }

      setLogoStatus("Logo salva com sucesso no banco.");
      setLogoNome("");
      setLogoBase64("");
      setLogoPreview("");

      await carregarLogos();
    } catch (error) {
      setLogoStatus(`Erro: ${error.message}`);
    } finally {
      setLogoLoading(false);
    }
  }

  async function excluirLogo(id) {
    const ok = window.confirm("Deseja excluir esta logo do banco?");

    if (!ok) return;

    try {
      setLogoLoading(true);

      const response = await fetch(`${API_BASE}/logos/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || "Erro ao excluir logo.");
      }

      setLogoStatus("Logo excluída com sucesso.");
      await carregarLogos();
    } catch (error) {
      setLogoStatus(`Erro: ${error.message}`);
    } finally {
      setLogoLoading(false);
    }
  }

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <div className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">

        <p className="text-xs font-black tracking-[4px] text-cyan-300">
          JC TRADER
        </p>

        <h1 className="text-3xl font-black">
          Config
        </h1>

        <p className="text-sm text-zinc-500">
          Configurações gerais do sistema.
        </p>

      </div>

      {/* IMPORT FOOTSTATS */}

      <section className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">

        <div className="mb-4 flex items-center gap-2">

          <Database
            className="text-cyan-300"
            size={20}
          />

          <h2 className="text-xl font-black">
            Importar FootStats
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <label className="text-sm font-bold text-zinc-400">

            Offset

            <input
              value={offset}
              onChange={(e) =>
                setOffset(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
            />

          </label>

          <label className="text-sm font-bold text-zinc-400">

            Limit

            <input
              value={limit}
              onChange={(e) =>
                setLimit(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
            />

          </label>

          <button
            onClick={importarLote}
            disabled={loading}
            className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-black disabled:opacity-50"
          >

            <RefreshCcw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Importando..."
              : "Importar próximo lote"}

          </button>

        </div>

        {result && (

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4 text-sm">

            <pre className="overflow-auto text-zinc-300">
              {JSON.stringify(result, null, 2)}
            </pre>

          </div>

        )}

      </section>


      {/* LOGOS SQL */}

      <section className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">

        <div className="mb-4 flex items-center gap-2">

          <Database
            className="text-purple-300"
            size={20}
          />

          <h2 className="text-xl font-black">
            Logos de Times e Ligas
          </h2>

        </div>

        <p className="mb-4 text-sm text-zinc-500">
          Envie uma imagem, selecione se é time ou liga e salve no banco SQL.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">

          <label className="text-sm font-bold text-zinc-400">

            Nome

            <input
              value={logoNome}
              onChange={(e) =>
                setLogoNome(e.target.value)
              }
              placeholder="Ex: Palmeiras ou Brazil Serie A"
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
            />

          </label>

          <label className="text-sm font-bold text-zinc-400">

            Tipo

            <select
              value={logoTipo}
              onChange={(e) =>
                setLogoTipo(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
            >
              <option value="time">Time</option>
              <option value="liga">Liga</option>
            </select>

          </label>

          <label className="text-sm font-bold text-zinc-400">

            Imagem

            <input
              type="file"
              accept="image/*"
              onChange={selecionarLogo}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
            />

          </label>

          <div className="flex items-end">

            <button
              onClick={salvarLogo}
              disabled={logoLoading}
              className="w-full rounded-xl bg-purple-600 px-4 py-2 font-black disabled:opacity-50"
            >
              {logoLoading
                ? "Salvando..."
                : "Salvar Logo"}
            </button>

          </div>

        </div>

        {logoPreview && (

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-black p-3">

            <img
              src={logoPreview}
              alt="Preview"
              className="h-16 w-16 rounded-xl object-contain"
            />

            <div>
              <p className="text-sm font-black text-white">
                Preview
              </p>

              <p className="text-xs text-zinc-500">
                {logoTipo === "liga"
                  ? "Será salva como liga"
                  : "Será salva como time"}
              </p>
            </div>

          </div>

        )}

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

          <button
            onClick={carregarLogos}
            disabled={logoLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 font-black hover:bg-zinc-700 disabled:opacity-50"
          >

            <RefreshCcw
              size={16}
              className={
                logoLoading
                  ? "animate-spin"
                  : ""
              }
            />

            Carregar logos salvos

          </button>

          {logoStatus && (
            <p className="text-sm font-bold text-zinc-300">
              {logoStatus}
            </p>
          )}

        </div>

        {logos.length > 0 && (

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">

            {logos.map((logo) => (

              <div
                key={logo.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-black p-3"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <img
                    src={logo.imagem_base64}
                    alt={logo.nome}
                    className="h-12 w-12 rounded-lg object-contain"
                  />

                  <div className="min-w-0">

                    <p className="truncate text-sm font-black text-white">
                      {logo.nome}
                    </p>

                    <p className="text-xs uppercase tracking-[2px] text-zinc-500">
                      {logo.tipo}
                    </p>

                  </div>

                </div>

                <button
                  onClick={() => excluirLogo(logo.id)}
                  className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black hover:bg-red-600"
                >
                  Excluir
                </button>

              </div>

            ))}

          </div>

        )}

      </section>


      {/* API URL */}

      <section className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">

        <div className="mb-4 flex items-center gap-2">

          <Save
            className="text-green-300"
            size={20}
          />

          <h2 className="text-xl font-black">
            API URL
          </h2>

        </div>

        <div className="flex flex-col gap-3 md:flex-row">

          <input
            value={apiUrl}
            onChange={(e) =>
              setApiUrl(e.target.value)
            }
            placeholder="https://..."
            className="flex-1 rounded-xl border border-zinc-700 bg-black px-3 py-2 text-white"
          />

          <button
            onClick={salvarApiUrl}
            className="rounded-xl bg-green-600 px-4 py-2 font-black"
          >
            Salvar
          </button>

        </div>

      </section>

      {/* RESET */}

      <section className="rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">

        <div className="mb-4 flex items-center gap-2">

          <RotateCcw
            className="text-orange-300"
            size={20}
          />

          <h2 className="text-xl font-black">
            Reset
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          <button
            onClick={limparEntradas}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 font-black hover:bg-zinc-700"
          >

            <Trash2 size={18} />

            Limpar Entradas

          </button>

          <button
            onClick={limparBanco}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 font-black hover:bg-zinc-700"
          >

            <Trash2 size={18} />

            Limpar Banco

          </button>

          <button
            onClick={resetarTudo}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-3 font-black hover:bg-red-600"
          >

            <RotateCcw size={18} />

            Resetar Tudo

          </button>

        </div>

      </section>

    </div>
  );
}