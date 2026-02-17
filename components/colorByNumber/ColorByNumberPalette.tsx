"use client";

/**
 * Color by Number – palette panel: Code | Color | Count
 */

import { useMemo } from "react";
import { useColorByNumberStore } from "@/store/useColorByNumberStore";

export default function ColorByNumberPalette() {
  const { data, filled, selectedCode, setSelectedCode, isPaletteVisible, togglePalette } =
    useColorByNumberStore();

  const paletteRows = useMemo(() => {
    if (!data || !data.cells.length) return [];

    const codeToColor = new Map<string, string>();
    const codeToCount = new Map<string, number>();
    const codeToTotal = new Map<string, number>();

    for (const cell of data.cells) {
      if (!cell.code) continue; // skip white cells (no code)
      if (!codeToColor.has(cell.code)) {
        codeToColor.set(cell.code, cell.color);
      }
      codeToTotal.set(cell.code, (codeToTotal.get(cell.code) ?? 0) + 1);
      if (filled[`${cell.x},${cell.y}`]) {
        codeToCount.set(cell.code, (codeToCount.get(cell.code) ?? 0) + 1);
      }
    }

    const codes = [...codeToColor.keys()].sort((a, b) => {
      const aNum = Number.parseInt(a, 10);
      const bNum = Number.parseInt(b, 10);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;
      if (!Number.isNaN(aNum)) return -1;
      if (!Number.isNaN(bNum)) return 1;
      return a.localeCompare(b);
    });

    return codes.map((code) => ({
      code,
      color: codeToColor.get(code) ?? "#999",
      count: codeToCount.get(code) ?? 0,
      total: codeToTotal.get(code) ?? 0,
    }));
  }, [data, filled]);

  if (!data || paletteRows.length === 0) {
    return (
      <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-5 relative">
        <p className="text-center text-sm text-[var(--text-muted)]">
          Tải grid để xem bảng màu
        </p>
      </div>
    );
  }

  // Collapsed state
  if (!isPaletteVisible) {
    return (
       <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-2 flex justify-end">
          <button
            onClick={togglePalette}
             className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--bg-primary)] shadow-sm hover:bg-[var(--accent-hover)] transition-colors"
          >
            Show Palette ↑
          </button>
       </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-6 py-5 relative">
      <div className="absolute top-2 right-4">
          <button
            onClick={togglePalette}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-black/5 rounded-md hover:bg-black/10"
            title="Hide palette"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
      </div>

      <div className="mx-auto max-w-6xl">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Bảng màu
        </h2>
        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[280px] text-left text-sm"
            aria-label="Bảng màu theo mã"
          >
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="pb-2 pr-4 font-medium">Code</th>
                <th className="pb-2 pr-4 font-medium">Color</th>
                <th className="pb-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {paletteRows.map((row) => {
                const isSelected = selectedCode === row.code;
                return (
                  <tr
                    key={row.code}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedCode(isSelected ? null : row.code)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedCode(isSelected ? null : row.code);
                      }
                    }}
                    className={`cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-white/5 ${
                      isSelected ? "bg-[var(--accent-muted)]" : ""
                    }`}
                    aria-label={`Chọn màu ${row.code}, ${row.count}/${row.total} ô đã tô`}
                    aria-pressed={isSelected}
                  >
                    <td className="py-2.5 pr-4 font-mono font-semibold text-[var(--text-primary)]">
                      {row.code}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div
                        className="h-6 w-12 rounded border border-[var(--border-subtle)]"
                        style={{ backgroundColor: row.color }}
                        aria-hidden
                      />
                    </td>
                    <td className="py-2.5 text-[var(--text-secondary)]">
                      {row.count} / {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Chọn màu từ bảng, sau đó click vào ô có mã tương ứng để tô.
        </p>
      </div>
    </div>
  );
}
