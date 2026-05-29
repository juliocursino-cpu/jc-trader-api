import {
  Search,
  ClipboardList,
  BarChart3,
  CalendarDays,
  Layers3,
  BrainCircuit,
  Wallet,
  LifeBuoy,
  Settings,
  Image,
  Zap,
  Radio,
} from "lucide-react";

const items = [
  { key: "scanner", label: "Scanner", icon: Search },
  { key: "compact", label: "Compact", icon: Zap },
  { key: "live", label: "Live", icon: Radio },
  { key: "entradas", label: "Entradas", icon: ClipboardList },
  { key: "dados", label: "Dados", icon: BarChart3 },
  { key: "calendario", label: "Calendário", icon: CalendarDays },
  { key: "ligas", label: "Ligas & Times", icon: Layers3 },
  { key: "metodos", label: "Métodos & Odds", icon: BrainCircuit },
  { key: "banco", label: "Banco", icon: Wallet },
  { key: "help", label: "Help", icon: LifeBuoy },
  { key: "config", label: "Config", icon: Settings },
  { key: "logos", label: "Logos", icon: Image },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
}) {
  return (
    <aside className="w-64 shrink-0 min-h-screen border-r border-zinc-800 bg-black p-4">
      {/* LOGO */}

      <div className="mb-6 rounded-2xl border border-zinc-800 bg-[#0b0b0b] p-4">
        <div className="flex justify-center">
<img
              src="/logo.png"
              alt="JC Trader"
              className="h-24 w-24 object-contain"
            />
          
        </div>

        <h1 className="mt-4 text-center text-xl font-black text-white">
          JC Trader
        </h1>

        <p className="text-center text-[11px] tracking-[3px] text-zinc-500">
          PROFESSIONAL
        </p>
      </div>

      {/* MENU */}

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => {
  if (item.key === "live") {
    window.open("https://cornerprobet.com/br/live", "_blank");
    return;
  }

  setActiveTab(item.key);
}}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition ${
                activeTab === item.key
                  ? "border border-blue-500 bg-blue-500/15 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon size={16} />

              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}