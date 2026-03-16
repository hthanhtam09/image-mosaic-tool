"use client";

interface EmptyStateProps {
    handleImportClick: () => void;
    dirInputRef: React.RefObject<HTMLInputElement | null>;
    handleDirUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isProcessingFolder: boolean;
    uploadedFolders: { color: boolean; uncolor: boolean };
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    handleImageFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function EmptyState({
    handleImportClick,
    dirInputRef,
    handleDirUploadChange,
    isProcessingFolder,
    uploadedFolders,
    imageInputRef,
    handleImageFileChange,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-8 text-center max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                {/* Standard Import */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 flex flex-col items-center hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Standard Import</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-8">Best for converting new images into patterns one by one.</p>
                    <button
                        onClick={handleImportClick}
                        className="w-full py-4 text-lg font-medium text-[var(--bg-primary)] bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl shadow-lg transition-all"
                    >
                        Select Images
                    </button>
                </div>

                {/* Folder Upload */}
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-2xl p-8 flex flex-col items-center hover:shadow-xl transition-all group">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Folder Upload</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">Upload folder containing <b>color/</b> and <b>uncolor/</b> subfolders.</p>

                    {/* Folder Status Indicators with Enhanced Effects */}
                    <div className="flex gap-4 mb-6">
                        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-700 shadow-sm ${uploadedFolders.color
                            ? 'bg-green-500 border-green-400 text-white scale-110 shadow-[0_0_25px_rgba(34,197,94,0.6)] animate-pulse'
                            : 'bg-gray-500/5 border-gray-500/20 text-[var(--text-muted)] opacity-60'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${uploadedFolders.color ? 'bg-white text-green-600' : 'bg-gray-500/30'}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <span className="tracking-wide">Color Folder</span>
                        </div>
                        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold border transition-all duration-700 shadow-sm ${uploadedFolders.uncolor
                            ? 'bg-blue-600 border-blue-400 text-white scale-110 shadow-[0_0_25px_rgba(59,130,246,0.6)] animate-pulse'
                            : 'bg-gray-500/5 border-gray-500/20 text-[var(--text-muted)] opacity-60'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${uploadedFolders.uncolor ? 'bg-white text-blue-600' : 'bg-gray-500/30'}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <span className="tracking-wide">Uncolor Folder</span>
                        </div>
                    </div>

                    <button
                        onClick={() => dirInputRef.current?.click()}
                        disabled={isProcessingFolder}
                        className="w-full py-4 text-lg font-medium text-blue-500 border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl shadow-lg transition-all relative flex items-center justify-center gap-3"
                    >
                        {isProcessingFolder ? (
                            <>
                                <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Scanning Folder...
                            </>
                        ) : (
                            "Select Folder"
                        )}
                    </button>
                </div>
            </div>

            <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                multiple
                onChange={handleImageFileChange}
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
