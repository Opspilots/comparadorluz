interface VideoModalProps {
    open: boolean
    onClose: () => void
}

export function VideoModal({ open, onClose }: VideoModalProps) {
    if (!open) return null

    return (
        <div
            className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-xl z-[3000] flex items-center justify-center p-6"
            onClick={onClose}
        >
            <div
                className="w-full max-w-[1000px] aspect-video bg-black rounded-3xl relative shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 bg-white/10 border-none w-10 h-10 rounded-full cursor-pointer text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                >
                    &times;
                </button>

                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0f172a]/50 to-[#0f172a]" />

                {/* Content overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-6">
                    {/* Play button */}
                    <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20 animate-pulse-ring">
                        <div className="w-0 h-0 border-t-[14px] border-t-transparent border-b-[14px] border-b-transparent border-l-[22px] border-l-white ml-1" />
                    </div>

                    <div className="text-center">
                        <h3 className="text-white text-2xl sm:text-3xl lg:text-[2.5rem] font-black mb-3 tracking-[-0.02em]">
                            EnergyDeal: La Revolucion
                        </h3>
                        <p className="text-white/70 text-base sm:text-lg max-w-[600px] mx-auto">
                            Optimizacion en tiempo real con IA. Mira como transformamos la gestion energetica.
                        </p>
                    </div>

                    {/* Scan line effect */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_20px_#3b82f6] animate-scan-line" />
                </div>

                {/* Progress bar mockup */}
                <div className="absolute bottom-5 left-5 right-5 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[65%] h-full bg-gradient-to-r from-blue-500 to-emerald-500 shadow-[0_0_10px_#3b82f6]" />
                </div>
            </div>
        </div>
    )
}
