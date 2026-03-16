"use client";

import AccessModal from "@/components/AccessModal";
import Dashboard from "@/components/colorByNumber/Dashboard";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-(--bg-primary)">
      <AccessModal />

      {/* Main Content Area: Dashboard */}
      <section className="relative flex-1 h-full overflow-hidden">
        <Dashboard /> {/* Dashboard handles grid/preview/modal internally */}
      </section>
    </main>
  );
}
