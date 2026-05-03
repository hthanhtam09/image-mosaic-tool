import { jsPDF } from "jspdf";
import { ColorByNumberData, FilledMap } from "./types";
import { exportToCanvas, exportPaletteToCanvas, PartialColorMode } from "./export";
import { NOTO_SANS_REGULAR, NOTO_SANS_BOLD } from "./fonts";
import { getThemeById } from "./themes";


export interface PDFCsvRow {
  number: string;
  text: string;
}

export interface PDFExportOptions {
  projects?: {
    data: ColorByNumberData;
    filled: FilledMap;
    partialColorMode: PartialColorMode;
    removeBackground?: boolean;
  }[];
  directImages?: {
    colorUrl: string;
    uncolorUrl: string;
    paletteUrl?: string;
  }[];
  backgroundImages: string[]; // Array of Data URLs or URLs
  csvData: PDFCsvRow[];
  prefixPages?: string[]; // Array of image data URLs
  suffixPages?: string[]; // Array of image data URLs
  solutionPages?: string[]; // Array of image data URLs (collage gallery)
  globalOptions: {
    showCodes: boolean;
    showPalette: boolean;
    theme: string;
    showStoryInput: boolean;
    globalExportPalette?: boolean;
    paletteImages?: string[];
  };

}

/**
 * PDF generation module for KDP-compatible books
 * Page size: 8.625 x 11.25 inches
 * Padding: 0.4 inches
 * DPI: 300 (standard for printing)
 */

const PAGE_W_IN = 8.625;
const PAGE_H_IN = 11.25;
const PADDING_IN = 0;

// jsPDF points (1 inch = 72 points)
const PT_PER_IN = 72;
const PAGE_W_PT = PAGE_W_IN * PT_PER_IN;
const PAGE_H_PT = PAGE_H_IN * PT_PER_IN;
const PADDING_PT = PADDING_IN * PT_PER_IN;
const SAFE_W_PT = PAGE_W_PT - PADDING_PT * 2;
const SAFE_H_PT = PAGE_H_PT - PADDING_PT * 2;

async function removeBackgroundFromDataUrl(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(dataUrl);
                return;
            }
            ctx.drawImage(img, 0, 0);
            
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const width = canvas.width;
                const height = canvas.height;
                
                // If top-left pixel is already transparent, assume it's already a clean PNG
                if (data[3] < 10) {
                    resolve(dataUrl);
                    return;
                }

                // Sample top-left pixel as the background color
                const bgR = data[0];
                const bgG = data[1];
                const bgB = data[2];
                const tolerance = 20; // Tolerance for JPG artifacts

                const isBackground = (idx: number) => {
                    return Math.abs(data[idx] - bgR) <= tolerance && 
                           Math.abs(data[idx+1] - bgG) <= tolerance && 
                           Math.abs(data[idx+2] - bgB) <= tolerance &&
                           data[idx+3] > 0;
                };

                const visited = new Uint8Array(width * height);
                const stack: [number, number][] = [];

                // Push edges to stack
                for (let x = 0; x < width; x++) {
                    stack.push([x, 0]);
                    stack.push([x, height - 1]);
                }
                for (let y = 0; y < height; y++) {
                    stack.push([0, y]);
                    stack.push([width - 1, y]);
                }

                while (stack.length > 0) {
                    const [x, y] = stack.pop()!;
                    const pixelIndex = y * width + x;
                    
                    if (visited[pixelIndex]) continue;
                    visited[pixelIndex] = 1;

                    const dataIndex = pixelIndex * 4;
                    if (isBackground(dataIndex)) {
                        data[dataIndex + 3] = 0; // Make transparent
                        
                        if (x > 0) stack.push([x - 1, y]);
                        if (x < width - 1) stack.push([x + 1, y]);
                        if (y > 0) stack.push([x, y - 1]);
                        if (y < height - 1) stack.push([x, y + 1]);
                    }
                }
                
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            } catch (e) {
                console.error("Failed to remove background", e);
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
};

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
  const { projects = [], directImages = [], backgroundImages = [], csvData, prefixPages = [], suffixPages = [], globalOptions } = options;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [PAGE_W_PT, PAGE_H_PT],
  });

  // Register Noto Sans Font
  pdf.addFileToVFS("NotoSans-Regular.ttf", NOTO_SANS_REGULAR);
  pdf.addFileToVFS("NotoSans-Bold.ttf", NOTO_SANS_BOLD);
  pdf.addFont("NotoSans-Regular.ttf", "Noto Sans", "normal");
  pdf.addFont("NotoSans-Bold.ttf", "Noto Sans", "bold");
  pdf.setFont("Noto Sans", "normal");

  const totalPairs = directImages.length > 0 ? directImages.length : projects.length;
  const totalPrefix = prefixPages.length;
  const totalSuffix = suffixPages.length;
  const totalSolution = options.solutionPages?.length || 0;
  const totalPages = totalPrefix + totalPairs * 2 + totalSolution + totalSuffix;

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
    const csvRow = csvData[i] || { number: "", text: "" };

    // Omit Left Text Page & Right Uncolored Page if this is a transparent background project (single page per project)
    const project = directImages.length === 0 ? projects[i] : null;
    const isTransparentProject = Boolean(project?.removeBackground);
    const theme = getThemeById(globalOptions.theme);
    const bgColorHex = theme.backgroundColor;

    // --- EVEN PAGE (Left Page) ---
    if (!isTransparentProject) {
      if (currentPageIndex > 0) pdf.addPage();
      currentPageIndex++;
      
      // Determine text color based on background brightness
      const getBrightness = (hex: string) => {
        const s = hex.replace("#", "");
        if (s.length !== 6) return 255;
        const r = parseInt(s.slice(0, 2), 16);
        const g = parseInt(s.slice(2, 4), 16);
        const b = parseInt(s.slice(4, 6), 16);
        return (r * 299 + g * 587 + b * 114) / 1000;
      };
      const textColorHex = getBrightness(bgColorHex) < 128 ? "#ffffff" : "#1a1a1a";

      
      // Background Image or Color
      if (backgroundImages.length > 0) {
        const bgImg = backgroundImages[i % backgroundImages.length];
        pdf.addImage(
          bgImg,
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

      let paletteImgData: string | undefined;

      if (globalOptions.globalExportPalette) {
          if (directImages && directImages.length > 0 && directImages[i]?.paletteUrl) {
              paletteImgData = await removeBackgroundFromDataUrl(directImages[i].paletteUrl!);
          } else if (globalOptions.paletteImages && globalOptions.paletteImages.length > i && globalOptions.paletteImages[i]) {
              paletteImgData = await removeBackgroundFromDataUrl(globalOptions.paletteImages[i]);
          } else if (project?.data) {
              // Render Palette Image mixed with Background
              const canvasPalette = exportPaletteToCanvas(project.data, {
                  bgColor: bgColorHex,
                  themeColor: bgColorHex,
                  pageNumber: i + 1,
                  transparentBg: true,
                  removeBgColorCells: true,
              });
              paletteImgData = canvasPalette.toDataURL("image/png");
          }
      }

      if (paletteImgData) {
          try {
              const paletteImage = await loadImageFromDataUrl(paletteImgData);
              
              // Calculate scale to fit within safe area
              const scaleX = SAFE_W_PT / paletteImage.width;
              const scaleY = SAFE_H_PT / paletteImage.height;
              const scale = Math.min(scaleX, scaleY);
              
              const scaledW = paletteImage.width * scale;
              const scaledH = paletteImage.height * scale;
              
              const dx = PADDING_PT + (SAFE_W_PT - scaledW) / 2;
              const dy = PADDING_PT + (SAFE_H_PT - scaledH) / 2;

              pdf.addImage(
                  paletteImgData,
                  "PNG",
                  dx,
                  dy,
                  scaledW,
                  scaledH,
                  undefined,
                  "FAST"
              );
          } catch (e) {
              console.error(e);
          }
      } else {
          // Overlay Text (Quotes/Riddle)
          pdf.setTextColor(textColorHex);
          
          pdf.setFont("Noto Sans", "bold");
          
          pdf.setFontSize(38); // 38px (pt in jsPDF)
          const numText = csvRow.number.toString();
          const numW = pdf.getTextWidth(numText);

          pdf.setFontSize(14); // 14px (pt in jsPDF)
          
          // Text constraint: "khoảng 1/3 ở giữa" (middle 1/3 of the page width)
          const textMaxWidth = PAGE_W_PT / 3;
          const splitText = pdf.splitTextToSize(csvRow.text, textMaxWidth);
          const textHeight = splitText.length * 14 * 1.15;
          
          // Center vertically in the upper-middle area, shifted up by 20pt
          let startY = (PAGE_H_PT * 0.45) - 20; 
          
          if (!globalOptions.showStoryInput) {
              // Adjust content for center
              startY = (PAGE_H_PT / 2) - 10 - (textHeight / 2);
          }

          pdf.setFont("Noto Sans", "bold");
          pdf.setFontSize(38);
          pdf.text(numText, (PAGE_W_PT - numW) / 2, startY);

          // Decorative line under the number
          const lineY = startY + 20;
          const lineLength = 40; // Short decorative line
          pdf.setDrawColor(textColorHex);
          pdf.setLineWidth(1.5);
          pdf.line((PAGE_W_PT - lineLength) / 2, lineY, (PAGE_W_PT + lineLength) / 2, lineY);

          pdf.setFont("Noto Sans", "normal");
          
          pdf.setFontSize(14); // 14px (pt in jsPDF)
          
          // Center the text body horizontally below the line
          const textStartY = lineY + 30;
          pdf.text(splitText, PAGE_W_PT / 2, textStartY, { align: "center" });

          if (globalOptions.showStoryInput) {
              // Add white box with dotted line below the text
              const textBottomY = textStartY + textHeight;

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
          }
      }

      if (onProgress) {
          onProgress(currentPageIndex, totalPages);
          await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // --- ODD PAGE (Right Page / Object Page) ---
    if (currentPageIndex > 0) pdf.addPage();
    currentPageIndex++;

    let imgData: string;
    
    if (directImages.length > 0) {
      imgData = directImages[i].uncolorUrl;
    } else {
      const canvas = exportToCanvas(project!.data, project!.filled, {
        showCodes: project!.removeBackground ? false : globalOptions.showCodes,
        colored: isTransparentProject, // Only export colored for transparent mode
        showPalette: project!.removeBackground ? false : globalOptions.showPalette,
        partialColorMode: project!.partialColorMode,
        bgColor: bgColorHex,
        transparentBg: project!.removeBackground,
        tightCrop: project!.removeBackground,
        removeBgColorCells: globalOptions.globalExportPalette,
      });

      imgData = canvas.toDataURL("image/png");
    }

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

  // --- SOLUTION PAGES (Answer Keys) ---
  if (options.solutionPages && options.solutionPages.length > 0) {
    for (let i = 0; i < options.solutionPages.length; i++) {
        pdf.addPage();
        currentPageIndex++;

        pdf.addImage(
            options.solutionPages[i],
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
