"use client";

import { useState } from "react";
import AccessModal from "@/components/AccessModal";
import Dashboard from "@/components/colorByNumber/Dashboard";
import PaintByNumbersApp from "@/components/paintByNumbers/PaintByNumbersApp";
import ToolSelector from "@/components/ToolSelector";

type ActiveTool = "none" | "mosaic" | "pbn";

export default function Home() {
  const [activeTool, setActiveTool] = useState<ActiveTool>("none");

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-(--bg-primary)">
      <AccessModal />

      {/* Main Content Area */}
      <section className="relative flex-1 h-full overflow-hidden">
        {activeTool === "none" && (
          <ToolSelector
            onSelectMosaic={() => setActiveTool("mosaic")}
            onSelectPBN={() => setActiveTool("pbn")}
          />
        )}

        {activeTool === "mosaic" && (
          <Dashboard onBack={() => setActiveTool("none")} />
        )}

        {activeTool === "pbn" && (
          <PaintByNumbersApp onBack={() => setActiveTool("none")} />
        )}
      </section>
    </main>
  );
}
