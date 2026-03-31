import { Sparkles } from 'lucide-react'
import { EnergyGrid } from './EnergyGrid'

interface HeroSectionProps {
    onOpenAuth: (mode: 'login' | 'signup') => void
}

function AppMockupSVG() {
    return (
        <svg
            viewBox="0 0 960 540"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto"
            role="img"
            aria-label="Vista previa del panel de EnergyDeal"
        >
            {/* Background */}
            <rect width="960" height="540" rx="16" fill="#0f172a" />

            {/* Sidebar */}
            <g className="animate-[fadeIn_0.6s_ease-out_0.2s_both]">
                <rect x="0" y="0" width="200" height="540" rx="16" fill="#0c1322" />
                {/* Logo area */}
                <rect x="20" y="20" width="28" height="28" rx="8" fill="url(#logoGrad)" />
                <rect x="56" y="26" width="90" height="14" rx="4" fill="white" fillOpacity="0.15" />
                {/* Nav items */}
                {/* Active item */}
                <rect x="0" y="72" width="3" height="36" rx="1.5" fill="#3b82f6" />
                <rect x="12" y="72" width="176" height="36" rx="8" fill="rgba(59,130,246,0.12)" />
                <rect x="24" y="82" width="16" height="16" rx="4" fill="#3b82f6" fillOpacity="0.6" />
                <rect x="48" y="85" width="72" height="10" rx="3" fill="white" fillOpacity="0.3" />
                {/* Inactive items */}
                {[124, 168, 212, 256, 300].map((y, i) => (
                    <g key={i}>
                        <rect x="24" y={y + 10} width="16" height="16" rx="4" fill="white" fillOpacity="0.08" />
                        <rect x="48" y={y + 13} width={60 + (i % 3) * 16} height="10" rx="3" fill="white" fillOpacity="0.06" />
                    </g>
                ))}
                {/* Bottom user area */}
                <rect x="20" y="484" width="160" height="40" rx="8" fill="white" fillOpacity="0.03" />
                <circle cx="40" cy="504" r="12" fill="#2563eb" fillOpacity="0.3" />
                <rect x="58" y="498" width="80" height="10" rx="3" fill="white" fillOpacity="0.1" />
            </g>

            {/* Main content area */}
            <g className="animate-[fadeIn_0.6s_ease-out_0.4s_both]">
                {/* Header bar */}
                <rect x="220" y="16" width="720" height="48" rx="10" fill="white" fillOpacity="0.02" />
                <rect x="236" y="32" width="120" height="14" rx="4" fill="white" fillOpacity="0.12" />
                {/* Search bar */}
                <rect x="580" y="28" width="200" height="28" rx="8" fill="white" fillOpacity="0.04" stroke="white" strokeOpacity="0.06" />
                <rect x="596" y="37" width="60" height="10" rx="3" fill="white" fillOpacity="0.08" />

                {/* Stat cards row */}
                {/* Card 1 - Clientes */}
                <rect x="220" y="80" width="230" height="100" rx="14" fill="rgba(37,99,235,0.06)" stroke="rgba(37,99,235,0.15)" strokeWidth="1" />
                <rect x="240" y="98" width="60" height="10" rx="3" fill="rgba(37,99,235,0.4)" />
                <text x="240" y="140" fill="white" fillOpacity="0.85" fontFamily="system-ui" fontSize="28" fontWeight="800">2.847</text>
                <rect x="380" y="130" width="50" height="20" rx="6" fill="rgba(16,185,129,0.15)" />
                <text x="392" y="144" fill="#10b981" fontFamily="system-ui" fontSize="11" fontWeight="700">+12%</text>

                {/* Card 2 - Contratos */}
                <rect x="464" y="80" width="230" height="100" rx="14" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.15)" strokeWidth="1" />
                <rect x="484" y="98" width="70" height="10" rx="3" fill="rgba(16,185,129,0.4)" />
                <text x="484" y="140" fill="white" fillOpacity="0.85" fontFamily="system-ui" fontSize="28" fontWeight="800">1.204</text>
                <rect x="624" y="130" width="50" height="20" rx="6" fill="rgba(16,185,129,0.15)" />
                <text x="636" y="144" fill="#10b981" fontFamily="system-ui" fontSize="11" fontWeight="700">+8%</text>

                {/* Card 3 - Conversión */}
                <rect x="708" y="80" width="230" height="100" rx="14" fill="rgba(217,119,6,0.06)" stroke="rgba(217,119,6,0.15)" strokeWidth="1" />
                <rect x="728" y="98" width="72" height="10" rx="3" fill="rgba(217,119,6,0.4)" />
                <text x="728" y="140" fill="white" fillOpacity="0.85" fontFamily="system-ui" fontSize="28" fontWeight="800">89,3%</text>
                <rect x="868" y="130" width="50" height="20" rx="6" fill="rgba(16,185,129,0.15)" />
                <text x="880" y="144" fill="#10b981" fontFamily="system-ui" fontSize="11" fontWeight="700">+3%</text>
            </g>

            {/* Chart area */}
            <g className="animate-[fadeIn_0.6s_ease-out_0.6s_both]">
                <rect x="220" y="196" width="480" height="328" rx="14" fill="white" fillOpacity="0.02" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
                {/* Chart title */}
                <rect x="240" y="216" width="140" height="12" rx="4" fill="white" fillOpacity="0.12" />
                {/* Grid lines */}
                {[270, 310, 350, 390, 430, 470].map((y, i) => (
                    <line key={i} x1="240" y1={y} x2="680" y2={y} stroke="white" strokeOpacity="0.03" strokeWidth="1" />
                ))}
                {/* Bar chart */}
                {[
                    { x: 260, h: 120, color: '#2563eb' },
                    { x: 298, h: 160, color: '#2563eb' },
                    { x: 336, h: 100, color: '#2563eb' },
                    { x: 374, h: 180, color: '#2563eb' },
                    { x: 412, h: 130, color: '#2563eb' },
                    { x: 450, h: 155, color: '#2563eb' },
                    { x: 488, h: 190, color: '#10b981' },
                    { x: 526, h: 140, color: '#2563eb' },
                    { x: 564, h: 170, color: '#2563eb' },
                    { x: 602, h: 185, color: '#10b981' },
                    { x: 640, h: 110, color: '#2563eb' },
                ].map((bar, i) => (
                    <rect
                        key={i}
                        x={bar.x}
                        y={490 - bar.h}
                        width="26"
                        height={bar.h}
                        rx="4"
                        fill={bar.color}
                        fillOpacity="0.25"
                        className="animate-[growUp_0.8s_ease-out_both]"
                        style={{ animationDelay: `${0.7 + i * 0.05}s` }}
                    />
                ))}
                {/* X axis labels */}
                {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'].map((m, i) => (
                    <text key={i} x={273 + i * 38} y={510} fill="white" fillOpacity="0.2" fontFamily="system-ui" fontSize="9" textAnchor="middle">{m}</text>
                ))}
            </g>

            {/* Right sidebar - Recent activity */}
            <g className="animate-[fadeIn_0.6s_ease-out_0.8s_both]">
                <rect x="714" y="196" width="226" height="328" rx="14" fill="white" fillOpacity="0.02" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
                <rect x="734" y="216" width="100" height="12" rx="4" fill="white" fillOpacity="0.12" />
                {/* Activity items */}
                {[248, 300, 352, 404, 456].map((y, i) => (
                    <g key={i}>
                        <circle cx="746" cy={y + 12} r="10" fill={['#2563eb', '#10b981', '#d97706', '#2563eb', '#10b981'][i]} fillOpacity="0.15" />
                        <rect x="764" y={y + 4} width={80 + (i % 2) * 30} height="8" rx="3" fill="white" fillOpacity="0.1" />
                        <rect x="764" y={y + 18} width={50 + (i % 3) * 15} height="7" rx="3" fill="white" fillOpacity="0.05" />
                    </g>
                ))}
            </g>

            {/* Floating badge - Savings detected */}
            <g className="animate-[fadeIn_0.6s_ease-out_1s_both]">
                <rect x="800" y="30" width="140" height="44" rx="12" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <text x="816" y="48" fill="white" fillOpacity="0.5" fontFamily="system-ui" fontSize="9" fontWeight="700" letterSpacing="0.5">AHORRO DETECTADO</text>
                <text x="816" y="66" fill="#10b981" fontFamily="system-ui" fontSize="18" fontWeight="800">+12,4%</text>
            </g>

            {/* Gradients */}
            <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#3b82f6" />
                    <stop offset="1" stopColor="#10b981" />
                </linearGradient>
            </defs>
        </svg>
    )
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
    return (
        <section id="hero" className="relative min-h-screen bg-[#0f172a] overflow-hidden flex flex-col items-center justify-center px-[5%] pt-28 pb-20">
            <EnergyGrid />

            {/* Content */}
            <div className="relative z-10 text-center max-w-5xl mx-auto animate-fade-in">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold mb-8 border border-blue-500/20">
                    <Sparkles className="w-4 h-4" />
                    Potenciado con IA
                </div>

                {/* Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-light leading-[1.05] mb-6 tracking-[-0.04em] text-white">
                    Transforma tu asesoría{' '}
                    <br className="hidden sm:block" />
                    <span className="font-extrabold text-gradient-blue">
                        con Inteligencia Artificial
                    </span>
                </h1>

                {/* Subheadline */}
                <p className="text-lg sm:text-xl text-slate-400 max-w-[750px] mx-auto mb-10 leading-relaxed">
                    Sube facturas, analiza tarifas y genera contratos en segundos.
                    La plataforma definitiva para el profesional energético.
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => onOpenAuth('signup')}
                        className="px-8 py-4 text-lg rounded-2xl bg-[#2563eb] text-white border-none font-extrabold cursor-pointer shadow-[0_20px_40px_rgba(59,130,246,0.3)] hover:bg-[#1d4ed8] hover:shadow-[0_24px_48px_rgba(59,130,246,0.4)] transition-all duration-200"
                    >
                        Pruébalo ahora
                    </button>
                    <button
                        onClick={() => onOpenAuth('login')}
                        className="px-8 py-4 text-lg rounded-2xl bg-transparent text-white border border-white/20 font-extrabold cursor-pointer flex items-center justify-center gap-2.5 hover:bg-white/5 hover:border-white/30 transition-all duration-200"
                    >
                        Ya tengo cuenta
                    </button>
                </div>

                {/* Social proof */}
                <p className="mt-8 text-sm text-slate-500 font-medium">
                    Únete a asesores energéticos que ya optimizan con IA
                </p>
            </div>

            {/* App Mockup - inline SVG */}
            <div className="relative z-10 mt-16 w-full max-w-[1000px] mx-auto animate-fade-in hidden sm:block" style={{ animationDelay: '0.3s' }}>
                <div className="bg-white/[0.03] p-3 rounded-[32px] border border-white/[0.06] shadow-[0_40px_100px_rgba(0,0,0,0.3)] backdrop-blur-sm">
                    <AppMockupSVG />
                </div>
            </div>
        </section>
    )
}
