import { useParams, Link } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'

const legalContent: Record<string, { title: string; sections: { heading: string; body: string }[] }> = {
    privacidad: {
        title: 'Política de Privacidad',
        sections: [
            {
                heading: '1. Responsable del tratamiento',
                body: 'EnergyDeal (en adelante, "la Empresa") es el responsable del tratamiento de los datos personales recogidos a través de la plataforma energydeal.es. Puede contactarnos en: privacidad@energydeal.es.',
            },
            {
                heading: '2. Datos que recopilamos',
                body: 'Recopilamos datos identificativos (nombre, email, empresa, CIF), datos de uso de la plataforma y, en caso de clientes gestionados por asesores, datos de suministro energético (CUPS, consumos). Los datos de pago son procesados directamente por Stripe y no son almacenados en nuestros servidores.',
            },
            {
                heading: '3. Base jurídica y finalidad',
                body: 'El tratamiento se basa en la ejecución del contrato de servicio (Art. 6.1.b RGPD) y, en su caso, en el consentimiento del interesado (Art. 6.1.a RGPD). Los datos se utilizan para prestar el servicio CRM, gestionar suscripciones y, con consentimiento previo, enviar comunicaciones comerciales.',
            },
            {
                heading: '4. Conservación de datos',
                body: 'Los datos se conservan mientras dure la relación contractual y, una vez finalizada, durante los plazos legales aplicables (máximo 5 años para obligaciones fiscales y contractuales). Los consentimientos RGPD se conservan según lo dispuesto en el RD 88/2026.',
            },
            {
                heading: '5. Derechos del interesado',
                body: 'Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, portabilidad y limitación del tratamiento escribiendo a privacidad@energydeal.es, adjuntando copia de su documento de identidad. Tiene derecho a presentar reclamación ante la Agencia Española de Protección de Datos (aepd.es).',
            },
            {
                heading: '6. Transferencias internacionales',
                body: 'Los datos son alojados en servidores de Supabase (AWS Frankfurt, UE) y pueden ser accedidos por proveedores de servicios como Stripe (EEUU, bajo Decisión de Adecuación). En ningún caso se ceden a terceros sin consentimiento expreso, salvo obligación legal.',
            },
        ],
    },
    terminos: {
        title: 'Términos de Uso',
        sections: [
            {
                heading: '1. Aceptación',
                body: 'El acceso y uso de EnergyDeal implica la aceptación plena y sin reservas de los presentes Términos de Uso. Si no está de acuerdo, debe abstenerse de utilizar la plataforma.',
            },
            {
                heading: '2. Descripción del servicio',
                body: 'EnergyDeal es una plataforma SaaS destinada a asesores energéticos y corredurías para la gestión de clientes, comparación de tarifas energéticas y seguimiento de contratos en el mercado libre español.',
            },
            {
                heading: '3. Obligaciones del usuario',
                body: 'El usuario se compromete a: (i) proporcionar información veraz en el registro; (ii) mantener la confidencialidad de sus credenciales; (iii) no utilizar la plataforma para actividades ilegales; (iv) cumplir con la normativa de protección de datos al gestionar datos de sus clientes (RGPD/LOPD-GDD).',
            },
            {
                heading: '4. Planes y facturación',
                body: 'El servicio se presta según el plan contratado. Los cambios de plan tienen efecto en el siguiente ciclo de facturación. Las cancelaciones detienen la renovación automática sin derecho a reembolso del período en curso, salvo en los casos previstos por la normativa de consumidores.',
            },
            {
                heading: '5. Limitación de responsabilidad',
                body: 'EnergyDeal no garantiza la exactitud de las tarifas mostradas, que dependen de la información publicada por las comercializadoras. La Empresa no se hace responsable de las decisiones comerciales tomadas basándose en los datos de la plataforma.',
            },
            {
                heading: '6. Modificaciones',
                body: 'Nos reservamos el derecho de modificar estos Términos, notificando los cambios con al menos 15 días de antelación por email o mediante aviso en la plataforma.',
            },
        ],
    },
    cookies: {
        title: 'Política de Cookies',
        sections: [
            {
                heading: '¿Qué son las cookies?',
                body: 'Las cookies son pequeños archivos de texto que los sitios web almacenan en el dispositivo del usuario para recordar preferencias, mantener sesiones activas y recopilar información de uso.',
            },
            {
                heading: 'Cookies estrictamente necesarias',
                body: 'Estas cookies son imprescindibles para el funcionamiento de la plataforma: gestión de sesión de autenticación (Supabase Auth), preferencias de idioma y configuración. No requieren consentimiento y no pueden desactivarse.',
            },
            {
                heading: 'Cookies analíticas',
                body: 'Utilizamos cookies de análisis para entender cómo se utiliza la plataforma y mejorar la experiencia. Estos datos son anonimizados y no incluyen información personal identificable.',
            },
            {
                heading: 'Gestión de cookies',
                body: 'Puede configurar su navegador para rechazar o eliminar cookies. Tenga en cuenta que desactivar cookies necesarias puede impedir el correcto funcionamiento de la plataforma. Para más información, consulte la ayuda de su navegador.',
            },
        ],
    },
    rgpd: {
        title: 'Derechos RGPD',
        sections: [
            {
                heading: 'Sus derechos bajo el RGPD',
                body: 'El Reglamento General de Protección de Datos (RGPD, UE 2016/679) le otorga una serie de derechos sobre sus datos personales que puede ejercer en cualquier momento.',
            },
            {
                heading: 'Derecho de acceso (Art. 15)',
                body: 'Puede solicitar información sobre qué datos personales tenemos sobre usted, con qué finalidad los tratamos y con quién los compartimos.',
            },
            {
                heading: 'Derecho de rectificación (Art. 16)',
                body: 'Puede solicitar la corrección de datos incorrectos o incompletos.',
            },
            {
                heading: 'Derecho de supresión / "al olvido" (Art. 17)',
                body: 'Puede solicitar la eliminación de sus datos cuando ya no sean necesarios para la finalidad para la que fueron recogidos, o cuando retire su consentimiento.',
            },
            {
                heading: 'Derecho de portabilidad (Art. 20)',
                body: 'Puede solicitar recibir sus datos en un formato estructurado y de uso común para transferirlos a otro responsable.',
            },
            {
                heading: 'Cómo ejercer sus derechos',
                body: 'Envíe un email a privacidad@energydeal.es indicando el derecho que desea ejercer y adjuntando copia de su DNI o documento identificativo equivalente. Responderemos en el plazo máximo de un mes. Si no está satisfecho con nuestra respuesta, puede reclamar ante la Agencia Española de Protección de Datos en www.aepd.es.',
            },
        ],
    },
}

export function LegalPage() {
    const { page } = useParams<{ page: string }>()
    const content = page ? legalContent[page] : null

    return (
        <div className="min-h-screen" style={{ background: '#020209' }}>
            {/* Header */}
            <header style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(2,2,9,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div className="max-w-[900px] mx-auto px-[5%] py-4 flex items-center justify-between">
                    <Link to="/login" className="flex items-center gap-2.5 text-decoration-none" style={{ textDecoration: 'none' }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} fill="currentColor" />
                        </div>
                        <span className="text-[1rem] font-extrabold tracking-[-0.03em] text-white">
                            Energy<span style={{ color: '#60a5fa' }}>Deal</span>
                        </span>
                    </Link>
                    <Link to="/login" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors" style={{ textDecoration: 'none' }}>
                        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                        Volver
                    </Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-[900px] mx-auto px-[5%] py-16">
                {content ? (
                    <>
                        <h1 className="text-3xl font-extrabold text-white tracking-[-0.03em] mb-2">{content.title}</h1>
                        <p className="text-slate-500 text-sm mb-10">Última actualización: abril 2026 · EnergyDeal · energydeal.es</p>
                        <div className="flex flex-col gap-8">
                            {content.sections.map((s, i) => (
                                <div key={i}>
                                    <h2 className="text-base font-bold text-white mb-2 tracking-[-0.01em]">{s.heading}</h2>
                                    <p className="text-sm text-slate-400 leading-relaxed">{s.body}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            <p className="text-xs text-slate-600">Para cualquier consulta sobre esta política, escríbenos a <a href="mailto:privacidad@energydeal.es" className="text-blue-400 hover:text-blue-300">privacidad@energydeal.es</a></p>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-slate-400">Página legal no encontrada.</p>
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm mt-4 block" style={{ textDecoration: 'none' }}>Volver al inicio</Link>
                    </div>
                )}
            </main>
        </div>
    )
}
