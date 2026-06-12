"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { autoInit } from "@/lib/marketing/mosaic";

const CATS = ["All", "Tutorials", "KDP Tips", "Product", "Design"];

// [category, title, excerpt, initials, author, read, seed]
const POSTS: [string, string, string, string, string, string, number][] = [
  ["KDP Tips", "Picking page sizes that actually sell", "The 3 trim sizes that dominate the coloring-book category — and when to break the rule.", "DM", "Devon Mills", "5 min", 201],
  ["Design", "A field guide to the 10 mosaic styles", "When to reach for hexagons vs. fish-scale, and how grid choice changes difficulty.", "ML", "Mara Lin", "6 min", 202],
  ["Product", "Object Focus: background removal, explained", "How auto white-background removal isolates a subject for cleaner sticker pages.", "AN", "Aisha Noor", "4 min", 203],
  ["Tutorials", "Building a themed series in one session", "Use bulk folder upload to ship a 5-book series without repeating yourself.", "TW", "Tom Wexler", "7 min", 204],
  ["KDP Tips", "Writing back-matter that earns reviews", "Small touches in your suffix pages that turn buyers into repeat customers.", "LO", "Lena Ortiz", "5 min", 205],
  ["Design", "Palettes that print true", "Why your screen colors drift on paper — and how to pick palettes that hold up.", "JR", "Jordan Reyes", "6 min", 206],
];

const ARTICLE = "/blog/from-stock-photo-to-kdp-book";

const cardInteractive =
  "rounded-xl border border-border-primary bg-bg-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c0cde359] hover:bg-bg-tertiary";
const chip =
  "inline-flex items-center gap-1.5 self-start rounded-full bg-[#c0cde31f] px-[11px] py-1 text-xs font-medium leading-none text-accent";
const muted = "text-text-secondary";
const inputClass =
  "h-10 w-full rounded-lg border border-border-primary bg-bg-secondary px-3.5 text-[15px] text-text-primary outline-none transition focus:border-accent focus:shadow-[var(--ring)] placeholder:text-text-secondary";
const miniAvatar =
  "inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--grad)] text-[10px] font-semibold text-[#121212]";
const postMeta = "flex items-center gap-2.5 text-[13px] text-text-secondary";

export default function BlogClient() {
  const [active, setActive] = useState("All");

  useEffect(() => {
    autoInit(document);
  }, []);

  return (
    <>
      <MarketingHeader active="blog" />

      <main>
        <div className="mx-auto w-full max-w-[1180px] px-8">
          <div className="pb-8 pt-16">
            <h1 className="text-[clamp(30px,4vw,36px)] font-bold leading-[1.15] tracking-[-0.015em]">Blog</h1>
            <p className={`mt-3 text-[17px] ${muted}`}>Guides, tutorials and updates for coloring-book creators.</p>
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`cursor-pointer rounded-full border px-3.5 py-[7px] text-[13px] transition ${
                    active === c
                      ? "border-transparent bg-[#c0cde31f] text-accent"
                      : "border-border-primary text-text-secondary hover:text-text-primary"
                  }`}
                  onClick={() => setActive(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative">
              <svg className="absolute left-[11px] top-1/2 -translate-y-1/2 text-text-secondary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
              <input className={`${inputClass} w-[220px] pl-9`} placeholder="Search articles…" />
            </div>
          </div>

          <Link href={ARTICLE}>
            <div className={`${cardInteractive} mb-10 grid grid-cols-[1.1fr_1fr] gap-0 overflow-hidden p-[22px] max-[960px]:grid-cols-1`}>
              <div className="relative min-h-[300px] overflow-hidden bg-bg-tertiary">
                <span className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-[3px] font-mono text-[11px] text-text-secondary">cover · 16:10</span>
                <div data-mosaic data-cols="16" data-rows="10" data-numbers="false" data-seed="200" style={{ height: "100%" }} />
              </div>
              <div className="flex flex-col justify-center gap-3.5 p-9">
                <span className={chip}>Tutorials</span>
                <h2 className="text-[clamp(24px,3vw,28px)] font-semibold leading-[1.2] tracking-[-0.01em]">
                  From stock photo to a 100-page KDP coloring book in one afternoon
                </h2>
                <p className={muted}>
                  A full walkthrough of the Mosaci workflow — choosing styles, tuning palettes, and assembling a print-ready PDF that passes KDP&apos;s checks.
                </p>
                <div className={postMeta}>
                  <span className={miniAvatar}>JR</span> Jordan Reyes · Feb 12, 2026 · 8 min read
                </div>
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-5 max-[960px]:grid-cols-2 max-[600px]:grid-cols-1">
            {POSTS.map((p) => (
              <Link key={p[1]} href={ARTICLE}>
                <div className={`${cardInteractive} cursor-pointer overflow-hidden p-0`}>
                  <div className="relative min-h-[168px] overflow-hidden bg-bg-tertiary">
                    <span className="absolute left-3 top-3 rounded-md bg-black/40 px-2 py-[3px] font-mono text-[11px] text-text-secondary">cover</span>
                    <div data-mosaic data-cols="12" data-rows="8" data-numbers="false" data-seed={String(p[6])} style={{ height: "100%" }} />
                  </div>
                  <div className="flex flex-col gap-2.5 p-[18px]">
                    <span className={chip}>{p[0]}</span>
                    <h3 className="text-xl font-semibold leading-[1.3]">{p[1]}</h3>
                    <p className={`text-[13px] ${muted}`}>{p[2]}</p>
                    <div className={`${postMeta} mt-1`}>
                      <span className={miniAvatar}>{p[3]}</span> {p[4]} · {p[5]} read
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="my-14 rounded-2xl border border-border-primary bg-bg-secondary p-10 text-center">
            <h2 className="text-[clamp(24px,3vw,28px)] font-semibold leading-[1.2] tracking-[-0.01em]">Get new tutorials in your inbox</h2>
            <p className={`my-2.5 mb-5 ${muted}`}>One practical coloring-book tip every week. No spam.</p>
            <div className="mx-auto flex max-w-[320px] gap-2">
              <input className={inputClass} type="email" placeholder="you@email.com" />
              <button className="btn btn-primary" type="button">Subscribe</button>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </>
  );
}
