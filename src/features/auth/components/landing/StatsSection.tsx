import { useEffect, useRef, useState } from 'react'

const stats = [
    { value: 200, suffix: '+', label: 'Tarifas comparables' },
    { value: 2, suffix: 'min', label: 'Por comparativa' },
    { value: 1, suffix: '', label: 'Plataforma para todo', prefix: 'Solo ' },
    { value: 0, suffix: '', label: 'Coste para empezar', prefix: '' },
]

function AnimatedCounter({ value, suffix, prefix, visible }: { value: number; suffix: string; prefix?: string; visible: boolean }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!visible) return
        if (value === 0) { setCount(0); return }

        let start = 0
        const duration = 1800
        const step = 16
        const increment = value / (duration / step)
        const timer = setInterval(() => {
            start += increment
            if (start >= value) {
                setCount(value)
                clearInterval(timer)
            } else {
                setCount(Math.floor(start))
            }
        }, step)
        return () => clearInterval(timer)
    }, [visible, value])

    return (
        <span className="tabular-nums">
            {prefix}{value === 0 ? '0' : count}{suffix}
        </span>
    )
}

export function StatsSection() {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true) },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section className="relative py-20 px-[5%] overflow-hidden" style={{ background: '#050508' }}>
            <div className="landing-divider absolute top-0 left-[10%] right-[10%]" />

            <div
                ref={ref}
                className={`max-w-[1000px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 transition-all duration-700 ${
                    visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
            >
                {stats.map((stat, i) => (
                    <div key={i} className="text-center" style={{ transitionDelay: `${i * 100}ms` }}>
                        <div className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white tracking-[-0.03em] mb-2">
                            <AnimatedCounter
                                value={stat.value}
                                suffix={stat.suffix}
                                prefix={stat.prefix}
                                visible={visible}
                            />
                        </div>
                        <div className="text-sm text-slate-500 font-medium">{stat.label}</div>
                    </div>
                ))}
            </div>
        </section>
    )
}
