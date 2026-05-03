"use client";

import { DirectImage } from "@/lib/colorByNumber";

interface PdfProgressStepProps {
    isGeneratingPdf: boolean;
    pdfProgress: { current: number; total: number };
    setCurrentStep: (step: 1 | 2 | 3) => void;
    setDirectImages: (imgs: DirectImage[]) => void;
    setUploadedFolders: (status: { color: boolean; uncolor: boolean; palette: boolean }) => void;
}

export default function PdfProgressStep({
    isGeneratingPdf,
    pdfProgress,
    setCurrentStep,
    setDirectImages,
    setUploadedFolders,
}: PdfProgressStepProps) {
    return (
        <div className="flex-1 flex flex-col py-2 items-center justify-center bg-(--bg-primary) z-50">
            <div className="w-full max-w-lg bg-(--bg-secondary) border border-(--border-subtle) rounded-2xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">

                {/* Connecting background lines */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--text-primary) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                <div className="relative z-10 flex flex-col items-center w-full">
                    {!isGeneratingPdf && pdfProgress.current === pdfProgress.total && pdfProgress.total !== 0 ? (
                        <>
                            <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-(--text-primary) mb-2 text-center">Export Complete!</h2>
                            <p className="text-(--text-secondary) text-center mb-8">Your KDP-ready PDF has been generated and downloaded.</p>

                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="flex-1 px-6 py-3 text-sm font-medium text-(--text-primary) border border-(--border-default) rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    Edit Settings
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentStep(1);
                                        setDirectImages([]);
                                        setUploadedFolders({ color: false, uncolor: false, palette: false });
                                    }}
                                    className="flex-1 px-6 py-3 text-sm font-medium text-white bg-(--accent) rounded-xl hover:bg-(--accent-hover) transition-colors"
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="relative w-24 h-24 mb-6">
                                <svg className="w-full h-full text-(--border-default)" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" />
                                </svg>
                                <svg className="w-full h-full absolute inset-0 text-(--accent) drop-shadow-md origin-center -rotate-90 transition-all duration-300" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="8"
                                        strokeDasharray="283"
                                        strokeDashoffset={283 - (283 * (pdfProgress.total ? pdfProgress.current / pdfProgress.total : 0))}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl text-(--text-primary)">
                                    {pdfProgress.total ? Math.round((pdfProgress.current / pdfProgress.total) * 100) : 0}%
                                </div>
                            </div>

                            <h2 className="text-xl font-bold text-(--text-primary) mb-2 text-center">
                                {pdfProgress.total && pdfProgress.current === pdfProgress.total ? "Finalizing PDF..." : "Generating Book..."}
                            </h2>
                            <p className="text-(--text-secondary) text-center text-sm mb-6">
                                {pdfProgress.total && pdfProgress.current === pdfProgress.total ? "Compressing and saving file structure. This might take a few seconds." : "Processing high-quality vectors. This may take a moment."}
                            </p>

                            <div className="w-full max-w-sm flex justify-between text-xs text-(--text-secondary) mb-2 font-mono">
                                <span>Page {pdfProgress.current}</span>
                                <span>Total {pdfProgress.total}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
