/**
 * Helpers to embed physical-resolution metadata (the PNG `pHYs` chunk) into
 * canvas-generated PNGs. The canvas already renders at 300 DPI pixel dimensions
 * (e.g. 2550×3300 for a letter page), but `canvas.toDataURL()` never writes a
 * pHYs chunk, so print software falls back to 72/96 DPI. Injecting pHYs makes
 * the exported files report the correct DPI.
 */

export const EXPORT_DPI = 300;

/** Pixels per metre for a given DPI (1 inch = 0.0254 m). */
const dpiToPpm = (dpi: number): number => Math.round(dpi / 0.0254);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array, start: number, end: number): number => {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const base64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

/**
 * Inserts a pHYs chunk (right after IHDR) declaring the given DPI.
 * Canvas PNGs never contain a pHYs chunk, so a plain insert is safe.
 */
const injectPngDpiBytes = (png: Uint8Array, dpi: number): Uint8Array => {
  // PNG = 8-byte signature + IHDR chunk (len 4 + type 4 + data 13 + crc 4 = 25).
  const ihdrEnd = 8 + 25; // 33
  const ppm = dpiToPpm(dpi);

  // pHYs chunk = length(4) + type(4) + data(9) + crc(4) = 21 bytes.
  const phys = new Uint8Array(21);
  const dv = new DataView(phys.buffer);
  dv.setUint32(0, 9); // data length
  phys[4] = 0x70; // 'p'
  phys[5] = 0x48; // 'H'
  phys[6] = 0x59; // 'Y'
  phys[7] = 0x73; // 's'
  dv.setUint32(8, ppm); // pixels per unit, X
  dv.setUint32(12, ppm); // pixels per unit, Y
  phys[16] = 1; // unit specifier: 1 = metre
  dv.setUint32(17, crc32(phys, 4, 17)); // CRC over type + data

  const out = new Uint8Array(png.length + phys.length);
  out.set(png.subarray(0, ihdrEnd), 0);
  out.set(phys, ihdrEnd);
  out.set(png.subarray(ihdrEnd), ihdrEnd + phys.length);
  return out;
};

/** Returns a PNG data URL for the canvas with a 300 DPI pHYs chunk embedded. */
export const canvasToDpiPngDataUrl = (
  canvas: HTMLCanvasElement,
  dpi: number = EXPORT_DPI,
): string => {
  const dataUrl = canvas.toDataURL("image/png");
  try {
    const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const withDpi = injectPngDpiBytes(base64ToBytes(b64), dpi);
    return `data:image/png;base64,${bytesToBase64(withDpi)}`;
  } catch {
    // If anything goes wrong, fall back to the plain (correctly-sized) PNG.
    return dataUrl;
  }
};

/** Returns just the base64 payload (no data URL prefix) with DPI embedded. */
export const canvasToDpiPngBase64 = (
  canvas: HTMLCanvasElement,
  dpi: number = EXPORT_DPI,
): string => canvasToDpiPngDataUrl(canvas, dpi).split(",")[1];

/** Returns a PNG Blob for the canvas with a 300 DPI pHYs chunk embedded. */
export const canvasToDpiPngBlob = (
  canvas: HTMLCanvasElement,
  dpi: number = EXPORT_DPI,
): Blob => {
  const bytes = base64ToBytes(canvasToDpiPngBase64(canvas, dpi));
  return new Blob([bytes as BlobPart], { type: "image/png" });
};
