import React, { useMemo, useState } from "react";
import {
  Activity,
  Calculator,
  Copy,
  HelpCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";

/* =========================================================
   JC TRADER - HELP / CALCULADORAS
   Hedge, Freebet, Comissão, Dutching, +EV e Split Stake
========================================================= */

function n(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const text = String(value ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return n(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function pct(value) {
  return `${n(value).toFixed(2)}%`;
}

function copyText(text) {
  try {
    navigator.clipboard.writeText(text);
    alert("Resultado copiado.");
  } catch {
    alert("Não foi possível copiar automaticamente.");
  }
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "number",
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-zinc-400">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 outline-none transition focus:border-sky-500"
      />
    </label>
  );
}

function ResultCard({
  title,
  value,
  icon: Icon,
  tone = "blue",
}) {
  const tones = {
    green: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-400/30 bg-red-500/10 text-red-300",
    blue: "border-sky-400/30 bg-sky-500/10 text-sky-300",
    yellow: "border-yellow-400/30 bg-yellow-500/10 text-yellow-300",
    violet: "border-violet-400/30 bg-violet-500/10 text-violet-300",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-80">
            {title}
          </p>
          <p className="mt-2 text-xl font-black">{value}</p>
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

function HelpCard({
  title,
  subtitle,
  icon: Icon,
  children,
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#111111] p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-zinc-50">
            {Icon && <Icon className="h-5 w-5 text-sky-400" />}
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function ModeTabs({
  value,
  onChange,
  options,
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {options.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${
            value === item.value
              ? "bg-sky-500 text-white"
              : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function HedgeCalculator() {
  const [form, setForm] = useState({
    modo: "back-to-lay",
    stakeBack: "",
    oddBack: "",
    oddLay: "",
    stakeLay: "",
    oddLayEntrada: "",
    oddBackSaida: "",
  });

  const result = useMemo(() => {
    if (form.modo === "back-to-lay") {
      const stakeBack = n(form.stakeBack);
      const oddBack = n(form.oddBack);
      const oddLay = n(form.oddLay);

      const stakeLay = stakeBack && oddBack && oddLay
        ? (stakeBack * oddBack) / oddLay
        : 0;

      const lucroSeBack = stakeBack * (oddBack - 1) - stakeLay * (oddLay - 1);
      const lucroSeLay = stakeLay - stakeBack;
      const lucroMedio = (lucroSeBack + lucroSeLay) / 2;

      return {
        stakeSaida: stakeLay,
        lucroSeBack,
        lucroSeLay,
        lucroMedio,
      };
    }

    const stakeLay = n(form.stakeLay);
    const oddLayEntrada = n(form.oddLayEntrada);
    const oddBackSaida = n(form.oddBackSaida);

    const stakeBack = stakeLay && oddLayEntrada && oddBackSaida
      ? (stakeLay * oddLayEntrada) / oddBackSaida
      : 0;

    const lucroSeBack = stakeLay * (oddLayEntrada - 1) - stakeBack * (oddBackSaida - 1);
    const lucroSeLay = stakeBack - stakeLay;
    const lucroMedio = (lucroSeBack + lucroSeLay) / 2;

    return {
      stakeSaida: stakeBack,
      lucroSeBack,
      lucroSeLay,
      lucroMedio,
    };
  }, [form]);

  const resumo = `Hedge ${form.modo === "back-to-lay" ? "Back → Lay" : "Lay → Back"} | Stake saída: ${money(result.stakeSaida)} | Lucro médio: ${money(result.lucroMedio)}`;

  return (
    <HelpCard
      title="Hedge"
      subtitle="Calcula a saída ideal entre Back → Lay ou Lay → Back."
      icon={ShieldCheck}
    >
      <ModeTabs
        value={form.modo}
        onChange={(modo) => setForm({ ...form, modo })}
        options={[
          { value: "back-to-lay", label: "Back → Lay" },
          { value: "lay-to-back", label: "Lay → Back" },
        ]}
      />

      {form.modo === "back-to-lay" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="Stake Back" value={form.stakeBack} onChange={(v) => setForm({ ...form, stakeBack: v })} />
          <Input label="Odd Back" value={form.oddBack} onChange={(v) => setForm({ ...form, oddBack: v })} />
          <Input label="Odd Lay Saída" value={form.oddLay} onChange={(v) => setForm({ ...form, oddLay: v })} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input label="Stake Lay" value={form.stakeLay} onChange={(v) => setForm({ ...form, stakeLay: v })} />
          <Input label="Odd Lay Entrada" value={form.oddLayEntrada} onChange={(v) => setForm({ ...form, oddLayEntrada: v })} />
          <Input label="Odd Back Saída" value={form.oddBackSaida} onChange={(v) => setForm({ ...form, oddBackSaida: v })} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <ResultCard
          title="Stake saída"
          value={money(result.stakeSaida)}
          icon={Activity}
          tone="blue"
        />

        <ResultCard
          title="Lucro Back vence"
          value={money(result.lucroSeBack)}
          icon={Wallet}
          tone={result.lucroSeBack >= 0 ? "green" : "red"}
        />

        <ResultCard
          title="Lucro Lay vence"
          value={money(result.lucroSeLay)}
          icon={Wallet}
          tone={result.lucroSeLay >= 0 ? "green" : "red"}
        />

        <ResultCard
          title="Lucro médio"
          value={money(result.lucroMedio)}
          icon={Target}
          tone={result.lucroMedio >= 0 ? "green" : "red"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyText(resumo)}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-zinc-900"
        >
          <Copy className="mr-2 inline h-4 w-4" />
          Copiar resultado
        </button>

        <button
          type="button"
          onClick={() =>
            setForm({
              modo: "back-to-lay",
              stakeBack: "",
              oddBack: "",
              oddLay: "",
              stakeLay: "",
              oddLayEntrada: "",
              oddBackSaida: "",
            })
          }
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-zinc-900"
        >
          <RefreshCcw className="mr-2 inline h-4 w-4" />
          Limpar
        </button>
      </div>
    </HelpCard>
  );
}

function FreebetCalculator() {
  const [form, setForm] = useState({
    stake: "",
    oddBack: "",
    oddLay: "",
    comissao: "0",
  });

  const result = useMemo(() => {
    const stake = n(form.stake);
    const oddBack = n(form.oddBack);
    const oddLay = n(form.oddLay);
    const comissao = n(form.comissao) / 100;

    const layStake = stake && oddBack && oddLay
      ? (stake * (oddBack - 1)) / (oddLay - comissao)
      : 0;

    const responsabilidade = layStake * Math.max(0, oddLay - 1);
    const lucroApostaBack = stake * (oddBack - 1) - responsabilidade;
    const lucroApostaLay = layStake * (1 - comissao);

    return {
      layStake,
      responsabilidade,
      lucroApostaBack,
      lucroApostaLay,
      lucroMedio: (lucroApostaBack + lucroApostaLay) / 2,
    };
  }, [form]);

  const resumo = `Freebet | Lay stake: ${money(result.layStake)} | Responsabilidade: ${money(result.responsabilidade)} | Lucro médio: ${money(result.lucroMedio)}`;

  return (
    <HelpCard
      title="Freebet"
      subtitle="Calcula a saída Lay para converter freebet em lucro."
      icon={Target}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input label="Valor Freebet" value={form.stake} onChange={(v) => setForm({ ...form, stake: v })} />
        <Input label="Odd Back" value={form.oddBack} onChange={(v) => setForm({ ...form, oddBack: v })} />
        <Input label="Odd Lay" value={form.oddLay} onChange={(v) => setForm({ ...form, oddLay: v })} />
        <Input label="Comissão (%)" value={form.comissao} onChange={(v) => setForm({ ...form, comissao: v })} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <ResultCard title="Lay Stake" value={money(result.layStake)} icon={Activity} tone="blue" />
        <ResultCard title="Responsabilidade" value={money(result.responsabilidade)} icon={ShieldCheck} tone="yellow" />
        <ResultCard title="Lucro Back" value={money(result.lucroApostaBack)} icon={Wallet} tone={result.lucroApostaBack >= 0 ? "green" : "red"} />
        <ResultCard title="Lucro Lay" value={money(result.lucroApostaLay)} icon={Wallet} tone={result.lucroApostaLay >= 0 ? "green" : "red"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copyText(resumo)}
          className="rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-zinc-900"
        >
          <Copy className="mr-2 inline h-4 w-4" />
          Copiar resultado
        </button>
      </div>
    </HelpCard>
  );
}


function DutchingCalculator() {
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState(["2.00", "3.00"]);

  const result = useMemo(() => {
    const stakeTotal = n(stake);
    const oddsValidas = odds.map(n).filter((odd) => odd > 1);

    const somaInversa = oddsValidas.reduce((acc, odd) => acc + 1 / odd, 0);

    const distribuicao = oddsValidas.map((odd) => {
      const valor = somaInversa ? stakeTotal * (1 / odd) / somaInversa : 0;
      const retorno = valor * odd;
      const lucro = retorno - stakeTotal;

      return {
        odd,
        valor,
        retorno,
        lucro,
      };
    });

    const retornoMedio = distribuicao.length
      ? distribuicao.reduce((acc, item) => acc + item.retorno, 0) /
        distribuicao.length
      : 0;

    const lucroMedio = retornoMedio - stakeTotal;
    const roi = stakeTotal ? (lucroMedio / stakeTotal) * 100 : 0;

    return {
      distribuicao,
      retornoMedio,
      lucroMedio,
      roi,
    };
  }, [stake, odds]);

  function adicionarOdd() {
    setOdds([...odds, ""]);
  }

  function removerOdd(index) {
    setOdds(odds.filter((_, i) => i !== index));
  }

  function atualizarOdd(index, value) {
    const novas = [...odds];
    novas[index] = value;
    setOdds(novas);
  }

  const resumo = `Dutching | Stake total: ${money(stake)} | Lucro médio: ${money(
    result.lucroMedio
  )} | ROI: ${pct(result.roi)}`;

  return (
    <HelpCard
      title="Dutching"
      subtitle="Distribui stake entre seleções para equalizar retorno."
      icon={Calculator}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input
          label="Stake Total"
          value={stake}
          onChange={setStake}
        />

        <button
          type="button"
          onClick={adicionarOdd}
          className="mt-5 rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-500"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Adicionar Odd
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        {odds.map((odd, index) => (
          <div key={index} className="flex gap-2">
            <Input
              label={`Odd ${index + 1}`}
              value={odd}
              onChange={(v) => atualizarOdd(index, v)}
            />

            {odds.length > 2 && (
              <button
                type="button"
                onClick={() => removerOdd(index)}
                className="mt-5 rounded-xl border border-red-900/50 bg-red-950/40 px-3 text-red-300 hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <ResultCard
          title="Retorno médio"
          value={money(result.retornoMedio)}
          icon={Wallet}
          tone="blue"
        />

        <ResultCard
          title="Lucro médio"
          value={money(result.lucroMedio)}
          icon={Target}
          tone={result.lucroMedio >= 0 ? "green" : "red"}
        />

        <ResultCard
          title="ROI"
          value={pct(result.roi)}
          icon={Activity}
          tone={result.roi >= 0 ? "green" : "red"}
        />
      </div>

      <div className="mt-4 overflow-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-3 py-3 text-left">Seleção</th>
              <th className="px-3 py-3">Odd</th>
              <th className="px-3 py-3">Stake</th>
              <th className="px-3 py-3">Retorno</th>
              <th className="px-3 py-3">Lucro</th>
            </tr>
          </thead>

          <tbody>
            {result.distribuicao.map((item, index) => (
              <tr key={index} className="border-t border-zinc-800 text-center">
                <td className="px-3 py-3 text-left font-bold text-zinc-300">
                  Seleção {index + 1}
                </td>
                <td className="px-3 py-3 text-zinc-300">{item.odd.toFixed(2)}</td>
                <td className="px-3 py-3 text-sky-300">{money(item.valor)}</td>
                <td className="px-3 py-3 text-zinc-300">{money(item.retorno)}</td>
                <td
                  className={`px-3 py-3 font-black ${
                    item.lucro >= 0 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {money(item.lucro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => copyText(resumo)}
        className="mt-4 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-black text-zinc-200 hover:bg-zinc-900"
      >
        <Copy className="mr-2 inline h-4 w-4" />
        Copiar resultado
      </button>
    </HelpCard>
  );
}


function CommissionCalculator() {
  const [form, setForm] = useState({
    lucroBruto: "",
    comissao: "0",
  });

  const result = useMemo(() => {
    const bruto = n(form.lucroBruto);
    const taxa = n(form.comissao) / 100;
    const desconto = bruto * taxa;
    const liquido = bruto - desconto;

    return {
      bruto,
      desconto,
      liquido,
    };
  }, [form]);

  return (
    <HelpCard
      title="Comissão"
      subtitle="Calcula lucro líquido após comissão da exchange."
      icon={Wallet}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input
          label="Lucro Bruto"
          value={form.lucroBruto}
          onChange={(v) => setForm({ ...form, lucroBruto: v })}
        />

        <Input
          label="Comissão (%)"
          value={form.comissao}
          onChange={(v) => setForm({ ...form, comissao: v })}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <ResultCard title="Lucro bruto" value={money(result.bruto)} icon={Wallet} tone="blue" />
        <ResultCard title="Comissão" value={money(result.desconto)} icon={Activity} tone="yellow" />
        <ResultCard title="Lucro líquido" value={money(result.liquido)} icon={ShieldCheck} tone={result.liquido >= 0 ? "green" : "red"} />
      </div>
    </HelpCard>
  );
}

function EVCalculator() {
  const [form, setForm] = useState({
    stake: "",
    odd: "",
    prob: "",
  });

  const result = useMemo(() => {
    const stake = n(form.stake);
    const odd = n(form.odd);
    const prob = n(form.prob) / 100;

    const ganho = stake * Math.max(0, odd - 1);
    const ev = prob * ganho - (1 - prob) * stake;
    const roi = stake ? (ev / stake) * 100 : 0;

    return {
      ev,
      roi,
      ganho,
    };
  }, [form]);

  return (
    <HelpCard
      title="Valor Esperado (+EV)"
      subtitle="Calcula se a entrada tem valor esperado positivo."
      icon={Activity}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label="Stake" value={form.stake} onChange={(v) => setForm({ ...form, stake: v })} />
        <Input label="Odd" value={form.odd} onChange={(v) => setForm({ ...form, odd: v })} />
        <Input label="Probabilidade (%)" value={form.prob} onChange={(v) => setForm({ ...form, prob: v })} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <ResultCard title="Ganho Potencial" value={money(result.ganho)} icon={Wallet} tone="blue" />
        <ResultCard title="Valor Esperado" value={money(result.ev)} icon={Target} tone={result.ev >= 0 ? "green" : "red"} />
        <ResultCard title="EV %" value={pct(result.roi)} icon={Activity} tone={result.roi >= 0 ? "green" : "red"} />
      </div>
    </HelpCard>
  );
}

function SplitStakeCalculator() {
  const [form, setForm] = useState({
    stake: "",
    oddStop: "",
    oddTake: "",
  });

  const result = useMemo(() => {
    const stake = n(form.stake);
    const oddStop = n(form.oddStop);
    const oddTake = n(form.oddTake);

    const apostaStop = stake && oddStop ? stake / oddStop : 0;
    const apostaTake = Math.max(0, stake - apostaStop);
    const retornoTake = apostaTake * oddTake;
    const lucroTake = retornoTake - stake;
    const roiTake = stake ? (lucroTake / stake) * 100 : 0;

    return {
      apostaStop,
      apostaTake,
      retornoTake,
      lucroTake,
      roiTake,
    };
  }, [form]);

  return (
    <HelpCard
      title="Split Stake"
      subtitle="Divide stake entre proteção e alvo de lucro."
      icon={Target}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label="Stake Total" value={form.stake} onChange={(v) => setForm({ ...form, stake: v })} />
        <Input label="Odd Stop" value={form.oddStop} onChange={(v) => setForm({ ...form, oddStop: v })} />
        <Input label="Odd Take" value={form.oddTake} onChange={(v) => setForm({ ...form, oddTake: v })} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <ResultCard title="Aposta Stop" value={money(result.apostaStop)} icon={ShieldCheck} tone="yellow" />
        <ResultCard title="Aposta Take" value={money(result.apostaTake)} icon={Target} tone="blue" />
        <ResultCard title="Lucro Take" value={money(result.lucroTake)} icon={Wallet} tone={result.lucroTake >= 0 ? "green" : "red"} />
        <ResultCard title="ROI Take" value={pct(result.roiTake)} icon={Activity} tone={result.roiTake >= 0 ? "green" : "red"} />
      </div>
    </HelpCard>
  );
}

export default function Help() {
  const [aba, setAba] = useState("hedge");

  const abas = [
    { id: "hedge", label: "Hedge" },
    { id: "freebet", label: "Freebet" },
    { id: "dutching", label: "Dutching" },
    { id: "comissao", label: "Comissão" },
    { id: "ev", label: "+EV" },
    { id: "split", label: "Split Stake" },
  ];

  return (
    <div className="space-y-4 text-zinc-100">
      <header className="rounded-2xl border border-zinc-800 bg-[#0f0f0f] p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-400">
          JC Trader clássico
        </p>

        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-50">
          <HelpCircle className="h-7 w-7 text-purple-400" />
          Help
        </h1>

        <p className="mt-1 text-sm text-zinc-400">
          Calculadoras operacionais para hedge, freebet, dutching, comissão,
          valor esperado e split stake.
        </p>
      </header>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-[#111111] p-3">
        {abas.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setAba(item.id)}
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${
              aba === item.id
                ? "bg-purple-500 text-white"
                : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </section>

      {aba === "hedge" && <HedgeCalculator />}
      {aba === "freebet" && <FreebetCalculator />}
      {aba === "dutching" && <DutchingCalculator />}
      {aba === "comissao" && <CommissionCalculator />}
      {aba === "ev" && <EVCalculator />}
      {aba === "split" && <SplitStakeCalculator />}
    </div>
  );
}