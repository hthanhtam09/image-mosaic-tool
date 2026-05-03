import React, { useState } from "react";

interface EmptyStateProps {
    handleImportClick: () => void;
    dirInputRef: React.RefObject<HTMLInputElement | null>;
    handleDirUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingFolder: boolean;
    uploadedFolders: { color: boolean; uncolor: boolean; palette: boolean };
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    handleImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;

    // Transparent Importer
    handleImportTransparentClick: () => void;
    transparentImageInputRef: React.RefObject<HTMLInputElement | null>;
    handleTransparentImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    
    // Navigation
    handleNextToSetup?: () => void;
    isPreparingStep2?: boolean;
}

type TabType = "standard" | "object" | "folder";

export default function EmptyState({
    handleImportClick,
    dirInputRef,
    handleDirUploadChange,
    isProcessingFolder,
    uploadedFolders,
    imageInputRef,
    handleImageFileChange,
    handleImportTransparentClick,
    transparentImageInputRef,
    handleTransparentImageFileChange,
    handleNextToSetup,
    isPreparingStep2,
}: EmptyStateProps) {
    const [activeTab, setActiveTab] = useState<TabType>("standard");

    const tabs = [
        {
            id: "standard" as TabType,
            name: "Standard Import",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
            ),
            color: "var(--accent)",
        },
        {
            id: "object" as TabType,
            name: "Object Focus",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
            ),
            color: "#a855f7", // purple-500
        },
        {
            id: "folder" as TabType,
            name: "Folder Upload",
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            ),
            color: "#3b82f6", // blue-500
        },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "standard":
                return (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(34,211,238,0.1)]">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Standard Import</h2>
                        <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-md">
                            Convert multiple images into mosaic patterns. Focuses on the entire frame of each image.
                        </p>
                        <button
                            onClick={handleImportClick}
                            className="px-12 py-5 text-xl font-semibold text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-2xl shadow-[0_8px_30px_rgb(34,211,238,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            Select Images
                        </button>
                    </div>
                );
            case "object":
                return (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(168,85,247,0.1)] relative">
                             <div className="absolute -top-2 -right-2 bg-purple-500 text-white p-1.5 rounded-full shadow-lg">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                             </div>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Object Focus</h2>
                        <p className="text-lg text-[var(--text-secondary)] mb-12 max-w-md">
                            Automatically strips white backgrounds to isolate the main object. Perfect for creating character stickers.
                        </p>
                        <button
                            onClick={handleImportTransparentClick}
                            className="px-12 py-5 text-xl font-semibold text-white bg-purple-500 hover:bg-purple-600 rounded-2xl shadow-[0_8px_30px_rgba(168,85,247,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            Transparent Import
                        </button>
                    </div>
                );
            case "folder":
                return (
                    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h2 className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">Folder Upload</h2>
                        <p className="text-lg text-[var(--text-secondary)] mb-8 max-w-md">
                            Bulk upload images with pre-separated <b>color/</b>, <b>uncolor/</b>, and optional <b>palette/</b> subfolders.
                        </p>

                        <div className="flex gap-4 mb-12">
                            <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${uploadedFolders.color
                                ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                                : 'bg-white/5 border-white/10 text-[var(--text-muted)]'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.color ? 'bg-green-500 text-white' : 'bg-white/10'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <span>Color</span>
                            </div>
                            <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${uploadedFolders.uncolor
                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                                : 'bg-white/5 border-white/10 text-[var(--text-muted)]'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.uncolor ? 'bg-blue-500 text-white' : 'bg-white/10'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <span>Uncolor</span>
                            </div>
                            <div className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold border transition-all duration-500 min-w-[120px] ${uploadedFolders.palette
                                ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                                : 'bg-white/5 border-white/10 text-[var(--text-muted)]'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${uploadedFolders.palette ? 'bg-pink-500 text-white' : 'bg-white/10'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span>Palette</span>
                                    <span className="text-[10px] font-normal opacity-70">(Optional)</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 items-center">
                            <button
                                onClick={() => dirInputRef.current?.click()}
                                disabled={isProcessingFolder}
                                className="px-12 py-4 text-lg font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[260px]"
                            >
                                {isProcessingFolder ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        Scanning...
                                    </>
                                ) : (
                                    "Select Root Folder"
                                )}
                            </button>
                            
                            {uploadedFolders.color && uploadedFolders.uncolor && (
                                <button
                                    onClick={handleNextToSetup}
                                    disabled={isPreparingStep2 || isProcessingFolder}
                                    className="px-12 py-4 text-lg font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-[0_8px_30px_rgba(37,99,235,0.3)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 w-[260px] animate-in fade-in slide-in-from-bottom-2"
                                >
                                    {isPreparingStep2 ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Continue to Setup
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-[var(--bg-primary)]">
            {/* Left Sidebar Navigation */}
            <aside className="w-24 flex flex-col items-center py-10 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] z-20 shadow-[10px_0_30px_rgba(0,0,0,0.2)]">
                <div className="flex-1 flex flex-col items-center gap-10 w-full px-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative group w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive
                                    ? "bg-white/10 text-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5"
                                    }`}
                                title={tab.name}
                            >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div
                                        className="absolute -left-2 w-1.5 h-8 rounded-r-full animate-in fade-in zoom-in duration-300"
                                        style={{ backgroundColor: tab.color }}
                                    />
                                )}
                                
                                <div className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                                    {tab.icon}
                                </div>
                                
                                {/* Tooltip on Hover */}
                                <div className="absolute left-20 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-white opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-50">
                                    {tab.name}
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Bottom Decorative Element */}
                <div className="mt-auto opacity-20 hover:opacity-40 transition-opacity">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
            </aside>

            {/* Main functional Area */}
            <main className="flex-1 relative overflow-hidden flex items-center justify-center p-8 bg-grid-pattern">
                {/* Decorative Background Glows */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="w-full max-w-4xl z-10 text-center">
                    {renderContent()}
                </div>
            </main>

            {/* Hidden Inputs */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                multiple
                onChange={handleImageFileChange}
            />
            <input
                ref={transparentImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                multiple
                onChange={handleTransparentImageFileChange}
            />
            <input
                ref={dirInputRef}
                type="file"
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement> & { webkitdirectory: string; directory: string })}
                className="hidden"
                onChange={handleDirUploadChange}
            />
        </div>
    );
}
