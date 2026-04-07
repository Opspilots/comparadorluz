import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const stats = [
    { value: 200, suffix: '+', label: 'Tarifas en base de datos', prefix: '' },
    { value: 2, suffix: ' min', label: 'Por comparativa completa', prefix: '< ' },
    { value: 40, suffix: '%', label: 'Más contratos cerrados', prefix: '+' },
    { value: 0, suffix: '', label: 'Coste para empezar', prefix: '' },
]

export function StatsSection() {
    const sectionRef = useRef<HTMLElement>(null)

    useGSAP(() => {
        stats.forEach((stat, i) => {
            const el = document.querySelector(`.stat-num-${i}`) as HTMLElement
            if (!el) return

            if (stat.value === 0) { el.textContent = `${stat.prefix}0`; return }

            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: 'top 80%',
                once: true,
                onEnter: () => {
                    gsap.to({ val: 0 }, {
                        val: stat.value,
                        duration: 1.8,
                        ease: 'power2.out',
                        delay: i * 0.1,
                        onUpdate: function () {
                            el.textContent = `${stat.prefix}${Math.floor(this.targets()[0].val)}${stat.suffix}`
                        },
                        onComplete: () => {
                            el.textContent = `${stat.prefix}${stat.value}${stat.suffix}`
                        },
                    })
                },
            })
        })

        gsap.from('.stat-item', {
            opacity: 0,
            y: 24,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: sectionRef.current,
                start: 'top 80%',
                once: true,
            },
        })
    }, { scope: sectionRef })

    return (
        <section ref={sectionRef} className="relative py-20 px-[5%] overflow-hidden" style={{ background: '#020209' }}>
            <div className="divider-v2 absolute top-0 left-[10%] right-[10%]" />

            <div className="max-w-[1000px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="stat-item text-center">
                        <div className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white tracking-[-0.04em] mb-2 tabular-nums">
                            <span className={`stat-num-${i}`}>
                                {stat.prefix}0{stat.suffix}
                            </span>
                        </div>
                        <div className="text-sm text-slate-600 font-medium">{stat.label}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}
