import { Linkedin, Twitter, Mail, Zap } from 'lucide-react'

const footerLinks = {
    Producto: [
        { label: 'Funcionalidades', href: '#funcionalidades' },
        { label: 'Cómo funciona', href: '#como-funciona' },
        { label: 'Integraciones', href: '#integraciones' },
        { label: 'Precios', href: '#precios' },
    ],
    Recursos: [
        { label: 'Blog', href: '#blog' },
        { label: 'FAQ', href: '#faq' },
        { label: 'Soporte', href: 'mailto:soporte@energydeal.es' },
        { label: 'Contacto', href: '#contacto' },
    ],
    Legal: [
        { label: 'Privacidad', href: '/legal/privacidad' },
        { label: 'Términos de uso', href: '/legal/terminos' },
        { label: 'Cookies', href: '/legal/cookies' },
        { label: 'RGPD', href: '/legal/rgpd' },
    ],
}

export function LandingFooter() {
    return (
        <footer style={{ background: '#010108', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="max-w-[1200px] mx-auto px-[5%] pt-14 pb-8">
                {/* Top grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-10 mb-12">
                    {/* Brand */}
                    <div className="col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                                    boxShadow: '0 0 12px rgba(37,99,235,0.35)',
                                }}
                            >
                                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} fill="currentColor" />
                            </div>
                            <span className="text-[1.1rem] font-extrabold tracking-[-0.03em] text-white">
                                Energy<span style={{ color: '#60a5fa' }}>Deal</span>
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed mb-5 max-w-[200px]">
                            El CRM para asesores energéticos que cierra más contratos.
                        </p>
                        <div className="flex gap-2">
                            {[
                                { Icon: Linkedin, label: 'LinkedIn', href: '#' },
                                { Icon: Twitter, label: 'Twitter / X', href: '#' },
                                { Icon: Mail, label: 'Email', href: 'mailto:hola@energydeal.es' },
                            ].map(({ Icon, label, href }) => (
                                <a
                                    key={label}
                                    href={href}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-white/[0.06] hover:border-white/[0.12] group"
                                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                                    aria-label={label}
                                >
                                    <Icon className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {(Object.entries(footerLinks) as [string, { label: string; href: string }[]][]).map(([section, links]) => (
                        <div key={section}>
                            <h4 className="text-[11px] font-bold text-white/40 tracking-[0.1em] uppercase mb-5">{section}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.href}>
                                        <a href={link.href} className="text-[13px] text-slate-600 hover:text-slate-300 transition-colors duration-200">
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div
                    className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                >
                    <span className="text-[12px] text-slate-700">
                        © {new Date().getFullYear()} EnergyDeal. Todos los derechos reservados.
                    </span>
                    <span className="text-[12px] text-slate-700">
                        Hecho con ♥ en España · RGPD compliant · energydeal.es
                    </span>
                </div>
            </div>
        </footer>
    )
}
