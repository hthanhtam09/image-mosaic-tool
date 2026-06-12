/* ============================================================
   Mosaci — Mosaic art generator (ported from prototype mosaic.js)
   Builds CSS-only numbered color-by-number grids + palettes.
   No external assets; everything is divs + the brand palette.
   ============================================================ */

// Standard color-by-number palette matching the tool output. [hex, code, name]
export const PALETTE: [string, string, string][] = [
  ["#E8472A", "1",  "Red Orange"],
  ["#7B3F1E", "2",  "Brown"],
  ["#1A1A1A", "3",  "Black"],
  ["#3DBFA8", "4",  "Aqua Green"],
  ["#F5D327", "5",  "Yellow"],
  ["#F5B98A", "6",  "Peach"],
  ["#C9A87C", "7",  "Tan"],
  ["#F09B2A", "8",  "Yellow Orange"],
  ["#555555", "9",  "Dark Gray"],
  ["#7BB8E8", "A",  "Light Blue"],
  ["#9E9E9E", "B",  "Gray"],
  ["#2B5FCC", "C",  "Blue"],
  ["#7C4DBC", "D",  "Violet"],
  ["#4A1A8C", "E",  "Dark Violet"],
  ["#F06BAA", "F",  "Pink"],
  ["#C8178A", "G",  "Magenta"],
];

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// shape clip-paths per grid style
export const SHAPES: Record<string, string> = {
  square: "none",
  circle: "circle(50%)",
  diamond: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
  hexagon: "polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)",
  puzzle: "none",
  fish: 'path("M0,8 A8,8 0 0,1 16,8 L16,16 L0,16 Z")',
  trapezoid: "polygon(15% 0,85% 0,100% 100%,0 100%)",
};

export interface MosaicOptions {
  cols?: number;
  rows?: number;
  shape?: string;
  seed?: number;
  numbers?: boolean;
  filled?: boolean;
  gap?: number;
}

/**
 * Render a numbered mosaic into `el`.
 */
export function renderMosaic(el: HTMLElement, opts: MosaicOptions = {}) {
  const cols = opts.cols || 14;
  const rows = opts.rows || 14;
  const shape = SHAPES[opts.shape ?? ""] ? (opts.shape as string) : "square";
  const rnd = seeded(opts.seed || 7);
  const numbers = opts.numbers !== false;
  const filled = opts.filled !== false; // filled = colored preview, else outline (line-art)
  const gap = opts.gap != null ? opts.gap : 1;

  // build a soft radial "subject" field so colors cluster like a real image
  el.style.display = "grid";
  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  el.style.gap = gap + "px";
  el.style.aspectRatio = `${cols} / ${rows}`;
  el.innerHTML = "";

  const cx = cols / 2 + (rnd() - 0.5) * cols * 0.25;
  const cy = rows / 2 + (rnd() - 0.5) * rows * 0.25;
  const maxd = Math.hypot(cols, rows) / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxd; // 0 center -> 1 edge
      const noise = rnd();
      // pick a palette index: subject (low d) uses brighter periwinkle range, bg edges muted
      let idx;
      if (d < 0.35) idx = Math.floor(noise * 4); // 0-3 bright core
      else if (d < 0.7) idx = 3 + Math.floor(noise * 5); // mid
      else idx = 6 + Math.floor(noise * 6); // muted edges
      idx = Math.min(idx, PALETTE.length - 1);
      const [hex, code] = PALETTE[idx];

      const cell = document.createElement("div");
      cell.style.aspectRatio = "1";
      cell.style.position = "relative";
      cell.style.display = "flex";
      cell.style.alignItems = "center";
      cell.style.justifyContent = "center";
      cell.style.fontSize = "clamp(5px, " + 70 / cols + "cqw, 11px)";
      cell.style.fontFamily = "'JetBrains Mono', monospace";

      if (shape !== "square" && shape !== "puzzle" && SHAPES[shape] !== "none") {
        cell.style.clipPath = SHAPES[shape];
      }
      if (shape === "circle") cell.style.borderRadius = "50%";

      if (filled) {
        cell.style.background = hex;
        // readable number color
        const lum =
          parseInt(hex.slice(1, 3), 16) * 0.299 +
          parseInt(hex.slice(3, 5), 16) * 0.587 +
          parseInt(hex.slice(5, 7), 16) * 0.114;
        cell.style.color = lum > 150 ? "rgba(18,18,18,.55)" : "rgba(255,255,255,.6)";
      } else {
        cell.style.background = "transparent";
        cell.style.border = "0.5px solid rgba(255,255,255,.18)";
        cell.style.color = "rgba(255,255,255,.5)";
      }
      if (numbers) cell.textContent = code;
      cell.dataset.idx = String(idx);
      el.appendChild(cell);
    }
  }
  el.style.containerType = "inline-size";
}

export function renderPalette(el: HTMLElement, count = 8) {
  el.innerHTML = "";
  const items = PALETTE.slice(0, count);
  items.forEach(([hex, code, name]) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.padding = "7px 0";
    row.innerHTML =
      `<span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text-secondary);width:20px">${code}</span>` +
      `<span style="width:22px;height:22px;border-radius:5px;background:${hex};border:1px solid rgba(255,255,255,.12);flex-shrink:0"></span>` +
      `<span style="font-size:13px;color:var(--text)">${name}</span>` +
      `<span style="margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-secondary)">${hex.toUpperCase()}</span>`;
    el.appendChild(row);
  });
}

// small decorative sampler tile (single pattern swatch)
export function sampleTile(shape: string, seed: number) {
  const d = document.createElement("div");
  renderMosaic(d, { cols: 6, rows: 6, shape, seed: seed || 3, numbers: false, gap: 1.5 });
  return d;
}

// auto-init any [data-mosaic] / [data-palette] elements
export function autoInit(root: Document | HTMLElement = document) {
  root.querySelectorAll<HTMLElement>("[data-mosaic]").forEach((el) => {
    if (el.dataset.mosaicInit) return;
    el.dataset.mosaicInit = "1";
    renderMosaic(el, {
      cols: +(el.dataset.cols || 0) || 14,
      rows: +(el.dataset.rows || 0) || 14,
      shape: el.dataset.shape || "square",
      seed: +(el.dataset.seed || 0) || 7,
      numbers: el.dataset.numbers !== "false",
      filled: el.dataset.filled !== "false",
      gap: el.dataset.gap != null ? +el.dataset.gap : 1,
    });
  });
  root.querySelectorAll<HTMLElement>("[data-palette]").forEach((el) => {
    if (el.dataset.paletteInit) return;
    el.dataset.paletteInit = "1";
    renderPalette(el, +(el.dataset.palette || 0) || 8);
  });
}
