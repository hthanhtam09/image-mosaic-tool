"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  features: string[];
  videoSrc?: string;
}

const TABS: Tab[] = [
  {
    id: "upload",
    label: "Upload image",
    features: [
      "Single photo or folder",
      "Drag & drop",
      "Any format",
      "Instant preview",
    ],
    videoSrc: "/assets/record.mov",
  },
  {
    id: "style",
    label: "Pick a style",
    features: [
      "10 mosaic patterns",
      "Live preview",
      "Custom color count",
      "Auto-palette",
    ],
    videoSrc: "/assets/record.mov",
  },
  {
    id: "export",
    label: "Export PDF",
    features: ["8.5 × 11 in", "Numbered page", "Answer key", "KDP-ready"],
    videoSrc: "/assets/record.mov",
  },
];

export default function ProductDemo() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="py-28">
      <div className="mx-auto w-full max-w-[1100px] px-8">
        {/* heading — centered, large, 2-line like Supabase */}
        <div className="mb-10 text-center">
          <h2 className="text-[clamp(34px,4.5vw,52px)] font-bold leading-[1.1] tracking-[-0.02em]">
            Stay productive and publish your book
          </h2>
          <p className="text-[clamp(34px,4.5vw,52px)] font-bold leading-[1.1] tracking-[-0.02em] text-text-secondary">
            without leaving the tool
          </p>
        </div>

        {/* tabs — pill buttons centered */}
        <div className="mb-8 flex justify-center gap-3">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(i)}
              className={
                "rounded-full border px-5 py-2 text-[14px] font-medium transition-all duration-150 " +
                (i === active
                  ? "border-white bg-transparent text-white"
                  : "border-border-primary text-text-secondary hover:border-white/40 hover:text-white")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* feature chips row */}
        <div className="mb-10 flex flex-wrap justify-center gap-x-7 gap-y-2">
          {tab.features.map((f) => (
            <span
              key={f}
              className="flex items-center gap-2 text-[14px] text-text-secondary"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="text-accent shrink-0"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {f}
            </span>
          ))}
        </div>

        {/* video — full width, browser chrome */}
        <div className="overflow-hidden rounded-2xl border border-border-primary bg-bg-secondary shadow-[0_0_100px_#c0cde312]">
          {/* browser bar */}
          <div className="flex h-9 items-center gap-2 border-b border-border-primary bg-[#161616] px-3.5">
            <span className="flex gap-[7px]">
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
              <i className="block h-[11px] w-[11px] rounded-full bg-[#333]" />
            </span>
            <span className="flex h-[22px] flex-1 items-center rounded-md border border-border-primary bg-bg-primary px-2.5 font-mono text-[11px] text-text-secondary">
              https://mosacistudio.com/studio
            </span>
          </div>

          {/* video / placeholder */}
          <div className="relative aspect-video w-full bg-bg-primary">
            {tab.videoSrc ? (
              <video
                key={tab.videoSrc}
                src={tab.videoSrc}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-text-secondary">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border-primary bg-bg-secondary">
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-accent"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-[14px]">
                  Demo video: <span className="text-white">{tab.label}</span>
                </p>
                <p className="text-[12px] opacity-40">
                  Set <code>videoSrc</code> in ProductDemo.tsx to add your video
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
