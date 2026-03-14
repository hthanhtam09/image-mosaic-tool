import { jsPDF } from "jspdf";
import { ColorByNumberData, FilledMap } from "./types";
import { exportToCanvas, PartialColorMode } from "./export";

export interface PDFCsvRow {
  number: string;
  text: string;
}

export interface PDFExportOptions {
  projects: {
    data: ColorByNumberData;
    filled: FilledMap;
    partialColorMode: PartialColorMode;
  }[];
  backgroundImage: string | null; // Data URL or URL
  csvData: PDFCsvRow[];
  prefixPages?: string[]; // Array of image data URLs
  suffixPages?: string[]; // Array of image data URLs
  globalOptions: {
    showCodes: boolean;
    showPalette: boolean;
    theme: "light" | "dark";
  };
}

/**
 * PDF generation module for KDP-compatible books
 * Page size: 8.5 x 11 inches
 * Padding: 0.4 inches
 * DPI: 300 (standard for printing)
 */

const PAGE_W_IN = 8.5;
const PAGE_H_IN = 11;
const PADDING_IN = 0;

// jsPDF points (1 inch = 72 points)
const PT_PER_IN = 72;
const PAGE_W_PT = PAGE_W_IN * PT_PER_IN;
const PAGE_H_PT = PAGE_H_IN * PT_PER_IN;
const PADDING_PT = PADDING_IN * PT_PER_IN;
const SAFE_W_PT = PAGE_W_PT - PADDING_PT * 2;
const SAFE_H_PT = PAGE_H_PT - PADDING_PT * 2;

export const parseCSV = (csvText: string): PDFCsvRow[] => {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return [];

  // Check if first line is a header like "text"
  const firstLine = lines[0].trim().toLowerCase();
  let startIndex = 0;
  if (firstLine === "text" || firstLine.includes("text")) {
    startIndex = 1;
  }

  const result: PDFCsvRow[] = [];
  let number = 1;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle potential quotes around the text
    let text = line;
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1);
    }
    
    result.push({ number: number.toString(), text });
    number++;
  }

  return result;
};

export const generateBookPdf = async (
  options: PDFExportOptions,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> => {
  const { projects, backgroundImage, csvData, prefixPages = [], suffixPages = [], globalOptions } = options;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [PAGE_W_PT, PAGE_H_PT],
  });

  const totalPairs = projects.length;
  const totalPrefix = prefixPages.length;
  const totalSuffix = suffixPages.length;
  const totalPages = totalPrefix + totalPairs * 2 + totalSuffix;

  let currentPageIndex = 0;

  // --- PREFIX PAGES (Pages 1-5, etc.) ---
  for (let i = 0; i < totalPrefix; i++) {
    if (currentPageIndex > 0) pdf.addPage();
    currentPageIndex++;

    pdf.addImage(
      prefixPages[i],
      "PNG",
      0, // Intro pages usually full bleed or handled by image itself
      0,
      PAGE_W_PT,
      PAGE_H_PT,
      undefined,
      "FAST"
    );
    if (onProgress) onProgress(currentPageIndex, totalPages);
  }

  // --- MAIN CONTENT (Repeating Pairs) ---
  for (let i = 0; i < totalPairs; i++) {
    const project = projects[i];
    const csvRow = csvData[i] || { number: "", text: "" };

    // --- EVEN PAGE (Left Page) ---
    if (currentPageIndex > 0) pdf.addPage();
    currentPageIndex++;
    
    const isDark = globalOptions.theme === "dark";
    const bgColorHex = isDark ? "#1a1a1a" : "#ffffff";
    const textColorHex = isDark ? "#ffffff" : "#1a1a1a";
    
    // Background Image or Color
    if (backgroundImage) {
      pdf.addImage(
        backgroundImage,
        "PNG",
        PADDING_PT,
        PADDING_PT,
        SAFE_W_PT,
        SAFE_H_PT,
        undefined,
        "FAST"
      );
    } else {
        pdf.setFillColor(bgColorHex);
        pdf.rect(0, 0, PAGE_W_PT, PAGE_H_PT, "F");
    }

    // Overlay Text
    pdf.setTextColor(textColorHex);
    
    // Try to use requested custom fonts. 
    // Note: In jsPDF, custom fonts need to be added to VFS via addFileToVFS and addFont. 
    // If they aren't, it will fall back to Helvetica automatically, but we set the names here so it's ready.
    try {
      pdf.setFont("Roca Two", "bold");
    } catch (e) {
      pdf.setFont("helvetica", "bold");
    }
    
    pdf.setFontSize(38); // 38px (pt in jsPDF)
    const numText = csvRow.number.toString();
    const numW = pdf.getTextWidth(numText);
    
    // Center vertically in the upper-middle area, shifted up by 20pt
    const startY = (PAGE_H_PT * 0.45) - 20; 
    pdf.text(numText, (PAGE_W_PT - numW) / 2, startY);

    // Decorative line under the number
    const lineY = startY + 20;
    const lineLength = 40; // Short decorative line
    pdf.setDrawColor(textColorHex);
    pdf.setLineWidth(1.5);
    pdf.line((PAGE_W_PT - lineLength) / 2, lineY, (PAGE_W_PT + lineLength) / 2, lineY);

    try {
      pdf.setFont("Noto Sans", "normal");
    } catch (e) {
      pdf.setFont("helvetica", "normal");
    }
    
    pdf.setFontSize(14); // 14px (pt in jsPDF)
    
    // Text constraint: "khoảng 1/3 ở giữa" (middle 1/3 of the page width)
    const textMaxWidth = PAGE_W_PT / 3;
    const splitText = pdf.splitTextToSize(csvRow.text, textMaxWidth);
    
    // Center the text body horizontally below the line
    const textStartY = lineY + 30;
    pdf.text(splitText, PAGE_W_PT / 2, textStartY, { align: "center" });

    // Add white box with dotted line below the text
    const textDimensions = pdf.getTextDimensions(splitText);
    const textBottomY = textStartY + textDimensions.h;

    const boxWidth = textMaxWidth; // Match the width of the text constraint
    const boxHeight = 60; // Make the input a bit taller
    const boxX = (PAGE_W_PT - boxWidth) / 2;
    const boxY = textBottomY + 10; // 10pt spacing below text

    // 1. Draw white rectangle with rounded corners (15px border radius)
    pdf.setFillColor("#ffffff");
    pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 15, 15, "F");

    // 2. Draw dotted line inside for user to write on
    pdf.setDrawColor("#666666"); // Dark gray dotted line
    pdf.setLineWidth(1);
    pdf.setLineDashPattern([4, 4], 0); // 4pt line, 4pt gap

    const paddingX = 20;
    const dottedLineY = boxY + boxHeight - 20; // Near the bottom of the taller box
    pdf.line(boxX + paddingX, dottedLineY, boxX + boxWidth - paddingX, dottedLineY);

    // Reset line dash for subsequent drawings
    pdf.setLineDashPattern([], 0);

    if (onProgress) {
        onProgress(currentPageIndex, totalPages);
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // --- ODD PAGE (Right Page) ---
    pdf.addPage();
    currentPageIndex++;

    const canvas = exportToCanvas(project.data, project.filled, {
      showCodes: globalOptions.showCodes,
      colored: false,
      showPalette: globalOptions.showPalette,
      partialColorMode: project.partialColorMode,
      bgColor: bgColorHex,
    });

    const imgData = canvas.toDataURL("image/png");

    pdf.addImage(
      imgData,
      "PNG",
      PADDING_PT,
      PADDING_PT,
      SAFE_W_PT,
      SAFE_H_PT,
      undefined,
      "FAST"
    );

    if (onProgress) {
        onProgress(currentPageIndex, totalPages);
        await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  // --- SUFFIX PAGES ---
  for (let i = 0; i < totalSuffix; i++) {
    pdf.addPage();
    currentPageIndex++;

    pdf.addImage(
      suffixPages[i],
      "PNG",
      0,
      0,
      PAGE_W_PT,
      PAGE_H_PT,
      undefined,
      "FAST"
    );
    if (onProgress) {
        onProgress(currentPageIndex, totalPages);
        await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  if (onProgress) {
      onProgress(totalPages, totalPages);
      await new Promise(resolve => setTimeout(resolve, 50));
  }
  return pdf.output("blob");
};
