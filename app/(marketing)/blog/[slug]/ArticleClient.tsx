"use client";

import { useEffect } from "react";
import Link from "next/link";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import { autoInit } from "@/lib/marketing/mosaic";
import "./article.css";

const TOC = [
  ["intro", "Why mosaics sell"],
  ["upload", "Uploading your set"],
  ["styles", "Choosing grid styles"],
  ["palette", "Tuning the palette"],
  ["assembly", "Assembling the PDF"],
  ["publish", "Publishing to KDP"],
];

const REL: [string, string, number][] = [
  ["Design", "A field guide to the 10 mosaic styles", 202],
  ["Product", "Object Focus, explained", 203],
  ["KDP Tips", "Picking page sizes that sell", 201],
];

const chip = "inline-flex items-center gap-1.5 self-start rounded-full bg-[#c0cde31f] px-[11px] py-1 text-xs font-medium leading-none text-accent";
const chipNeutral = "inline-flex items-center gap-1.5 rounded-full bg-bg-tertiary px-[11px] py-1 text-xs font-medium leading-none text-text-secondary";
const avatar = "inline-flex shrink-0 items-center justify-center rounded-full border border-[#c0cde34d] bg-[var(--grad)] font-semibold text-[#121212]";
const iconBtn = "inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border-primary text-text-secondary transition hover:bg-bg-tertiary hover:text-text-primary";
const inputClass = "h-10 w-full rounded-lg border border-border-primary bg-bg-secondary px-3.5 text-[15px] text-text-primary outline-none transition focus:border-accent focus:shadow-[var(--ring)] placeholder:text-text-secondary";
const h2 = "text-[clamp(24px,3vw,28px)] font-semibold leading-[1.2] tracking-[-0.01em]";

export default function ArticleClient() {
  useEffect(() => {
    autoInit(document);

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".toc a"));
    const ids = links.map((l) => l.getAttribute("href")!.slice(1));
    const onScroll = () => {
      let active = ids[0];
      ids.forEach((id) => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 120) active = id;
      });
      links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + active));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <MarketingHeader active="blog" />

      <main>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 px-8 xl:grid-cols-[220px_1fr_220px]">
          <div className="pt-7 text-[13px] text-text-secondary xl:col-start-2 [&_a:hover]:text-text-primary">
            <Link href="/">Home</Link> › <Link href="/blog">Blog</Link> › <span>From stock photo to KDP book</span>
          </div>

          <nav className="toc" id="toc">
            <div className="toc-title">On this page</div>
            {TOC.map(([id, label], i) => (
              <a key={id} href={`#${id}`} className={i === 0 ? "active" : undefined}>
                {label}
              </a>
            ))}
          </nav>

          <article className="mx-auto max-w-[720px] pb-16 pt-8 xl:col-start-2">
            <div className="mb-7 flex flex-col gap-[18px]">
              <span className={chip}>Tutorials</span>
              <h1 className="text-[clamp(30px,4vw,36px)] font-bold leading-[1.2] tracking-[-0.015em]">
                From stock photo to a 100-page KDP coloring book in one afternoon
              </h1>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span className={`${avatar} h-10 w-10 text-[13px]`}>JR</span>
                <div>
                  <div className="font-medium text-text-primary">Jordan Reyes</div>
                  <div>Feb 12, 2026 · 8 min read</div>
                </div>
                <div className="ml-auto flex gap-2">
                  <button className={iconBtn} type="button" aria-label="Save">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <path d="M16 6l-4-4-4 4" />
                      <path d="M12 2v13" />
                    </svg>
                  </button>
                  <button className={iconBtn} type="button" aria-label="Share">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="article-cover relative mb-9 overflow-hidden rounded-2xl border border-border-primary">
              <span className="ph-label">cover · 16:9</span>
              <div data-mosaic data-cols="20" data-rows="11" data-numbers="false" data-seed="300" />
            </div>

            <div className="prose">
              <p id="intro">
                Coloring books are one of the most durable categories on Kindle Direct Publishing — but the production work has always been the
                bottleneck. This guide walks through turning a folder of source images into a finished, print-ready book using Mosaci, end to end.
              </p>

              <h2 id="upload">Uploading your set</h2>
              <p>
                Start in the Mosaic Tool and pick <strong>Standard Import</strong>. Drag your images onto the dropzone — up to 100 at a time. Mosaci
                accepts both PNG and JPG, and you can prune the set on the next screen before any conversion happens.
              </p>
              <blockquote>The fastest workflow is to batch a whole themed set at once, then fine-tune individual pages in Review.</blockquote>

              <h2 id="styles">Choosing grid styles</h2>
              <p>
                Each page can use any of ten mosaic styles. Grid choice is really a difficulty dial: tight squares read as advanced, while larger
                hexagons and fish-scale patterns feel friendlier for younger colorists.
              </p>
              <ul>
                <li>
                  <strong>Square</strong> — classic, highest detail.
                </li>
                <li>
                  <strong>Hexagon / Islamic</strong> — softer, decorative.
                </li>
                <li>
                  <strong>Fish scale</strong> — playful, great for animals.
                </li>
              </ul>
              <p>You can set a default for the whole book and override per page in the Review grid.</p>

              <h2 id="palette">Tuning the palette</h2>
              <p>
                Mosaci derives a numbered palette automatically. In <code>Output settings</code> you can change the cell size, toggle numbers, and
                export the palette as a separate PNG for your back matter.
              </p>
              <pre>
                <code>{`cellSize: 24px
showNumbers: true
exportPalette: true
theme: "Dark"`}</code>
              </pre>

              <figure>
                <div className="cover-img relative">
                  <span
                    className="ph-label"
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--text-secondary)",
                      background: "rgba(0,0,0,.4)",
                      padding: "3px 8px",
                      borderRadius: 6,
                      zIndex: 2,
                    }}
                  >
                    numbered page preview
                  </span>
                  <div data-mosaic data-cols="16" data-rows="11" data-seed="301" />
                </div>
                <figcaption>A converted page with its numbered palette applied.</figcaption>
              </figure>

              <h2 id="assembly">Assembling the PDF</h2>
              <p>
                The Setup step is where a stack of pages becomes a book. Drop in prefix pages, palette images, an optional CSV of story text, a
                solution collage, and suffix pages. The live preview shows exactly how each page will print.
              </p>

              <h2 id="publish">Publishing to KDP</h2>
              <p>
                Export produces a single print-ready PDF sized to your chosen trim. Upload it to KDP, set your cover, and you&apos;re done — what used
                to take a week of manual layout now fits in an afternoon.
              </p>
            </div>

            <div className="my-9 mb-7 mt-9 flex flex-wrap gap-2">
              <span className={chipNeutral}>KDP</span>
              <span className={chipNeutral}>Workflow</span>
              <span className={chipNeutral}>PDF Export</span>
              <span className={chipNeutral}>Mosaic Styles</span>
            </div>

            <div className="flex items-center gap-4 rounded-xl border border-border-primary bg-bg-secondary p-[22px]">
              <span className={`${avatar} h-14 w-14 text-lg`}>JR</span>
              <div>
                <div className="font-semibold">Jordan Reyes</div>
                <p className="mt-1 text-[13px] text-text-secondary">
                  KDP author and product educator. Has published 40+ coloring books and writes about production workflows for self-publishers.
                </p>
              </div>
            </div>

            <div className="my-12 rounded-2xl border border-border-primary bg-bg-secondary p-9 text-center">
              <h2 className={h2}>Get new tutorials in your inbox</h2>
              <p className="my-2.5 mb-5 text-text-secondary">One practical tip every week. No spam.</p>
              <div className="mx-auto flex max-w-[320px] gap-2">
                <input className={inputClass} type="email" placeholder="you@email.com" />
                <button className="btn btn-primary" type="button">Subscribe</button>
              </div>
            </div>

            <h3 className="mb-2 text-xl font-semibold leading-[1.3]">Related posts</h3>
            <div className="mt-6 grid grid-cols-3 gap-4 max-[640px]:grid-cols-1">
              {REL.map((r) => (
                <Link key={r[1]} href="/blog/from-stock-photo-to-kdp-book">
                  <div className="overflow-hidden rounded-xl border border-border-primary bg-bg-secondary transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c0cde359] hover:bg-bg-tertiary">
                    <div className="relative min-h-[120px] bg-bg-tertiary">
                      <div data-mosaic data-cols="10" data-rows="6" data-numbers="false" data-seed={String(r[2])} style={{ height: "100%" }} />
                    </div>
                    <div className="flex flex-col gap-2.5 p-3.5">
                      <span className={chip}>{r[0]}</span>
                      <h3 className="text-base font-semibold leading-[1.3]">{r[1]}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </main>

      <MarketingFooter />
    </>
  );
}
