"use client";

import React from "react";
import { THEMES } from "@/lib/colorByNumber/themes";
import { PDFCsvRow } from "@/lib/colorByNumber/pdfExport";
import { DirectImage } from "@/lib/colorByNumber";
import Image from "next/image";

interface UploadZoneProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}

const UploadZone = ({ onClick, label, disabled }: UploadZoneProps) => (
  <div 
    onClick={disabled ? undefined : onClick}
    className={`mt-3.5 w-full border border-dashed border-white/10 rounded-xl py-6 flex flex-col items-center justify-center transition-all duration-300 group/upload ${
      disabled 
        ? "opacity-40 cursor-not-allowed pointer-events-none bg-white/[0.005]" 
        : "hover:border-[var(--accent)]/40 bg-white/[0.01] hover:bg-white/[0.03] active:scale-[0.99] cursor-pointer"
    }`}
  >
    <div className={`w-9 h-9 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-2 transition-transform duration-300 ${!disabled && "group-hover/upload:scale-105"}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </div>
    <span className="text-xs font-semibold text-white/80 group-hover/upload:text-white transition-colors">{label}</span>
    <span className="text-[10px] text-white/45 mt-0.5">JPEG, PNG up to 10MB</span>
  </div>
);

interface ThumbnailListProps {
  pages: string[];
  onRemove: (idx: number) => void;
  onAddMore: () => void;
  disabled?: boolean;
}

const ThumbnailList = ({ 
  pages, 
  onRemove, 
  onAddMore,
  disabled
}: ThumbnailListProps) => (
  <div className="mt-3.5 flex flex-col gap-2">
    <div className="flex items-center gap-2.5 max-w-full overflow-x-auto pb-2.5 custom-scrollbar">
      {pages.map((page, i) => (
        <div key={i} className="group/thumb shrink-0 relative w-15 h-20 rounded-xl border border-white/10 bg-black/30 overflow-hidden shadow-md transition-transform duration-200 hover:-translate-y-0.5">
          <Image src={page} alt={`Page ${i + 1}`} width={60} height={80} unoptimized className="w-full h-full object-cover" />
          
          {/* Hover overlay for delete */}
          <div className={`absolute inset-0 bg-black/60 opacity-0 transition-opacity flex flex-col items-center justify-between p-1 z-10 ${!disabled && "group-hover/thumb:opacity-100"}`}>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              disabled={disabled}
              className="self-end w-4.5 h-4.5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition shadow-md active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete page"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <span className="text-[9px] font-bold text-white/90 bg-black/40 px-1 py-0.5 rounded backdrop-blur-xs select-none">P. {i + 1}</span>
          </div>
        </div>
      ))}
      
      <button 
        type="button"
        onClick={onAddMore}
        disabled={disabled}
        className="shrink-0 w-15 h-20 rounded-xl border border-dashed border-white/15 hover:border-[var(--accent)] bg-white/[0.01] hover:bg-white/[0.03] flex flex-col items-center justify-center text-white/40 hover:text-white/80 transition active:scale-95 shadow-sm disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
        title="Add page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span className="text-[9px] font-semibold mt-1">Add</span>
      </button>
    </div>
  </div>
);

interface PdfSetupStepProps {
  directImages: DirectImage[];
  uploadedFolders: { color: boolean; uncolor: boolean; palette: boolean; solutionsCollage: boolean };
  prefixPages: string[];
  prefixInputRef: React.RefObject<HTMLInputElement | null>;
  handlePrefixChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setPrefixPages: (pages: string[]) => void;
  bgImages: string[];
  bgInputRef: React.RefObject<HTMLInputElement | null>;
  handleBgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setBgImages: (imgs: string[]) => void;
  csvFileName: string;
  csvData: PDFCsvRow[];
  csvInputRef: React.RefObject<HTMLInputElement | null>;
  handleCsvChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setCsvFileName: (name: string) => void;
  setCsvData: (data: PDFCsvRow[]) => void;
  suffixPages: string[];
  suffixInputRef: React.RefObject<HTMLInputElement | null>;
  handleSuffixChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setSuffixPages: (pages: string[]) => void;
  globalTheme: string;
  setGlobalTheme: (theme: string) => void;
  setCurrentStep: (step: 1 | 2 | 3) => void;
  setDirectImages: (imgs: DirectImage[]) => void;
  setUploadedFolders: (status: { color: boolean; uncolor: boolean; palette: boolean; solutionsCollage: boolean }) => void;
  handleGeneratePdf: () => void;
  showStoryInput: boolean;
  setShowStoryInput: (val: boolean) => void;
  globalExportPalette: boolean;
  paletteImages: string[];
  setPaletteImages: (imgs: string[]) => void;
  paletteInputRef: React.RefObject<HTMLInputElement | null>;
  handlePaletteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  solutionCollagePages: string[];
  setSolutionCollagePages: (pages: string[]) => void;
  solutionCollageInputRef: React.RefObject<HTMLInputElement | null>;
  handleSolutionCollageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  solutionNameList: string[];
  solutionNamesInputRef: React.RefObject<HTMLInputElement | null>;
  handleSolutionNamesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export default function PdfSetupStep({
  directImages,
  uploadedFolders,
  prefixPages,
  prefixInputRef,
  handlePrefixChange,
  setPrefixPages,
  bgImages,
  bgInputRef,
  handleBgChange,
  setBgImages,
  csvFileName,
  csvData,
  csvInputRef,
  handleCsvChange,
  setCsvFileName,
  setCsvData,
  suffixPages,
  suffixInputRef,
  handleSuffixChange,
  setSuffixPages,
  globalTheme,
  setGlobalTheme,
  setCurrentStep,
  setDirectImages,
  setUploadedFolders,
  handleGeneratePdf,
  showStoryInput,
  setShowStoryInput,
  globalExportPalette,
  paletteImages,
  setPaletteImages,
  paletteInputRef,
  handlePaletteChange,
  solutionCollagePages,
  setSolutionCollagePages,
  solutionCollageInputRef,
  handleSolutionCollageChange,
  solutionNameList,
  solutionNamesInputRef,
  handleSolutionNamesChange,
  disabled = false,
}: PdfSetupStepProps) {

  // Page removal handlers
  const removePrefixPage = (indexToRemove: number) => {
    setPrefixPages(prefixPages.filter((_, idx) => idx !== indexToRemove));
  };

  const removeBgImage = (indexToRemove: number) => {
    setBgImages(bgImages.filter((_, idx) => idx !== indexToRemove));
  };

  const removePaletteImage = (indexToRemove: number) => {
    setPaletteImages(paletteImages.map((img, idx) => idx === indexToRemove ? "" : img));
  };

  const removeSolutionPage = (indexToRemove: number) => {
    setSolutionCollagePages(solutionCollagePages.filter((_, idx) => idx !== indexToRemove));
  };

  const removeSuffixPage = (indexToRemove: number) => {
    setSuffixPages(suffixPages.filter((_, idx) => idx !== indexToRemove));
  };



  return (
    <div id="pdf-setup" className="flex-1 flex flex-col py-1 overflow-y-auto no-scrollbar">
      {/* Folder Flow Status Header */}
      {directImages.length > 0 && (
        <div className="max-w-5xl mx-auto w-full mb-6 px-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Folder Mode Active</h2>
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">{directImages.length} pairs loaded</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-300 ${uploadedFolders.color ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/[0.02] border-white/5 text-white/30'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${uploadedFolders.color ? 'bg-green-400 shadow-sm shadow-green-400/50' : 'bg-white/20'}`} />
                Color
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all duration-300 ${uploadedFolders.uncolor ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-white/[0.02] border-white/5 text-white/30'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${uploadedFolders.uncolor ? 'bg-blue-400 shadow-sm shadow-blue-400/50' : 'bg-white/20'}`} />
                Uncolor
              </div>
              {uploadedFolders.palette && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-sm shadow-pink-400/50" />
                  Palette
                </div>
              )}
              {uploadedFolders.solutionsCollage && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  Solutions
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Publishing Dashboard Content */}
      <div className="max-w-5xl mx-auto w-full flex flex-col lg:flex-row gap-6 items-start px-2">
        
        {/* Left Pane: Book Configuration Panel */}
        <div className="w-full lg:w-[320px] shrink-0 space-y-5">
          
          {/* General PDF Design Settings */}
          <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/5">
              <svg className="text-violet-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">Book Styling</h3>
            </div>
            
            {/* Color Theme Selector */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-white/55 uppercase tracking-wide">PDF Theme Color</label>
                <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/10 rounded-full font-semibold">
                  {THEMES.find(t => t.id === globalTheme)?.name || "Select"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/15 rounded-xl border border-white/5">
                {THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setGlobalTheme(theme.id)}
                    disabled={disabled}
                    title={theme.name}
                    className={`aspect-square rounded-lg transition-all relative flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none ${
                      globalTheme === theme.id 
                        ? "scale-105 shadow-md shadow-black/40 ring-1 ring-white/30" 
                        : "opacity-60 hover:opacity-100 hover:scale-[1.03]"
                    }`}
                    style={{ backgroundColor: theme.backgroundColor }}
                  >
                    {globalTheme === theme.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Story Content & Writing Box (Only for Standard Flow) */}
          {!globalExportPalette && directImages.length === 0 && (
            <div className="bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-5 shadow-xl shadow-black/10">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/5">
                <svg className="text-orange-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" />
                </svg>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">Story Setting</h3>
              </div>

              {/* Toggle writing box */}
              <div className="flex items-center justify-between p-2 bg-black/15 border border-white/5 rounded-xl mb-4.5">
                <span className="text-xs font-semibold text-white/70">Writing Box</span>
                <label className={`relative inline-flex items-center select-none ${disabled ? "cursor-not-allowed pointer-events-none opacity-50" : "cursor-pointer"}`}>
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={showStoryInput}
                    onChange={(e) => setShowStoryInput(e.target.checked)}
                    disabled={disabled}
                  />
                  <div className="w-8 h-4 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white/60 peer-checked:after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)]"></div>
                </label>
              </div>

              {/* CSV Upload */}
              <div className="space-y-3">
                <label className="text-[11px] font-bold text-white/55 uppercase tracking-wide block">Fun Facts / Sentences</label>
                {csvFileName && csvData.length > 0 ? (
                  <div className="space-y-3">
                    <div className="bg-black/20 rounded-xl border border-white/5 overflow-hidden">
                      <div className="bg-white/5 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-white/40 border-b border-white/5 flex justify-between">
                        <span>Preview</span>
                        <span className="text-[var(--accent)] font-semibold">{csvData.length} Facts</span>
                      </div>
                      <div className="p-2.5 space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                        {csvData.slice(0, 3).map((r, i) => (
                          <div key={i} className="flex gap-2 text-[11px] leading-normal">
                            <span className="text-white/30 font-bold font-mono">{r.number}</span>
                            <span className="text-white/70 truncate">{r.text}</span>
                          </div>
                        ))}
                        {csvData.length > 3 && (
                          <div className="text-[9px] text-center text-white/30 pt-1.5 border-t border-white/5 font-semibold">
                            +{csvData.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => { setCsvFileName(""); setCsvData([]); }} 
                        disabled={disabled}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={() => csvInputRef.current?.click()} 
                        disabled={disabled}
                        className="px-2.5 py-1.5 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => csvInputRef.current?.click()} 
                    disabled={disabled}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-white/5 hover:bg-white/10 active:scale-98 border border-white/10 rounded-xl text-xs font-bold text-white transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Upload CSV File
                  </button>
                )}
                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Publishing Pipeline (Page Flow Timeline) */}
        <div className="flex-1 min-w-0 relative pl-6 ml-4 border-l border-white/10 space-y-6">
          
          {/* Timeline Node 1: Intro Pages */}
          <div className="relative group bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition-all duration-300">
            {/* Step Number Dot centered on Timeline line */}
            <div className="absolute -left-[37px] top-6.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:border-[var(--accent)] group-hover:text-white transition-all duration-300 shadow-sm z-10">
              01
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Intro Pages</h3>
                  <p className="text-xs text-white/45 mt-0.5 leading-normal">Front matter, copyright, instructions (Pages 1-5)</p>
                </div>
              </div>
              <span className="text-[9px] font-bold bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Optional</span>
            </div>

            {prefixPages.length > 0 ? (
              <ThumbnailList 
                pages={prefixPages} 
                onRemove={removePrefixPage} 
                onAddMore={() => prefixInputRef.current?.click()} 
              />
            ) : (
              <UploadZone onClick={() => prefixInputRef.current?.click()} label="Select Intro Cover Images" />
            )}
            <input ref={prefixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePrefixChange} />
          </div>

          {/* Timeline Node 2: Background Images */}
          <div className="relative group bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition-all duration-300">
            <div className="absolute -left-[37px] top-6.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:border-[var(--accent)] group-hover:text-white transition-all duration-300 shadow-sm z-10">
              02
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 shadow-inner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Background Design</h3>
                  <p className="text-xs text-white/45 mt-0.5 leading-normal">Artwork applied to activity pages (automatically cycled)</p>
                </div>
              </div>
              <span className="text-[9px] font-bold bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Optional</span>
            </div>

            {bgImages.length > 0 ? (
              <ThumbnailList 
                pages={bgImages} 
                onRemove={removeBgImage} 
                onAddMore={() => bgInputRef.current?.click()} 
              />
            ) : (
              <UploadZone onClick={() => bgInputRef.current?.click()} label="Select Background Images" />
            )}
            <input ref={bgInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handleBgChange} />
          </div>

          {/* Timeline Node 3: Custom Palettes (Conditionally visible) */}
          {(globalExportPalette || directImages.length > 0) && (
            <div className="relative group bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition-all duration-300">
              <div className="absolute -left-[37px] top-6.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:border-[var(--accent)] group-hover:text-white transition-all duration-300 shadow-sm z-10">
                03
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0 shadow-inner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">Palette Layouts</h3>
                    <p className="text-xs text-white/45 mt-0.5 leading-normal">Upload custom palette keys for standard activity pages</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Required</span>
              </div>

              {paletteImages.some(Boolean) ? (
                <ThumbnailList 
                  pages={paletteImages.filter(Boolean)} 
                  onRemove={(idx) => {
                    // Map visual filtered index back to the original index
                    const activeIndices = paletteImages.map((img, i) => img ? i : -1).filter(i => i !== -1);
                    const originalIdx = activeIndices[idx];
                    if (originalIdx !== undefined) removePaletteImage(originalIdx);
                  }} 
                  onAddMore={() => paletteInputRef.current?.click()} 
                />
              ) : (
                <UploadZone onClick={() => paletteInputRef.current?.click()} label="Upload Custom Palette Images" />
              )}
              <input ref={paletteInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handlePaletteChange} />
            </div>
          )}

          {/* Timeline Node 4: Answer Keys / Solutions (Conditionally visible) */}
          {(globalExportPalette || directImages.length > 0) && (
            <div className="relative group bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition-all duration-300">
              <div className="absolute -left-[37px] top-6.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:border-[var(--accent)] group-hover:text-white transition-all duration-300 shadow-sm z-10">
                {globalExportPalette || directImages.length > 0 ? "04" : "03"}
              </div>

              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">Solutions Collage</h3>
                    <p className="text-xs text-white/45 mt-0.5 leading-normal">
                      {directImages.length > 0 ? "Upload custom answer sheets" : "Auto-synthesized from converted images"}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Optional</span>
              </div>

              {solutionCollagePages.length > 0 ? (
                <div className="space-y-4">
                  <ThumbnailList 
                    pages={solutionCollagePages} 
                    onRemove={removeSolutionPage} 
                    onAddMore={() => solutionCollageInputRef.current?.click()} 
                  />
                  {directImages.length === 0 && (
                    <div className="flex justify-start">
                      <button 
                        onClick={() => solutionNamesInputRef.current?.click()} 
                        disabled={disabled}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-lg text-xs font-semibold text-white/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        Import CSV Names {solutionNameList.length > 0 ? `(${solutionNameList.length})` : ""}
                      </button>
                    </div>
                  )}
                </div>
              ) : directImages.length > 0 ? (
                <UploadZone onClick={() => solutionCollageInputRef.current?.click()} label="Upload Solution Key Images" />
              ) : (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-black/15 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">Auto Build Active</span>
                      <p className="text-[10px] text-white/40 leading-tight">Collage page built automatically</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => solutionNamesInputRef.current?.click()} 
                    disabled={disabled}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-xs font-bold text-white transition disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Import Names CSV {solutionNameList.length > 0 ? `(${solutionNameList.length})` : ""}
                  </button>
                </div>
              )}
              <input ref={solutionCollageInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handleSolutionCollageChange} />
              <input ref={solutionNamesInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleSolutionNamesChange} />
            </div>
          )}

          {/* Timeline Node 5: Outro Cover Pages */}
          <div className="relative group bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 hover:border-white/10 rounded-2xl p-5 shadow-lg transition-all duration-300">
            <div className="absolute -left-[37px] top-6.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-2 border-white/20 flex items-center justify-center text-[10px] font-bold text-white/50 group-hover:border-[var(--accent)] group-hover:text-white transition-all duration-300 shadow-sm z-10">
              {globalExportPalette || directImages.length > 0 ? "05" : "03"}
            </div>

            <div className="flex justify-between items-start gap-4">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Outro Pages</h3>
                  <p className="text-xs text-white/45 mt-0.5 leading-normal">Cross-promotional pages, solutions, back cover (End of PDF)</p>
                </div>
              </div>
              <span className="text-[9px] font-bold bg-white/5 text-white/40 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Optional</span>
            </div>

            {suffixPages.length > 0 ? (
              <ThumbnailList 
                pages={suffixPages} 
                onRemove={removeSuffixPage} 
                onAddMore={() => suffixInputRef.current?.click()} 
              />
            ) : (
              <UploadZone onClick={() => suffixInputRef.current?.click()} label="Select Outro Cover Images" />
            )}
            <input ref={suffixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSuffixChange} />
          </div>

        </div>
      </div>
    </div>
  );
}
