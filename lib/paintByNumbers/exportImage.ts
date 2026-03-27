import jsPDF from "jspdf";

/**
 * Export canvas as a PNG data URL, including an optional color legend at the bottom.
 */
export function exportAsPNG(
  canvas: HTMLCanvasElement,
  legend?: { label: number; hex: string; rgb: [number, number, number] }[]
): string {
  if (!legend || legend.length === 0) return canvas.toDataURL("image/png");

  const border = 20; // thick border matching reference image
  const bottomMargin = 100; // room for legend
  const width = canvas.width + border * 2;
  const height = canvas.height + border * 2 + bottomMargin;

  const outCanvas = document.createElement("canvas");
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext("2d")!;

  // Fill background white
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Draw black rounded border for the image (mimicking reference picture)
  const radius = 24;
  ctx.beginPath();
  ctx.moveTo(border + radius, border);
  ctx.lineTo(border + canvas.width - radius, border);
  ctx.quadraticCurveTo(border + canvas.width, border, border + canvas.width, border + radius);
  ctx.lineTo(border + canvas.width, border + canvas.height - radius);
  ctx.quadraticCurveTo(border + canvas.width, border + canvas.height, border + canvas.width - radius, border + canvas.height);
  ctx.lineTo(border + radius, border + canvas.height);
  ctx.quadraticCurveTo(border, border + canvas.height, border, border + canvas.height - radius);
  ctx.lineTo(border, border + radius);
  ctx.quadraticCurveTo(border, border, border + radius, border);
  ctx.closePath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#000000";
  ctx.stroke();

  // Draw original image inside the border
  ctx.save();
  ctx.clip();
  ctx.drawImage(canvas, border, border);
  ctx.restore();

  // Draw legend horizontally centered
  const circleRadius = 18;
  const gap = 16;
  const totalLegendWidth = legend.length * (circleRadius * 2) + (legend.length - 1) * gap;
  let startX = (width - totalLegendWidth) / 2 + circleRadius;
  const startY = height - bottomMargin / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 14px 'Inter', Arial, sans-serif";

  for (const item of legend) {
    const [r, g, b] = item.rgb;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(startX, startY, circleRadius, 0, Math.PI * 2);
    ctx.fillStyle = item.hex;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.stroke();

    // Determine text color based on luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    ctx.fillStyle = luminance > 128 ? "#000000" : "#ffffff";
    ctx.fillText(String(item.label), startX, startY + 1);

    startX += circleRadius * 2 + gap;
  }

  return outCanvas.toDataURL("image/png");
}

/**
 * Trigger a download of the canvas as PNG.
 */
export function downloadPNG(
  canvas: HTMLCanvasElement,
  legend?: { label: number; hex: string; rgb: [number, number, number] }[],
  filename: string = "paint-by-numbers.png"
): void {
  const dataUrl = exportAsPNG(canvas, legend);
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export the PBN canvas + legend as a PDF for printing.
 */
export function downloadPDF(
  canvas: HTMLCanvasElement,
  legend: { label: number; hex: string; rgb: [number, number, number] }[],
  filename: string = "paint-by-numbers.pdf"
): void {
  const imgData = canvas.toDataURL("image/png");

  // Determine orientation based on aspect ratio
  const isLandscape = canvas.width > canvas.height;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  // Calculate image dimensions to fit page
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - 40; // reserve space for legend
  const scale = Math.min(
    availableWidth / canvas.width,
    availableHeight / canvas.height
  );
  const imgW = canvas.width * scale;
  const imgH = canvas.height * scale;
  const imgX = (pageWidth - imgW) / 2;

  pdf.addImage(imgData, "PNG", imgX, margin, imgW, imgH);

  // Draw color legend below the image
  const legendY = margin + imgH + 8;
  const swatchSize = 5;
  const colWidth = 30;
  const cols = Math.floor(availableWidth / colWidth);

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "bold");
  pdf.text("Color Legend", margin, legendY);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let i = 0; i < legend.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * colWidth;
    const y = legendY + 4 + row * (swatchSize + 3);

    // Draw color swatch
    const [r, g, b] = legend[i].rgb;
    pdf.setFillColor(r, g, b);
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(x, y, swatchSize, swatchSize, "FD");

    // Draw label
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${legend[i].label} = ${legend[i].hex}`, x + swatchSize + 2, y + swatchSize / 2 + 1);
  }

  pdf.save(filename);
}
