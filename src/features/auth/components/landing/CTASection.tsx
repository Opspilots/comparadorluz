interface CTASectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

export function CTASection({ onOpenAuth }: CTASectionProps) {
    return (
        <section className="py-24 lg:py-28 px-[5%] text-center bg-gradient-to-br from-[#2563eb] to-[#10b981] relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
                backgroundSize: '32px 32px',
            }} />

            <div className="max-w-[800px] mx-auto relative z-10">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.8rem] font-black text-white mb-5 tracking-[-0.02em]">
                    Listo para el siguiente nivel?
                </h2>
                <p className="text-lg lg:text-xl text-white/90 mb-10">
                    Unete a los mas de 500 asesores que ya confian en EnergyDeal.
                </p>
                <button
                    onClick={() => onOpenAuth('signup')}
                    className="px-10 py-4 bg-white text-[#2563eb] border-none rounded-2xl font-black text-lg cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-200"
                >
                    Empezar gratis ahora
                </button>
            </div>
        </section>
    )
}
