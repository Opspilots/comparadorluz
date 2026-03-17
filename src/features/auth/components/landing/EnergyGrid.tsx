export function EnergyGrid() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Grid lines */}
            <div className="absolute inset-0 energy-grid animate-grid-pulse" />

            {/* Radial glows */}
            <div className="absolute inset-0 energy-grid-glow" />

            {/* Traveling glow line */}
            <div className="absolute top-1/2 left-0 w-full h-px">
                <div className="h-px w-1/3 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent animate-glow-line" />
            </div>

            {/* Corner accents */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/[0.04] to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-emerald-500/[0.04] to-transparent rounded-full blur-3xl" />
        </div>
    )
}
