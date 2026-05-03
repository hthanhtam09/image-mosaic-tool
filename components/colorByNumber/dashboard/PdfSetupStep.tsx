"use client";

import { THEMES } from "@/lib/colorByNumber/themes";
import { PDFCsvRow } from "@/lib/colorByNumber/pdfExport";
import { DirectImage } from "@/lib/colorByNumber";
import Image from "next/image";


interface PdfSetupStepProps {
    directImages: DirectImage[];
    uploadedFolders: { color: boolean; uncolor: boolean; palette: boolean };
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
    setUploadedFolders: (status: { color: boolean; uncolor: boolean; palette: boolean }) => void;
    handleGeneratePdf: () => void;
    showStoryInput: boolean;
    setShowStoryInput: (val: boolean) => void;
    globalExportPalette: boolean;
    paletteImages: string[];
    setPaletteImages: (imgs: string[]) => void;
    paletteInputRef: React.RefObject<HTMLInputElement | null>;
    handlePaletteChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
}: PdfSetupStepProps) {
    return (
        <div className="flex-1 flex flex-col py-2 overflow-y-auto no-scrollbar">
            {/* Folder Flow Status Header */}
            {directImages.length > 0 && (
                <div className="max-w-5xl mx-auto w-full mb-6 flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-(--text-primary)">Folder Mode Active</h2>
                            <p className="text-[10px] text-(--text-secondary) uppercase tracking-wider font-semibold">{directImages.length} Pairs Loaded</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border shadow-sm transition-all duration-500 ${uploadedFolders.color ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-500/5 border-gray-500/10 text-(--text-muted)'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${uploadedFolders.color ? 'bg-white text-green-600' : 'bg-gray-500/20'}`}>
                                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                Color
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border shadow-sm transition-all duration-500 ${uploadedFolders.uncolor ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-500/5 border-gray-500/10 text-(--text-muted)'}`}>
                                <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center ${uploadedFolders.uncolor ? 'bg-white text-blue-600' : 'bg-gray-500/20'}`}>
                                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                Uncolor
                            </div>
                            {uploadedFolders.palette && (
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold border shadow-sm transition-all duration-500 bg-pink-500 border-pink-400 text-white`}>
                                    <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center bg-white text-pink-600`}>
                                        <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                    </div>
                                    Palette
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* 1. Intro Pages */}
                <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-(--text-primary) mb-1">Intro Pages</h3>
                        <p className="text-xs text-(--text-secondary) text-center mb-5">Front matter, copyright, instructions (Pages 1-5)</p>

                        {prefixPages.length > 0 ? (
                            <div className="flex flex-col items-center w-full gap-3">
                                <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                    {prefixPages.map((page, i) => (
                                        <div key={i} className="shrink-0 relative w-12 h-16 rounded border border-(--border-default) overflow-hidden shadow-sm">
                                            <Image src={page} alt={`Intro ${i + 1}`} width={48} height={64} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setPrefixPages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                    <button onClick={() => prefixInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent)/10 rounded-lg transition-colors">Add More</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => prefixInputRef.current?.click()} className="px-4 py-2 bg-(--bg-primary) border border-(--border-default) rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Select Images</button>
                        )}
                        <input ref={prefixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePrefixChange} />
                    </div>
                    {prefixPages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({prefixPages.length})</div>}
                </div>

                {/* 2. Background Image */}
                <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-(--text-primary) mb-1">Background Theme</h3>
                        <p className="text-xs text-(--text-secondary) text-center mb-5">Design applied to all left-side pages (cycles through multiple images)</p>

                        {bgImages.length > 0 ? (
                            <div className="flex flex-col items-center w-full gap-3">
                                <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                    {bgImages.map((img, i) => (
                                        <div key={i} className="shrink-0 relative w-12 h-16 rounded border border-(--border-default) overflow-hidden shadow-sm">
                                            <Image src={img} alt={`BG ${i + 1}`} width={48} height={64} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setBgImages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                    <button onClick={() => bgInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent)/10 rounded-lg transition-colors">Add More</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => bgInputRef.current?.click()} className="px-4 py-2 bg-(--bg-primary) border border-(--border-default) rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Select Images</button>
                        )}
                        <input ref={bgInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handleBgChange} />
                    </div>
                    {bgImages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({bgImages.length})</div>}
                    {bgImages.length === 0 && <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Optional</div>}
                </div>

                {/* 3. CSV Text Content OR Palette Images */}
                {!globalExportPalette ? (
                    <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-(--text-primary) mb-1">Story Content</h3>
                            <p className="text-xs text-(--text-secondary) text-center mb-4">Fun facts and text blocks via CSV</p>

                            <div className="flex items-center gap-2 mb-4 w-full bg-black/5 p-2 rounded-lg justify-between border border-(--border-subtle)">
                                <span className="text-xs font-medium text-(--text-primary)">Include Writing Box</span>
                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={showStoryInput}
                                        onChange={(e) => setShowStoryInput(e.target.checked)}
                                    />
                                    <div className="w-8 h-4 bg-gray-500/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                                </label>
                            </div>

                            {csvFileName && csvData.length > 0 ? (
                                <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="w-full max-w-50 bg-(--bg-primary) rounded border border-(--border-default) overflow-hidden">
                                        <div className="bg-black/5 px-2 py-1 text-[10px] font-medium text-(--text-secondary) border-b border-(--border-default) flex justify-between">
                                            <span>#</span><span>Text Preview</span>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {csvData.slice(0, 3).map((r, i) => (
                                                <div key={i} className="flex gap-2 text-xs">
                                                    <span className="text-(--text-secondary) w-4 shrink-0 font-mono">{r.number}</span>
                                                    <span className="text-(--text-primary) truncate">{r.text}</span>
                                                </div>
                                            ))}
                                            {csvData.length > 3 && (
                                                <div className="text-[10px] text-center text-(--text-secondary) pt-1 border-t border-(--border-default)">+{csvData.length - 3} more rows</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => { setCsvFileName(""); setCsvData([]); }} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                        <button onClick={() => csvInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent)/10 rounded-lg transition-colors">Change CSV</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => csvInputRef.current?.click()} className="px-4 py-2 bg-(--bg-primary) border border-(--border-default) rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Upload CSV File</button>
                            )}
                            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
                        </div>
                        {csvFileName && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({csvData.length})</div>}
                    </div>
                ) : (
                    <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                            <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-(--text-primary) mb-1">Palette Images</h3>
                            <p className="text-xs text-(--text-secondary) text-center mb-5">Upload custom palettes for the left pages</p>

                            {directImages.length > 0 ? (
                                <div className="flex flex-col items-center justify-center bg-black/5 rounded-xl border border-dashed border-(--border-subtle) w-full py-6">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${uploadedFolders.palette ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {uploadedFolders.palette ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-(--text-primary)">
                                        {uploadedFolders.palette ? "Loaded from Folder Mode" : "No Palette Folder"}
                                    </span>
                                </div>
                            ) : paletteImages.length > 0 ? (
                                <div className="flex flex-col items-center w-full gap-3">
                                    <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                        {paletteImages.map((img, i) => (
                                            <div key={i} className="shrink-0 relative w-12 h-16 rounded border border-(--border-default) overflow-hidden shadow-sm">
                                                <Image src={img} alt={`Palette ${i + 1}`} width={48} height={64} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPaletteImages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                        <button onClick={() => paletteInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent)/10 rounded-lg transition-colors">Change Images</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => paletteInputRef.current?.click()} className="px-4 py-2 bg-(--bg-primary) border border-(--border-default) rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Upload Images</button>
                            )}
                            <input ref={paletteInputRef} type="file" accept="image/png,image/jpeg" multiple className="hidden" onChange={handlePaletteChange} />
                        </div>
                        {paletteImages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({paletteImages.length})</div>}
                    </div>
                )}

                {/* 4. Outro Pages */}
                <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        </div>
                        <h3 className="text-sm font-semibold text-(--text-primary) mb-1">Outro Pages</h3>
                        <p className="text-xs text-(--text-secondary) text-center mb-5">Answer keys, cross-promotion, back cover</p>

                        {suffixPages.length > 0 ? (
                            <div className="flex flex-col items-center w-full gap-3">
                                <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-2 no-scrollbar">
                                    {suffixPages.map((page, i) => (
                                        <div key={i} className="shrink-0 relative w-12 h-16 rounded border border-(--border-default) overflow-hidden shadow-sm">
                                            <Image src={page} alt={`Outro ${i + 1}`} width={48} height={64} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] rounded" />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setSuffixPages([])} className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">Clear</button>
                                    <button onClick={() => suffixInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-(--accent) hover:bg-(--accent)/10 rounded-lg transition-colors">Add More</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => suffixInputRef.current?.click()} className="px-4 py-2 bg-(--bg-primary) border border-(--border-default) rounded-lg shadow-sm text-sm font-medium hover:bg-black/5 transition-colors">Select Images</button>
                        )}
                        <input ref={suffixInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSuffixChange} />
                    </div>
                    {suffixPages.length > 0 && <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Loaded ({suffixPages.length})</div>}
                    {suffixPages.length === 0 && <div className="absolute top-4 right-4 bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Optional</div>}
                </div>

                {/* 5. Theme Selection (Only for Upload Folder flow) */}
                {directImages.length > 0 && (
                    <div className="bg-(--bg-secondary) rounded-2xl p-5 border border-(--border-subtle) flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18" /></svg>
                            </div>
                            <h3 className="text-sm font-semibold text-(--text-primary) mb-1">PDF Theme</h3>
                            <p className="text-xs text-(--text-secondary) text-center mb-5">Select a background theme for your book</p>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar w-full max-w-2xl mx-auto">
                                {THEMES.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setGlobalTheme(theme.id)}
                                        className={`px-3 py-2 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2 border ${globalTheme === theme.id
                                            ? 'bg-(--accent) text-white border-(--accent) shadow-md'
                                            : 'bg-(--bg-primary) border-(--border-default) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-subtle)'
                                            }`}
                                    >
                                        <div
                                            className={`w-3 h-3 rounded-full border ${globalTheme === theme.id ? 'border-white/40' : 'border-black/5'}`}
                                            style={{ backgroundColor: theme.backgroundColor }}
                                        />
                                        <span className="truncate">{theme.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="absolute top-4 right-4 bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase">Required</div>
                    </div>
                )}
            </div>

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between mt-6 max-w-5xl mx-auto w-full pt-4 border-t border-(--border-subtle)">
                <button
                    onClick={() => {
                        setCurrentStep(1);
                        if (directImages.length > 0) {
                            setDirectImages([]);
                            setUploadedFolders({ color: false, uncolor: false, palette: false });
                        }
                    }}
                    className="px-6 py-2 text-sm font-medium text-(--text-secondary) border border-(--border-default) rounded-lg hover:bg-white/5 transition-colors"
                >
                    Back to Grid
                </button>
                <button
                    onClick={handleGeneratePdf}
                    className="px-6 py-2 text-sm font-bold text-white bg-(--accent) hover:bg-(--accent-hover) rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                >
                    Generate & Download PDF
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
            </div>
        </div>
    );
}
