import { useState } from "react";

import Sidebar from "./components/Sidebar";

import Scanner from "./pages/Scanner";
import Compact from "./pages/Compact";
import Entradas from "./pages/Entradas";
import Dados from "./pages/Dados";
import Calendario from "./pages/Calendario";
import LigasTimes from "./pages/LigasTimes";
import MetodosOdds from "./pages/MetodosOdds";
import Banco from "./pages/Banco";
import Help from "./pages/Help";
import Config from "./pages/Config";
import Logos from "./pages/Logos";

export default function App() {
  const [activeTab, setActiveTab] =
    useState("scanner");

  function renderPage() {
    switch (activeTab) {
      case "scanner":
        return <Scanner />;

      case "compact":
        return <Compact />;

      case "entradas":
        return <Entradas />;

      case "dados":
        return <Dados />;

      case "calendario":
        return <Calendario />;

      case "ligas":
        return <LigasTimes />;

      case "metodos":
        return <MetodosOdds />;

      case "banco":
        return <Banco />;

      case "help":
        return <Help />;

      case "config":
        return <Config />;
      
      case "logos":
        return <Logos />;

      default:
        return <Scanner />;
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-[#050505] text-white">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden p-4">
        {renderPage()}
      </main>
    </div>
  );
}