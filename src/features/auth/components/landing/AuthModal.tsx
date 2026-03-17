import React from 'react'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { EnergyGrid } from './EnergyGrid'

interface AuthModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    authMode: 'login' | 'signup'
    setAuthMode: (mode: 'login' | 'signup') => void
    email: string
    setEmail: (email: string) => void
    password: string
    setPassword: (password: string) => void
    loading: boolean
    message: string | null
    onSubmit: (e: React.FormEvent) => void
    onGoogleLogin: () => void
}

export function AuthModal({
    open,
    onOpenChange,
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    message,
    onSubmit,
    onGoogleLogin,
}: AuthModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden border-none gap-0">
                <DialogTitle className="sr-only">
                    {authMode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
                </DialogTitle>

                <div className="flex min-h-[560px]">
                    {/* Left brand panel — hidden on mobile */}
                    <div className="hidden md:flex w-[42%] bg-[#0f172a] relative flex-col justify-between p-10 overflow-hidden">
                        <EnergyGrid />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 mb-8">
                                <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-emerald-500 -rotate-[5deg]" />
                                <span className="text-xl font-black text-white tracking-[-0.02em]">EnergyDeal</span>
                            </div>

                            <h2 className="text-3xl font-black text-white leading-tight tracking-[-0.03em] mb-3">
                                La plataforma que{' '}
                                <span className="text-gradient-blue">transforma</span>{' '}
                                la energia
                            </h2>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Gestion inteligente de tarifas, clientes y contratos para profesionales del sector energetico.
                            </p>
                        </div>

                        <div className="relative z-10 space-y-3">
                            {[
                                '500+ asesores activos',
                                '200+ comercializadoras',
                                'IA integrada en cada paso',
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="text-slate-300 text-sm font-medium">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right form panel */}
                    <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
                        <div className="max-w-[360px] mx-auto w-full">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="md:hidden w-12 h-12 bg-[#2563eb] rounded-xl mx-auto mb-5 flex items-center justify-center text-white text-xl font-black">
                                    E
                                </div>
                                <h2 className="text-2xl font-black tracking-[-0.02em] text-[#0f172a]">
                                    {authMode === 'login' ? 'Bienvenido' : 'Crea tu cuenta'}
                                </h2>
                                <p className="text-[#64748b] text-sm mt-1.5">
                                    {authMode === 'login'
                                        ? 'Accede a tu panel de gestion'
                                        : 'Empieza a comparar tarifas hoy'}
                                </p>
                            </div>

                            {/* Message */}
                            {message && (
                                <div
                                    className={`p-3.5 rounded-xl mb-5 text-sm font-medium ${
                                        message.startsWith('Error')
                                            ? 'bg-red-50 text-red-800 border border-red-100'
                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                    }`}
                                >
                                    {message}
                                </div>
                            )}

                            {/* Google OAuth first */}
                            <button
                                type="button"
                                onClick={onGoogleLogin}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white border border-[#e2e8f0] rounded-xl font-semibold text-sm text-[#0f172a] cursor-pointer hover:bg-[#f8fafc] hover:border-[#cbd5e1] transition-all duration-150 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.04)] disabled:opacity-50"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {authMode === 'login' ? 'Continuar con Google' : 'Registrarme con Google'}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center my-6">
                                <div className="flex-1 h-px bg-[#e2e8f0]" />
                                <span className="px-4 text-[#94a3b8] text-xs font-semibold uppercase tracking-wider">
                                    o con email
                                </span>
                                <div className="flex-1 h-px bg-[#e2e8f0]" />
                            </div>

                            {/* Form */}
                            <form onSubmit={onSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[#0f172a] mb-1.5">
                                        Email profesional
                                    </label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="nombre@empresa.com"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#0f172a] mb-1.5">
                                        Contrasena
                                    </label>
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="h-11"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 text-base font-bold rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.15)]"
                                >
                                    {loading ? 'Procesando...' : (authMode === 'login' ? 'Entrar' : 'Registrarme')}
                                </Button>
                            </form>

                            {/* Toggle */}
                            <div className="text-center mt-6">
                                <p className="text-sm text-[#64748b]">
                                    {authMode === 'login' ? 'No tienes cuenta? ' : 'Ya eres usuario? '}
                                    <button
                                        type="button"
                                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                                        className="bg-transparent border-none text-[#2563eb] font-bold cursor-pointer p-0 hover:underline"
                                    >
                                        {authMode === 'login' ? 'Unete gratis' : 'Accede aqui'}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
