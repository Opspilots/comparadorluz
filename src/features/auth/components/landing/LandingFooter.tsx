export function LandingFooter() {
    return (
        <footer className="py-14 px-[5%] bg-white border-t border-[#e2e8f0]">
            <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500" />
                    <span className="text-xl font-black tracking-[-0.02em] text-[#0f172a]">EnergyDeal</span>
                </div>
                <div className="flex gap-6 text-[#64748b] font-medium text-sm">
                    <a href="#" className="hover:text-[#0f172a] transition-colors">Privacidad</a>
                    <a href="#" className="hover:text-[#0f172a] transition-colors">Terminos</a>
                    <a href="#" className="hover:text-[#0f172a] transition-colors">Contacto</a>
                </div>
                <div className="text-[#94a3b8] text-sm">
                    &copy; {new Date().getFullYear()} EnergyDeal CRM
                </div>
            </div>
        </footer>
    )
}
