export function LandingFooter() {
    return (
        <footer className="py-10 px-[5%] border-t border-white/[0.04]" style={{ background: '#050508' }}>
            <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-emerald-500 -rotate-[5deg]" />
                    <span className="text-sm font-bold text-white tracking-[-0.02em]">EnergyDeal</span>
                </div>
                <div className="flex gap-6 text-slate-600 text-[13px]">
                    <a href="/legal/privacidad" className="hover:text-slate-400 transition-colors">Privacidad</a>
                    <a href="/legal/terminos" className="hover:text-slate-400 transition-colors">Terminos</a>
                    <a href="#contacto" className="hover:text-slate-400 transition-colors">Contacto</a>
                </div>
                <span className="text-slate-700 text-[13px]">
                    &copy; {new Date().getFullYear()} EnergyDeal
                </span>
            </div>
        </footer>
    )
}
