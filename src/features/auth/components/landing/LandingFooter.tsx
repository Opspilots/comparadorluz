import { Linkedin, Twitter, Mail } from 'lucide-react'

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
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 -rotate-[5deg] flex-shrink-0" />
                            <span className="text-[1.1rem] font-extrabold tracking-[-0.03em] text-white">EnergyDeal</span>
                        </div>
                        <p className="text-[13px] text-slate-600 leading-relaxed mb-5 max-w-[200px]">
                            El CRM para asesores energéticos que cierra más contratos.
                        </p>
                        <div className="flex gap-2.5">
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-colors"
                                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                                aria-label="LinkedIn"
                            >
                                <Linkedin className="w-3.5 h-3.5 text-slate-500" />
                            </a>
                            <a
                                href="#"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-colors"
                                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                                aria-label="Twitter / X"
                            >
                                <Twitter className="w-3.5 h-3.5 text-slate-500" />
                            </a>
                            <a
                                href="mailto:hola@energydeal.es"
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.05] transition-colors"
                                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                                aria-label="Email"
                            >
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                            </a>
                        </div>
                    </div>

                    {/* Link columns */}
                    {(Object.entries(footerLinks) as [string, { label: string; href: string }[]][]).map(([section, links]) => (
                        <div key={section}>
                            <h4 className="text-[11px] font-bold text-white/50 tracking-[0.1em] uppercase mb-5">{section}</h4>
                            <ul className="space-y-3">
                                {links.map((link) => (
                                    <li key={link.href}>
                                        <a href={link.href} className="text-[13px] text-slate-600 hover:text-slate-300 transition-colors">
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
